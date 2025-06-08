import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';

export class EchoCommand extends BaseCommand {
    constructor() {
        super('echo', 'Write text to a file or display text', 'echo [-e] [text] [>|>>] [file]');
    }

    public async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return '\n';
        }

        // Check for -e option
        let interpretEscapes = false;
        if (args[0] === '-e') {
            interpretEscapes = true;
            args = args.slice(1);
        }

        // Find the redirection operator and file path
        const redirectIndex = args.findIndex(arg => arg === '>' || arg === '>>');
        const isAppend = redirectIndex !== -1 && args[redirectIndex] === '>>';
        const hasRedirect = redirectIndex !== -1;

        // Get the text to echo (everything before the redirection)
        let text = hasRedirect ? args.slice(0, redirectIndex).join(' ') : args.join(' ');
        
        // Interpret escape sequences if -e is specified
        if (interpretEscapes) {
            text = text.replace(/\\n/g, '\n')
                      .replace(/\\t/g, '\t')
                      .replace(/\\r/g, '\r')
                      .replace(/\\b/g, '\b')
                      .replace(/\\f/g, '\f')
                      .replace(/\\v/g, '\v')
                      .replace(/\\0/g, '\0')
                      .replace(/\\\\/g, '\\');
        }

        if (hasRedirect) {
            if (redirectIndex === args.length - 1) {
                return 'Error: No file specified for redirection';
            }

            const filePath = args[redirectIndex + 1];
            try {
                if (isAppend) {
                    // Get existing content and append
                    const node = fileSystem.getNode(filePath);
                    if (node && fileSystem.isFile(node)) {
                        const newContent = node.content + text;
                        fileSystem.createFile(filePath, newContent, true);
                    } else {
                        fileSystem.createFile(filePath, text);
                    }
                } else {
                    // Overwrite existing file
                    fileSystem.createFile(filePath, text, true);
                }
                return '';
            } catch (error) {
                if (error instanceof Error) {
                    return `Error: ${error.message}`;
                }
                return 'Error: Failed to write to file';
            }
        }

        return text;
    }
} 