#!/bin/bash

# Check for sudo privileges
if [[ $EUID -ne 0 ]]; then
   echo "Questo script deve essere eseguito con sudo" 
   echo "Uso: sudo $0"
   exit 1
fi

# Function to check and install Node.js
install_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "Node.js non trovato. Installazione in corso..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
        apt-get install -y nodejs
    else
        echo "Node.js già installato. Versione: $(node -v)"
    fi
}

# Function to check if a directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        echo "Error: Directory $1 not found!"
        exit 1
    fi
}

# Install Node.js if not present
install_nodejs

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
