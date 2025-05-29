#!/bin/bash

# Check if OPENAI_API_KEY is set
if [ -z "${OPENAI_API_KEY}" ]; then
  echo "OPENAI_API_KEY environment variable is not set."
  read -p "Please enter your OpenAI API key: " OPENAI_API_KEY
  export OPENAI_API_KEY
  
  if [ -z "${OPENAI_API_KEY}" ]; then
    echo "Error: OpenAI API key is required to run the backend."
    exit 1
  fi
  
  echo "API key set for this session."
fi

# Start the FastAPI backend server
echo "Starting FastAPI backend server..."
cd backend
source venv/bin/activate
OPENAI_API_KEY="${OPENAI_API_KEY}" python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Start the frontend development server
echo "Starting frontend development server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Function to handle script termination
cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  exit 0
}

# Register the cleanup function for when the script is terminated
trap cleanup SIGINT SIGTERM

echo "Both servers are running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

# Keep the script running
wait
