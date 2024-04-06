import rules from './rules';

export type TokenType = 'rule' | 'string';
export type Heading = {depth: number, folding: boolean};

export class Token {
    value: string;
    type: TokenType;
    heading: Heading | null = null;
    style: string | null = null;
    size: number | null = null;
    color: string | null = null;

    constructor(value: string, type: TokenType, {heading, style, size, color}: {heading?: Heading, style?: string, size?: number, color?: string}){
        this.value = value;
        this.type = type;
        this.toString = () => this.value;
        if(heading){
            this.heading = heading;
        } else if(style){
            this.style = style;
        } else if(size){
            this.size = size;
        } else if(color){
            this.color = color;
        }
    }
}

export class Tokenizer {
    private cursor: number = 0;
    private token: string = '';
    private tokens: Token[] = [];
    private newLine: boolean = true;
    private heading: Heading | null = null;

    constructor(){}

    private previousTokenPush(): void {
        if(this.token !== ''){
            this.tokens.push(new Token(this.token, 'string', {}));
            this.token = '';
        }
    }

    private isHeadingStart(str: string): Heading | null {
        const start = str.startsWith('======# ') ? {depth: 6, folding: true} :
                      str.startsWith('====== ') ? {depth: 6, folding: false} :
                      str.startsWith('=====# ') ? {depth: 5, folding: true} :
                      str.startsWith('===== ') ? {depth: 5, folding: false} :
                      str.startsWith('====# ') ? {depth: 4, folding: true} :
                      str.startsWith('==== ') ? {depth: 4, folding: false} :
                      str.startsWith('===# ') ? {depth: 3, folding: true} :
                      str.startsWith('=== ') ? {depth: 3, folding: false} :
                      str.startsWith('==# ') ? {depth: 2, folding: true} :
                      str.startsWith('== ') ? {depth: 2, folding: false} :
                      str.startsWith('=# ') ? {depth: 1, folding: true} :
                      str.startsWith('= ') ? {depth: 1, folding: false} :
                      null;

        return start;
    }

    private isHeadingEnd(str: string): Heading | null {
        const end = str === ' #======' ? {depth: 6, folding: true} :
                    str === ' ======' ? {depth: 6, folding: false} :
                    str === ' #=====' ? {depth: 5, folding: true} :
                    str === ' =====' ? {depth: 5, folding: false} :
                    str === ' #====' ? {depth: 4, folding: true} :
                    str === ' ====' ? {depth: 4, folding: false} :
                    str === ' #===' ? {depth: 3, folding: true} :
                    str === ' ===' ? {depth: 3, folding: false} :
                    str === ' #==' ? {depth: 2, folding: true} :
                    str === ' ==' ? {depth: 2, folding: false} :
                    str === ' #=' ? {depth: 1, folding: true} :
                    str === ' =' ? {depth: 1, folding: false} :
                    null;
        
        return end;
    }

    private isHorizontalLine(str: string): number | null {
        const match = str.match(/^-{4,9}$/);

        return match ? match[0].length : null;
    }

    public run(input: string): Token[] {
        this.cursor = 0;
        this.token = '';
        this.tokens = [];
        this.newLine = true;
        this.heading = null;

        root: for(; input.length > this.cursor; this.cursor++){
            if(input[this.cursor] === '\n'){
                while(input[this.cursor] === '\n'){
                    this.previousTokenPush();
                    this.tokens.push(new Token('\n', 'rule', {}));
    
                    this.newLine = true;
    
                    this.cursor++;
                }
            } else if(this.cursor > 0) this.newLine = false;

            if(input.length <= this.cursor) break;
            
            const char: string = input[this.cursor];

            if(char === '\\'){
                this.token += input[this.cursor];
                continue;
            }

            let heading: Heading | null;
            let horizontalLine: number | null;
            let str: string;
            const line = input.slice(this.cursor).split('\n')[0];

            if(this.newLine && input.substring(this.cursor, this.cursor + 2) === '##'){
                this.cursor += 2;

                while(input[this.cursor] && input[this.cursor] !== '\n') this.cursor++;
                continue;
            } else if(this.newLine && (heading = this.isHeadingStart(line))){
                const len = heading.depth + (heading.folding ? 2 : 1);
                this.cursor += len-1;
                this.heading = heading;

                this.previousTokenPush();
                this.tokens.push(new Token(line.slice(0, len), 'rule', {heading: heading}));
                continue;
            } else if(this.newLine && (horizontalLine = this.isHorizontalLine(line))){
                this.cursor += horizontalLine-1;

                this.previousTokenPush();
                this.tokens.push(new Token('-'.repeat(horizontalLine), 'rule', {}));
                continue;
            }

            if(this.heading && (heading = this.isHeadingEnd(line)) && heading.depth === this.heading.depth && heading.folding === this.heading.folding){
                this.cursor += line.length-1;
                this.heading = null;
                
                this.previousTokenPush();
                this.tokens.push(new Token(line, 'rule', {heading}));
                continue;
            }
            
            for(let rule of rules){
                if(rule.length > 0 && input.slice(this.cursor, this.cursor + rule.length) === rule){
                    this.previousTokenPush();
                    this.tokens.push(new Token(rule, 'rule', {}));
                    this.cursor += rule.length-1;
                    
                    continue root;
                }
            }

            if(line.startsWith('{{{#!wiki')){
                let style: string = "";

                if(line.startsWith('{{{#!wiki style="')){
                    style = line.slice(17).split('"')[0];
                    str = line.slice(0, 17 + style.length);
                    this.cursor += 17 + style.length;
                } else {
                    this.cursor += 9;
                    str = '{{{#!wiki';
                }

                this.previousTokenPush();
                this.tokens.push(new Token(str, 'rule', {style}));
                    
                continue;
            }

            let size: string;
            let plus: boolean;
            if(((plus = (str = input.slice(this.cursor, this.cursor + 6)).startsWith('{{{+')) || str.startsWith('{{{-')) && str.endsWith(' ') && !isNaN(+(size = str.slice(4, 5)))){
                this.previousTokenPush();
                this.tokens.push(new Token(str, 'rule', {size: parseInt((!plus ? '-' : '+')+size, 10)}));
                this.cursor += 5;
                    
                continue;
            }

            let color: string;
            if((str = input.slice(this.cursor, this.cursor + 21).split(' ')[0]).startsWith('{{{#') && (color = str.slice(4))){
                this.previousTokenPush();
                this.tokens.push(new Token(str, 'rule', {color: (color.match(/^(?:[0-9a-f]{3}){1,2}$/i) ? '#'+color : color)}));
                this.cursor += str.length;
                    
                continue;
            }

            if(input.slice(this.cursor, this.cursor + 3) === '{{{'){
                this.previousTokenPush();
                this.tokens.push(new Token('{{{', 'rule', {}));

                this.cursor += 2;

                continue;
            }

            this.token += char;
        }

        this.previousTokenPush();

        return this.tokens;
    }
}