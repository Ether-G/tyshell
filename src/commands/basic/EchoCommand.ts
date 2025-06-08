import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class EchoCommand extends BaseCommand {
    constructor() {
        super('echo', 'Write text to a file or display text', 'echo [text] [> filename]');
    }

    public async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return '';
        }

        // Check if we're writing to a file
        const redirectIndex = args.indexOf('>');
        if (redirectIndex !== -1) {
            const text = args.slice(0, redirectIndex).join(' ');
            const filename = args[redirectIndex + 1];

            if (!filename) {
                return 'Error: No filename specified after >';
            }

            try {
                fileSystem.createFile(filename, text);
                return '';
            } catch (error: unknown) {
                if (error instanceof Error) {
                    return `Error: ${error.message}`;
                }
                return 'Error: An unknown error occurred';
            }
        }

        // Just echo the text
        return args.join(' ');
    }
} 