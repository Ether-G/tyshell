import { BaseCommand } from './BaseCommand';
import { FileSystem } from '../filesystem/FileSystem';
import { LsCommand } from './basic/LsCommand';
import { CdCommand } from './basic/CdCommand';
import { PwdCommand } from './basic/PwdCommand';
import { MkdirCommand } from './basic/MkdirCommand';
import { TouchCommand } from './basic/TouchCommand';
import { ClearCommand } from './basic/ClearCommand';
import { HelpCommand } from './basic/HelpCommand';
import { EchoCommand } from './basic/EchoCommand';
import { RmCommand } from './basic/RmCommand';
import { CatCommand } from './basic/CatCommand';

export class CommandRegistry {
    private commands: Map<string, BaseCommand>;

    constructor(private fileSystem: FileSystem) {
        this.commands = new Map();
        this.registerDefaultCommands();
    }

    private registerDefaultCommands(): void {
        this.registerCommand(new LsCommand());
        this.registerCommand(new CdCommand());
        this.registerCommand(new PwdCommand());
        this.registerCommand(new MkdirCommand());
        this.registerCommand(new TouchCommand());
        this.registerCommand(new ClearCommand());
        this.registerCommand(new HelpCommand(this));
        this.registerCommand(new EchoCommand());
        this.registerCommand(new RmCommand());
        this.registerCommand(new CatCommand());
    }

    public registerCommand(command: BaseCommand): void {
        this.commands.set(command.name, command);
    }

    public getCommand(name: string): BaseCommand | undefined {
        return this.commands.get(name);
    }

    public getAllCommands(): BaseCommand[] {
        return Array.from(this.commands.values());
    }

    getCommandNames(): string[] {
        return Array.from(this.commands.keys());
    }

    public async executeCommand(name: string, args: string[]): Promise<string> {
        const command = this.getCommand(name);
        if (!command) {
            throw new Error(`Command not found: ${name}`);
        }
        return command.execute(args, this.fileSystem);
    }
} 