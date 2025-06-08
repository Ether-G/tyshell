import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class ClearCommand extends BaseCommand {
    constructor() {
        super(
            'clear',
            'Clear the terminal screen',
            'clear'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        this.validateArgs(args, 0);
        // Return a special marker that the client will interpret as a clear command
        return '\x1B[2J\x1B[H';
    }
} 