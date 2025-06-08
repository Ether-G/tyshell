import { FileSystem } from '../../filesystem/FileSystem';

export abstract class BaseCommand {
    constructor(
        public readonly name: string,
        public readonly description: string,
        public readonly usage: string
    ) {}

    abstract execute(args: string[], fileSystem: FileSystem): Promise<string>;
} 