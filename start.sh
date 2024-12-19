#!/bin/bash

# Function to check if a directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        echo "Error: Directory $1 not found!"
        exit 1
    fi
}

# Check if directories exist
check_directory "./frontend"
check_directory "./backend"

# Build backend
echo "Checking backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "Backend node_modules exists, skipping installation..."
fi

if [ ! -d "dist" ]; then
    echo "Building backend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "Error building backend"
        exit 1
    fi
else
    echo "Backend dist exists, skipping build..."
fi

# Build frontend
echo "Checking frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend node_modules exists, skipping installation..."
fi

if [ ! -d "dist" ]; then
    echo "Building frontend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "Error building frontend"
        exit 1
    fi
else
    echo "Frontend dist exists, skipping build..."
fi

# Start backend
echo "Starting backend..."
cd ../backend
npm start > /dev/null 2>&1 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run preview
FRONTEND_PID=$!

# Handle script termination
trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM

# Keep script running
wait
