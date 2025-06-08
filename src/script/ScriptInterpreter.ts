import { Token, TokenType, ScriptParser } from './ScriptParser';
import { CommandExecutor } from '../commands/CommandExecutor';
import { FileSystem } from '../filesystem/FileSystem';

interface Environment {
    variables: Map<string, string>;
    functions: Map<string, FunctionDefinition>;
}

interface FunctionDefinition {
    name: string;
    body: Token[];
    parameters: string[];
}

export class ScriptInterpreter {
    private parser: ScriptParser;
    private environment: Environment;
    private currentToken: number = 0;
    private tokens: Token[] = [];

    constructor(
        private commandExecutor: CommandExecutor,
        private fileSystem: FileSystem
    ) {
        this.parser = new ScriptParser();
        this.environment = {
            variables: new Map(),
            functions: new Map()
        };
    }

    async interpret(script: string): Promise<string> {
        this.tokens = this.parser.parse(script);
        this.currentToken = 0;
        return this.executeStatements();
    }

    private async executeStatements(): Promise<string> {
        let output = '';
        while (this.currentToken < this.tokens.length) {
            const token = this.tokens[this.currentToken];
            
            if (token.type === 'EOF') {
                break;
            }

            if (token.type === 'NEWLINE' || token.type === 'SEMICOLON') {
                this.currentToken++;
                continue;
            }

            if (token.type === 'KEYWORD') {
                switch (token.value) {
                    case 'if':
                        output += await this.executeIfStatement();
                        break;
                    case 'for':
                        output += await this.executeForLoop();
                        break;
                    case 'while':
                        output += await this.executeWhileLoop();
                        break;
                    case 'function':
                        this.parseFunctionDefinition();
                        break;
                    case 'export':
                        output += await this.executeExport();
                        break;
                    case 'unset':
                        output += await this.executeUnset();
                        break;
                    default:
                        output += await this.executeCommand();
                }
            } else {
                output += await this.executeCommand();
            }
        }
        return output;
    }

    private async executeCommand(): Promise<string> {
        const commandTokens: Token[] = [];
        let hasRedirect = false;

        while (this.currentToken < this.tokens.length) {
            const token = this.tokens[this.currentToken];
            
            if (token.type === 'NEWLINE' || token.type === 'SEMICOLON') {
                this.currentToken++;
                break;
            }

            if (token.type === 'OPERATOR' && (token.value === '>' || token.value === '>>' || token.value === '<')) {
                hasRedirect = true;
                commandTokens.push(token);
                this.currentToken++;
                continue;
            }

            if (token.type === 'VARIABLE') {
                const value = this.environment.variables.get(token.value) || '';
                commandTokens.push({ ...token, type: 'WORD', value });
            } else {
                commandTokens.push(token);
            }

            this.currentToken++;
        }

        if (commandTokens.length === 0) {
            return '';
        }

        const command = this.buildCommand(commandTokens);
        const result = await this.commandExecutor.execute(command);
        return result.output || '';
    }

    private buildCommand(tokens: Token[]): string {
        return tokens.map(token => token.value).join(' ');
    }

    private async executeIfStatement(): Promise<string> {
        this.currentToken++; // Skip 'if'
        const condition = await this.evaluateCondition();
        
        if (!this.expect('KEYWORD', 'then')) {
            throw new Error('Expected "then" after if condition');
        }

        let output = '';
        if (condition) {
            output = await this.executeStatements();
        } else {
            // Skip the then block
            while (this.currentToken < this.tokens.length) {
                const token = this.tokens[this.currentToken];
                if (token.type === 'KEYWORD' && (token.value === 'else' || token.value === 'fi')) {
                    break;
                }
                this.currentToken++;
            }
        }

        if (this.currentToken < this.tokens.length && 
            this.tokens[this.currentToken].type === 'KEYWORD' && 
            this.tokens[this.currentToken].value === 'else') {
            this.currentToken++;
            if (!condition) {
                output = await this.executeStatements();
            } else {
                // Skip the else block
                while (this.currentToken < this.tokens.length) {
                    const token = this.tokens[this.currentToken];
                    if (token.type === 'KEYWORD' && token.value === 'fi') {
                        break;
                    }
                    this.currentToken++;
                }
            }
        }

        if (!this.expect('KEYWORD', 'fi')) {
            throw new Error('Expected "fi" to close if statement');
        }

        return output;
    }

    private async executeForLoop(): Promise<string> {
        this.currentToken++; // Skip 'for'
        const variable = this.expect('WORD');
        if (!this.expect('KEYWORD', 'in')) {
            throw new Error('Expected "in" after for variable');
        }

        const items: string[] = [];
        while (this.currentToken < this.tokens.length) {
            const token = this.tokens[this.currentToken];
            if (token.type === 'KEYWORD' && token.value === 'do') {
                break;
            }
            if (token.type === 'WORD') {
                items.push(token.value);
            }
            this.currentToken++;
        }

        if (!this.expect('KEYWORD', 'do')) {
            throw new Error('Expected "do" in for loop');
        }

        let output = '';
        for (const item of items) {
            this.environment.variables.set(variable.value, item);
            output += await this.executeStatements();
        }

        if (!this.expect('KEYWORD', 'done')) {
            throw new Error('Expected "done" to close for loop');
        }

        return output;
    }

    private async executeWhileLoop(): Promise<string> {
        this.currentToken++; // Skip 'while'
        let output = '';

        while (true) {
            const condition = await this.evaluateCondition();
            if (!condition) {
                break;
            }

            if (!this.expect('KEYWORD', 'do')) {
                throw new Error('Expected "do" in while loop');
            }

            output += await this.executeStatements();

            if (!this.expect('KEYWORD', 'done')) {
                throw new Error('Expected "done" to close while loop');
            }
        }

        return output;
    }

    private async evaluateCondition(): Promise<boolean> {
        const left = this.expect('WORD');
        const operator = this.expect('OPERATOR');
        const right = this.expect('WORD');

        const leftValue = this.environment.variables.get(left.value) || left.value;
        const rightValue = this.environment.variables.get(right.value) || right.value;

        switch (operator.value) {
            case '==':
                return leftValue === rightValue;
            case '!=':
                return leftValue !== rightValue;
            case '<':
                return leftValue < rightValue;
            case '>':
                return leftValue > rightValue;
            case '<=':
                return leftValue <= rightValue;
            case '>=':
                return leftValue >= rightValue;
            default:
                throw new Error(`Invalid comparison operator: ${operator.value}`);
        }
    }

    private parseFunctionDefinition(): void {
        this.currentToken++; // Skip 'function'
        const name = this.expect('WORD');
        const parameters: string[] = [];

        if (this.tokens[this.currentToken].type === 'BRACE' && this.tokens[this.currentToken].value === '(') {
            this.currentToken++; // Skip '('
            while (this.currentToken < this.tokens.length) {
                const token = this.tokens[this.currentToken];
                if (token.type === 'BRACE' && token.value === ')') {
                    this.currentToken++;
                    break;
                }
                if (token.type === 'WORD') {
                    parameters.push(token.value);
                }
                this.currentToken++;
            }
        }

        const body: Token[] = [];
        while (this.currentToken < this.tokens.length) {
            const token = this.tokens[this.currentToken];
            if (token.type === 'KEYWORD' && token.value === 'end') {
                this.currentToken++;
                break;
            }
            body.push(token);
            this.currentToken++;
        }

        this.environment.functions.set(name.value, {
            name: name.value,
            body,
            parameters
        });
    }

    private async executeExport(): Promise<string> {
        this.currentToken++; // Skip 'export'
        const variable = this.expect('WORD');
        const value = this.environment.variables.get(variable.value) || '';
        this.environment.variables.set(variable.value, value);
        return '';
    }

    private async executeUnset(): Promise<string> {
        this.currentToken++; // Skip 'unset'
        const variable = this.expect('WORD');
        this.environment.variables.delete(variable.value);
        return '';
    }

    private expect(type: TokenType, value?: string): Token {
        if (this.currentToken >= this.tokens.length) {
            throw new Error(`Unexpected end of input, expected ${type}${value ? ` "${value}"` : ''}`);
        }

        const token = this.tokens[this.currentToken];
        if (token.type !== type || (value !== undefined && token.value !== value)) {
            throw new Error(`Unexpected token ${token.type} "${token.value}", expected ${type}${value ? ` "${value}"` : ''}`);
        }

        this.currentToken++;
        return token;
    }
} 