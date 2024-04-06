import {Tokenizer, Token} from "./tokenizer";
import {Parser, Node} from "./parser";
import {Renderer} from "./renderer";

export {Tokenizer, Parser, Renderer, Token, Node};

export const tokenizer = new Tokenizer();
export const parser = new Parser();

export default function parse(str: string){
    return parser.run(tokenizer.run(str));
}