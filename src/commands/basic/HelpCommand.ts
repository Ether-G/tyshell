import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';
import { CommandRegistry } from '../CommandRegistry';

export class HelpCommand extends BaseCommand {
    private registry: CommandRegistry;

    constructor(registry: CommandRegistry) {
        super(
            'help',
            'Show help information for commands',
            'help [command]'
        );
        this.registry = registry;
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            // Show all commands
            const commands = this.registry.getAllCommands();
            const output = ['Available commands:', ''];
            
            // Group commands by category
            const categories = new Map<string, string[]>();
            commands.forEach(cmd => {
                const category = this.getCommandCategory(cmd.name);
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                categories.get(category)!.push(cmd.name);
            });

            // Format output by category
            categories.forEach((cmds, category) => {
                output.push(`${category}:`);
                cmds.sort().forEach(cmdName => {
                    const cmd = this.registry.getCommand(cmdName)!;
                    output.push(`  ${cmdName.padEnd(12)} ${cmd.description}`);
                });
                output.push('');
            });

            output.push('Type "help <command>" for more information about a specific command.');
            return output.join('\n');
        } else {
            // Show help for specific command
            const commandName = args[0];
            const command = this.registry.getCommand(commandName);
            
            if (!command) {
                return `Command not found: ${commandName}`;
            }

            return [
                `Command: ${command.name}`,
                `Description: ${command.description}`,
                `Usage: ${command.usage}`,
                '',
                'Examples:',
                ...this.getCommandExamples(command.name)
            ].join('\n');
        }
    }

    private getCommandCategory(commandName: string): string {
        const categories: { [key: string]: string[] } = {
            'File Operations': ['ls', 'cat', 'touch', 'rm', 'cp', 'mv', 'mkdir', 'rmdir'],
            'File Content': ['grep', 'head', 'tail', 'less', 'more'],
            'Navigation': ['cd', 'pwd'],
            'System': ['clear', 'history', 'exit'],
            'Help': ['help', 'man']
        };

        for (const [category, commands] of Object.entries(categories)) {
            if (commands.includes(commandName)) {
                return category;
            }
        }

        return 'Other';
    }

    private getCommandExamples(commandName: string): string[] {
        const examples: { [key: string]: string[] } = {
            'ls': [
                '  ls              # List files in current directory',
                '  ls -l           # List files with details',
                '  ls /home        # List files in /home directory'
            ],
            'cd': [
                '  cd /home        # Change to /home directory',
                '  cd ..           # Move up one directory',
                '  cd ~           # Change to home directory'
            ],
            'cat': [
                '  cat file.txt    # Display file contents',
                '  cat file1 file2 # Display multiple files'
            ],
            'grep': [
                '  grep "pattern" file.txt    # Search for pattern in file',
                '  grep -i "pattern" file.txt # Case-insensitive search'
            ],
            'mkdir': [
                '  mkdir dirname   # Create a new directory',
                '  mkdir -p a/b/c  # Create nested directories'
            ],
            'rm': [
                '  rm file.txt     # Remove a file',
                '  rm -r dir       # Remove directory recursively'
            ]
        };

        return examples[commandName] || ['  No examples available'];
    }
} 