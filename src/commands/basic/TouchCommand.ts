import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class TouchCommand extends BaseCommand {
    constructor() {
        super('touch', 'Create empty files or update timestamps', 'touch [-c] file...');
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return 'Usage: touch [-c] file...';
        }

        const options = {
            noCreate: false
        };

        // Parse options
        while (args.length > 0 && args[0].startsWith('-')) {
            const opt = args.shift()!;
            if (opt === '-c') {
                options.noCreate = true;
            } else {
                return `touch: invalid option -- ${opt.slice(1)}\nUsage: touch [-c] file...`;
            }
        }

        if (args.length === 0) {
            return 'touch: missing operand\nUsage: touch [-c] file...';
        }

        const results: string[] = [];
        const errors: string[] = [];

        for (const path of args) {
            try {
                const absolutePath = fileSystem.resolvePath(path);
                const parentPath = fileSystem.dirname(absolutePath);
                const fileName = fileSystem.basename(absolutePath);

                // Check if parent directory exists
                const parent = fileSystem.getNode(parentPath);
                if (!parent) {
                    errors.push(`touch: cannot touch '${path}': No such file or directory`);
                    continue;
                }

                // Check if file exists
                const existingFile = fileSystem.getNode(absolutePath);
                if (existingFile) {
                    if (fileSystem.isFile(existingFile)) {
                        // Update timestamp
                        existingFile.modifiedAt = new Date();
                    } else {
                        errors.push(`touch: cannot touch '${path}': Not a file`);
                    }
                } else if (!options.noCreate) {
                    // Create new file
                    fileSystem.createFile(absolutePath, '');
                }
            } catch (error: unknown) {
                if (error instanceof Error) {
                    errors.push(`touch: cannot touch '${path}': ${error.message}`);
                } else {
                    errors.push(`touch: cannot touch '${path}': Unknown error`);
                }
            }
        }

        return [...results, ...errors].join('\n');
    }
} 