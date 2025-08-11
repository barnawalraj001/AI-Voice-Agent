# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import json
import asyncio
import base64
import warnings
import logging
from pythonjsonlogger import jsonlogger

from pathlib import Path
from dotenv import load_dotenv

from google.genai.types import (
    Part,
    Content,
    Blob,
)

from google.adk.runners import InMemoryRunner
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig

from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from RAJ.agent import root_agent

warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

#
# ADK Streaming
#

# Load Gemini API Key
load_dotenv()

APP_NAME = "ADK Streaming example"


async def start_agent_session(user_id, is_audio=False):
    """Starts an agent session"""

    logging.info(f"Starting agent session for user: {user_id}, audio: {is_audio}")
    # Create a Runner
    runner = InMemoryRunner(
        app_name=APP_NAME,
        agent=root_agent,
    )

    # Create a Session
    session = await runner.session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,  # Replace with actual user ID
    )

    # Set response modality
    modality = "AUDIO" if is_audio else "TEXT"
    run_config = RunConfig(response_modalities=[modality])

    # Create a LiveRequestQueue for this session
    live_request_queue = LiveRequestQueue()

    # Start agent session
    live_events = runner.run_live(
        session=session,
        live_request_queue=live_request_queue,
        run_config=run_config,
    )
    return live_events, live_request_queue


async def agent_to_client_messaging(websocket, live_events):
    """Agent to client communication"""
    while True:
        async for event in live_events:
            logging.info(f"Event from agent: {event}")

            # If the turn complete or interrupted, send it
            if event.turn_complete or event.interrupted:
                message = {
                    "turn_complete": event.turn_complete,
                    "interrupted": event.interrupted,
                }
                await websocket.send_text(json.dumps(message))
                logging.info(f"[AGENT TO CLIENT]: {message}")
                continue

            # Read the Content and its first Part
            part: Part = (
                event.content and event.content.parts and event.content.parts[0]
            )
            if not part:
                continue

            # If it's audio, send Base64 encoded audio data
            is_audio = part.inline_data and part.inline_data.mime_type.startswith("audio/pcm")
            if is_audio:
                audio_data = part.inline_data and part.inline_data.data
                if audio_data:
                    message = {
                        "mime_type": "audio/pcm",
                        "data": base64.b64encode(audio_data).decode("ascii")
                    }
                    await websocket.send_text(json.dumps(message))
                    logging.info(f"[AGENT TO CLIENT]: audio/pcm: {len(audio_data)} bytes.")
                    continue

            # If it's text and a parial text, send it
            if part.text and event.partial:
                message = {
                    "mime_type": "text/plain",
                    "data": part.text
                }
                await websocket.send_text(json.dumps(message))
                logging.info(f"[AGENT TO CLIENT]: text/plain: {message}")


async def client_to_agent_messaging(websocket, live_request_queue):
    """Client to agent communication"""
    while True:
        # Decode JSON message
        message_json = await websocket.receive_text()
        logging.info(f"[CLIENT TO AGENT]: Received message: {message_json}")
        message = json.loads(message_json)
        mime_type = message["mime_type"]
        data = message["data"]

        # Send the message to the agent
        if mime_type == "text/plain":
            # Send a text message
            content = Content(role="user", parts=[Part.from_text(text=data)])
            live_request_queue.send_content(content=content)
            logging.info(f"[CLIENT TO AGENT]: {data}")
        elif mime_type == "audio/pcm":
            # Send an audio data
            decoded_data = base64.b64decode(data)
            live_request_queue.send_realtime(Blob(data=decoded_data, mime_type=mime_type))
        else:
            raise ValueError(f"Mime type not supported: {mime_type}")


async def handle_media_stream(websocket, live_events, live_request_queue):
    """Handle bidirectional media streaming for external clients"""
    try:
        await websocket.accept()
        logging.info("Media stream connection established")
        
        # Start agent to client messaging
        agent_task = asyncio.create_task(agent_to_client_messaging(websocket, live_events))
        client_task = asyncio.create_task(client_to_agent_messaging(websocket, live_request_queue))
        
        # Wait for either task to complete
        await asyncio.wait([agent_task, client_task], return_when=asyncio.FIRST_EXCEPTION)
        
    except Exception as e:
        logging.error(f"Error in media stream handler: {e}")
    finally:
        logging.info("Media stream connection closed")


#
# FastAPI web app
#

app = FastAPI()

STATIC_DIR = Path("static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    """Serves the index.html"""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, is_audio: str):
    """Client websocket endpoint"""

    # Wait for client connection
    await websocket.accept()
    logging.info(f"Client #{user_id} connected, audio mode: {is_audio}")

    # Start agent session
    live_events, live_request_queue = await start_agent_session(user_id, is_audio == "true")

    # Start tasks
    agent_to_client_task = asyncio.create_task(
        agent_to_client_messaging(websocket, live_events)
    )
    client_to_agent_task = asyncio.create_task(
        client_to_agent_messaging(websocket, live_request_queue)
    )

    # Wait until the websocket is disconnected or an error occurs
    tasks = [agent_to_client_task, client_to_agent_task]
    await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)

    # Close LiveRequestQueue
    live_request_queue.close()

    # Disconnected
    logging.info(f"Client #{user_id} disconnected")


@app.websocket("/media-stream")
async def media_stream_endpoint(websocket: WebSocket):
    """Media Streams endpoint for bidirectional audio streaming"""
    
    # Generate a unique user ID for this call
    import uuid
    call_id = str(uuid.uuid4())
    
    logging.info(f"Media stream call #{call_id} connecting...")

    # Start agent session with audio enabled
    live_events, live_request_queue = await start_agent_session(call_id, is_audio=True)

    # Handle the media stream
    await handle_media_stream(websocket, live_events, live_request_queue)

    # Close LiveRequestQueue
    live_request_queue.close()

    # Disconnected
    logging.info(f"Media stream call #{call_id} disconnected")
