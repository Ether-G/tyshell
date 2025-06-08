import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class RmCommand extends BaseCommand {
    constructor() {
        super('rm', 'Remove files or directories', 'rm [-r] <path>');
    }

    public async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return 'Error: No path specified';
        }

        const recursive = args[0] === '-r';
        const path = recursive ? args[1] : args[0];

        if (!path) {
            return 'Error: No path specified';
        }

        try {
            const node = fileSystem.getNode(path);
            if (!node) {
                return `Error: No such file or directory: ${path}`;
            }

            if (fileSystem.isDirectory(node)) {
                if (!recursive) {
                    return `Error: ${path} is a directory. Use -r to remove directories`;
                }
                fileSystem.removeDirectory(path);
            } else {
                fileSystem.removeFile(path);
            }
            return '';
        } catch (error: unknown) {
            if (error instanceof Error) {
                return `Error: ${error.message}`;
            }
            return 'Error: An unknown error occurred';
        }
    }
} 