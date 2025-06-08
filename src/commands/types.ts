import { FileSystem } from '../filesystem/types';

export interface Command {
    readonly name: string;
    readonly description: string;
    readonly usage: string;
    execute(args: string[], fileSystem: FileSystem): Promise<string>;
}

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

export interface CommandParser {
    parse(input: string): {
        command: string;
        args: string[];
    };
}

export interface CommandExecutor {
    execute(input: string): Promise<CommandResult>;
} 