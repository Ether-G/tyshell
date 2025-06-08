export type TokenType = 
    | 'WORD'           // Regular word
    | 'VARIABLE'       // $variable
    | 'OPERATOR'       // &&, ||, |, >, >>, <
    | 'KEYWORD'        // if, then, else, fi, for, while, do, done
    | 'FUNCTION'       // function keyword
    | 'BRACE'          // {, }, (, )
    | 'SEMICOLON'      // ;
    | 'NEWLINE'        // \n
    | 'COMMENT'        // # comment
    | 'EOF';          // End of file

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

export class ScriptParser {
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;
    private tokens: Token[] = [];
    private input: string = '';

    private readonly keywords = new Set([
        'if', 'then', 'else', 'fi',
        'for', 'while', 'until', 'do', 'done',
        'case', 'esac',
        'function', 'return',
        'break', 'continue',
        'export', 'unset', 'read',
        'let', 'declare'
    ]);

    private readonly operators = new Set([
        '&&', '||', '|', '>', '>>', '<', '2>', '2>>',
        '=', '+=', '-=', '*=', '/=', '%=',
        '==', '!=', '<', '>', '<=', '>=',
        '+', '-', '*', '/', '%'
    ]);

    parse(input: string): Token[] {
        this.input = input;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];

        while (this.position < this.input.length) {
            const char = this.input[this.position];

            if (this.isWhitespace(char)) {
                this.advance();
                continue;
            }

            if (char === '#') {
                this.parseComment();
                continue;
            }

            if (char === '$') {
                this.parseVariable();
                continue;
            }

            if (this.isOperatorStart(char)) {
                this.parseOperator();
                continue;
            }

            if (this.isBrace(char)) {
                this.parseBrace();
                continue;
            }

            if (char === ';') {
                this.addToken('SEMICOLON', ';');
                this.advance();
                continue;
            }

            if (char === '\n') {
                this.addToken('NEWLINE', '\n');
                this.line++;
                this.column = 1;
                this.advance();
                continue;
            }

            this.parseWord();
        }

        this.addToken('EOF', '');
        return this.tokens;
    }

    private isWhitespace(char: string): boolean {
        return /\s/.test(char) && char !== '\n';
    }

    private isOperatorStart(char: string): boolean {
        return /[&|><=+\-*/%]/.test(char);
    }

    private isBrace(char: string): boolean {
        return /[{}()]/.test(char);
    }

    private advance(): void {
        this.position++;
        this.column++;
    }

    private addToken(type: TokenType, value: string): void {
        this.tokens.push({
            type,
            value,
            line: this.line,
            column: this.column
        });
    }

    private parseComment(): void {
        let comment = '';
        while (this.position < this.input.length && this.input[this.position] !== '\n') {
            comment += this.input[this.position];
            this.advance();
        }
        this.addToken('COMMENT', comment);
    }

    private parseVariable(): void {
        this.advance(); // Skip $
        let variable = '';
        
        // Handle ${variable} syntax
        if (this.input[this.position] === '{') {
            this.advance(); // Skip {
            while (this.position < this.input.length && this.input[this.position] !== '}') {
                variable += this.input[this.position];
                this.advance();
            }
            this.advance(); // Skip }
        } else {
            // Handle $variable syntax
            while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
                variable += this.input[this.position];
                this.advance();
            }
        }

        this.addToken('VARIABLE', variable);
    }

    private parseOperator(): void {
        let operator = '';
        const start = this.position;

        while (this.position < this.input.length && this.isOperatorStart(this.input[this.position])) {
            operator += this.input[this.position];
            this.advance();
        }

        // Try to match the longest possible operator
        while (operator.length > 0 && !this.operators.has(operator)) {
            operator = operator.slice(0, -1);
            this.position--;
        }

        if (operator.length > 0) {
            this.addToken('OPERATOR', operator);
        } else {
            // If no operator matched, treat as a word
            this.position = start;
            this.parseWord();
        }
    }

    private parseBrace(): void {
        const char = this.input[this.position];
        this.addToken('BRACE', char);
        this.advance();
    }

    private parseWord(): void {
        let word = '';
        const start = this.position;

        while (this.position < this.input.length) {
            const char = this.input[this.position];
            
            if (this.isWhitespace(char) || this.isOperatorStart(char) || 
                this.isBrace(char) || char === ';' || char === '\n' || char === '#') {
                break;
            }

            word += char;
            this.advance();
        }

        if (this.keywords.has(word)) {
            this.addToken('KEYWORD', word);
        } else {
            this.addToken('WORD', word);
        }
    }
} 