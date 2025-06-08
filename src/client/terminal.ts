import { CommandExecutor } from '../commands/CommandExecutor';
import { FileSystem } from '../filesystem/FileSystem';
import { Terminal } from './types';

export class WebTerminal implements Terminal {
    private terminalElement: HTMLElement;
    private inputElement!: HTMLInputElement;
    private outputElement!: HTMLElement;
    private promptElement!: HTMLElement;
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private cursorPosition: number = 0;
    private commandExecutor: CommandExecutor;
    private fileSystem: FileSystem;
    private scrollObserver: MutationObserver;
    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
    private resizeStart: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
    private static terminalCount: number = 0;
    private static activeTerminals: Set<WebTerminal> = new Set();
    private static tabBar: HTMLElement;
    private static windowGroup: HTMLElement;
    private tabElement!: HTMLElement;

    constructor(terminalId: string, fileSystem: FileSystem) {
        this.terminalElement = document.getElementById(terminalId)!;
        this.commandExecutor = new CommandExecutor(fileSystem);
        this.fileSystem = fileSystem;
        
        this.scrollObserver = new MutationObserver(() => {
            this.forceScrollToBottom();
        });
        
        WebTerminal.terminalCount++;
        WebTerminal.activeTerminals.add(this);
        
        this.initializeTerminal();
    }

    private static initializeStaticElements(): void {
        if (!WebTerminal.tabBar) {
            WebTerminal.tabBar = document.createElement('div');
            WebTerminal.tabBar.className = 'terminal-tab-bar';
            document.body.appendChild(WebTerminal.tabBar);
        }
        if (!WebTerminal.windowGroup) {
            WebTerminal.windowGroup = document.createElement('div');
            WebTerminal.windowGroup.className = 'terminal-window-group';
            document.body.appendChild(WebTerminal.windowGroup);
        }
    }

    private initializeTerminal(): void {
        WebTerminal.initializeStaticElements();

        // Create tab element
        this.tabElement = document.createElement('div');
        this.tabElement.className = 'terminal-tab';
        this.tabElement.innerHTML = `
            <span class="terminal-tab-title">Terminal ${WebTerminal.terminalCount}</span>
            <button class="terminal-tab-close">×</button>
        `;
        WebTerminal.tabBar.appendChild(this.tabElement);

        // Create terminal layout
        this.terminalElement.innerHTML = `
            <div class="terminal-content">
                <div class="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="terminal-prompt">$ </span>
                    <input type="text" class="terminal-input" autofocus>
                </div>
            </div>
        `;

        // Move terminal to window group
        WebTerminal.windowGroup.appendChild(this.terminalElement);

        // Get elements
        this.outputElement = this.terminalElement.querySelector('.terminal-output')!;
        this.inputElement = this.terminalElement.querySelector('.terminal-input')! as HTMLInputElement;
        this.promptElement = this.terminalElement.querySelector('.terminal-prompt')!;

        // Start observing the output element for changes
        this.scrollObserver.observe(this.outputElement, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Add event listeners
        this.inputElement.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.inputElement.addEventListener('input', this.handleInput.bind(this));
        this.inputElement.addEventListener('click', () => this.inputElement.focus());

        // Add tab event listeners
        this.tabElement.addEventListener('click', () => this.activate());
        this.tabElement.querySelector('.terminal-tab-close')!.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Add terminal styles
        const style = document.createElement('style');
        style.textContent = `
            body {
                margin: 0;
                padding: 0;
                overflow: hidden;
                background-color: #2d2d2d;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .terminal-tab-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 40px;
                background-color: #1e1e1e;
                display: flex;
                align-items: center;
                padding: 0 10px;
                gap: 5px;
                border-bottom: 1px solid #333;
                z-index: 1000;
            }
            .terminal-tab {
                display: flex;
                align-items: center;
                padding: 8px 16px;
                background-color: #2d2d2d;
                color: #ffffff;
                border-radius: 4px 4px 0 0;
                cursor: pointer;
                user-select: none;
                gap: 8px;
                height: 32px;
                min-width: 120px;
                max-width: 200px;
            }
            .terminal-tab.active {
                background-color: #3d3d3d;
            }
            .terminal-tab-title {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .terminal-tab-close {
                background: none;
                border: none;
                color: #ffffff;
                cursor: pointer;
                padding: 2px 6px;
                font-size: 14px;
                border-radius: 3px;
                opacity: 0.7;
            }
            .terminal-tab-close:hover {
                opacity: 1;
                background-color: #ff5555;
            }
            .terminal-window-group {
                position: fixed;
                top: 40px;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #2d2d2d;
                overflow: hidden;
            }
            .terminal {
                background-color: #1e1e1e;
                color: #ffffff;
                font-family: 'Courier New', monospace;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
            }
            .terminal.active {
                opacity: 1;
                pointer-events: auto;
            }
            .terminal-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                padding: 10px;
            }
            .terminal-output {
                flex: 1;
                overflow-y: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.4;
            }
            .terminal-input-line {
                display: flex;
                align-items: center;
                padding: 8px 0;
                background-color: transparent;
                border-top: 1px solid #333;
                margin-top: 8px;
            }
            .terminal-prompt {
                color: #00ff00;
                margin-right: 5px;
                white-space: nowrap;
                font-family: 'Courier New', monospace;
            }
            .terminal-input {
                flex: 1;
                background: none;
                border: none;
                color: #ffffff;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                outline: none;
                padding: 0;
            }
            .terminal-input::selection {
                background-color: #264f78;
            }
            .new-terminal-btn {
                position: fixed;
                top: 8px;
                right: 10px;
                padding: 4px 8px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                z-index: 1001;
            }
            .new-terminal-btn:hover {
                background-color: #45a049;
            }
        `;
        document.head.appendChild(style);

        // Set initial prompt and activate this terminal
        this.updatePrompt();
        this.activate();
    }

    private activate(): void {
        // Deactivate all terminals
        WebTerminal.activeTerminals.forEach(terminal => {
            terminal.terminalElement.classList.remove('active');
            terminal.tabElement.classList.remove('active');
        });

        // Activate this terminal
        this.terminalElement.classList.add('active');
        this.tabElement.classList.add('active');
        this.inputElement.focus();
    }

    private close(): void {
        WebTerminal.activeTerminals.delete(this);
        this.terminalElement.remove();
        this.tabElement.remove();

        // If there are other terminals, activate the last one
        if (WebTerminal.activeTerminals.size > 0) {
            const lastTerminal = Array.from(WebTerminal.activeTerminals).pop()!;
            lastTerminal.activate();
        }
    }

    private startDragging(event: MouseEvent): void {
        if (event.target instanceof HTMLElement && event.target.closest('.terminal-controls')) {
            return;
        }
        this.isDragging = true;
        const rect = this.terminalElement.getBoundingClientRect();
        this.dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    private startResizing(event: MouseEvent): void {
        this.isResizing = true;
        const rect = this.terminalElement.getBoundingClientRect();
        this.resizeStart = {
            x: event.clientX,
            y: event.clientY,
            width: rect.width,
            height: rect.height
        };
    }

    private handleMouseMove(event: MouseEvent): void {
        if (this.isDragging) {
            const x = event.clientX - this.dragOffset.x;
            const y = event.clientY - this.dragOffset.y;
            this.terminalElement.style.left = `${x}px`;
            this.terminalElement.style.top = `${y}px`;
        } else if (this.isResizing) {
            const width = this.resizeStart.width + (event.clientX - this.resizeStart.x);
            const height = this.resizeStart.height + (event.clientY - this.resizeStart.y);
            this.terminalElement.style.width = `${Math.max(300, width)}px`;
            this.terminalElement.style.height = `${Math.max(200, height)}px`;
        }
    }

    private stopDragging(): void {
        this.isDragging = false;
        this.isResizing = false;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.executeCommand();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateHistory(-1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.navigateHistory(1);
                break;
            case 'ArrowLeft':
                if (this.cursorPosition > 0) {
                    this.cursorPosition--;
                }
                break;
            case 'ArrowRight':
                if (this.cursorPosition < this.inputElement.value.length) {
                    this.cursorPosition++;
                }
                break;
            case 'Home':
                event.preventDefault();
                this.cursorPosition = 0;
                break;
            case 'End':
                event.preventDefault();
                this.cursorPosition = this.inputElement.value.length;
                break;
        }
    }

    private handleInput(): void {
        this.cursorPosition = this.inputElement.selectionStart || 0;
    }

    private async executeCommand(): Promise<void> {
        const command = this.inputElement.value.trim();
        if (command) {
            this.commandHistory.push(command);
            this.historyIndex = this.commandHistory.length;
            this.appendOutput(`$ ${command}`);
            
            try {
                const result = await this.commandExecutor.execute(command);
                if (result.success) {
                    if (result.output) {
                        this.appendOutput(result.output);
                    }
                } else {
                    this.appendOutput(`Error: ${result.error}`);
                }
            } catch (error) {
                if (error instanceof Error) {
                    this.appendOutput(`Error: ${error.message}`);
                } else {
                    this.appendOutput('Error: An unknown error occurred');
                }
            }
        } else {
            this.appendOutput('$ ');
        }
        
        this.inputElement.value = '';
        this.cursorPosition = 0;
        this.updatePrompt();
        this.forceScrollToBottom();
    }

    private navigateHistory(direction: number): void {
        if (this.commandHistory.length === 0) return;

        this.historyIndex = Math.max(0, Math.min(this.commandHistory.length, this.historyIndex + direction));
        const command = this.historyIndex === this.commandHistory.length ? '' : this.commandHistory[this.historyIndex];
        
        this.inputElement.value = command;
        this.cursorPosition = command.length;
        this.inputElement.setSelectionRange(this.cursorPosition, this.cursorPosition);
    }

    private appendOutput(text: string): void {
        const line = document.createElement('div');
        
        // Handle ANSI color codes
        const parts = text.split(/(\x1b\[[0-9;]*m)/g);
        let currentSpan = document.createElement('span');
        line.appendChild(currentSpan);

        parts.forEach(part => {
            if (part.startsWith('\x1b[')) {
                // Parse ANSI color code
                const code = part.slice(2, -1); // Remove \x1b[ and m
                const values = code.split(';').map(Number);
                
                // Create new span for the colored text
                currentSpan = document.createElement('span');
                line.appendChild(currentSpan);
                
                // Apply styles based on ANSI codes
                values.forEach(value => {
                    switch (value) {
                        case 0: // Reset
                            currentSpan.style.color = '#e0e0e0'; // Light gray for default text
                            currentSpan.style.fontWeight = '';
                            break;
                        case 1: // Bold
                            currentSpan.style.fontWeight = 'bold';
                            break;
                        case 30: // Black
                            currentSpan.style.color = '#808080'; // Dark gray
                            break;
                        case 31: // Red
                            currentSpan.style.color = '#ff6b6b'; // Softer red
                            break;
                        case 32: // Green
                            currentSpan.style.color = '#98c379'; // Softer green
                            break;
                        case 33: // Yellow
                            currentSpan.style.color = '#e5c07b'; // Softer yellow
                            break;
                        case 34: // Blue
                            currentSpan.style.color = '#61afef'; // Softer blue
                            break;
                        case 35: // Magenta
                            currentSpan.style.color = '#c678dd'; // Softer magenta
                            break;
                        case 36: // Cyan
                            currentSpan.style.color = '#56b6c2'; // Softer cyan
                            break;
                        case 37: // White
                            currentSpan.style.color = '#e0e0e0'; // Light gray
                            break;
                        case 90: // Bright Black
                            currentSpan.style.color = '#5c6370'; // Darker gray
                            break;
                        case 91: // Bright Red
                            currentSpan.style.color = '#ef5350'; // Brighter red
                            break;
                        case 92: // Bright Green
                            currentSpan.style.color = '#7cb342'; // Brighter green
                            break;
                        case 93: // Bright Yellow
                            currentSpan.style.color = '#ffb74d'; // Brighter yellow
                            break;
                        case 94: // Bright Blue
                            currentSpan.style.color = '#42a5f5'; // Brighter blue
                            break;
                        case 95: // Bright Magenta
                            currentSpan.style.color = '#ba68c8'; // Brighter magenta
                            break;
                        case 96: // Bright Cyan
                            currentSpan.style.color = '#4dd0e1'; // Brighter cyan
                            break;
                        case 97: // Bright White
                            currentSpan.style.color = '#ffffff'; // Pure white
                            break;
                    }
                });
            } else {
                currentSpan.textContent = part;
            }
        });

        this.outputElement.appendChild(line);
        this.forceScrollToBottom();
    }

    private updatePrompt(): void {
        const currentPath = this.fileSystem.getCurrentPath();
        this.promptElement.textContent = `[${currentPath}] $ `;
    }

    private forceScrollToBottom(): void {
        // Multiple scroll attempts to ensure it works
        this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
        
        // Immediate attempt
        setTimeout(() => {
            this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }, 0);
        
        // Delayed attempt
        setTimeout(() => {
            this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }, 100);
    }

    public focus(): void {
        this.inputElement.focus();
    }

    public clear(): void {
        this.outputElement.innerHTML = '';
        this.forceScrollToBottom();
    }
} 