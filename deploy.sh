#!/bin/bash

echo "Stopping and removing existing container..."
docker stop adk-web 2>/dev/null || true
docker rm adk-web 2>/dev/null || true

echo "Building FastAPI ADK Web Server Docker image..."
docker build --no-cache -t adk-web .

echo "Starting FastAPI ADK Web Server container..."
docker run -d \
    --name adk-web \
    -p 8000:8000 \
    -e GOOGLE_APPLICATION_CREDENTIALS=/app/application_default_credentials.json \
    --restart unless-stopped \
    adk-web

echo "FastAPI ADK Web Server deployed!"
echo "Access at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
echo "Container name: adk-web"
echo "To view logs: docker logs adk-web"
echo "To stop: docker stop adk-web" 