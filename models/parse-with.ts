import * as nearley from 'nearley';
import * as grammar from './grammar-evo';

export function parseString(input: string): any {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

    try {
        parser.feed(input);
        if (parser.results.length > 0) {
            
            //     console.log("===<start");
     //       console.dir(parser.results, { depth: 99 });
    //        console.log("===>end");
            return parser.results[0];
        } else {
            throw new Error("No parse tree found.");
        }
    } catch (e: any) {
    //        console.error(e.message);

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

// Example usage
const exampleParseTree: ParseNode = {
    type: 'Sentence',
    clause: {
        type: 'Clause',
        value: 'a play cost of 5 or less',
        text: 'a play cost of 5 or less'
    },
    text: 'a play cost of 5 or less'
};

const originalText = recoverText(exampleParseTree);
console.log("Original Text:", originalText);

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




// Example usage
const input1 = "a play cost of 5 or less"; //  from this monster's evolution cards";
const input2 = "the [soc] trait or [pulsemon] in its text"
const input3 = "[dramon] in its name"

if (false) 
for (let input of [input1, input2, input3]) {
    const parseTree = parseString(input);
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
