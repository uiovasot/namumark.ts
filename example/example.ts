import parse, {tokenizer} from "../src";

console.log(JSON.stringify(await parse(`
문법
`), null, ' '));