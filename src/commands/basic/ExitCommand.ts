import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class ExitCommand extends BaseCommand {
    constructor() {
        super(
            'exit',
            'Exit the current terminal window',
            'exit'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        this.validateArgs(args, 0);
        // Close the current terminal window
        window.close();
        return 'Terminal closed';
    }
} 