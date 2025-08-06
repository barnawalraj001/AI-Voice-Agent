# ADK HDB - AI Agent with Audio Streaming

A real-time AI agent application built with Google's Agent Development Kit (ADK) that supports both text and audio interactions. The application features a web-based interface with live audio streaming capabilities.

## 🚀 Features

- **Real-time AI Agent**: Powered by Google's Gemini Live 2.5 Flash model
- **Audio Streaming**: Live audio input/output with PCM format
- **Web Interface**: Modern, responsive web UI with audio visualizer
- **WebSocket Communication**: Real-time bidirectional communication
- **Google Search Integration**: Agent can search the web for information
- **Docker Support**: Easy deployment with Docker containerization

## 🏗️ Architecture

### Project Structure
```
adk-hdb/
├── main.py                 # FastAPI application with WebSocket endpoints
├── RAJ/
│   ├── __init__.py
│   └── agent.py           # ADK agent configuration
├── static/                # Frontend assets
│   ├── css/
│   ├── js/
│   └── img/
├── Dockerfile             # Docker configuration
├── requirements.txt       # Python dependencies
├── deploy.sh             # Deployment script
└── application_default_credentials.json  # Google Cloud credentials
```

### Workflow

1. **Client Connection**: User connects via WebSocket to `/ws/{user_id}`
2. **Agent Session**: Server creates an ADK agent session with live request queue
3. **Real-time Communication**: 
   - Client sends audio data to agent
   - Agent processes and responds with audio
   - Responses stream back to client in real-time
4. **Audio Processing**: PCM audio data is buffered and sent in 0.2s intervals

## 🛠️ Technology Stack

- **Backend**: FastAPI, Uvicorn, Python 3.11
- **AI Agent**: Google ADK (Agent Development Kit)
- **Model**: Gemini Live 2.5 Flash Preview Native Audio
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Audio**: Web Audio API, Audio Worklets
- **Communication**: WebSocket
- **Containerization**: Docker

## 📋 Prerequisites

- Docker and Docker Compose
- Google Cloud Platform account
- Google ADK access
- Valid `application_default_credentials.json` file

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd adk-hdb
   ```

2. **Add your Google credentials**
   - Place your `application_default_credentials.json` file in the root directory
   - Ensure it has the necessary permissions for Google ADK and Gemini API

3. **Deploy using the script**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:8000`
   - The application will be available with full audio capabilities

### Manual Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=./application_default_credentials.json
   ```

3. **Run the application**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## 🎮 Usage

### Web Interface

1. **Open the application** in your browser at `http://localhost:8000`
2. **Click the microphone button** to start audio mode
3. **Speak** to interact with the AI agent
4. **Click the close button** to stop audio mode

### Audio Features

- **Real-time Audio Streaming**: The application streams audio in PCM format
- **Audio Visualizer**: Visual feedback shows audio input levels
- **Buffered Audio**: Audio is buffered in 0.2-second intervals for optimal performance
- **Automatic Reconnection**: WebSocket automatically reconnects if connection is lost

### Agent Capabilities

- **Text Conversations**: Natural language text interactions
- **Audio Conversations**: Voice-to-voice conversations
- **Web Search**: Agent can search the internet for information
- **Context Awareness**: Maintains conversation context across interactions

## 🔧 Configuration

### Environment Variables

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud credentials
- `PYTHONPATH`: Set to `/app` in Docker environment
- `PYTHONUNBUFFERED`: Set to `1` for immediate log output
- `.env` : Copy from `env.example` to .env

### Agent Configuration

The agent is configured in `RAJ/agent.py`:
- **Model**: `gemini-live-2.5-flash-preview-native-audio`
- **Tools**: Google Search integration
- **Instructions**: Custom instructions for the agent behavior

## 📊 API Endpoints

- `GET /`: Serves the main web interface
- `GET /static/*`: Static file serving
- `WebSocket /ws/{user_id}`: Real-time communication endpoint

## 🐳 Docker Commands

### Build and Run
```bash
# Build the image
docker build -t adk-web .

# Run the container
docker run -d --name adk-web -p 8000:8000 adk-web

# View logs
docker logs adk-web

# Stop container
docker stop adk-web

# Remove container
docker rm adk-web
```

### Using the deployment script
```bash
./deploy.sh
```



### Local Development

1. **Install development dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run with hot reload**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```


### Code Structure

- **`main.py`**: FastAPI application with WebSocket handling
- **`RAJ/agent.py`**: ADK agent configuration
- **`static/js/app.js`**: Frontend JavaScript with audio handling
- **`static/js/audio-*.js`**: Audio worklet processors

**Note**: This application requires valid Google Cloud credentials and ADK access. Make sure your `application_default_credentials.json` file is properly configured with the necessary permissions for Google ADK and Gemini API access. # AI-Voice-Agent
