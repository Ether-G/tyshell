import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class CatCommand extends BaseCommand {
    constructor() {
        super('cat', 'Display file contents', 'cat <file>');
    }

    public async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return 'Error: No file specified';
        }

        const path = args[0];
        try {
            const node = fileSystem.getNode(path);
            if (!node) {
                return `Error: No such file: ${path}`;
            }

            if (fileSystem.isDirectory(node)) {
                return `Error: ${path} is a directory`;
            }

            if (fileSystem.isFile(node)) {
                return node.content;
            }

            return `Error: ${path} is not a file`;
        } catch (error: unknown) {
            if (error instanceof Error) {
                return `Error: ${error.message}`;
            }
            return 'Error: An unknown error occurred';
        }
    }
} 