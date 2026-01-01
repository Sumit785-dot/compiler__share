#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Observer Development Environment ===${NC}"

# Function to kill processes on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down servers...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT

# Start Backend
echo -e "${GREEN}Starting Backend (Django)...${NC}"
source venv/bin/activate
python backend/manage.py runserver 0.0.0.0:8001 &
BACKEND_PID=$!

# Wait a moment for backend
sleep 2

# Start Frontend
echo -e "${GREEN}Starting Frontend (Vite)...${NC}"
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   Project is running!                        ${NC}"
echo -e "${BLUE}   Backend: http://localhost:8001             ${NC}"
echo -e "${BLUE}   Frontend: http://localhost:5173            ${NC}"
echo -e "${BLUE}   Press Ctrl+C to stop both servers          ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Keep script running
wait
