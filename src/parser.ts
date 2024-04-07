import {Token} from "./tokenizer";
import {textRules, videos, lists} from "./rules";

export class Node {
    public items: Node[] = [];
    public type: string = 'Node';
    public value: string = '';
    public depth: number = 0;
    public style: string = '';
    public color: string = '';
    public size: number = 0;
    public folding: boolean = false;
    public link: string = '';
    public param: {[str: string]: string} = {};
    public name: string = '';
    public names: Node[] = [];
    public code: string = '';
    public date: string = '';

    constructor(type: string, {items, value, depth, folding, style, color, size, link, param, name, names, code, date}: {items?: Node[], value?: string, depth?: number, folding?: boolean, style?: string, color?: string, size?: number, link?: string, param?: {[str: string]: string}, name?: string, names?: Node[], code?: string, date?: string}){
        this.type = type;
        if(items) this.items = items;
        if(value) this.value = value;
        if(depth) this.depth = depth;
        if(folding) this.folding = folding;
        if(style) this.color = style;
        if(color) this.color = color;
        if(size) this.size = size;
        if(link) this.link = link
        if(param) this.param = param;
        if(name) this.name = name;
        if(names) this.names = names;
        if(code) this.code = code;
        if(date) this.date = date;
    }
}

export class Parser {
    private tokens: Token[] = [];
    private cursor: number = 0;

    constructor(){}

    private getParam(separator: string, end: string){
        const param: {[str: string]: string} = {};

        while(this.tokens[this.cursor]){
            let key = '';
            
            while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === '=' || this.tokens[this.cursor].value === separator || this.tokens[this.cursor].value === end))){
                key += this.tokens[this.cursor].value;

                this.cursor++;
            }

            key = key.trim();
            
            this.cursor++;

            param[key] = '';

            while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === separator || this.tokens[this.cursor].value === end))){
                param[key] += this.tokens[this.cursor].value;

                this.cursor++;
            }

            if(this.tokens[this.cursor]?.type === 'rule' && this.tokens[this.cursor].value === separator) this.cursor++;

            if(this.tokens[this.cursor]?.type === 'rule' && this.tokens[this.cursor].value === end) break;
        }

        return param;
    }

    private tableParam(){
        let param = '';

        this.cursor++;

        while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '>')){
            param += this.tokens[this.cursor];

            this.cursor++;
        }

        this.cursor++;

        return param;
    }

    private table(){
        const node = new Node('Table', {items: [], param: {}, names: []});

        let currentRow: Node = new Node('TableRow', {items: [], param: {}});

        while(this.tokens[this.cursor]){
            const currentCell = new Node('TableCell', {items: [], param: {}});

            param: while(this.tokens[this.cursor] && this.tokens[this.cursor].type === "rule"){
                switch(this.tokens[this.cursor].value){
                    case '<-':
                        currentCell.param['colspan'] = this.tableParam();

                        break;

                    case '<^|':
                    case '<|':
                    case '<v|':
                        currentCell.param['vertical-align'] = this.tokens[this.cursor].value === '<^|' ? 'top' :
                                                              this.tokens[this.cursor].value === '<|' ? 'middle' :
                                                              'bottom';


                        currentCell.param['rowspan'] = this.tableParam();
    
                        break;
                    
                    case '<width=':
                        currentCell.param['width'] = this.tableParam();

                        break;

                    case '<height=':
                        currentCell.param['height'] = this.tableParam();
    
                        break;

                    case '<(>':
                    case '<:>':
                    case '<)>':
                        this.cursor++;

                        currentCell.param['align'] = this.tokens[this.cursor].value === '<(>' ? 'left' :
                                                     this.tokens[this.cursor].value === '<|>' ? 'center' :
                                                     'right';
    
                        break;

                    case '<nopad>':
                        this.cursor++;

                        currentCell.param['nopad'] = 'true';
    
                        break;
                    
                    case '<tablewidth=':
                    case '<table width=':
                        node.param['width'] = this.tableParam();

                        break;
                    
                    case '<bgcolor=':
                        currentCell.param['bgcolor'] = this.tableParam();

                        break;

                    case '<colbgcolor=':
                        currentCell.param['colbgcolor'] = this.tableParam();
    
                        break;

                    case '<rowbgcolor=':
                        currentRow.param['bgcolor'] = this.tableParam();
        
                        break;
                    
                    case '<tablebgcolor=':
                    case '<table bgcolor=':
                        node.param['bgcolor'] = this.tableParam();
            
                        break;

                    case '<color=':
                    case '<color':
                        currentCell.param['color'] = this.tableParam();
                
                        break;

                    case '<colcolor=':
                        currentCell.param['colcolor'] = this.tableParam();
                
                        break;

                    case '<rowcolor=':
                        currentRow.param['color'] = this.tableParam();
                
                        break;
                    
                    case '<tablecolor=':
                    case '<table color=':
                        node.param['color'] = this.tableParam();
                
                        break;

                    case '<tablebordercolor=':
                    case '<table bordercolor=':
                        node.param['bordercolor'] = this.tableParam();
                
                        break;

                    case '<tablealign=left>':
                    case '<table align=left>':
                    case '<tablealign=center>':
                    case '<table align=center>':
                    case '<tablealign=right>':
                    case '<table align=right>':
                        this.cursor++;

                        node.param['align'] = this.tokens[this.cursor].value.endsWith('left>') ? 'left' :
                                              this.tokens[this.cursor].value.endsWith('center>') ? 'center' :
                                              'right';

                        break;

                    default:
                        break param;
                }
            }

            while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '||')){
                currentCell.items.push(this.walk());
            }

            this.cursor++;

            currentRow.items.push(currentCell);

            if(this.tokens[this.cursor]?.value === '\n'){
                node.items.push(currentRow);

                currentRow = new Node('TableRow', {items: []});

                this.cursor++;

                if(this.tokens[this.cursor]?.value !== '||') break;
                this.cursor++;
            }
        }

        return node;
    }

    private walk(){
        const token = this.tokens[this.cursor];
        if(token.type === 'rule'){
            if(token.heading){
                const node = new Node('Heading', {items: [], depth: token.heading.depth, folding: token.heading.folding});

                this.cursor++;

                while(this.tokens[this.cursor] && !this.tokens[this.cursor].heading){
                    node.items.push(this.walk());
                }

                this.cursor++;

                return node;
            } else if(token.value.startsWith('{{{#!wiki')){
                const node = new Node('Block', {style: token.style || '', items: []});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.items.push(this.walk());
                }

                this.cursor++;

                return node;
            } else if(token.value === '{{{#!html'){
                const node = new Node('Html', {value: ''});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.value += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '{{{#!folding'){
                const node = new Node('Folding', {names: [], items: []});

                this.cursor++;

                while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                    node.names.push(this.walk());
                }

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.items.push(this.walk());
                }

                this.cursor++;

                return node;
            } else if(token.value === "{{{#!syntax "){
                const node = new Node('Syntax', {value: '', name: ''});
                this.cursor++;

                while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                    node.name += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.value += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.color){
                const node = new Node('Color', {color: token.color});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.items.push(this.walk());
                }

                this.cursor++;

                return node;
            } else if(token.size){
                const node = new Node('Size', {size: token.size});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.items.push(this.walk());
                }

                this.cursor++;

                return node;
            } else if(token.value.match(/^-{4,9}$/)){
                const node = new Node('HorizontalLine', {});
                
                this.cursor++;

                return node;
            } else if(token.value === '{{{'){
                const node = new Node('Literal', {value: ''});
                
                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '}}}')){
                    node.value += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '[['){
                const node = new Node('HyperLink', {link: '', items: []});
                
                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === '|' || this.tokens[this.cursor].value === ']]'))){
                    node.link += this.tokens[this.cursor];
                    
                    this.cursor++;
                }

                if(node.link.startsWith(':파일') || node.link.startsWith(':분류')) node.link = node.link.slice(1);

                if(this.tokens[this.cursor].value === '|'){
                    this.cursor++;

                    while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ']]')){
                        node.items.push(this.walk());
                    }
                } else node.items.push(new Node('Literal', {value: node.link}));

                this.cursor++;

                return node;
            } else if(token.value === '[[분류:'){
                const node = new Node('Category', {link: ''});
                
                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ']]')){
                    node.link += this.tokens[this.cursor];
                    
                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '[[파일:'){
                const node = new Node('Image', {link: '', param: {}});
                
                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === '|' || this.tokens[this.cursor].value === ']]'))){
                    node.link += this.tokens[this.cursor];
                    
                    this.cursor++;
                }

                if(this.tokens[this.cursor].value === '|'){
                    this.cursor++;

                    node.param = this.getParam('&', ']]');
                }

                this.cursor++;

                return node;
            } else if(textRules[token.value]){
                const node = new Node(textRules[token.value], {items: []});
                
                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === token.value)){
                    node.items.push(this.walk());
                }

                this.cursor++;

                if(node.items.length < 1) return new Node('Literal', {value: token.value.repeat(2)})

                return node;
            } else if(videos.includes(token.value)){
                const node = new Node("Video", {name: token.value.slice(1, token.value.length-1), code: "", param: {}});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === ',' || this.tokens[this.cursor].value === ')]'))){
                    node.code += this.tokens[this.cursor].value;

                    this.cursor++;
                }

                if(this.tokens[this.cursor].value === ','){
                    this.cursor++;

                    node.param = this.getParam(',', ')]');
                }

                this.cursor++;

                return node;
            } else if(token.value === "[*" || token.value === "[^"){
                const node = new Node("FootNote", {name: "", items: []});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === ' ' || this.tokens[this.cursor].value === ']'))){
                    node.name += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ']')){
                    node.items.push(this.walk());
                }

                this.cursor++;

                return node;
            } else if(token.value === '>'){
                const node = new Node('BlockQuote', {depth: 0, items: []});

                const quotes: {node: Node, depth: number}[] = [{node, depth: 0}];
                let currentNode: Node = node;
                let currentDepth = 1;

                // 인용문-리스트
                let inList = false;

                let listNode: Node;

                let list: {node: Node, depth: number}[] = [];
                let currentListNode: Node = node;
                let currentListDepth = 1;

                while(this.tokens[this.cursor]){
                    if(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '>'){
                        this.cursor++;
                        let depth = 1;
                        while(this.tokens[this.cursor]?.type === 'rule' && this.tokens[this.cursor]?.value === '>') depth++, this.cursor++;

                        if(currentDepth < depth){
                            if(inList) inList = false;

                            for(let i = 0; i < depth-currentDepth; i++){
                                const Quote = new Node('BlockQuote', {items: [], depth: currentDepth+i});

                                currentNode.items.push(Quote);

                                currentDepth = depth;
                                currentNode = Quote;

                                quotes.push({
                                    node: currentNode,
                                    depth
                                });
                            }
                        } else if(currentDepth > depth){
                            if(inList) inList = false;

                            const findNode = quotes.filter(item => item.depth === (depth-1)).pop();
                            if(findNode) currentNode = findNode.node, currentDepth = depth;
                        }

                        if(this.tokens[this.cursor].value === '\n'){
                            currentNode.items.push(new Node('Literal', {value: '\n'}));
                        } else {
                            if((inList && this.tokens[this.cursor].value === ' ') || (this.tokens[this.cursor].value === ' ' && this.tokens[this.cursor+1]?.type === 'rule' && lists.includes(this.tokens[this.cursor+1]?.value))){
                                if(!inList){
                                    inList = true;

                                    listNode = new Node('List', {depth: 0, items: [], param: {}});

                                    list = [{node, depth: 0}];
                                    currentListNode = listNode;
                                    currentListDepth = 1;

                                    currentNode.items.push(listNode);
                                }

                                this.cursor++;
                                let depth = 1;
                                while(this.tokens[this.cursor]?.value === ' ') depth++, this.cursor++;

                                const identifier = this.tokens[this.cursor]?.value;

                                if(!lists.includes(identifier)){
                                    const currentItem = currentListNode.items[currentListNode.items.length - 1];

                                    currentItem.items.push(new Node('Literal', {value: '\n'}));
                
                                    while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                                        currentItem.items.push(this.walk());
                                    }

                                    continue;
                                }

                                this.cursor++;

                                if(currentListDepth < depth){
                                    for(let i = 0; i < depth-currentListDepth; i++){
                                        const item = new Node('List', {items: [], depth: currentListDepth+i, param: {}});

                                        currentListNode.items.push(item);

                                        currentListDepth = depth;
                                        currentListNode = item;

                                        list.push({
                                            node: currentListNode,
                                            depth
                                        });
                                    }
                                } else if(currentListDepth > depth){
                                    const findNode = list.filter(item => item.depth === (depth-1)).pop();
                                    if(findNode) currentListNode = findNode.node, currentListDepth = depth;
                                }

                                if(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '#'){
                                    this.cursor++;

                                    currentListNode.param['start'] = '';

                                    while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== ' '){
                                        currentListNode.param['start'] += this.tokens[this.cursor].value;

                                        this.cursor++;
                                    }

                                    this.cursor++;
                                }

                                const currentItem = new Node('ListItem', {items: [], name: identifier});

                                if(this.tokens[this.cursor].value === '\n'){
                                    currentItem.items.push(new Node('Literal', {value: '\n'}));
                                } else {
                                    while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                                        currentItem.items.push(this.walk());
                                    }
                                }

                                currentListNode.items.push(currentItem);
                            } else {
                                if(inList) inList = false;

                                while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                                    currentNode.items.push(this.walk());
                                }
                            }
                        }
                        this.cursor++;
                    } else break;
                }

                return node;
            } else if(token.value === ' ' && this.tokens[this.cursor+1].type === 'rule' && lists.includes(this.tokens[this.cursor+1]?.value)){
                const node = new Node('List', {depth: 0, items: [], param: {}});

                const list: {node: Node, depth: number}[] = [{node, depth: 0}];
                let currentNode: Node = node;
                let currentDepth = 1;

                while(this.tokens[this.cursor]){
                    if(this.tokens[this.cursor].value === ' '){
                        this.cursor++;
                        let depth = 1;
                        while(this.tokens[this.cursor]?.value === ' ') depth++, this.cursor++;

                        const identifier = this.tokens[this.cursor]?.value;

                        if(!lists.includes(identifier)){
                            const currentItem = currentNode.items[currentNode.items.length - 1];

                            currentItem.items.push(new Node('Literal', {value: '\n'}));
           
                            while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                                currentItem.items.push(this.walk());
                            }

                            continue;
                        }

                        this.cursor++;

                        if(currentDepth < depth){
                            for(let i = 0; i < depth-currentDepth; i++){
                                const item = new Node('List', {items: [], depth: currentDepth+i, param: {}});

                                currentNode.items.push(item);

                                currentDepth = depth;
                                currentNode = item;

                                list.push({
                                    node: currentNode,
                                    depth
                                });
                            }
                        } else if(currentDepth > depth){
                            const findNode = list.filter(item => item.depth === (depth-1)).pop();
                            if(findNode) currentNode = findNode.node, currentDepth = depth;
                        }

                        if(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '#'){
                            this.cursor++;

                            currentNode.param['start'] = '';

                            while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== ' '){
                                currentNode.param['start'] += this.tokens[this.cursor].value;

                                this.cursor++;
                            }

                            this.cursor++;
                        }

                        const currentItem = new Node('ListItem', {items: [], name: identifier});

                        if(this.tokens[this.cursor].value === '\n'){
                            currentItem.items.push(new Node('Literal', {value: '\n'}));
                        } else {
                            while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                                currentItem.items.push(this.walk());
                            }
                        }

                        currentNode.items.push(currentItem);

                        this.cursor++;
                    } else break;
                }

                return node;
            } else if(token.value === '\n' && this.tokens[this.cursor+1]?.value === ' ' && !lists.includes(this.tokens[this.cursor+2]?.value)){
                const node = new Node('Indent', {depth: 0, items: []});
                const indents: {node: Node, depth: number}[] = [{node, depth: 0}];

                let currentNode: Node = node;
                let currentDepth = 1;

                this.cursor++;

                while(this.tokens[this.cursor]){
                    if(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ' '){
                        this.cursor++;
                        let depth = 1;
                        while(this.tokens[this.cursor]?.type === 'rule' && this.tokens[this.cursor]?.value === ' ') depth++, this.cursor++;
                        if(currentDepth < depth){
                            for(let i = 0; i < depth-currentDepth; i++){
                                const indent = new Node('Indent', {items: [], depth: currentDepth+i});

                                currentNode.items.push(indent);
                                currentDepth = depth;
                                currentNode = indent;

                                indents.push({
                                    node: currentNode,
                                    depth
                                });
                            }
                        } else if(currentDepth > depth){
                            const findNode = indents.filter(item => item.depth === (depth-1)).pop();
                            if(findNode) currentNode = findNode.node, currentDepth = depth;
                        }
                        if(this.tokens[this.cursor].value === '\n'){
                            currentNode.items.push(new Node('Literal', {value: '\n'}));
                        } else {
                            while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                                currentNode.items.push(this.walk());
                            }
                        }
                        this.cursor++;
                    } else break;
                }
                return node;
            } else if(token.value === '[include('){
                const node = new Node('Include', {name: '', param: {}});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === ',' || this.tokens[this.cursor].value === ')]'))){
                    node.name += this.tokens[this.cursor];

                    this.cursor++;
                }

                if(this.tokens[this.cursor].value === ','){
                    this.cursor++;

                    node.param = this.getParam(',', ')]');
                }

                this.cursor++;

                return node;
            } else if(token.value === '@'){
                const node = new Node('Param', {name: '', items: []});

                const _cursor = ++this.cursor;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === '=' || this.tokens[this.cursor].value === '@')) && this.tokens[this.cursor].value !== '\n'){
                    node.name += this.tokens[this.cursor];

                    this.cursor++;
                }

                if(!(this.tokens[this.cursor]?.type === 'rule' && (this.tokens[this.cursor].value === '=' || this.tokens[this.cursor].value === '@'))){
                    this.cursor = _cursor;

                    return new Node('Literal', {value: '@'});
                }

                if(this.tokens[this.cursor].value === '='){
                    this.cursor++;

                    while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '@') && this.tokens[this.cursor].value !== '\n'){
                        node.items.push(this.walk());
                    }
    
                    if(!(this.tokens[this.cursor]?.type === 'rule' && this.tokens[this.cursor].value === '@')){
                        this.cursor = _cursor;
    
                        return new Node('Literal', {value: '@'});
                    }
                }

                this.cursor++;

                return node;
            } else if(token.value === '[age('){
                const node = new Node('Age', {date: ''});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ')]')){
                    node.date += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '[dday('){
                const node = new Node('Dday', {date: ''});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ')]')){
                    node.date += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '[pagecount('){
                const node = new Node('PageCount', {name: ''});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ')]')){
                    node.name += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '[ruby('){
                const node = new Node('Ruby', {names: [], param: {}});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && (this.tokens[this.cursor].value === ',' || this.tokens[this.cursor].value === ')]'))){
                    node.names.push(this.walk());
                }

                if(this.tokens[this.cursor].value === ','){
                    this.cursor++;

                    node.param = this.getParam(',', ')]');
                }

                this.cursor++;

                return node;
            } else if(token.value === '[math('){
                const node = new Node('Math', {value: ''});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === ')]')){
                    node.value += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '<math>'){
                const node = new Node('Math', {value: ''});

                this.cursor++;

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '</math>')){
                    node.value += this.tokens[this.cursor];

                    this.cursor++;
                }

                this.cursor++;

                return node;
            } else if(token.value === '[date]' || token.value === '[datetime]'){
                const node = new Node('DateTime', {});

                this.cursor++;

                return node;
            } else if(token.value === '[목차]' || token.value === '[tableofcontents]'){
                const node = new Node('TableOfContents', {});

                this.cursor++;

                return node;
            } else if(token.value === '[각주]' || token.value === '[footnote]'){
                const node = new Node('TableOfFootnotes', {});

                this.cursor++;

                return node;
            } else if(token.value === '[br]'){
                const node = new Node('Literal', {value: '\n'});

                this.cursor++;

                return node;
            } else if(token.value === '[clearfix]'){
                const node = new Node('ClearFix', {});

                this.cursor++;

                return node;
            } else if(token.value === '[pagecount]'){
                const node = new Node('PageCount', {});

                this.cursor++;

                return node;
            } else if(token.value === '||'){
                this.cursor++;

                return this.table();
            } else if(token.value === '|'){
                this.cursor++

                let caption: Node[] = [];

                while(this.tokens[this.cursor] && !(this.tokens[this.cursor].type === 'rule' && this.tokens[this.cursor].value === '|')){
                    caption.push(this.walk());
                }

                this.cursor++;

                const table = this.table();

                table.names = caption;

                return table;
            } else if(token.value === '\n' && this.tokens[this.cursor+1]?.value === '##'){
                const node = new Node('Comment', {value: ''});

                this.cursor++;
                this.cursor++;

                while(this.tokens[this.cursor] && this.tokens[this.cursor].value !== '\n'){
                    node.value += this.tokens[this.cursor];
                    
                    this.cursor++;
                }

                return node;
            }
        }
        
        this.cursor++;
        return new Node('Literal', {value: token.toString()});
    }

    public run(tokens: Token[]){
        this.tokens = tokens;
        this.cursor = 0;

        const nodes: Node[] = [];
        while(this.tokens[this.cursor]) nodes.push(this.walk());

        return nodes;
    }
}
