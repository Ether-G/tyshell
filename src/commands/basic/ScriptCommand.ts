import { BaseCommand } from '../BaseCommand';
import { ScriptInterpreter } from '../../script/ScriptInterpreter';
import { CommandExecutor } from '../CommandExecutor';
import { FileSystem } from '../../filesystem/FileSystem';
import { CommandRegistry } from '../CommandRegistry';

export class ScriptCommand extends BaseCommand {
    constructor(
        private fileSystem: FileSystem,
        private registry: CommandRegistry
    ) {
        super(
            'script',
            'Execute a bash-like script',
            'script <file> or script -c "script content"'
        );
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return this.usage;
        }

        const interpreter = new ScriptInterpreter(this.registry.getCommandExecutor(), this.fileSystem);
        let scriptContent: string;

        if (args[0] === '-c') {
            if (args.length < 2) {
                return 'Error: No script content provided';
            }
            scriptContent = args.slice(1).join(' ');
        } else {
            const filePath = args[0];
            try {
                const node = fileSystem.getNode(filePath);
                if (!node || !fileSystem.isFile(node)) {
                    return `Error: File not found: ${filePath}`;
                }
                scriptContent = node.content;
            } catch (error) {
                return `Error reading file: ${(error as Error).message}`;
            }
        }

        try {
            return await interpreter.interpret(scriptContent);
        } catch (error) {
            return `Error executing script: ${(error as Error).message}`;
        }
    }
} 