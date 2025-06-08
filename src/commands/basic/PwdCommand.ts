import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class PwdCommand extends BaseCommand {
    constructor() {
        super(
            'pwd',
            'Print working directory',
            'pwd'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        try {
            this.validateArgs(args, 0);
            return fileSystem.getCurrentPath();
        } catch (error) {
            return this.formatError(error as Error);
        }
    }
} 