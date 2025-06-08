import { BaseCommand } from '../BaseCommand';
import { FileSystem } from '../../filesystem/FileSystem';
import { Directory } from '../../filesystem/types';

export class MkdirCommand extends BaseCommand {
    constructor() {
        super('mkdir', 'Create directories', 'mkdir [-p] [-v] directory...');
    }

    async execute(args: string[], fileSystem: FileSystem): Promise<string> {
        if (args.length === 0) {
            return 'Usage: mkdir [-p] [-v] directory...';
        }

        const options = {
            parents: false,
            verbose: false
        };

        // Parse options
        while (args.length > 0 && args[0].startsWith('-')) {
            const opt = args.shift()!;
            if (opt === '-p') {
                options.parents = true;
            } else if (opt === '-v') {
                options.verbose = true;
            } else {
                return `mkdir: invalid option -- ${opt.slice(1)}\nUsage: mkdir [-p] [-v] directory...`;
            }
        }

        if (args.length === 0) {
            return 'mkdir: missing operand\nUsage: mkdir [-p] [-v] directory...';
        }

        const results: string[] = [];
        const errors: string[] = [];

        for (const path of args) {
            try {
                const absolutePath = fileSystem.resolvePath(path);
                const parentPath = fileSystem.dirname(absolutePath);
                const dirName = fileSystem.basename(absolutePath);

                // Check if parent directory exists
                const parent = fileSystem.getNode(parentPath);
                if (!parent) {
                    if (options.parents) {
                        // Create parent directories recursively
                        const parts = parentPath.split('/').filter(Boolean);
                        let currentPath = '';
                        for (const part of parts) {
                            currentPath += '/' + part;
                            if (!fileSystem.getNode(currentPath)) {
                                fileSystem.createDirectory(currentPath);
                                if (options.verbose) {
                                    results.push(`mkdir: created directory '${currentPath}'`);
                                }
                            }
                        }
                    } else {
                        errors.push(`mkdir: cannot create directory '${path}': No such file or directory`);
                        continue;
                    }
                }

                // Create the directory
                fileSystem.createDirectory(absolutePath);
                if (options.verbose) {
                    results.push(`mkdir: created directory '${path}'`);
                }
            } catch (error: unknown) {
                if (error instanceof Error) {
                    errors.push(`mkdir: cannot create directory '${path}': ${error.message}`);
                } else {
                    errors.push(`mkdir: cannot create directory '${path}': Unknown error`);
                }
            }
        }

        return [...results, ...errors].join('\n');
    }
} 