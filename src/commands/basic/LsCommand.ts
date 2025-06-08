import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';
import { FileSystemNode, File, Directory } from '../../filesystem/types';

interface LsOptions {
    long: boolean;
    all: boolean;
    recursive: boolean;
    reverse: boolean;
    sortBy: 'name' | 'size' | 'date';
}

export class LsCommand extends BaseCommand {
    constructor() {
        super(
            'ls',
            'List directory contents',
            'ls [-l] [-a] [-r] [-R] [path]'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        const { options, path } = this.parseArgs(args);
        try {
            const items = fileSystem.listDirectory(path);
            if (items.length === 0) {
                return '';
            }

            // Filter hidden files if -a is not specified
            const visibleItems = options.all ? items : items.filter(item => !item.name.startsWith('.'));

            // Sort items
            const sortedItems = this.sortItems(visibleItems, options);

            // Format output
            if (options.long) {
                return this.formatLongListing(sortedItems);
            } else {
                return this.formatSimpleListing(sortedItems);
            }
        } catch (error) {
            return this.formatError(error as Error);
        }
    }

    private parseArgs(args: string[]): { options: LsOptions; path: string } {
        const options: LsOptions = {
            long: false,
            all: false,
            recursive: false,
            reverse: false,
            sortBy: 'name'
        };

        let path = '.';
        let i = 0;

        while (i < args.length && args[i].startsWith('-')) {
            const arg = args[i];
            if (arg === '--') {
                i++;
                break;
            }

            for (const flag of arg.slice(1)) {
                switch (flag) {
                    case 'l':
                        options.long = true;
                        break;
                    case 'a':
                        options.all = true;
                        break;
                    case 'R':
                        options.recursive = true;
                        break;
                    case 'r':
                        options.reverse = true;
                        break;
                    case 'S':
                        options.sortBy = 'size';
                        break;
                    case 't':
                        options.sortBy = 'date';
                        break;
                }
            }
            i++;
        }

        if (i < args.length) {
            path = args[i];
        }

        return { options, path };
    }

    private isFile(node: FileSystemNode): node is File {
        return node.type === 'file';
    }

    private isDirectory(node: FileSystemNode): node is Directory {
        return node.type === 'directory';
    }

    private sortItems(items: FileSystemNode[], options: LsOptions): FileSystemNode[] {
        return items.sort((a, b) => {
            let comparison = 0;

            // First sort by type (directories first)
            if (a.type !== b.type) {
                comparison = a.type === 'directory' ? -1 : 1;
            } else {
                // Then sort by the specified criteria
                switch (options.sortBy) {
                    case 'size':
                        const sizeA = this.isFile(a) ? a.size : 0;
                        const sizeB = this.isFile(b) ? b.size : 0;
                        comparison = sizeA - sizeB;
                        break;
                    case 'date':
                        comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
                        break;
                    default: // 'name'
                        comparison = a.name.localeCompare(b.name);
                }
            }

            return options.reverse ? -comparison : comparison;
        });
    }

    private formatSimpleListing(items: FileSystemNode[]): string {
        const maxWidth = 80;
        const itemsPerLine = Math.floor(maxWidth / 20);
        const lines: string[] = [];
        let currentLine: string[] = [];

        // ANSI color codes
        const colors = {
            reset: '\x1b[0m',
            directory: '\x1b[1;34m',  // Bold blue
            executable: '\x1b[1;32m', // Bold green
            symlink: '\x1b[1;36m',    // Bold cyan
            normal: '\x1b[0m'         // Normal
        };

        items.forEach(item => {
            let color = colors.normal;
            let name = item.name;

            if (this.isDirectory(item)) {
                color = colors.directory;
                name = `${name}/`;
            } else if (this.isFile(item)) {
                // Check if file is executable (you might want to add this property to your File type)
                if ((item as any).executable) {
                    color = colors.executable;
                }
            }

            currentLine.push(`${color}${name}${colors.reset}`);

            if (currentLine.length === itemsPerLine) {
                lines.push(currentLine.join('  '));
                currentLine = [];
            }
        });

        if (currentLine.length > 0) {
            lines.push(currentLine.join('  '));
        }

        return lines.join('\n');
    }

    private formatLongListing(items: FileSystemNode[]): string {
        const colors = {
            reset: '\x1b[0m',
            directory: '\x1b[1;34m',  // Bold blue
            executable: '\x1b[1;32m', // Bold green
            symlink: '\x1b[1;36m',    // Bold cyan
            normal: '\x1b[0m'         // Normal
        };

        const lines = items.map(item => {
            const type = this.isDirectory(item) ? 'd' : '-';
            const size = this.isFile(item) ? item.size.toString().padStart(8) : '        ';
            const date = item.modifiedAt.toLocaleString();
            
            let color = colors.normal;
            let name = item.name;

            if (this.isDirectory(item)) {
                color = colors.directory;
                name = `${name}/`;
            } else if (this.isFile(item)) {
                if ((item as any).executable) {
                    color = colors.executable;
                }
            }

            return `${type} ${size} ${date} ${color}${name}${colors.reset}`;
        });

        return lines.join('\n');
    }
} 