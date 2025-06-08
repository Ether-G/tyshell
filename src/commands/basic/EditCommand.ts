import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';
import { File } from '../../filesystem/types';

export interface EditorState {
    content: string[];
    cursor: { x: number; y: number };
    scrollOffset: number;
    modified: boolean;
    filename: string;
    searchQuery: string;
    searchResults: { y: number; x: number }[];
    currentSearchIndex: number;
    mode: 'normal' | 'search' | 'help' | 'save_prompt';
    promptMessage: string;
    promptInput: string;
}

export class EditCommand extends BaseCommand {
    public state: EditorState | null = null;
    private readonly statusBarHeight = 2;
    private readonly helpBarHeight = 1;
    private readonly minLines = 10;
    private readonly helpText = [
        'Editor Help',
        '==========',
        '',
        'Navigation:',
        '  Arrow keys - Move cursor',
        '  Home/End   - Move to start/end of line',
        '  Page Up/Dn - Move up/down by page',
        '',
        'Editing:',
        '  Enter      - Insert new line',
        '  Backspace  - Delete character or merge lines',
        '  Delete     - Delete character under cursor',
        '',
        'Commands:',
        '  ^O         - Save file',
        '  ^X         - Exit editor',
        '  ^W         - Search text',
        '  ^G         - Show this help',
        '  ^F         - Find next',
        '  ^B         - Find previous',
        '',
        'Press any key to return to editor'
    ];

    constructor(private fileSystem: FileSystem) {
        super(
            'edit',
            'Edit a file using a simple text editor',
            'edit [file]'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return this.usage;
        }

        const filename = args[0];
        const node = fileSystem.getNode(filename);

        // Initialize editor state
        this.state = {
            content: node && fileSystem.isFile(node) ? node.content.split('\n') : [''],
            cursor: { x: 0, y: 0 },
            scrollOffset: 0,
            modified: false,
            filename,
            searchQuery: '',
            searchResults: [],
            currentSearchIndex: -1,
            mode: 'normal',
            promptMessage: '',
            promptInput: ''
        };

        // Return special marker to indicate editor mode
        const editorState = {
            content: this.state.content,
            cursor: this.state.cursor,
            filename: this.state.filename
        };
        
        return '\x1B[EDITOR_MODE]' + JSON.stringify(editorState);
    }

    public findNext(): void {
        if (!this.state || !this.state.searchQuery) return;

        const query = this.state.searchQuery.toLowerCase();
        let found = false;

        // Start search from current position
        for (let y = this.state.cursor.y; y < this.state.content.length; y++) {
            const line = this.state.content[y].toLowerCase();
            const x = y === this.state.cursor.y ? 
                line.indexOf(query, this.state.cursor.x + 1) : 
                line.indexOf(query);

            if (x !== -1) {
                this.state.cursor.y = y;
                this.state.cursor.x = x;
                found = true;
                break;
            }
        }

        // If not found, wrap around to the beginning
        if (!found) {
            for (let y = 0; y < this.state.cursor.y; y++) {
                const line = this.state.content[y].toLowerCase();
                const x = line.indexOf(query);
                if (x !== -1) {
                    this.state.cursor.y = y;
                    this.state.cursor.x = x;
                    found = true;
                    break;
                }
            }
        }

        // Update scroll position if needed
        if (found) {
            if (this.state.cursor.y < this.state.scrollOffset) {
                this.state.scrollOffset = this.state.cursor.y;
            } else if (this.state.cursor.y >= this.state.scrollOffset + this.minLines) {
                this.state.scrollOffset = this.state.cursor.y - this.minLines + 1;
            }
        }
    }

    public findPrevious(): void {
        if (!this.state || !this.state.searchQuery) return;

        const query = this.state.searchQuery.toLowerCase();
        let found = false;

        // Start search from current position
        for (let y = this.state.cursor.y; y >= 0; y--) {
            const line = this.state.content[y].toLowerCase();
            const x = y === this.state.cursor.y ? 
                line.lastIndexOf(query, this.state.cursor.x - 1) : 
                line.lastIndexOf(query);

            if (x !== -1) {
                this.state.cursor.y = y;
                this.state.cursor.x = x;
                found = true;
                break;
            }
        }

        // If not found, wrap around to the end
        if (!found) {
            for (let y = this.state.content.length - 1; y > this.state.cursor.y; y--) {
                const line = this.state.content[y].toLowerCase();
                const x = line.lastIndexOf(query);
                if (x !== -1) {
                    this.state.cursor.y = y;
                    this.state.cursor.x = x;
                    found = true;
                    break;
                }
            }
        }

        // Update scroll position if needed
        if (found) {
            if (this.state.cursor.y < this.state.scrollOffset) {
                this.state.scrollOffset = this.state.cursor.y;
            } else if (this.state.cursor.y >= this.state.scrollOffset + this.minLines) {
                this.state.scrollOffset = this.state.cursor.y - this.minLines + 1;
            }
        }
    }

    public handleKeyPress(key: string): boolean {
        if (!this.state) return false;
        switch (this.state.mode) {
            case 'search':
                this.handleSearchKey(key);
                return false;
            case 'help':
                this.state.mode = 'normal';
                return false;
            case 'save_prompt':
                return this.handleSavePromptKey(key);
            default:
                this.handleNormalKey(key);
                return false;
        }
    }

    private handleSearchKey(key: string): void {
        if (!this.state) return;

        if (key === 'Enter') {
            this.state.mode = 'normal';
            return;
        }

        if (key === 'Escape') {
            this.state.mode = 'normal';
            this.state.searchQuery = '';
            return;
        }

        if (key === 'Backspace') {
            this.state.searchQuery = this.state.searchQuery.slice(0, -1);
            return;
        }

        if (key.length === 1) {
            this.state.searchQuery += key;
        }
    }

    private handleSavePromptKey(key: string): boolean {
        if (!this.state) return false;
        if (key.toLowerCase() === 'y' || key === 'Enter') {
            this.saveFile(this.fileSystem).then(() => {
                this.exit(this.fileSystem);
            });
            return true;
        } else if (key.toLowerCase() === 'n' || key === 'Escape') {
            this.exit(this.fileSystem);
            return true;
        }
        return false;
    }

    private handleNormalKey(key: string): void {
        if (!this.state) return;

        switch (key) {
            case 'ArrowUp':
                if (this.state.cursor.y > 0) {
                    this.state.cursor.y--;
                    this.state.cursor.x = Math.min(this.state.cursor.x, this.state.content[this.state.cursor.y].length);
                }
                break;
            case 'ArrowDown':
                if (this.state.cursor.y < this.state.content.length - 1) {
                    this.state.cursor.y++;
                    this.state.cursor.x = Math.min(this.state.cursor.x, this.state.content[this.state.cursor.y].length);
                }
                break;
            case 'ArrowLeft':
                if (this.state.cursor.x > 0) {
                    this.state.cursor.x--;
                }
                break;
            case 'ArrowRight':
                if (this.state.cursor.x < this.state.content[this.state.cursor.y].length) {
                    this.state.cursor.x++;
                }
                break;
            case 'Home':
                this.state.cursor.x = 0;
                break;
            case 'End':
                this.state.cursor.x = this.state.content[this.state.cursor.y].length;
                break;
            case 'PageUp':
                this.state.scrollOffset = Math.max(0, this.state.scrollOffset - this.minLines);
                this.state.cursor.y = Math.max(0, this.state.cursor.y - this.minLines);
                break;
            case 'PageDown':
                this.state.scrollOffset = Math.min(
                    this.state.content.length - this.minLines,
                    this.state.scrollOffset + this.minLines
                );
                this.state.cursor.y = Math.min(
                    this.state.content.length - 1,
                    this.state.cursor.y + this.minLines
                );
                break;
            case 'Backspace':
                if (this.state.cursor.x > 0) {
                    const line = this.state.content[this.state.cursor.y];
                    this.state.content[this.state.cursor.y] = line.slice(0, this.state.cursor.x - 1) + line.slice(this.state.cursor.x);
                    this.state.cursor.x--;
                    this.state.modified = true;
                } else if (this.state.cursor.y > 0) {
                    const currentLine = this.state.content[this.state.cursor.y];
                    const prevLine = this.state.content[this.state.cursor.y - 1];
                    this.state.content[this.state.cursor.y - 1] = prevLine + currentLine;
                    this.state.content.splice(this.state.cursor.y, 1);
                    this.state.cursor.y--;
                    this.state.cursor.x = prevLine.length;
                    this.state.modified = true;
                }
                break;
            case 'Delete':
                const line = this.state.content[this.state.cursor.y];
                if (this.state.cursor.x < line.length) {
                    this.state.content[this.state.cursor.y] = line.slice(0, this.state.cursor.x) + line.slice(this.state.cursor.x + 1);
                    this.state.modified = true;
                } else if (this.state.cursor.y < this.state.content.length - 1) {
                    const nextLine = this.state.content[this.state.cursor.y + 1];
                    this.state.content[this.state.cursor.y] = line + nextLine;
                    this.state.content.splice(this.state.cursor.y + 1, 1);
                    this.state.modified = true;
                }
                break;
            case 'Enter':
                const currentLine = this.state.content[this.state.cursor.y];
                const newLine = currentLine.slice(this.state.cursor.x);
                this.state.content[this.state.cursor.y] = currentLine.slice(0, this.state.cursor.x);
                this.state.content.splice(this.state.cursor.y + 1, 0, newLine);
                this.state.cursor.y++;
                this.state.cursor.x = 0;
                this.state.modified = true;
                break;
            default:
                if (key.length === 1) {
                    const line = this.state.content[this.state.cursor.y];
                    this.state.content[this.state.cursor.y] = line.slice(0, this.state.cursor.x) + key + line.slice(this.state.cursor.x);
                    this.state.cursor.x++;
                    this.state.modified = true;
                }
        }

        // Update scroll position if needed
        if (this.state.cursor.y < this.state.scrollOffset) {
            this.state.scrollOffset = this.state.cursor.y;
        } else if (this.state.cursor.y >= this.state.scrollOffset + this.minLines) {
            this.state.scrollOffset = this.state.cursor.y - this.minLines + 1;
        }
    }

    public async saveFile(fileSystem: FileSystem): Promise<void> {
        console.log('EditCommand.saveFile called');
        if (!this.state) {
            console.log('No state to save');
            return;
        }
        const content = this.state.content.join('\n');
        console.log('Saving content:', content);
        fileSystem.createFile(this.state.filename, content, true);
        this.state.modified = false;
        console.log('File saved successfully');
    }

    public async exit(fileSystem: FileSystem): Promise<void> {
        console.log('EditCommand.exit called');
        if (!this.state) {
            console.log('No state to exit');
            return;
        }
        if (this.state.modified) {
            console.log('State is modified, saving before exit');
            await this.saveFile(fileSystem);
        }
        console.log('Clearing editor state');
        this.state = null;
        console.log('EditCommand.exit completed');
    }

    public renderScreen(): string {
        if (!this.state) return '';

        if (this.state.mode === 'help') {
            return this.helpText.join('\n');
        }

        const lines = this.getVisibleLines();
        const content = lines.map((line, i) => {
            const lineNum = (this.state!.scrollOffset + i + 1).toString().padStart(3);
            let renderedLine = `\x1B[90m${lineNum}\x1B[0m ${line}`;

            // Highlight search results
            if (this.state!.mode === 'search' && this.state!.searchQuery) {
                const searchIndex = line.toLowerCase().indexOf(this.state!.searchQuery.toLowerCase());
                if (searchIndex !== -1) {
                    const before = renderedLine.slice(0, searchIndex + 5); // +5 for line number and space
                    const match = renderedLine.slice(searchIndex + 5, searchIndex + 5 + this.state!.searchQuery.length);
                    const after = renderedLine.slice(searchIndex + 5 + this.state!.searchQuery.length);
                    renderedLine = `${before}\x1B[43m${match}\x1B[0m${after}`;
                }
            }

            return renderedLine;
        }).join('\n');

        const statusBar = this.renderStatusBar();
        const helpBar = this.renderHelpBar();

        return `${content}\n${statusBar}\n${helpBar}`;
    }

    private getVisibleLines(): string[] {
        if (!this.state) return [];
        const start = this.state.scrollOffset;
        const end = start + this.minLines;
        return this.state.content.slice(start, end);
    }

    private renderStatusBar(): string {
        if (!this.state) return '';
        const modified = this.state.modified ? '[Modified]' : '';
        const filename = this.state.filename;
        const cursor = `Line ${this.state.cursor.y + 1}, Col ${this.state.cursor.x + 1}`;
        const mode = this.state.mode !== 'normal' ? `[${this.state.mode}]` : '';
        return `\x1B[7m${filename} ${modified} ${cursor} ${mode}\x1B[0m`;
    }

    private renderHelpBar(): string {
        if (!this.state) return '';
        switch (this.state.mode) {
            case 'search':
                return `\x1B[7mSearch: ${this.state.searchQuery}_\x1B[0m`;
            case 'help':
                return '\x1B[7mPress any key to return to editor\x1B[0m';
            case 'save_prompt':
                return `\x1B[7m${this.state.promptMessage} [Y/n]_\x1B[0m`;
            default:
                return '\x1B[7m^O: Save  ^X: Exit  ^W: Search  ^G: Help  ^F: Next  ^B: Prev\x1B[0m';
        }
    }
} 