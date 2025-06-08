interface WebSocketMessage {
    type: 'prompt' | 'result' | 'error';
    data: {
        path?: string;
        availableCommands?: string[];
        output?: string;
        error?: string;
        success?: boolean;
        message?: string;
    };
}

class Terminal {
    private ws: WebSocket;
    private output: HTMLDivElement;
    private input: HTMLInputElement;
    private prompt: HTMLSpanElement;
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private fileSystem: any; // Assuming a fileSystem property exists

    constructor() {
        this.output = document.getElementById('output') as HTMLDivElement;
        this.input = document.getElementById('command-input') as HTMLInputElement;
        this.prompt = document.querySelector('.prompt') as HTMLSpanElement;
        this.ws = new WebSocket(`ws://${window.location.host}`);

        this.setupWebSocket();
        this.setupEventListeners();
    }

    private setupWebSocket(): void {
        this.ws.onmessage = (event) => {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            this.writeToOutput('Connection closed. Please refresh the page.', 'error');
        };

        this.ws.onerror = () => {
            this.writeToOutput('WebSocket error. Please refresh the page.', 'error');
        };
    }

    private setupEventListeners(): void {
        this.input.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Enter':
                    this.handleCommand();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.navigateHistory('up');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.navigateHistory('down');
                    break;
                case 'Tab':
                    event.preventDefault();
                    this.handleTabCompletion();
                    break;
            }
        });
    }

    private handleMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'prompt':
                this.updatePrompt(message.data.path || '/');
                break;
            case 'result':
                if (message.data.error) {
                    this.writeToOutput(message.data.error, 'error');
                } else if (message.data.output) {
                    // Check for clear command
                    if (message.data.output === '\x1B[2J\x1B[H') {
                        this.clearOutput();
                    } else {
                        this.writeToOutput(message.data.output);
                    }
                }
                break;
            case 'error':
                this.writeToOutput(message.data.message || 'An error occurred', 'error');
                break;
        }
    }

    private handleCommand(): void {
        const command = this.input.value.trim();
        if (command) {
            this.writeToOutput(`$ ${command}`);
            this.commandHistory.push(command);
            this.historyIndex = this.commandHistory.length;
            this.ws.send(command);
        }
        this.input.value = '';
    }

    private navigateHistory(direction: 'up' | 'down'): void {
        if (this.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
            }
        } else {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
                return;
            }
        }

        this.input.value = this.commandHistory[this.historyIndex];
        this.input.selectionStart = this.input.selectionEnd = this.input.value.length;
    }

    private handleTabCompletion(): void {
        // TODO: Implement tab completion
        // This will require maintaining a list of available commands and files
        // and implementing fuzzy matching
    }

    private writeToOutput(text: string, className?: string): void {
        const line = document.createElement('div');
        line.textContent = text;
        if (className) {
            line.classList.add(className);
        }
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    private clearOutput(): void {
        this.output.innerHTML = '';
    }

    private updatePrompt(path: string): void {
        const currentPath = this.fileSystem.getCurrentPath();
        this.prompt.textContent = `[${currentPath}] $`;
    }
}

// Initialize terminal when the page loads
window.addEventListener('load', () => {
    new Terminal();
}); 