/**
* Copyright 2025 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/**
 * app.js: JS code for the adk-streaming sample app.
 */

/**
 * WebSocket handling
 */

// Connect the server with a WebSocket connection
const sessionId = Math.random().toString().substring(10);
const ws_url =
  "ws://" + window.location.host + "/ws/" + sessionId;
let websocket = null;
let is_audio = false;

// Get DOM elements
const micButton = document.getElementById("mic-button");
const closeButton = document.getElementById("close-button");
const visualizer = document.getElementById("visualizer");
let currentMessageId = null;

// WebSocket handlers
function connectWebsocket() {
  // Connect websocket
  websocket = new WebSocket(ws_url + "?is_audio=" + is_audio);

  // Handle connection open
  websocket.onopen = function () {
    // Connection opened messages
    console.log("WebSocket connection opened.");
    micButton.disabled = false;
  };

  // Handle incoming messages
  websocket.onmessage = function (event) {
    // Parse the incoming message
    const message_from_server = JSON.parse(event.data);
    console.log("[AGENT TO CLIENT] ", message_from_server);

    // Check if the turn is complete
    // if turn complete, add new message
    if (
      message_from_server.turn_complete &&
      message_from_server.turn_complete == true
    ) {
      currentMessageId = null;
      // When the turn is complete, transition back to the listening state
      visualizer.classList.remove("speaking");
      return;
    }

    // Check for interrupt message
    if (
      message_from_server.interrupted &&
      message_from_server.interrupted === true
    ) {
      // Stop audio playback if it's playing
      if (audioPlayerNode) {
        audioPlayerNode.port.postMessage({ command: "endOfAudio" });
      }
      return;
    }

    // If it's audio, play it
    if (message_from_server.mime_type == "audio/pcm" && audioPlayerNode) {
      visualizer.classList.add("speaking");
      audioPlayerNode.port.postMessage(base64ToArray(message_from_server.data));
    }
  };

  // Handle connection close
  websocket.onclose = function () {
    console.log("WebSocket connection closed.");
    micButton.disabled = true;
    setTimeout(function () {
      console.log("Reconnecting...");
      connectWebsocket();
    }, 5000);
  };

  websocket.onerror = function (e) {
    console.log("WebSocket error: ", e);
  };
}
connectWebsocket();

// Send a message to the server as a JSON string
function sendMessage(message) {
  if (websocket && websocket.readyState == WebSocket.OPEN) {
    const messageJson = JSON.stringify(message);
    websocket.send(messageJson);
  }
}

// Decode Base64 data to Array
function base64ToArray(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Audio handling
 */

let audioPlayerNode;
let audioPlayerContext;
let audioRecorderNode;
let audioRecorderContext;
let micStream;
let analyser;
let visualizerAnimationId;

// Audio buffering for 0.2s intervals
let audioBuffer = [];
let bufferTimer = null;

// Import the audio worklets
import { startAudioPlayerWorklet } from "./audio-player.js";
import { startAudioRecorderWorklet } from "./audio-recorder.js";

// Start audio
async function startAudio() {
  try {
    console.log("Starting audio player...");
    const [playerNode, playerCtx] = await startAudioPlayerWorklet();
    audioPlayerNode = playerNode;
    audioPlayerContext = playerCtx;
    console.log("Audio player started.");

    console.log("Starting audio recorder...");
    const [recorderNode, recorderCtx, stream] =
      await startAudioRecorderWorklet(audioRecorderHandler);
    audioRecorderNode = recorderNode;
    audioRecorderContext = recorderCtx;
    micStream = stream;
    console.log("Audio recorder started.");

    setupVisualizer();
    console.log("Visualizer setup complete.");
    return true; // Indicate success
  } catch (error) {
    console.error("Failed to start audio:", error);
    alert(
      "Could not start audio. This can happen if microphone access is denied or the page is not served over a secure connection (HTTPS). Please check your browser's permissions and console for more details."
    );
    return false; // Indicate failure
  }
}

// Setup the audio visualizer
function setupVisualizer() {
  analyser = audioRecorderContext.createAnalyser();
  const source = audioRecorderContext.createMediaStreamSource(micStream);
  source.connect(analyser);
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    visualizerAnimationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    const intensity = dataArray.reduce((a, b) => a + b) / bufferLength / 255;
    const color1 = `rgba(0, 123, 255, ${intensity * 0.8})`;
    const color2 = `rgba(0, 80, 180, ${intensity * 0.5})`;
    const color3 = `rgba(45, 45, 45, 0.2)`;

    visualizer.style.background = `radial-gradient(circle, ${color1} 0%, ${color2} 50%, ${color3} 100%)`;
  }

  draw();
}

// Stop the audio visualizer
function stopVisualizer() {
  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
    visualizerAnimationId = null;
    visualizer.style.background = '';
  }
}

// Start the audio only when the user clicked the button
// (due to the gesture requirement for the Web Audio API)
micButton.addEventListener("click", async () => {
  if (!is_audio) {
    console.log("Mic button clicked.");
    is_audio = true; // Prevent re-entry while starting
    const audioStarted = await startAudio();

    if (audioStarted) {
      console.log("Audio successfully started. Connecting to WebSocket...");
      connectWebsocket(); // Reconnect with the audio mode
    } else {
      console.log("Audio failed to start. Aborting WebSocket connection.");
      is_audio = false; // Reset state on failure
    }
  }
});

closeButton.addEventListener("click", () => {
  if (is_audio) {
    console.log("Close button clicked.");
    // Stop audio
    stopAudioRecording();
    stopVisualizer(); // Stop the visualizer
    is_audio = false;
    if (websocket) {
      websocket.close();
    }
    visualizer.classList.remove("speaking");
  }
});

// Audio recorder handler
function audioRecorderHandler(pcmData) {
  // Add audio data to buffer
  audioBuffer.push(new Uint8Array(pcmData));
  
  // Start timer if not already running
  if (!bufferTimer) {
    bufferTimer = setInterval(sendBufferedAudio, 200); // 0.2 seconds
  }
}

// Send buffered audio data every 0.2 seconds
function sendBufferedAudio() {
  if (audioBuffer.length === 0) {
    return;
  }
  
  // Calculate total length
  let totalLength = 0;
  for (const chunk of audioBuffer) {
    totalLength += chunk.length;
  }
  
  // Combine all chunks into a single buffer
  const combinedBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioBuffer) {
    combinedBuffer.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Send the combined audio data
  sendMessage({
    mime_type: "audio/pcm",
    data: arrayBufferToBase64(combinedBuffer.buffer),
  });
  console.log("[CLIENT TO AGENT] sent %s bytes", combinedBuffer.byteLength);
  
  // Clear the buffer
  audioBuffer = [];
}

// Stop audio recording and cleanup
function stopAudioRecording() {
  if (bufferTimer) {
    clearInterval(bufferTimer);
    bufferTimer = null;
  }
  stopVisualizer();

  // Send any remaining buffered audio
  if (audioBuffer.length > 0) {
    sendBufferedAudio();
  }
}

// Encode an array buffer with Base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
