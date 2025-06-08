import { CommandParser as ICommandParser } from './types';

export class CommandParser implements ICommandParser {
    parse(input: string): { command: string; args: string[] } {
        // Trim whitespace and split by spaces
        const parts = input.trim().split(/\s+/);
        
        // First part is the command, rest are arguments
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        return { command, args };
    }
} 