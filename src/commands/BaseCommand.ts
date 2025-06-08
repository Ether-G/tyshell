import { Command } from './types';
import { FileSystem } from '../filesystem/FileSystem';

export abstract class BaseCommand implements Command {
    constructor(
        public readonly name: string,
        public readonly description: string,
        public readonly usage: string
    ) {}

    abstract execute(args: string[], fileSystem: FileSystem): Promise<string>;

    protected validateArgs(args: string[], expectedCount: number): void {
        if (args.length !== expectedCount) {
            throw new Error(`Invalid number of arguments. Usage: ${this.usage}`);
        }
    }

    protected formatError(error: Error): string {
        return `Error: ${error.message}`;
    }

    protected formatOutput(output: string): string {
        return output;
    }
} 