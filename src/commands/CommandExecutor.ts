import { CommandExecutor as ICommandExecutor, CommandResult } from './types';
import { CommandParser } from './CommandParser';
import { CommandRegistry } from './CommandRegistry';
import { FileSystem } from '../filesystem/FileSystem';

export class CommandExecutor implements ICommandExecutor {
    private parser: CommandParser;
    private registry: CommandRegistry;
    private fileSystem: FileSystem;

    constructor(fileSystem: FileSystem) {
        this.parser = new CommandParser();
        this.registry = new CommandRegistry(fileSystem);
        this.fileSystem = fileSystem;
    }

    async execute(input: string): Promise<CommandResult> {
        try {
            const { command, args } = this.parser.parse(input);
            
            if (!command) {
                return {
                    success: true,
                    output: ''
                };
            }

            const cmd = this.registry.getCommand(command);
            if (!cmd) {
                return {
                    success: false,
                    output: '',
                    error: `Command not found: ${command}`
                };
            }

            const output = await cmd.execute(args, this.fileSystem);
            return {
                success: true,
                output
            };
        } catch (error) {
            return {
                success: false,
                output: '',
                error: (error as Error).message
            };
        }
    }

    getAvailableCommands(): string[] {
        return this.registry.getCommandNames();
    }
} 