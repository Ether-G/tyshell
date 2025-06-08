import { WebTerminal } from './terminal';
import { FileSystem } from '../filesystem/FileSystem';

// Initialize the file system
const fileSystem = new FileSystem();

// Create the initial terminal instance
const initialTerminal = document.getElementById('terminal')!;
initialTerminal.className = 'terminal';
const terminal = new WebTerminal('terminal', fileSystem);

// Add a button to create new terminals
const newTerminalBtn = document.createElement('button');
newTerminalBtn.textContent = '+';
newTerminalBtn.className = 'new-terminal-btn';
newTerminalBtn.title = 'New Terminal';

newTerminalBtn.addEventListener('click', () => {
    const terminalId = `terminal-${Date.now()}`;
    const terminalDiv = document.createElement('div');
    terminalDiv.id = terminalId;
    terminalDiv.className = 'terminal';
    document.body.appendChild(terminalDiv);
    new WebTerminal(terminalId, fileSystem);
});

document.body.appendChild(newTerminalBtn); 