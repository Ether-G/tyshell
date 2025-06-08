#!/bin/bash

# Create necessary directories
mkdir -p src/{server,client,filesystem,commands} public dist

# Install dependencies
npm install

# Build the project
npm run build

echo "Setup complete! You can now run the server with: npm run dev" 