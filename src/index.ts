import {Tokenizer, Token} from "./tokenizer";
import {Parser, Node} from "./parser";

export {Tokenizer, Parser, Token, Node};

export const tokenizer = new Tokenizer();
export const parser = new Parser();

export default async function parse(str: string){
    return await parser.run(tokenizer.run(str));
}