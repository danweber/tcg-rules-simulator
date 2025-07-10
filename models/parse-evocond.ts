import * as nearley from 'nearley';
import * as grammar from './grammar-evo';
import { find_in_tree } from './util';

// This can parse multiple things!


export function parseStringEvoCond(input: string, search: string, all: boolean = false): any {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    input = input.replaceAll(" ", " ");
    input = input.replaceAll("_", " ");

    try {
        parser.feed(input);
        //   console.log(9, parser.results.length);

        /*
                if (parser.results.length > 1) {
                    console.log(`Parse succeeded with ${parser.results.length} possible results!`);
                    parser.results.forEach((result, index) => {
                        console.log(`Parse tree #${index + 1}:`);
                        console.log(JSON.stringify(result, null, 2));
                    });
                
                    // Compare the results to see if they're truly identical
                    if (JSON.stringify(parser.results[0]) === JSON.stringify(parser.results[1])) {
                        console.log("The parse trees are identical.");
                    } else {
                        console.log("The parse trees have differences.");
                        console.log(JSON.stringify(parser.results[0]));
                        console.log(JSON.stringify(parser.results[1]));
                    }
                } else {
                    console.error("Parse failed.");
                }
        */
        let orig_res = parser.results;
        if (all) console.log("found " + orig_res.length + " results for " + input);
//         console.error(orig_res);

         let res = orig_res;   
        if (search != "" && !all) {
            res = res.map(r => find_in_tree(r, search)).filter(r => r);
        }
        if (res.length > 1 && all) {
            console.log("found multi-match for " + input);
            console.log(orig_res);
        } 
        if (res.length > 0) {
            //   console.log("===<start");
            //      console.dir(parser.results, { depth: 6 });
            //console.log("Parse tree:", JSON.stringify(parser.results[0], null, 2));
            //console.log("===>end");
            if (all) return res;
            return res[0];
        } else {
          //  console.error(orig_res);
           // throw new Error("No parse tree found, for " + input);
        }
    } catch (e: any) {
        
        if (3>4) console.error(e.message);

        /*
        const stack = e.stack.split('\n');
        const maxLines = 20; // Number of lines to display from the start and end of the stack trace
    
        const start = stack.slice(0, maxLines);
        const end = stack.slice(-maxLines);
    
        console.error("Error message:", e.message);
        console.error("Partial stack trace:");
        console.error([...start, '...truncated...', ...end].join('\n'));
        */
        return null;
    }
}

export function newparseString(input: string): any {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

    try {
        console.log("Feeding input to the parser...");
        parser.feed(input);

        if (parser.results.length > 0) {
            console.log("Parser results found:", parser.results);
            return parser.results[0];
        } else {
            console.warn("No parse tree found.");
            return null;
        }
    } catch (e: any) {
        console.error("Parsing error:", e.message);
        return null;
    }
}

interface ParseNode {
    type: string;
    text: string;
    [key: string]: any;
}


function recoverText(node: ParseNode | string): string {
    if (typeof node === 'string') {
        return node;
    } else if (node && typeof node === 'object') {
        if (node.text) {
            return node.text;
        } else {
            return Object.keys(node)
                .filter(key => key !== 'type' && key !== 'text')
                .map(key => recoverText(node[key]))
                .join('');
        }
    } else {
        return '';
    }
}

export function newRecoverText(origdata: any): string {
    if (!origdata) return "NUL";
    return origdata.map(
        function (d: any) {
            if (Array.isArray(d)) {
                let x = newRecoverText(d);
                return /*"A:" + */ "[" + x + "]";
            }
            if (typeof d === "string") return /* "S:" +  */ d;
            if (typeof d === "object") {
                if (d.string) return d.string.value || "??"
            }
            return "BAD[" + (typeof d) + "]";
        }
    ).join("+");


}

// Example function to recover original text from parse tree
function oldrecoverText(node: any): string {
    if (typeof node === 'string') {
        return node;
    } else if (typeof node === 'object') {
        if (!node) return "EMPTY";
        let t = "T" + node.text;
        if (!t) {
            if (node.data)
                t = "ND" + node.data.map(recoverText).join('');
            else
                t = "NUL";
        }
        return t;
        //        return node.text || ( node.data && node.data.map(recoverText).join(''));
    } else {
        return "TYPE" + typeof node;
    }
}


// Function to pretty-print the parse tree
export function printParseTree(node: any, indent: string = ''): void {

    let text = recoverText(node);
    console.log(indent + "recovered text: " + text);
    if (Array.isArray(node)) {
        node.forEach(subNode => printParseTree(subNode, indent));
    } else if (node && typeof node === 'object') {
        console.log(`${indent}${node.type}: ${node.value}`);
        if (node.children) {
            printParseTree(node.children, indent + '  ');
        }
    }
}


function replaceUnicodeEscapes(str: string): string {
    return str.replace(/\\u[0-9a-fA-F]{4}/g, (match) => {
        return String.fromCharCode(parseInt(match.replace("\\u", ""), 16));
    });
}


// Example usage
const input1 = "a play cost of 5 or less"; //  from this monster's evolution cards";
const input2 = "the [soc] trait or [pulsemon] in its text"
const input3 = "[dramon] in its name"



if (require.main === module) {
    console.log("standalone mode");

    var args = process.argv.slice(2);
    let filename = args[0];
    var fs = require('fs');
    var array = fs.readFileSync(filename).toString().split("\n");
    //    array = ["play cost 13 or less"];
    for (let line of array) {
        line = replaceUnicodeEscapes(line);
        line = line.replaceAll(" ", " ");
        line = line.replaceAll("_", " ");
        
        if (line.length < 2) continue;
        console.log(">> " + line);
        //        console.log(line);
        let p = parseStringEvoCond(line, "", true);
        if (p) console.log(9, p.length);

        console.dir(p, { depth: null });

        //   console.dir(p, {depth: 5});
    }
}



if (false)
    for (let input of [input1, input2, input3]) {
        const parseTree = parseStringEvoCond(input, "");
        console.log(`Input: "${input}"`);
        console.log("Parse Tree:");
        printParseTree(parseTree);
        console.log(parseTree);
        console.log("dir for " + input);
        console.dir(parseTree);
        console.log("done");

    }

// Example usage
/*
const input = "Hello, world!";
const parseTree = parseString(input);
console.log(`Input: "${input}"`);
console.log("Parse Tree:", parseTree);
*/
