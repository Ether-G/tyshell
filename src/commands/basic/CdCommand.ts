import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class CdCommand extends BaseCommand {
    constructor() {
        super(
            'cd',
            'Change directory',
            'cd <path>'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        try {
            this.validateArgs(args, 1);
            const path = args[0];
            
            if (path === '~') {
                fileSystem.changeDirectory('/');
                return '';
            }
            
            fileSystem.changeDirectory(path);
            return '';
        } catch (error) {
            return this.formatError(error as Error);
        }
    }
} 