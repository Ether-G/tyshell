import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { FileSystem } from '../filesystem/FileSystem';
import { CommandExecutor } from '../commands/CommandExecutor';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Create file system and command executor instances
const fileSystem = new FileSystem();
const commandExecutor = new CommandExecutor(fileSystem);

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    // Send initial prompt
    ws.send(JSON.stringify({
        type: 'prompt',
        data: {
            path: fileSystem.getCurrentPath(),
            availableCommands: commandExecutor.getAvailableCommands()
        }
    }));

    // Handle incoming messages
    ws.on('message', async (message: Buffer) => {
        try {
            const input = message.toString();
            const result = await commandExecutor.execute(input);

            // Send command result
            ws.send(JSON.stringify({
                type: 'result',
                data: result
            }));

            // Send new prompt
            ws.send(JSON.stringify({
                type: 'prompt',
                data: {
                    path: fileSystem.getCurrentPath()
                }
            }));
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                data: {
                    message: (error as Error).message
                }
            }));
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 