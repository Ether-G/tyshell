import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { FileSystem } from '../filesystem/FileSystem';
import { CommandExecutor } from '../commands/CommandExecutor';
import { CommandRegistry } from '../commands/CommandRegistry';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket server
const io = new Server(httpServer);

// Create file system and command executor instances
const fileSystem = new FileSystem();
const registry = new CommandRegistry(fileSystem);
const commandExecutor = new CommandExecutor(fileSystem, registry);

// Handle WebSocket connections
io.on('connection', (socket: Socket) => {
    console.log('Client connected');

    // Send initial prompt
    socket.emit('prompt', {
        path: fileSystem.getCurrentPath(),
        availableCommands: commandExecutor.getAvailableCommands()
    });

    // Handle incoming messages
    socket.on('message', async (message: Buffer) => {
        try {
            const input = message.toString();
            const result = await commandExecutor.execute(input);

            // Send command result
            socket.emit('result', result);

            // Send new prompt
            socket.emit('prompt', {
                path: fileSystem.getCurrentPath()
            });
        } catch (error) {
            socket.emit('error', {
                message: (error as Error).message
            });
        }
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 