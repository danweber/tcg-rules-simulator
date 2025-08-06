"use strict";
// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
    function id(x) { return x[0]; }
    function tgv(x) {
        let s = gv(x);
        return s.trim();
    }
    function gv(x) {
        if (!x) {
            return "";
        }
        if (x.raw_text)
            return x.raw_text;
        if (typeof x === "string")
            return x;
        if (Array.isArray(x)) {
            return x.map(element => gv(element)).join("") || "";
        }
        return `??${typeof x}??`;
    }
    function gv2(x) {
        return `??${typeof x}??`;
    }
    function max_number(array) {
        let max = 1;
        for (let i = 0; i < array.length; i++) {
            let n = parseInt(array[i].count);
            if (n > max) {
                max = n;
            }
        }
        return max;
    }
    function max_upto(array) {
        let max = false;
        for (let i = 0; i < array.length; i++) {
            let n = array[i].upto;
            if (n)
                return true;
        }
        return max;
    }
    var grammar = {
        Lexer: undefined,
        ParserRules: [
            { "name": "_$ebnf$1", "symbols": [] },
            { "name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "_", "symbols": ["_$ebnf$1"], "postprocess": function (d) { return null; } },
            { "name": "__$ebnf$1", "symbols": ["wschar"] },
            { "name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "__", "symbols": ["__$ebnf$1"], "postprocess": function (d) { return null; } },
            { "name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id },
            { "name": "Top", "symbols": ["WithSentence"] },
            { "name": "Top", "symbols": ["EvoCondition"] },
            { "name": "Top", "symbols": ["At"] },
            { "name": "Top", "symbols": ["MultiTarget"] },
            { "name": "Top", "symbols": ["EffSentence"] },
            { "name": "Top", "symbols": ["WhenSentence"] },
            { "name": "Top", "symbols": ["IfClause"] },
            { "name": "Top", "symbols": ["SuperlativeClause"] },
            { "name": "Top", "symbols": ["Keyword"] },
            { "name": "Top", "symbols": ["DeclareCentral"] },
            { "name": "SolidEffect$ebnf$1", "symbols": [] },
            { "name": "SolidEffect$ebnf$1$subexpression$1", "symbols": [{ "literal": " " }, "EffSentence"] },
            { "name": "SolidEffect$ebnf$1", "symbols": ["SolidEffect$ebnf$1", "SolidEffect$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "SolidEffect", "symbols": ["EffSentence", "SolidEffect$ebnf$1"], "postprocess": function (d) {
                    return {
                        type: 'SolidEffect', sentence1: d[0]
                    };
                } },
            { "name": "WhenSentence", "symbols": ["WhenEvo"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0], }; } },
            { "name": "WhenSentence", "symbols": ["WhenSusp"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenPlay"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenRemoval"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenEffect"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenGets"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenPlaced"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenAttacks"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenSentence", "symbols": ["WhenMulti"], "postprocess": function (d) { return { raw_text: gv(d), type: 'WhenSentence', When: d[0] }; } },
            { "name": "WhenMulti$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenMulti$subexpression$1", "symbols": ["WhenMulti$subexpression$1$string$1"] },
            { "name": "WhenMulti$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenMulti$subexpression$1", "symbols": ["WhenMulti$subexpression$1$string$2"] },
            { "name": "WhenMulti$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenMulti", "symbols": ["MultiTarget", "WhenMulti$subexpression$1", "WhenVerb", "WhenMulti$string$1", "WhenVerb"], "postprocess": function (d) {
                    return { raw_text: gv(d), target: d[0], after: d[0], before: d[0],
                        event: [d[2] ? d[2].event : false, d[4] ? d[4].event : false].filter(x => x)
                    };
                } },
            { "name": "WhenGets$string$1", "symbols": [{ "literal": " " }, { "literal": "g" }, { "literal": "e" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenGets$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "WhenGets$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenGets$string$2", "symbols": [{ "literal": " " }, { "literal": "l" }, { "literal": "i" }, { "literal": "n" }, { "literal": "k" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenGets", "symbols": ["Target", "WhenGets$string$1", "WhenGets$ebnf$1", "WhenGets$string$2"], "postprocess": function (d) {
                    return { raw_text: gv(d), event: "LINK", target: d[0] };
                } },
            { "name": "WhenVerb$string$1", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenVerb$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "WhenVerb$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenVerb", "symbols": ["WhenVerb$string$1", "WhenVerb$ebnf$1"], "postprocess": function (d) { return { raw_text: gv(d), event: "SUSPEND" }; } },
            { "name": "WhenVerb$string$2", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenVerb$ebnf$2$string$1", "symbols": [{ "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenVerb$ebnf$2", "symbols": ["WhenVerb$ebnf$2$string$1"], "postprocess": id },
            { "name": "WhenVerb$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenVerb", "symbols": ["WhenVerb$string$2", "WhenVerb$ebnf$2"], "postprocess": function (d) { return { raw_text: gv(d), event: "PLAY" }; } },
            { "name": "WhenVerb$string$3", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenVerb$ebnf$3", "symbols": [{ "literal": "d" }], "postprocess": id },
            { "name": "WhenVerb$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenVerb", "symbols": ["WhenVerb$string$3", "WhenVerb$ebnf$3"], "postprocess": function (d) { return { raw_text: gv(d), event: "EVOLVE" }; } },
            { "name": "WhenEffect$string$1", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEffect$ebnf$1$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEffect$ebnf$1", "symbols": ["WhenEffect$ebnf$1$string$1"], "postprocess": id },
            { "name": "WhenEffect$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEffect$ebnf$2$string$1", "symbols": [{ "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEffect$ebnf$2", "symbols": ["WhenEffect$ebnf$2$string$1"], "postprocess": id },
            { "name": "WhenEffect$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEffect$ebnf$3$string$1", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEffect$ebnf$3", "symbols": ["WhenEffect$ebnf$3$string$1"], "postprocess": id },
            { "name": "WhenEffect$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEffect", "symbols": ["WhenEffect$string$1", "WhenEffect$ebnf$1", "WhenEffect$ebnf$2", "WhenEffect$ebnf$3", "MultiTarget"], "postprocess": function (d) {
                    return { raw_text: gv(d),
                        old: "PLAY",
                        event: [d[1] ? "PLAY" : false, d[3] ? "EVOLVE" : false].filter(x => x),
                        after: d[4], target: d[4],
                        effect: true };
                } },
            { "name": "WhenEvo$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "o" }, { "literal": "u" }, { "literal": "l" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEvo$ebnf$1", "symbols": ["WhenEvo$ebnf$1$string$1"], "postprocess": id },
            { "name": "WhenEvo$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEvo$ebnf$2$string$1", "symbols": [{ "literal": " " }, { "literal": "n" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEvo$ebnf$2", "symbols": ["WhenEvo$ebnf$2$string$1"], "postprocess": id },
            { "name": "WhenEvo$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEvo$ebnf$3$string$1", "symbols": [{ "literal": " " }, { "literal": "D" }, { "literal": "N" }, { "literal": "A" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEvo$ebnf$3", "symbols": ["WhenEvo$ebnf$3$string$1"], "postprocess": id },
            { "name": "WhenEvo$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEvo$string$1", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEvo$ebnf$4", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "WhenEvo$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEvo$ebnf$5$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenEvo$ebnf$5", "symbols": ["WhenEvo$ebnf$5$string$1"], "postprocess": id },
            { "name": "WhenEvo$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEvo$ebnf$6", "symbols": ["Target"], "postprocess": id },
            { "name": "WhenEvo$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenEvo", "symbols": ["Target", "WhenEvo$ebnf$1", "WhenEvo$ebnf$2", "WhenEvo$ebnf$3", "WhenEvo$string$1", "WhenEvo$ebnf$4", "WhenEvo$ebnf$5", "WhenEvo$ebnf$6"], "postprocess": function (d) {
                    return { raw_text: gv(d), event: "EVOLVE", before: d[0], after: d[7], dna: !!d[3] };
                } },
            { "name": "WhenAttacks$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenAttacks", "symbols": ["Target", "WhenAttacks$string$1"], "postprocess": function (d) {
                    return { raw_text: gv(d), event: "ATTACK", target: d[0], after: d[7], dna: !!d[3] };
                } },
            { "name": "WhenSusp$string$1", "symbols": [{ "literal": " " }, { "literal": "b" }, { "literal": "e" }, { "literal": "c" }, { "literal": "o" }, { "literal": "m" }, { "literal": "e" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenSusp$ebnf$1$string$1", "symbols": [{ "literal": "u" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenSusp$ebnf$1", "symbols": ["WhenSusp$ebnf$1$string$1"], "postprocess": id },
            { "name": "WhenSusp$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenSusp$string$2", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenSusp", "symbols": ["Target", "WhenSusp$string$1", "WhenSusp$ebnf$1", "WhenSusp$string$2"], "postprocess": function (d) {
                    return { raw_text: gv(d), event: d[2] ? "UNSUSPEND" : "SUSPEND", target: d[0] };
                } },
            { "name": "WhenPlay$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "o" }, { "literal": "u" }, { "literal": "l" }, { "literal": "d" }, { "literal": " " }, { "literal": "b" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlay$subexpression$1", "symbols": ["WhenPlay$subexpression$1$string$1"] },
            { "name": "WhenPlay$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlay$subexpression$1", "symbols": ["WhenPlay$subexpression$1$string$2"] },
            { "name": "WhenPlay$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlay$subexpression$1", "symbols": ["WhenPlay$subexpression$1$string$3"] },
            { "name": "WhenPlay$string$1", "symbols": [{ "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlay$ebnf$1", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "WhenPlay$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlay$ebnf$2", "symbols": ["FromRegion"], "postprocess": id },
            { "name": "WhenPlay$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlay", "symbols": ["MultiTarget", "WhenPlay$subexpression$1", "WhenPlay$string$1", "WhenPlay$ebnf$1", "WhenPlay$ebnf$2"], "postprocess": function (d) {
                    let target = d[0];
                    let from = d[4];
                    target.from = from; // this cheat needs to stop
                    return { line: 106, raw_text: gv(d), event: "PLAY", target: target, from: from, xxx: d[1] };
                } },
            { "name": "WhenPlaced$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$ebnf$1$subexpression$1", "symbols": ["WhenPlaced$ebnf$1$subexpression$1$string$1"] },
            { "name": "WhenPlaced$ebnf$1$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$ebnf$1$subexpression$1", "symbols": ["WhenPlaced$ebnf$1$subexpression$1$string$2"] },
            { "name": "WhenPlaced$ebnf$1", "symbols": ["WhenPlaced$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "WhenPlaced$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlaced$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$subexpression$1", "symbols": ["WhenPlaced$subexpression$1$string$1"] },
            { "name": "WhenPlaced$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "r" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$subexpression$1", "symbols": ["WhenPlaced$subexpression$1$string$2"] },
            { "name": "WhenPlaced$ebnf$2$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$ebnf$2$subexpression$1", "symbols": ["WhenPlaced$ebnf$2$subexpression$1$string$1"] },
            { "name": "WhenPlaced$ebnf$2", "symbols": ["WhenPlaced$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "WhenPlaced$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlaced$ebnf$3", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "WhenPlaced$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlaced$ebnf$4", "symbols": ["FromRegion"], "postprocess": id },
            { "name": "WhenPlaced$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlaced$ebnf$5$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$ebnf$5$subexpression$1", "symbols": ["WhenPlaced$ebnf$5$subexpression$1$string$1", "Target"] },
            { "name": "WhenPlaced$ebnf$5$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$ebnf$5$subexpression$1", "symbols": ["WhenPlaced$ebnf$5$subexpression$1$string$2", "Location"] },
            { "name": "WhenPlaced$ebnf$5$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "o" }, { "literal": "w" }, { "literal": "n" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenPlaced$ebnf$5$subexpression$1", "symbols": ["WhenPlaced$ebnf$5$subexpression$1$string$3"] },
            { "name": "WhenPlaced$ebnf$5", "symbols": ["WhenPlaced$ebnf$5$subexpression$1"], "postprocess": id },
            { "name": "WhenPlaced$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenPlaced", "symbols": ["Target", "WhenPlaced$ebnf$1", "WhenPlaced$subexpression$1", "WhenPlaced$ebnf$2", "WhenPlaced$ebnf$3", "WhenPlaced$ebnf$4", "WhenPlaced$ebnf$5"], "postprocess": function (d) {
                    return { raw_text: gv(d), event: "MOVE_CARD", target: d[0] };
                } },
            { "name": "WhenRemoval$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "o" }, { "literal": "u" }, { "literal": "l" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WhenRemoval$ebnf$1", "symbols": ["WhenRemoval$ebnf$1$string$1"], "postprocess": id },
            { "name": "WhenRemoval$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenRemoval$ebnf$2$subexpression$1", "symbols": [{ "literal": " " }, "Reason"] },
            { "name": "WhenRemoval$ebnf$2", "symbols": ["WhenRemoval$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "WhenRemoval$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WhenRemoval", "symbols": ["Target", "WhenRemoval$ebnf$1", { "literal": " " }, "Removal", "WhenRemoval$ebnf$2"], "postprocess": function (d) {
                    return { raw_text: gv(d), target: d[0], event: d[3].event, cause: d[4] && d[4][1] };
                } },
            { "name": "Removal$string$1", "symbols": [{ "literal": "b" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Removal", "symbols": ["Removal$string$1"], "postprocess": function (d) { return { raw_text: gv(d), event: "DELETE" }; } },
            { "name": "Reason$string$1", "symbols": [{ "literal": "o" }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "b" }, { "literal": "y" }, { "literal": " " }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Reason", "symbols": ["Reason$string$1"], "postprocess": function (d) {
                    return { raw_text: gv(d), cause: "DELETE" };
                } },
            { "name": "EffSentence$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": "T" }, { "literal": "h" }, { "literal": "e" }, { "literal": "n" }, { "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$ebnf$1$subexpression$1", "symbols": ["EffSentence$ebnf$1$subexpression$1$string$1"] },
            { "name": "EffSentence$ebnf$1", "symbols": ["EffSentence$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "EffSentence$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$2$subexpression$1$string$1", "symbols": [{ "literal": "W" }, { "literal": "h" }, { "literal": "e" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$ebnf$2$subexpression$1$string$2", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$ebnf$2$subexpression$1", "symbols": ["EffSentence$ebnf$2$subexpression$1$string$1", "WhenSentence", "EffSentence$ebnf$2$subexpression$1$string$2"] },
            { "name": "EffSentence$ebnf$2", "symbols": ["EffSentence$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "EffSentence$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$3", "symbols": ["IfClause"], "postprocess": id },
            { "name": "EffSentence$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$4$subexpression$1$string$1", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$ebnf$4$subexpression$1", "symbols": ["Cost", "EffSentence$ebnf$4$subexpression$1$string$1"] },
            { "name": "EffSentence$ebnf$4", "symbols": ["EffSentence$ebnf$4$subexpression$1"], "postprocess": id },
            { "name": "EffSentence$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$5", "symbols": ["Duration"], "postprocess": id },
            { "name": "EffSentence$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$6", "symbols": ["ForEach"], "postprocess": id },
            { "name": "EffSentence$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$subexpression$1", "symbols": ["Declarative"] },
            { "name": "EffSentence$subexpression$1", "symbols": ["Imperative"] },
            { "name": "EffSentence$subexpression$1", "symbols": ["YouDeclare"] },
            { "name": "EffSentence$subexpression$1", "symbols": ["SpecialCaseDelay"] },
            { "name": "EffSentence$ebnf$7$subexpression$1", "symbols": [{ "literal": " " }, "Duration"] },
            { "name": "EffSentence$ebnf$7", "symbols": ["EffSentence$ebnf$7$subexpression$1"], "postprocess": id },
            { "name": "EffSentence$ebnf$7", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$8$subexpression$1", "symbols": [{ "literal": " " }, "ForEach"] },
            { "name": "EffSentence$ebnf$8", "symbols": ["EffSentence$ebnf$8$subexpression$1"], "postprocess": id },
            { "name": "EffSentence$ebnf$8", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$9$subexpression$1$ebnf$1", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "EffSentence$ebnf$9$subexpression$1$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$9$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$ebnf$9$subexpression$1$ebnf$2", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "EffSentence$ebnf$9$subexpression$1$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$9$subexpression$1$ebnf$3", "symbols": ["Duration"], "postprocess": id },
            { "name": "EffSentence$ebnf$9$subexpression$1$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$9$subexpression$1", "symbols": ["EffSentence$ebnf$9$subexpression$1$ebnf$1", "EffSentence$ebnf$9$subexpression$1$string$1", "EffSentence$ebnf$9$subexpression$1$ebnf$2", { "literal": " " }, "EffSentence$ebnf$9$subexpression$1$ebnf$3", "Declarative"] },
            { "name": "EffSentence$ebnf$9", "symbols": ["EffSentence$ebnf$9$subexpression$1"], "postprocess": id },
            { "name": "EffSentence$ebnf$9", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$10", "symbols": [{ "literal": "." }], "postprocess": id },
            { "name": "EffSentence$ebnf$10", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$11", "symbols": ["ExtraSentence"], "postprocess": id },
            { "name": "EffSentence$ebnf$11", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence$ebnf$12", "symbols": ["ForEachSentence"], "postprocess": id },
            { "name": "EffSentence$ebnf$12", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence", "symbols": ["EffSentence$ebnf$1", "EffSentence$ebnf$2", "EffSentence$ebnf$3", "EffSentence$ebnf$4", "EffSentence$ebnf$5", "EffSentence$ebnf$6", "EffSentence$subexpression$1", "EffSentence$ebnf$7", "EffSentence$ebnf$8", "EffSentence$ebnf$9", "EffSentence$ebnf$10", "EffSentence$ebnf$11", "EffSentence$ebnf$12"], "postprocess": function (d, l) {
                    let extra = d[11];
                    let for_each = d[12];
                    // also returning tgv instead of if-clause is something to move away from
                    let effects = d[6][0]; // need [0] because it has parensfg
                    let duration = d[4] || (d[7] && d[7][1]);
                    // set for_each per effects...
                    for (let effect of effects) {
                        if (d[5] || d[8]) {
                            let fe = d[5] || d[8][1];
                            effect.action_args.for_each = fe.for_each;
                        }
                        // ... and grab any nested duration. Do we even need our top-level duration?
                        if (effect.action_args && effect.action_args.duration) {
                            duration = effect.action_args.duration;
                        }
                    }
                    return {
                        line: 159,
                        raw_text: gv(d), // we need to AND the effect
                        when_s: tgv(d[1]),
                        if: tgv(d[2]),
                        cost: tgv(d[3]),
                        d6: d[7],
                        duration: duration,
                        type: 'EffSentence',
                        effect: effects,
                        extra: extra,
                        for_each: tgv(for_each),
                    };
                } },
            { "name": "EffSentence$ebnf$13", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "EffSentence$ebnf$13", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence", "symbols": ["Cost", "EffSentence$ebnf$13"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'EffSentence', effect: d[0][1]
                    };
                } },
            { "name": "EffSentence$string$1", "symbols": [{ "literal": "," }, { "literal": " " }, { "literal": "w" }, { "literal": "h" }, { "literal": "e" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$string$2", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence$string$3", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence", "symbols": ["Duration", "EffSentence$string$1", "WhenSentence", "EffSentence$string$2", "Cost", "EffSentence$string$3", "Imperative", { "literal": "." }], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'EffSentence', kind: "pending", when: d[2],
                        rendered: "The next time " + gv(d[2]) + ", " + gv(d[4]) + ", " + gv(d[6]) + "."
                    };
                } },
            { "name": "ExtraSentence$string$1", "symbols": [{ "literal": " " }, { "literal": "W" }, { "literal": "h" }, { "literal": "e" }, { "literal": "n" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": " " }, { "literal": "w" }, { "literal": "o" }, { "literal": "u" }, { "literal": "l" }, { "literal": "d" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "y" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "," }, { "literal": " " }, { "literal": "r" }, { "literal": "e" }, { "literal": "d" }, { "literal": "u" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }, { "literal": " " }, { "literal": "b" }, { "literal": "y" }, { "literal": " " }, { "literal": "2" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ExtraSentence", "symbols": ["ExtraSentence$string$1"] },
            { "name": "ExtraSentence$string$2", "symbols": [{ "literal": " " }, { "literal": "T" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "a" }, { "literal": "l" }, { "literal": "s" }, { "literal": "o" }, { "literal": " " }, { "literal": "a" }, { "literal": "c" }, { "literal": "t" }, { "literal": "i" }, { "literal": "v" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }, { "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "r" }, { "literal": "e" }, { "literal": "e" }, { "literal": "d" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": "a" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ExtraSentence", "symbols": ["ExtraSentence$string$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'ExtraSentence', effect: 'also-in-breeding'
                    };
                } },
            { "name": "ForEachSentence", "symbols": [{ "literal": " " }, "ForEach", "EachModify"] },
            { "name": "EachModify$string$1", "symbols": [{ "literal": "a" }, { "literal": "d" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EachModify$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EachModify$string$3", "symbols": [{ "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "x" }, { "literal": "i" }, { "literal": "m" }, { "literal": "u" }, { "literal": "m" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EachModify", "symbols": ["EachModify$string$1", "Number", "EachModify$string$2", "Property", "EachModify$string$3"] },
            { "name": "EachModify$string$4", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": "c" }, { "literal": "r" }, { "literal": "e" }, { "literal": "a" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "x" }, { "literal": "i" }, { "literal": "m" }, { "literal": "u" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EachModify$string$5", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "h" }, { "literal": "o" }, { "literal": "o" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EachModify", "symbols": ["EachModify$string$4", "Property", "EachModify$string$5", "Number", { "literal": "." }] },
            { "name": "SpecialCaseDelay$string$1", "symbols": [{ "literal": "＜" }, { "literal": "D" }, { "literal": "e" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "＞" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "SpecialCaseDelay", "symbols": ["SpecialCaseDelay$string$1", "NestedEffect", { "literal": "." }], "postprocess": function (d, l) {
                    return [{ raw_text: gv(d), type: 'Action', action: 'Delay', nested_solid: d[1].nested_solid,
                            nested_solid_s: d[1].nested_s }];
                } },
            { "name": "NestedEffect$ebnf$1", "symbols": [] },
            { "name": "NestedEffect$ebnf$1$subexpression$1", "symbols": [{ "literal": " " }, "EffSentence"] },
            { "name": "NestedEffect$ebnf$1", "symbols": ["NestedEffect$ebnf$1", "NestedEffect$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "NestedEffect", "symbols": [{ "literal": "・" }, "EffSentence", "NestedEffect$ebnf$1"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), type: 'NestedEffect', nested_solid: d[1], nested_s: gv(d[1]) };
                } },
            { "name": "EffSentence000$ebnf$1", "symbols": [{ "literal": "." }], "postprocess": id },
            { "name": "EffSentence000$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence000", "symbols": ["Declarative", "EffSentence000$ebnf$1"] },
            { "name": "EffSentence000$ebnf$2", "symbols": ["IfClause"], "postprocess": id },
            { "name": "EffSentence000$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence000$ebnf$3", "symbols": [{ "literal": "." }], "postprocess": id },
            { "name": "EffSentence000$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence000", "symbols": ["EffSentence000$ebnf$2", "Imperative", "EffSentence000$ebnf$3"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), if: tgv(d[0]), type: 'EffSentence', effect: d[1] };
                } },
            { "name": "EffSentence000$ebnf$4", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "EffSentence000$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence000", "symbols": ["Cost", "EffSentence000$ebnf$4"] },
            { "name": "EffSentence000$string$1", "symbols": [{ "literal": "W" }, { "literal": "h" }, { "literal": "e" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffSentence000", "symbols": ["EffSentence000$string$1", "WhenSentence", { "literal": "," }] },
            { "name": "EffSentence000$ebnf$5", "symbols": [{ "literal": "." }], "postprocess": id },
            { "name": "EffSentence000$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EffSentence000", "symbols": ["YouDeclare", "EffSentence000$ebnf$5"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), line: 89, type: 'EffSentence', effect: d[0] };
                } },
            { "name": "IfClause$string$1", "symbols": [{ "literal": "I" }, { "literal": "f" }, { "literal": " " }, { "literal": "D" }, { "literal": "N" }, { "literal": "A" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause", "symbols": ["IfClause$string$1"] },
            { "name": "IfClause$string$2", "symbols": [{ "literal": "i" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": " " }, { "literal": "d" }, { "literal": "o" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$string$3", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause", "symbols": ["IfClause$string$2", "MultiTarget", "IfClause$string$3"] },
            { "name": "IfClause$string$4", "symbols": [{ "literal": "I" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$string$5", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause", "symbols": ["IfClause$string$4", "MultiTarget", "IfClause$string$5"] },
            { "name": "IfClause$string$6", "symbols": [{ "literal": "I" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$1", "symbols": ["IfClause$subexpression$1$string$1"] },
            { "name": "IfClause$string$7", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause", "symbols": ["IfClause$string$6", "Target", "IfClause$subexpression$1", "MultiTarget", "IfClause$string$7"] },
            { "name": "IfClause$string$8", "symbols": [{ "literal": "I" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$2$string$1", "symbols": [{ "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$2", "symbols": ["IfClause$subexpression$2$string$1"] },
            { "name": "IfClause$subexpression$2$string$2", "symbols": [{ "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$2", "symbols": ["IfClause$subexpression$2$string$2"] },
            { "name": "IfClause$ebnf$1$string$1", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$ebnf$1", "symbols": ["IfClause$ebnf$1$string$1"], "postprocess": id },
            { "name": "IfClause$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "IfClause", "symbols": ["IfClause$string$8", "Target", "IfClause$subexpression$2", "WithSentence", "IfClause$ebnf$1"], "postprocess": function (d) {
                    // passive_text changes "a has b" to "a with b"
                    let passive_text = gv(d[1]) + " with " + gv(d[3]);
                    let target = gv(d[1]);
                    //  if (target === "any of them") target = "it";
                    return { raw_text: gv(d),
                        passive_text: passive_text,
                        testtype: "TARGET_EXISTS", and: d[1].and, target: target, XX_target_obj: d[1], type: 'IfClause', with: d[3] };
                } },
            { "name": "IfClause$subexpression$3$string$1", "symbols": [{ "literal": "I" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$3", "symbols": ["IfClause$subexpression$3$string$1"] },
            { "name": "IfClause$subexpression$3$string$2", "symbols": [{ "literal": "i" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$3", "symbols": ["IfClause$subexpression$3$string$2"] },
            { "name": "IfClause$subexpression$4$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$4", "symbols": ["IfClause$subexpression$4$string$1"] },
            { "name": "IfClause$subexpression$4$string$2", "symbols": [{ "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$subexpression$4", "symbols": ["IfClause$subexpression$4$string$2"] },
            { "name": "IfClause$ebnf$2$string$1", "symbols": [{ "literal": "u" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause$ebnf$2", "symbols": ["IfClause$ebnf$2$string$1"], "postprocess": id },
            { "name": "IfClause$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "IfClause$string$9", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "d" }, { "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "IfClause", "symbols": ["IfClause$subexpression$3", "MultiTarget", "IfClause$subexpression$4", "IfClause$ebnf$2", "IfClause$string$9"], "postprocess": function (d) {
                    return { raw_text: gv(d), type: 'IfClause',
                        testtype: "TARGET_EXISTS",
                        and: [
                            d[1],
                            { raw_text: 'is suspended', suspended: true }
                        ]
                    };
                } },
            { "name": "Declarative$ebnf$1", "symbols": ["During"], "postprocess": id },
            { "name": "Declarative$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Declarative$subexpression$1", "symbols": ["DeclareCentral"] },
            { "name": "Declarative$subexpression$1", "symbols": ["Cant"] },
            { "name": "Declarative$ebnf$2", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "Declarative$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Declarative", "symbols": ["Declarative$ebnf$1", "Declarative$subexpression$1", "Declarative$ebnf$2"], "postprocess": function (d) {
                    let effect = d[1][0];
                    let actions = [effect.action];
                    if (effect.actions) {
                        // double-clause!
                        // don't double up status effects, because they're already merged into 1
                        const uniqueArr = [...new Set(effect.actions)];
                        if (uniqueArr.length > 1) {
                            actions = effect.actions;
                        }
                    }
                    // optional and target matter for the first, must be the same for all later
                    let later_effect = { ...effect };
                    let this_mon_it = {
                        raw_text: 'this Monster',
                        type: 'Target-2',
                        xxx_d5: null,
                        and: [{ raw_text: 'this', self: true }],
                        with: null,
                        count: 1,
                        upto: false,
                        under: null,
                        is_evo_card: true,
                        adj_text: 'this',
                        entity: 'Monster',
                        entity_txt: 'Monster',
                        entity_match: {
                            raw_text: 'Monster',
                            entity: 'Monster',
                            and: [{ raw_text: 'Monster', entity_type: 'Monster' }],
                            type: 'Entity'
                        },
                        from: null
                    };
                    later_effect.target = this_mon_it;
                    later_effect.optional = false;
                    effect.is_cost = effect.optional; // so we only ask on the first
                    return actions.map(function (x, index) {
                        return {
                            raw_text: gv(d),
                            line: 244,
                            type: effect.type,
                            action: x,
                            action_args: index > 0 ? later_effect : effect
                        };
                    });
                    /*     return [ {
                         raw_text:gv(d),
                         line: 238,
                         type:effect.type,
                         action:effect.action,
                         action_args:effect } ] ;
                         */
                } },
            { "name": "YouDeclare$subexpression$1$string$1", "symbols": [{ "literal": "Y" }, { "literal": "o" }, { "literal": "u" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "YouDeclare$subexpression$1", "symbols": ["YouDeclare$subexpression$1$string$1"] },
            { "name": "YouDeclare$subexpression$1$string$2", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "YouDeclare$subexpression$1", "symbols": ["YouDeclare$subexpression$1$string$2"] },
            { "name": "YouDeclare$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "YouDeclare$ebnf$1", "symbols": ["YouDeclare$ebnf$1$string$1"], "postprocess": id },
            { "name": "YouDeclare$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "YouDeclare", "symbols": ["YouDeclare$subexpression$1", "YouDeclare$ebnf$1", "Action"], "postprocess": function (d, l) {
                    return [{
                            raw_text: gv(d),
                            // xxx_d2: d[2],
                            optional: !!d[1],
                            line: 246,
                            type: d[2].type,
                            action: d[2].action,
                            action_args: d[2].action_args
                        }];
                } },
            { "name": "DeclareCentral$ebnf$1$string$1", "symbols": [{ "literal": "m" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$ebnf$1", "symbols": ["DeclareCentral$ebnf$1$string$1"], "postprocess": id },
            { "name": "DeclareCentral$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral", "symbols": ["MultiTarget", { "literal": " " }, "DeclareCentral$ebnf$1", "Actions"], "postprocess": function (d, l) {
                    const acx = d[3];
                    // if multiple actions here, they all share the same target1 and optional
                    return {
                        raw_text: gv(d),
                        optional: !!d[2],
                        type: 'Action',
                        xxx_dc: "declare central",
                        // xxx_d: d[2],
                        action: acx.action,
                        actions: acx.actions, // only when multiple, and can't handle direct objects well
                        // todo: filter out all null results
                        dp_change: acx.dp_change, // having to repeat these sucks
                        without_suspending: acx.without_suspending,
                        target2_text: acx.target2_text,
                        keyword_gains: acx.keyword_gains,
                        for_each: acx.for_each,
                        duration: acx.duration,
                        status: acx.status,
                        target: d[0],
                    };
                } },
            { "name": "DeclareCentral$string$1", "symbols": [{ "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "1" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral", "symbols": ["DeclareCentral$string$1"] },
            { "name": "DeclareCentral$ebnf$2$string$1", "symbols": [{ "literal": "m" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$ebnf$2", "symbols": ["DeclareCentral$ebnf$2$string$1"], "postprocess": id },
            { "name": "DeclareCentral$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral", "symbols": ["MultiTarget", { "literal": " " }, "DeclareCentral$ebnf$2", "Verb1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d),
                        optional: !!d[2],
                        type: 'Action',
                        action: d[3].action,
                        target: d[0],
                    };
                } },
            { "name": "DeclareCentral$ebnf$3$string$1", "symbols": [{ "literal": "F" }, { "literal": "o" }, { "literal": "r" }, { "literal": "E" }, { "literal": "a" }, { "literal": "c" }, { "literal": "h" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$ebnf$3", "symbols": ["DeclareCentral$ebnf$3$string$1"], "postprocess": id },
            { "name": "DeclareCentral$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral", "symbols": ["DeclareCentral$ebnf$3", "Immunes", { "literal": " " }, "MultiTarget"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d),
                        line: 266,
                        target: d[3],
                        type: 'Action',
                        action: d[1].action,
                        for_each: d[0] && d[0].for_each,
                        status: d[1].status,
                    };
                } },
            { "name": "DeclareCentral", "symbols": ["MultiTarget", { "literal": " " }, "Immunes"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d),
                        line: 381,
                        target: d[0],
                        type: 'Action',
                        action: d[2].action,
                        status: d[2].status,
                    };
                } },
            { "name": "DeclareCentral$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "r" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$string$3", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$ebnf$4", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "DeclareCentral$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral$string$4", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$ebnf$5", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "DeclareCentral$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral$ebnf$6$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "a" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }, { "literal": "＜" }, { "literal": "D" }, { "literal": "e" }, { "literal": "-" }, { "literal": "E" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }, { "literal": "＞" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DeclareCentral$ebnf$6", "symbols": ["DeclareCentral$ebnf$6$string$1"], "postprocess": id },
            { "name": "DeclareCentral$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral$ebnf$7", "symbols": [{ "literal": "." }], "postprocess": id },
            { "name": "DeclareCentral$ebnf$7", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareCentral", "symbols": ["DeclareCentral$string$2", "MultiTarget", "DeclareCentral$string$3", "DeclareCentral$ebnf$4", "DeclareCentral$string$4", "DeclareCentral$ebnf$5", "DeclareCentral$ebnf$6", "DeclareCentral$ebnf$7"], "postprocess": function (d, l) {
                    console.error("overbroad immunity");
                    return {
                        raw_text: gv(d),
                        line: 384,
                        target: d[1],
                        type: 'Action',
                        action: 'give status',
                        status: {
                            event: 'ALL', // this is overbroad
                            target: "opponent",
                            immune: true,
                            cause: 1
                        }
                    };
                } },
            { "name": "Actions$ebnf$1", "symbols": [] },
            { "name": "Actions$ebnf$1$subexpression$1$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "," }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Actions$ebnf$1$subexpression$1$ebnf$1", "symbols": ["Actions$ebnf$1$subexpression$1$ebnf$1$string$1"], "postprocess": id },
            { "name": "Actions$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Actions$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Actions$ebnf$1$subexpression$1", "symbols": ["Actions$ebnf$1$subexpression$1$ebnf$1", "Actions$ebnf$1$subexpression$1$string$1", "DeclareAction"] },
            { "name": "Actions$ebnf$1", "symbols": ["Actions$ebnf$1", "Actions$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Actions", "symbols": ["DeclareAction", "Actions$ebnf$1"], "postprocess": function (d, l) {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    const array = [d[0], ...d[1].map(x => x[2])];
                    // const array = [];
                    return {
                        raw_text: gv(d),
                        line: 301,
                        array: array, // 
                        type: 'Action',
                        action: (_a = array.find(a => a.action)) === null || _a === void 0 ? void 0 : _a.action,
                        actions: array.filter(a => a.action).map(a => a.action),
                        dp_change: (_b = array.find(a => a.dp_change)) === null || _b === void 0 ? void 0 : _b.dp_change,
                        without_suspending: (_c = array.find(a => a.without_suspending)) === null || _c === void 0 ? void 0 : _c.without_suspending,
                        target2_text: (_d = array.find(a => a.target2_text)) === null || _d === void 0 ? void 0 : _d.target2_text,
                        keyword_gains: (_e = array.find(a => a.keyword_gains)) === null || _e === void 0 ? void 0 : _e.keyword_gains,
                        for_each: (_f = array.find(a => a.for_each)) === null || _f === void 0 ? void 0 : _f.for_each,
                        status: (_g = array.find(a => a.status)) === null || _g === void 0 ? void 0 : _g.status,
                        // if just 1 action has a duration we might encounter it inside here
                        duration: (_h = array.find(a => a.duration)) === null || _h === void 0 ? void 0 : _h.duration,
                    };
                } },
            { "name": "Verb1$string$1", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Verb1", "symbols": ["Verb1$string$1"], "postprocess": function (d) { return { raw_text: gv(d), action: 'suspend' }; } },
            { "name": "Verb1$string$2", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Verb1", "symbols": ["Verb1$string$2"], "postprocess": function (d) { return { raw_text: gv(d), action: 'unsuspend' }; } },
            { "name": "During$string$1", "symbols": [{ "literal": "D" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "n" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "p" }, { "literal": "h" }, { "literal": "a" }, { "literal": "s" }, { "literal": "e" }, { "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "During", "symbols": ["During$string$1"] },
            { "name": "MT$string$1", "symbols": [{ "literal": "1" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MT", "symbols": ["MT$string$1"] },
            { "name": "Duration$string$1", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "t" }, { "literal": "i" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration", "symbols": ["Duration$string$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), expiration: { END_OF_TURN: "OPPONENT" }
                    };
                } },
            { "name": "Duration$ebnf$1", "symbols": [{ "literal": "F" }], "postprocess": id },
            { "name": "Duration$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Duration$ebnf$2", "symbols": [{ "literal": "f" }], "postprocess": id },
            { "name": "Duration$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Duration$string$2", "symbols": [{ "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$ebnf$3", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "Duration$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Duration$ebnf$4", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "Duration$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Duration", "symbols": ["Duration$ebnf$1", "Duration$ebnf$2", "Duration$string$2", "Duration$ebnf$3", "Duration$ebnf$4"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), expiration: { END_OF_TURN: "THIS" }
                    };
                } },
            { "name": "Duration$subexpression$1$string$1", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "t" }, { "literal": "i" }, { "literal": "l" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1", "symbols": ["Duration$subexpression$1$string$1"] },
            { "name": "Duration$subexpression$1$string$2", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "t" }, { "literal": "i" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1$ebnf$1$string$1", "symbols": [{ "literal": "n" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1$ebnf$1", "symbols": ["Duration$subexpression$1$ebnf$1$string$1"], "postprocess": id },
            { "name": "Duration$subexpression$1$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Duration$subexpression$1$string$3", "symbols": [{ "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1", "symbols": ["Duration$subexpression$1$string$2", "Duration$subexpression$1$ebnf$1", "Duration$subexpression$1$string$3"] },
            { "name": "Duration$subexpression$1$string$4", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "t" }, { "literal": "i" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1", "symbols": ["Duration$subexpression$1$string$4"] },
            { "name": "Duration$subexpression$1$string$5", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "t" }, { "literal": "i" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1", "symbols": ["Duration$subexpression$1$string$5"] },
            { "name": "Duration$subexpression$1$string$6", "symbols": [{ "literal": "U" }, { "literal": "n" }, { "literal": "t" }, { "literal": "i" }, { "literal": "l" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "s" }, { "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$subexpression$1", "symbols": ["Duration$subexpression$1$string$6"] },
            { "name": "Duration$ebnf$5$string$1", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Duration$ebnf$5", "symbols": ["Duration$ebnf$5$string$1"], "postprocess": id },
            { "name": "Duration$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Duration", "symbols": ["Duration$subexpression$1", "Duration$ebnf$5"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), expiration: { END_OF_TURN: "OPPONENT" }
                    };
                } },
            { "name": "Cant$string$1", "symbols": [{ "literal": "c" }, { "literal": "a" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "c" }, { "literal": "t" }, { "literal": "i" }, { "literal": "v" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cant$string$2", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cant", "symbols": ["Cant$string$1", "StandaloneText", "Cant$string$2"] },
            { "name": "Cant$string$3", "symbols": [{ "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cant$ebnf$1", "symbols": [] },
            { "name": "Cant$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cant$ebnf$1$subexpression$1", "symbols": ["Cant$ebnf$1$subexpression$1$string$1", "CantActions"] },
            { "name": "Cant$ebnf$1", "symbols": ["Cant$ebnf$1", "Cant$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Cant", "symbols": ["MultiTarget", "Cant$string$3", "CantActions", "Cant$ebnf$1"], "postprocess": function (d) {
                    const { Console } = require("console");
                    const console = new Console(process.stderr);
                    // console.error(298);
                    // console.dir(d, {depth: 5});
                    // console.error(300);
                    const array = [d[2], ...d[3].map(x => x[1])];
                    return {
                        raw_text: gv(d),
                        type: 'Cant',
                        action: 'give status',
                        target: d[0],
                        immune: true,
                        status: array.map(x => ({
                            event: x.event,
                            immune: true,
                            target: x.target || ''
                        }))
                    };
                } },
            { "name": "Cant$string$4", "symbols": [{ "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cant", "symbols": ["MultiTarget", "Cant$string$4"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d),
                        type: 'Action',
                        action: 'attack',
                        optional: true,
                        target: d[0],
                    };
                } },
            { "name": "CantActions$string$1", "symbols": [{ "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CantActions$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CantActions$ebnf$1", "symbols": ["CantActions$ebnf$1$string$1"], "postprocess": id },
            { "name": "CantActions$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CantActions", "symbols": ["CantActions$string$1", "CantActions$ebnf$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), event: 'ATTACK_DECLARE', target: d[1] ? "player" : ""
                    };
                } },
            { "name": "CantActions$string$2", "symbols": [{ "literal": "b" }, { "literal": "l" }, { "literal": "o" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CantActions", "symbols": ["CantActions$string$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), event: 'BLOCK'
                    };
                } },
            { "name": "DeclareAction$subexpression$1", "symbols": ["Gets"] },
            { "name": "DeclareAction$subexpression$1", "symbols": ["Gains"] },
            { "name": "DeclareAction$subexpression$1", "symbols": ["Immunes"] },
            { "name": "DeclareAction$subexpression$1", "symbols": ["Attacks"] },
            { "name": "DeclareAction$subexpression$1", "symbols": ["Verb1"] },
            { "name": "DeclareAction$ebnf$1", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "DeclareAction$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareAction$ebnf$2", "symbols": ["Duration"], "postprocess": id },
            { "name": "DeclareAction$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DeclareAction", "symbols": ["DeclareAction$subexpression$1", "DeclareAction$ebnf$1", "DeclareAction$ebnf$2"], "postprocess": function (d) {
                    let obj = d[0][0];
                    if (d[2])
                        obj.duration = d[2];
                    return obj;
                } },
            { "name": "Action$subexpression$1", "symbols": ["Play"] },
            { "name": "Action$subexpression$1", "symbols": ["Link"] },
            { "name": "Action$subexpression$1", "symbols": ["Return"] },
            { "name": "Action$subexpression$1", "symbols": ["Place"] },
            { "name": "Action$subexpression$1", "symbols": ["Attack"] },
            { "name": "Action$subexpression$1", "symbols": ["Evolve"] },
            { "name": "Action$subexpression$1", "symbols": ["Suspend"] },
            { "name": "Action", "symbols": ["Action$subexpression$1"], "postprocess": function (ds, l) {
                    const d = ds[0];
                    return {
                        raw_text: gv(d),
                        type: 'Action',
                        line: 380,
                        action: d[0].action,
                        action_args: d[0]
                    };
                } },
            { "name": "ForFree$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": "o" }, { "literal": "u" }, { "literal": "t" }, { "literal": " " }, { "literal": "p" }, { "literal": "a" }, { "literal": "y" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForFree$ebnf$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForFree$ebnf$1", "symbols": ["ForFree$ebnf$1$string$1"], "postprocess": id },
            { "name": "ForFree$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForFree$ebnf$2$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForFree$ebnf$2", "symbols": ["ForFree$ebnf$2$string$1"], "postprocess": id },
            { "name": "ForFree$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForFree$ebnf$3$string$1", "symbols": [{ "literal": "m" }, { "literal": "e" }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForFree$ebnf$3", "symbols": ["ForFree$ebnf$3$string$1"], "postprocess": id },
            { "name": "ForFree$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForFree$ebnf$4$string$1", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForFree$ebnf$4", "symbols": ["ForFree$ebnf$4$string$1"], "postprocess": id },
            { "name": "ForFree$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForFree$ebnf$5", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "ForFree$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForFree", "symbols": ["ForFree$string$1", "ForFree$ebnf$1", "ForFree$ebnf$2", "ForFree$ebnf$3", "ForFree$ebnf$4", "ForFree$ebnf$5"] },
            { "name": "ForMemCost$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForMemCost$ebnf$1$string$1", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForMemCost$ebnf$1", "symbols": ["ForMemCost$ebnf$1$string$1"], "postprocess": id },
            { "name": "ForMemCost$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForMemCost$string$2", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForMemCost$ebnf$2", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "ForMemCost$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForMemCost", "symbols": ["ForMemCost$string$1", "ForMemCost$ebnf$1", "ForMemCost$string$2", "ForMemCost$ebnf$2"] },
            { "name": "Attacks$string$1", "symbols": [{ "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Attacks$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Attacks$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Attacks$ebnf$2", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "Attacks$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Attacks$ebnf$3$string$1", "symbols": [{ "literal": "a" }, { "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Attacks$ebnf$3", "symbols": ["Attacks$ebnf$3$string$1"], "postprocess": id },
            { "name": "Attacks$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Attacks$ebnf$4", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "Attacks$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Attacks$ebnf$5", "symbols": ["WithoutSuspending"], "postprocess": id },
            { "name": "Attacks$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Attacks", "symbols": ["Attacks$string$1", "Attacks$ebnf$1", "Attacks$ebnf$2", "Attacks$ebnf$3", "Attacks$ebnf$4", "Attacks$ebnf$5"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d),
                        type: 'Action',
                        target2_text: d[3],
                        action: 'attack',
                        without_suspending: !!d[5],
                    };
                } },
            { "name": "Evolve$string$1", "symbols": [{ "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Evolve$ebnf$1", "symbols": ["ForFree"], "postprocess": id },
            { "name": "Evolve$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Evolve$ebnf$2", "symbols": ["ForMemCost"], "postprocess": id },
            { "name": "Evolve$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Evolve", "symbols": ["MultiTarget", "Evolve$string$1", "MultiTarget", "Evolve$ebnf$1", "Evolve$ebnf$2"], "postprocess": function (d, l) { return { optional: true, raw_text: gv(d), action: 'evolve', target2: d[0], target: d[2], no_cost: !!d[4] }; } },
            { "name": "Evolve$string$2", "symbols": [{ "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "a" }, { "literal": "p" }, { "literal": "p" }, { "literal": " " }, { "literal": "f" }, { "literal": "u" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Evolve$ebnf$3", "symbols": ["ForFree"], "postprocess": id },
            { "name": "Evolve$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Evolve$ebnf$4", "symbols": ["ForMemCost"], "postprocess": id },
            { "name": "Evolve$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Evolve", "symbols": ["MultiTarget", "Evolve$string$2", "MultiTarget", "Evolve$ebnf$3", "Evolve$ebnf$4"], "postprocess": function (d, l) { return { optional: true, raw_text: gv(d), action: 'evolve', appfuse: true, target2: d[0], target: d[2], no_cost: !!d[4] }; } },
            { "name": "Devolve$string$1", "symbols": [{ "literal": "T" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Devolve$string$2", "symbols": [{ "literal": "," }, { "literal": " " }, { "literal": "＜" }, { "literal": "D" }, { "literal": "e" }, { "literal": "-" }, { "literal": "E" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Devolve", "symbols": ["Devolve$string$1", "MultiTarget", "Devolve$string$2", "Number", { "literal": "＞" }], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'devolve', target: d[1], number: gv(d[3])
                    };
                } },
            { "name": "Devolve$string$3", "symbols": [{ "literal": "＜" }, { "literal": "D" }, { "literal": "e" }, { "literal": "-" }, { "literal": "E" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Devolve$string$4", "symbols": [{ "literal": "＞" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Devolve", "symbols": ["Devolve$string$3", "Number", "Devolve$string$4", "MultiTarget"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'devolve',
                        target: d[3],
                        number: parseInt(gv(d[1]))
                    };
                } },
            { "name": "Attack$subexpression$1$string$1", "symbols": [{ "literal": "A" }, { "literal": "t" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Attack$subexpression$1", "symbols": ["Attack$subexpression$1$string$1"] },
            { "name": "Attack$subexpression$1$string$2", "symbols": [{ "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Attack$subexpression$1", "symbols": ["Attack$subexpression$1$string$2"] },
            { "name": "Attack$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Attack$ebnf$1", "symbols": ["WithoutSuspending"], "postprocess": id },
            { "name": "Attack$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Attack", "symbols": ["Attack$subexpression$1", "Attack$string$1", "MultiTarget", "Attack$ebnf$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'attack', target: d[2], without_suspending: !!d[3]
                    };
                } },
            { "name": "Play$subexpression$1$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Play$subexpression$1", "symbols": ["Play$subexpression$1$string$1"] },
            { "name": "Play$subexpression$1$string$2", "symbols": [{ "literal": "P" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Play$subexpression$1", "symbols": ["Play$subexpression$1$string$2"] },
            { "name": "Play$ebnf$1", "symbols": ["ForFree"], "postprocess": id },
            { "name": "Play$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Play", "symbols": ["Play$subexpression$1", "MultiTarget", "Play$ebnf$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'play', target: d[1], no_cost: !!d[2]
                    };
                } },
            { "name": "Link$subexpression$1$string$1", "symbols": [{ "literal": "l" }, { "literal": "i" }, { "literal": "n" }, { "literal": "k" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Link$subexpression$1", "symbols": ["Link$subexpression$1$string$1"] },
            { "name": "Link$subexpression$1$string$2", "symbols": [{ "literal": "L" }, { "literal": "i" }, { "literal": "n" }, { "literal": "k" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Link$subexpression$1", "symbols": ["Link$subexpression$1$string$2"] },
            { "name": "Link$subexpression$2$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Link$subexpression$2", "symbols": ["Link$subexpression$2$string$1"] },
            { "name": "Link$subexpression$2$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Link$subexpression$2", "symbols": ["Link$subexpression$2$string$2"] },
            { "name": "Link$ebnf$1", "symbols": ["ForFree"], "postprocess": id },
            { "name": "Link$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Link", "symbols": ["Link$subexpression$1", "MultiTarget", "Link$subexpression$2", "MultiTarget", "Link$ebnf$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'link', target: d[1], target2: d[3], no_cost: !!d[4]
                    };
                } },
            { "name": "Suspend$subexpression$1$string$1", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Suspend$subexpression$1", "symbols": ["Suspend$subexpression$1$string$1"] },
            { "name": "Suspend$subexpression$1$string$2", "symbols": [{ "literal": "S" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Suspend$subexpression$1", "symbols": ["Suspend$subexpression$1$string$2"] },
            { "name": "Suspend$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": "g" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Suspend$ebnf$1$subexpression$1", "symbols": ["Suspend$ebnf$1$subexpression$1$string$1"] },
            { "name": "Suspend$ebnf$1$subexpression$1", "symbols": [{ "literal": "s" }] },
            { "name": "Suspend$ebnf$1", "symbols": ["Suspend$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "Suspend$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Suspend", "symbols": ["Suspend$subexpression$1", "Suspend$ebnf$1", { "literal": " " }, "MultiTarget"], "postprocess": function (d, l) { return { raw_text: gv(d), action: 'suspend', target: d[3] }; } },
            { "name": "Return$subexpression$1$string$1", "symbols": [{ "literal": "R" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$1", "symbols": ["Return$subexpression$1$string$1"] },
            { "name": "Return$subexpression$1$string$2", "symbols": [{ "literal": "r" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$1", "symbols": ["Return$subexpression$1$string$2"] },
            { "name": "Return$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$2$string$1", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$2", "symbols": ["Return$subexpression$2$string$1"] },
            { "name": "Return$subexpression$2$string$2", "symbols": [{ "literal": "t" }, { "literal": "o" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$2", "symbols": ["Return$subexpression$2$string$2"] },
            { "name": "Return$string$2", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return", "symbols": ["Return$subexpression$1", "MultiTarget", "Return$string$1", "Return$subexpression$2", "Return$string$2"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: d[3][0] === "bottom" ? 'bottomdeck' : 'topdeck', target: d[1]
                    };
                } },
            { "name": "Return$subexpression$3$string$1", "symbols": [{ "literal": "R" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$3", "symbols": ["Return$subexpression$3$string$1"] },
            { "name": "Return$subexpression$3$string$2", "symbols": [{ "literal": "r" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$3", "symbols": ["Return$subexpression$3$string$2"] },
            { "name": "Return$string$3", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$4$string$1", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$4", "symbols": ["Return$subexpression$4$string$1"] },
            { "name": "Return$subexpression$4$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return$subexpression$4", "symbols": ["Return$subexpression$4$string$2"] },
            { "name": "Return$string$4", "symbols": [{ "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Return", "symbols": ["Return$subexpression$3", "MultiTarget", "Return$string$3", "Return$subexpression$4", "Return$string$4"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'PlaceCard', target: d[1], target2: { raw_text: "hand" }
                    };
                } },
            { "name": "ModifyCost$string$1", "symbols": [{ "literal": "r" }, { "literal": "e" }, { "literal": "d" }, { "literal": "u" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$1", "symbols": ["ModifyCost$ebnf$1$string$1"], "postprocess": id },
            { "name": "ModifyCost$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ModifyCost$ebnf$2$string$1", "symbols": [{ "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$2", "symbols": ["ModifyCost$ebnf$2$string$1"], "postprocess": id },
            { "name": "ModifyCost$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ModifyCost$ebnf$3$subexpression$1$string$1", "symbols": [{ "literal": "u" }, { "literal": "s" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$3$subexpression$1", "symbols": ["ModifyCost$ebnf$3$subexpression$1$string$1"] },
            { "name": "ModifyCost$ebnf$3$subexpression$1$string$2", "symbols": [{ "literal": "m" }, { "literal": "e" }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$3$subexpression$1", "symbols": ["ModifyCost$ebnf$3$subexpression$1$string$2"] },
            { "name": "ModifyCost$ebnf$3$subexpression$1$string$3", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$3$subexpression$1", "symbols": ["ModifyCost$ebnf$3$subexpression$1$string$3"] },
            { "name": "ModifyCost$ebnf$3$subexpression$1$string$4", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$3$subexpression$1", "symbols": ["ModifyCost$ebnf$3$subexpression$1$string$4"] },
            { "name": "ModifyCost$ebnf$3", "symbols": ["ModifyCost$ebnf$3$subexpression$1"], "postprocess": id },
            { "name": "ModifyCost$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ModifyCost$ebnf$4", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "ModifyCost$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ModifyCost$string$2", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$5$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost$ebnf$5", "symbols": ["ModifyCost$ebnf$5$string$1"], "postprocess": id },
            { "name": "ModifyCost$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ModifyCost$string$3", "symbols": [{ "literal": " " }, { "literal": "b" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ModifyCost", "symbols": ["ModifyCost$string$1", "ModifyCost$ebnf$1", "ModifyCost$ebnf$2", "ModifyCost$ebnf$3", "ModifyCost$ebnf$4", "ModifyCost$string$2", "ModifyCost$ebnf$5", "ModifyCost$string$3", "Number"], "postprocess": function (d, l) { return { raw_text: gv(d), action: 'modifycost', number: gv(d[8]) }; } },
            { "name": "WithoutSuspending$string$1", "symbols": [{ "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": "o" }, { "literal": "u" }, { "literal": "t" }, { "literal": " " }, { "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WithoutSuspending$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WithoutSuspending$ebnf$1", "symbols": ["WithoutSuspending$ebnf$1$string$1"], "postprocess": id },
            { "name": "WithoutSuspending$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "WithoutSuspending", "symbols": ["WithoutSuspending$string$1", "WithoutSuspending$ebnf$1"] },
            { "name": "ForEach$subexpression$1$string$1", "symbols": [{ "literal": "F" }, { "literal": "o" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$1", "symbols": ["ForEach$subexpression$1$string$1"] },
            { "name": "ForEach$subexpression$1$string$2", "symbols": [{ "literal": "f" }, { "literal": "o" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$1", "symbols": ["ForEach$subexpression$1$string$2"] },
            { "name": "ForEach$subexpression$2$string$1", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "r" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$2", "symbols": ["ForEach$subexpression$2$string$1"] },
            { "name": "ForEach$subexpression$2$string$2", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "a" }, { "literal": "c" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$2", "symbols": ["ForEach$subexpression$2$string$2"] },
            { "name": "ForEach$ebnf$1$string$1", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$ebnf$1", "symbols": ["ForEach$ebnf$1$string$1"], "postprocess": id },
            { "name": "ForEach$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForEach$subexpression$3$string$1", "symbols": [{ "literal": "2" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "s" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "T" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "v" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$3", "symbols": ["ForEach$subexpression$3$string$1"] },
            { "name": "ForEach$subexpression$3$string$2", "symbols": [{ "literal": "2" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "T" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": "'" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$3", "symbols": ["ForEach$subexpression$3$string$2"] },
            { "name": "ForEach$subexpression$3$string$3", "symbols": [{ "literal": "T" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }, { "literal": "a" }, { "literal": " " }, { "literal": "d" }, { "literal": "i" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "r" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$3", "symbols": ["ForEach$subexpression$3$string$3"] },
            { "name": "ForEach$subexpression$3$string$4", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$3", "symbols": ["ForEach$subexpression$3$string$4"] },
            { "name": "ForEach$subexpression$3", "symbols": ["MultiTarget"] },
            { "name": "ForEach$subexpression$3$string$5", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ForEach$subexpression$3", "symbols": ["ForEach$subexpression$3$string$5", "MultiTarget"] },
            { "name": "ForEach$ebnf$2", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "ForEach$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForEach$ebnf$3", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "ForEach$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "ForEach", "symbols": ["ForEach$subexpression$1", "ForEach$subexpression$2", "ForEach$ebnf$1", "ForEach$subexpression$3", "ForEach$ebnf$2", "ForEach$ebnf$3"], "postprocess": function (d) {
                    return {
                        type: "ForEach-1",
                        raw_text: gv(d), for_each: gv(d[3])
                    };
                } },
            { "name": "Gets$ebnf$1", "symbols": ["ForEach"], "postprocess": id },
            { "name": "Gets$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Gets$subexpression$1$string$1", "symbols": [{ "literal": "g" }, { "literal": "e" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Gets$subexpression$1", "symbols": ["Gets$subexpression$1$string$1"] },
            { "name": "Gets$subexpression$1$string$2", "symbols": [{ "literal": "g" }, { "literal": "e" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Gets$subexpression$1", "symbols": ["Gets$subexpression$1$string$2"] },
            { "name": "Gets$ebnf$2", "symbols": [{ "literal": "+" }], "postprocess": id },
            { "name": "Gets$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Gets$string$1", "symbols": [{ "literal": " " }, { "literal": "D" }, { "literal": "P" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Gets", "symbols": ["Gets$ebnf$1", "Gets$subexpression$1", "Gets$ebnf$2", "Number", "Gets$string$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'give status',
                        dp_change: "gets " + gv([d[2], d[3], d[4]]),
                        for_each: d[0] && d[0].for_each,
                        REDUNDANT_status: {
                            event: 'DP_CHANGE',
                            n: gv(d[3]),
                            for_each: d[0] && d[0].for_each,
                        }
                    };
                } },
            { "name": "Gains$subexpression$1$string$1", "symbols": [{ "literal": "g" }, { "literal": "a" }, { "literal": "i" }, { "literal": "n" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Gains$subexpression$1", "symbols": ["Gains$subexpression$1$string$1"] },
            { "name": "Gains$subexpression$1$string$2", "symbols": [{ "literal": "g" }, { "literal": "a" }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Gains$subexpression$1", "symbols": ["Gains$subexpression$1$string$2"] },
            { "name": "Gains$subexpression$2", "symbols": ["Keyword"] },
            { "name": "Gains$subexpression$2$string$1", "symbols": [{ "literal": "N" }, { "literal": "E" }, { "literal": "S" }, { "literal": "T" }, { "literal": "E" }, { "literal": "D" }, { "literal": " " }, { "literal": "E" }, { "literal": "F" }, { "literal": "F" }, { "literal": "E" }, { "literal": "C" }, { "literal": "T" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Gains$subexpression$2", "symbols": ["Gains$subexpression$2$string$1"] },
            { "name": "Gains", "symbols": ["Gains$subexpression$1", "Gains$subexpression$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'give status',
                        line: 308,
                        keyword_gains: "gains " + gv(d[1]),
                        status_maybenot: {
                            event: 'KEYWORD',
                        }
                    };
                } },
            { "name": "Immunes$subexpression$1$string$1", "symbols": [{ "literal": "i" }, { "literal": "s" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "e" }, { "literal": "d" }, { "literal": " " }, { "literal": "b" }, { "literal": "y" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Immunes$subexpression$1", "symbols": ["Immunes$subexpression$1$string$1"] },
            { "name": "Immunes$subexpression$1$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "d" }, { "literal": "o" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Immunes$subexpression$1", "symbols": ["Immunes$subexpression$1$string$2"] },
            { "name": "Immunes", "symbols": ["Immunes$subexpression$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d),
                        type: 'Status',
                        action: 'give status',
                        status: {
                            event: 'ALL',
                            target: "their monster",
                            immune: true,
                            cause: 1
                        }
                    };
                } },
            { "name": "Cost$subexpression$1$string$1", "symbols": [{ "literal": "B" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cost$subexpression$1", "symbols": ["Cost$subexpression$1$string$1"] },
            { "name": "Cost$subexpression$1$string$2", "symbols": [{ "literal": "b" }, { "literal": "y" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cost$subexpression$1", "symbols": ["Cost$subexpression$1$string$2"] },
            { "name": "Cost", "symbols": ["Cost$subexpression$1", "Imperative"] },
            { "name": "Imperative", "symbols": ["_Imperative"], "postprocess": (d) => [d[0]] },
            { "name": "Imperative$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Imperative", "symbols": ["_Imperative", "Imperative$string$1", "_Imperative"], "postprocess": function (d) {
                    return [d[0], d[2]];
                } },
            { "name": "_Imperative", "symbols": ["Activate"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Add"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Place"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Trash"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Delete"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Choose"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Devolve"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Play"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Return"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Evolve"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Cancel"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["ModifyCost"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["Suspend"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["GiveStatus"] },
            { "name": "_Imperative$subexpression$1", "symbols": ["MemChange"] },
            { "name": "_Imperative", "symbols": ["_Imperative$subexpression$1"], "postprocess": function (ds, l) {
                    const d = ds[0];
                    return { raw_text: gv(d),
                        type: 'Action',
                        action: d[0].action,
                        line: 472,
                        action_args: d[0] };
                } },
            { "name": "Activate$string$1", "symbols": [{ "literal": "A" }, { "literal": "c" }, { "literal": "t" }, { "literal": "i" }, { "literal": "v" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }, { "literal": " " }, { "literal": "1" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Activate$string$2", "symbols": [{ "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Activate$string$3", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Activate", "symbols": ["Activate$string$1", "thingy", "Activate$string$2", "StandaloneText", "Activate$string$3"] },
            { "name": "thingy$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "thingy", "symbols": ["thingy$string$1"] },
            { "name": "Cancel$string$1", "symbols": [{ "literal": "p" }, { "literal": "r" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Cancel", "symbols": ["Cancel$string$1"] },
            { "name": "Evolve$string$3", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Evolve$string$4", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Evolve$ebnf$5", "symbols": ["ForFree"], "postprocess": id },
            { "name": "Evolve$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Evolve", "symbols": ["Evolve$string$3", "MultiTarget", "Evolve$string$4", "MultiTarget", "Evolve$ebnf$5"] },
            { "name": "Add$subexpression$1$string$1", "symbols": [{ "literal": "A" }, { "literal": "d" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$1", "symbols": ["Add$subexpression$1$string$1"] },
            { "name": "Add$subexpression$1$string$2", "symbols": [{ "literal": "a" }, { "literal": "d" }, { "literal": "d" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$1", "symbols": ["Add$subexpression$1$string$2"] },
            { "name": "Add$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$ebnf$1", "symbols": ["Add$ebnf$1$string$1"], "postprocess": id },
            { "name": "Add$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Add$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "m" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$2$string$1", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$2", "symbols": ["Add$subexpression$2$string$1"] },
            { "name": "Add$subexpression$2$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$2", "symbols": ["Add$subexpression$2$string$2"] },
            { "name": "Add$string$2", "symbols": [{ "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add", "symbols": ["Add$subexpression$1", "MultiTarget", "Add$ebnf$1", "Add$string$1", "Add$subexpression$2", "Add$string$2"] },
            { "name": "Add$string$3", "symbols": [{ "literal": "A" }, { "literal": "d" }, { "literal": "d" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$3$string$1", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$3", "symbols": ["Add$subexpression$3$string$1"] },
            { "name": "Add$subexpression$3$string$2", "symbols": [{ "literal": "t" }, { "literal": "o" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$3", "symbols": ["Add$subexpression$3$string$2"] },
            { "name": "Add$string$4", "symbols": [{ "literal": " " }, { "literal": "s" }, { "literal": "e" }, { "literal": "c" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add", "symbols": ["Add$string$3", "Add$subexpression$3", "Add$string$4"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'MoveCard',
                        target: "hand", // to
                        target2: { raw_text: "your security" },
                        //    place_location: "bottom" 
                    };
                } },
            { "name": "Add$string$5", "symbols": [{ "literal": "A" }, { "literal": "d" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$4$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$4", "symbols": ["Add$subexpression$4$string$1"] },
            { "name": "Add$string$6", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$5$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$5", "symbols": ["Add$subexpression$5$string$1"] },
            { "name": "Add$subexpression$5$string$2", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add$subexpression$5", "symbols": ["Add$subexpression$5$string$2"] },
            { "name": "Add$string$7", "symbols": [{ "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Add", "symbols": ["Add$string$5", "Add$subexpression$4", "Add$string$6", "Add$subexpression$5", "Add$string$7"] },
            { "name": "MemChange$string$1", "symbols": [{ "literal": "g" }, { "literal": "a" }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MemChange$string$2", "symbols": [{ "literal": " " }, { "literal": "m" }, { "literal": "e" }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MemChange", "symbols": ["MemChange$string$1", "Number", "MemChange$string$2"] },
            { "name": "OtherTarget$string$1", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "c" }, { "literal": "k" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": "p" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherTarget", "symbols": ["OtherTarget$string$1"], "postprocess": function (d) { return { raw_text: gv(d) }; } },
            { "name": "Place$subexpression$1$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$1", "symbols": ["Place$subexpression$1$string$1"] },
            { "name": "Place$subexpression$1$string$2", "symbols": [{ "literal": "P" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$1", "symbols": ["Place$subexpression$1$string$2"] },
            { "name": "Place$subexpression$1$string$3", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$1", "symbols": ["Place$subexpression$1$string$3"] },
            { "name": "Place$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "u" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$ebnf$1", "symbols": ["Place$ebnf$1$string$1"], "postprocess": id },
            { "name": "Place$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Place$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$2$string$1", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$2", "symbols": ["Place$subexpression$2$string$1"] },
            { "name": "Place$subexpression$2$string$2", "symbols": [{ "literal": "t" }, { "literal": "o" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$2", "symbols": ["Place$subexpression$2$string$2"] },
            { "name": "Place$string$2", "symbols": [{ "literal": " " }, { "literal": "s" }, { "literal": "e" }, { "literal": "c" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place", "symbols": ["Place$subexpression$1", "MultiTarget", "Place$ebnf$1", "Place$string$1", "Place$subexpression$2", "Place$string$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'MoveToSecurity',
                        choose: 1,
                        target: d[1],
                        target2: { raw_text: "security" },
                        place_location: gv(d[4]),
                        //    face_up: !!d[2]
                    };
                } },
            { "name": "Place$subexpression$3$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$3", "symbols": ["Place$subexpression$3$string$1"] },
            { "name": "Place$subexpression$3$string$2", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$3", "symbols": ["Place$subexpression$3$string$2"] },
            { "name": "Place$subexpression$3$string$3", "symbols": [{ "literal": "P" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$3", "symbols": ["Place$subexpression$3$string$3"] },
            { "name": "Place$subexpression$4", "symbols": ["MultiTarget"] },
            { "name": "Place$subexpression$4", "symbols": ["OtherTarget"] },
            { "name": "Place$ebnf$2$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "o" }, { "literal": "w" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$ebnf$2", "symbols": ["Place$ebnf$2$string$1"], "postprocess": id },
            { "name": "Place$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Place$subexpression$5$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$5", "symbols": ["Place$subexpression$5$string$1"] },
            { "name": "Place$subexpression$5$string$2", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$5", "symbols": ["Place$subexpression$5$string$2"] },
            { "name": "Place$subexpression$6$string$1", "symbols": [{ "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$6", "symbols": ["Place$subexpression$6$string$1"] },
            { "name": "Place$subexpression$6$string$2", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$6", "symbols": ["Place$subexpression$6$string$2"] },
            { "name": "Place$ebnf$3$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$ebnf$3", "symbols": ["Place$ebnf$3$string$1"], "postprocess": id },
            { "name": "Place$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Place$ebnf$4", "symbols": ["Target"], "postprocess": id },
            { "name": "Place$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Place", "symbols": ["Place$subexpression$3", "Place$subexpression$4", "Place$ebnf$2", "Place$subexpression$5", "MultiTarget", "Place$subexpression$6", "Place$ebnf$3", "Place$ebnf$4"], "postprocess": function (d) {
                    let t1 = d[1][0];
                    let t2 = d[4];
                    // this function runs multiple times :< :< :<
                    if (d[7]) {
                        if (!t2.bob) {
                            t2.bob = "alreadyrun"; // to stop other matches in the grammar tree
                            // this somehow causes things to break because it sets choose to 0. Maybe
                            // once legacy parsing is all dead we can be pure and have this here
                            //    t2.raw_text += " or " + d[6].raw_text;
                            t2.targets.push(d[7]);
                        }
                    }
                    return {
                        line: 680,
                        raw_text: gv(d), action: 'Tuck',
                        face_down: !!d[2],
                        choose: 1,
                        xxx_d6: d[7],
                        target: t1,
                        target2: t2,
                        //    old_target2: {        raw_text: gv(d[3]) + " or " + gv(d[s6]),        targets: [ d[3], d[6] ] },
                        place_location: "bottom"
                    };
                } },
            { "name": "Place$string$3", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$ebnf$5$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "o" }, { "literal": "w" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$ebnf$5", "symbols": ["Place$ebnf$5$string$1"], "postprocess": id },
            { "name": "Place$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Place$subexpression$7$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$7", "symbols": ["Place$subexpression$7$string$1"] },
            { "name": "Place$subexpression$7$string$2", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$7", "symbols": ["Place$subexpression$7$string$2"] },
            { "name": "Place$subexpression$8$string$1", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": "y" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$8", "symbols": ["Place$subexpression$8$string$1"] },
            { "name": "Place$subexpression$8$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$8", "symbols": ["Place$subexpression$8$string$2"] },
            { "name": "Place$string$4", "symbols": [{ "literal": " " }, { "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place", "symbols": ["Place$string$3", "MultiTarget", "Place$ebnf$5", "Place$subexpression$7", "Place$subexpression$8", "Place$string$4"], "postprocess": function (d) {
                    const that_monster = {
                        raw_text: 'that Monster',
                        type: 'MultiTarget',
                        case: '1ORMORE',
                        count: 1,
                        targets: [
                            {
                                raw_text: 'that Monster',
                                type: 'Target-2',
                                and: [{ raw_text: 'that', it: true }],
                                count: 1,
                                adj_text: 'that',
                                entity: 'Monster',
                                entity_txt: 'Monster',
                                entity_match: {
                                    raw_text: 'Monster',
                                    entity: 'Monster',
                                    and: [{ raw_text: 'Monster', entity_type: 'Monster' }],
                                    type: 'Entity'
                                },
                            }
                        ],
                    };
                    return {
                        raw_text: gv(d), action: 'PlaceCard',
                        choose: 1,
                        target: d[1],
                        target2: that_monster,
                        place_location: "bottom",
                        face_down: !!d[2],
                    };
                } },
            { "name": "Place$subexpression$9$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$9", "symbols": ["Place$subexpression$9$string$1"] },
            { "name": "Place$subexpression$9$string$2", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$9", "symbols": ["Place$subexpression$9$string$2"] },
            { "name": "Place$ebnf$6$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "o" }, { "literal": "w" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$ebnf$6", "symbols": ["Place$ebnf$6$string$1"], "postprocess": id },
            { "name": "Place$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Place$subexpression$10$string$1", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$10", "symbols": ["Place$subexpression$10$string$1"] },
            { "name": "Place$subexpression$10$string$2", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Place$subexpression$10", "symbols": ["Place$subexpression$10$string$2"] },
            { "name": "Place", "symbols": ["Place$subexpression$9", "MultiTarget", "Place$ebnf$6", "Place$subexpression$10", "MultiTarget"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'PlaceCard',
                        choose: 1,
                        target: d[1],
                        target2: d[4],
                        place_location: "bottom",
                        face_down: !!d[2],
                    };
                } },
            { "name": "Choose$subexpression$1$string$1", "symbols": [{ "literal": "c" }, { "literal": "h" }, { "literal": "o" }, { "literal": "o" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Choose$subexpression$1", "symbols": ["Choose$subexpression$1$string$1"] },
            { "name": "Choose$subexpression$1$string$2", "symbols": [{ "literal": "C" }, { "literal": "h" }, { "literal": "o" }, { "literal": "o" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Choose$subexpression$1", "symbols": ["Choose$subexpression$1$string$2"] },
            { "name": "Choose", "symbols": ["Choose$subexpression$1", "MultiTarget"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'Choose',
                        choose: d[1].count,
                        target: d[1]
                    };
                } },
            { "name": "Trash$subexpression$1$string$1", "symbols": [{ "literal": "T" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$1", "symbols": ["Trash$subexpression$1$string$1"] },
            { "name": "Trash$subexpression$1$string$2", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$1", "symbols": ["Trash$subexpression$1$string$2"] },
            { "name": "Trash$subexpression$1$string$3", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$1", "symbols": ["Trash$subexpression$1$string$3"] },
            { "name": "Trash$subexpression$2$string$1", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$2", "symbols": ["Trash$subexpression$2$string$1"] },
            { "name": "Trash$subexpression$2$string$2", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$2", "symbols": ["Trash$subexpression$2$string$2"] },
            { "name": "Trash$subexpression$3$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$3", "symbols": ["Trash$subexpression$3$string$1"] },
            { "name": "Trash$subexpression$3$string$2", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$3", "symbols": ["Trash$subexpression$3$string$2"] },
            { "name": "Trash$string$1", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash", "symbols": ["Trash$subexpression$1", "MultiTarget", "Trash$subexpression$2", "Trash$subexpression$3", "Trash$string$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), action: 'SourceStrip',
                        choose: d[1].count,
                        // this branch is used in when-this-evo-card-trash and delayed-bounce-crash
                        target: d[1],
                    };
                } },
            { "name": "Trash$subexpression$4$string$1", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$4", "symbols": ["Trash$subexpression$4$string$1"] },
            { "name": "Trash$subexpression$4$string$2", "symbols": [{ "literal": "T" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$4", "symbols": ["Trash$subexpression$4$string$2"] },
            { "name": "Trash$subexpression$4$string$3", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$4", "symbols": ["Trash$subexpression$4$string$3"] },
            { "name": "Trash", "symbols": ["Trash$subexpression$4", "MultiTarget"], "postprocess": function (d, l, r) {
                    if (!gv(d[1]).includes("evolution card") &&
                        !gv(d[1]).includes("link card"))
                        return r;
                    return {
                        line: 541,
                        raw_text: gv(d), action: 'SourceStrip',
                        choose: d[1].count,
                        // this branch is used in when-this-evo-card-trash and delayed-bounce-crash
                        target: d[1],
                    };
                } },
            { "name": "Trash$subexpression$5$string$1", "symbols": [{ "literal": "T" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$5", "symbols": ["Trash$subexpression$5$string$1"] },
            { "name": "Trash$subexpression$5$string$2", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$5", "symbols": ["Trash$subexpression$5$string$2"] },
            { "name": "Trash$subexpression$5$string$3", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$5", "symbols": ["Trash$subexpression$5$string$3"] },
            { "name": "Trash$subexpression$5$string$4", "symbols": [{ "literal": "C" }, { "literal": "h" }, { "literal": "o" }, { "literal": "o" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$5", "symbols": ["Trash$subexpression$5$string$4"] },
            { "name": "Trash$subexpression$6$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$6", "symbols": ["Trash$subexpression$6$string$1"] },
            { "name": "Trash$subexpression$6$string$2", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$6", "symbols": ["Trash$subexpression$6$string$2"] },
            { "name": "Trash$subexpression$6$string$3", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$6", "symbols": ["Trash$subexpression$6$string$3"] },
            { "name": "Trash$ebnf$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$ebnf$1", "symbols": ["Trash$ebnf$1$string$1"], "postprocess": id },
            { "name": "Trash$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Trash", "symbols": ["Trash$subexpression$5", "MultiTarget", "Trash$subexpression$6", "MultiTarget", "Trash$ebnf$1"], "postprocess": function (d, l, r) {
                    ///   if (! gv(d[1]).includes("card")) return r;  // this hits "security card" too :<
                    if (!gv(d[1]).includes("evolution card"))
                        return r;
                    let target = d[3];
                    //    console.error(495, gv(target));
                    if (!gv(target).match(/^[1-9].*/))
                        return r; // require a number to double-target
                    let target2 = d[1];
                    target2.targets[0].under = { raw_text: "under it", targetnumber: 1 };
                    return {
                        raw_text: gv(d), action: 'EvoSourceDoubleRemove',
                        xxx_target2_txt: gv(d[1]),
                        target: target,
                        target2: target2,
                        xxx_target1_txt: gv(d[6]),
                        // can we get rid of choose??
                        //    choose: d[8].count,
                        //   target: d[8],
                        // n: Number(gv(d[4])),
                        //place: gv(d[2])
                    };
                } },
            { "name": "Trash$subexpression$7$string$1", "symbols": [{ "literal": "F" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$7", "symbols": ["Trash$subexpression$7$string$1"] },
            { "name": "Trash$subexpression$7$string$2", "symbols": [{ "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash$subexpression$7", "symbols": ["Trash$subexpression$7$string$2"] },
            { "name": "Trash$string$2", "symbols": [{ "literal": "," }, { "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Trash", "symbols": ["Trash$subexpression$7", "MultiTarget", "Trash$string$2", "MultiTarget"], "postprocess": function (d) {
                    let target = d[1];
                    target.search_type = "entity";
                    let target2 = d[3];
                    // need to say that target2 is part of target1
                    target2.bob = 'fred';
                    target2.targets[0].sample = 'test';
                    target2.targets[0].under = { raw_text: "under it", targetnumber: 1 };
                    let number = gv(d[3]);
                    return {
                        raw_text: gv(d), action: 'EvoSourceDoubleRemove',
                        // first target: a monster
                        target: target,
                        // second target: its evo cards
                        XXX_target2: { raw_text: number + " of its evolution cards" },
                        target2: target2,
                        for_each: gv(d[5]),
                    };
                } },
            { "name": "GiveStatus$string$1", "symbols": [{ "literal": "g" }, { "literal": "i" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "GiveStatus$string$2", "symbols": [{ "literal": " " }, { "literal": "\"" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "GiveStatus$ebnf$1", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "GiveStatus$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "GiveStatus", "symbols": ["GiveStatus$string$1", "MultiTarget", "GiveStatus$string$2", "String", { "literal": "\"" }, "GiveStatus$ebnf$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'give status',
                        target: d[1],
                        nested_effect: gv(d[3]),
                        STUPID_status: {
                            event: 'ATTACK_DECLARE',
                            immune: true,
                            target: d[2] ? "player" : ""
                        }
                    };
                } },
            { "name": "GiveStatus$string$3", "symbols": [{ "literal": "G" }, { "literal": "i" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "GiveStatus", "symbols": ["GiveStatus$string$3", "MultiTarget", { "literal": " " }, "Keyword"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'give status',
                        target: d[1],
                        keyword: gv(d[3]),
                        line: 401,
                        keyword_gains: "gains " + gv(d[3]),
                        // unused because we special case "keyword"
                        status_unused: {
                            event: 'KEYWORD',
                            immune: true,
                            target: d[2] ? "player" : ""
                        }
                    };
                } },
            { "name": "Delete$subexpression$1$string$1", "symbols": [{ "literal": "D" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Delete$subexpression$1", "symbols": ["Delete$subexpression$1$string$1"] },
            { "name": "Delete$subexpression$1$string$2", "symbols": [{ "literal": "d" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Delete$subexpression$1", "symbols": ["Delete$subexpression$1$string$2"] },
            { "name": "Delete$subexpression$1$string$3", "symbols": [{ "literal": "d" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Delete$subexpression$1", "symbols": ["Delete$subexpression$1$string$3"] },
            { "name": "Delete", "symbols": ["Delete$subexpression$1", "MultiTarget"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), action: 'delete',
                        target: d[1],
                    };
                } },
            { "name": "WithSentence", "symbols": ["WithClause"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'WithSentence', and: data[0], /* clause: data[0], */ text: location.source }; } },
            { "name": "WithSentence$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WithSentence", "symbols": ["WithClause", "WithSentence$string$1", "WithClause"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'WithSentence', or: [data[0].flat(), data[2].flat()].flat(), clause1: data[0], clause2: data[2], }; } },
            { "name": "WithSentence$string$2", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "WithSentence", "symbols": ["WithClause", "WithSentence$string$2", "WithClause"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'WithSentence', and: [data[0].flat(), data[2].flat()].flat(), clause1: data[0], clause2: data[2], }; } },
            { "name": "WithClause", "symbols": ["TraitClause"] },
            { "name": "WithClause", "symbols": ["CardClause"] },
            { "name": "WithClause", "symbols": ["EffectClause"] },
            { "name": "WithClause", "symbols": ["CostClause"] },
            { "name": "WithClause", "symbols": ["ColorCount"] },
            { "name": "WithClause", "symbols": ["DPClause"] },
            { "name": "WithClause", "symbols": ["LevelClause"] },
            { "name": "WithClause", "symbols": ["StackClause"] },
            { "name": "WithClause", "symbols": ["SuperlativeClause"] },
            { "name": "WithClause", "symbols": ["Keyword"] },
            { "name": "WithClause", "symbols": ["OtherClause"], "postprocess": id },
            { "name": "Keyword", "symbols": [{ "literal": "＜" }, "BracketContent", { "literal": "＞" }], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Keyword', keyword: gv(data[1]), string: data[1], strings: [gv(data)], text: location.source }; } },
            { "name": "OtherClause$string$1", "symbols": [{ "literal": "d" }, { "literal": "i" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "r" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause", "symbols": ["OtherClause$string$1"] },
            { "name": "OtherClause$string$2", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "e" }, { "literal": "d" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause", "symbols": ["OtherClause$string$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), with_inherited: true
                    };
                } },
            { "name": "OtherClause$string$3", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "e" }, { "literal": "q" }, { "literal": "u" }, { "literal": "a" }, { "literal": "l" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "l" }, { "literal": "o" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause", "symbols": ["OtherClause$string$3"] },
            { "name": "OtherClause$string$4", "symbols": [{ "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "h" }, { "literal": "i" }, { "literal": "g" }, { "literal": "h" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "l" }, { "literal": "o" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "a" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }, { "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause", "symbols": ["OtherClause$string$4"] },
            { "name": "OtherClause$subexpression$1$string$1", "symbols": [{ "literal": "a" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause$subexpression$1", "symbols": ["OtherClause$subexpression$1$string$1"] },
            { "name": "OtherClause$subexpression$1$string$2", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause$subexpression$1", "symbols": ["OtherClause$subexpression$1$string$2"] },
            { "name": "OtherClause$string$5", "symbols": [{ "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OtherClause", "symbols": ["OtherClause$subexpression$1", "StandaloneText", "OtherClause$string$5"] },
            { "name": "EvoCards$string$1", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EvoCards", "symbols": ["EvoCards$string$1"] },
            { "name": "EvoCards$string$2", "symbols": [{ "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EvoCards", "symbols": ["EvoCards$string$2"] },
            { "name": "StackClause$string$1", "symbols": [{ "literal": "n" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause", "symbols": ["StackClause$string$1", "EvoCards"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), number: '0', type: 'EvoSources', compare: "IS"
                    };
                } },
            { "name": "StackClause$string$2", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause", "symbols": ["Number", "StackClause$string$2", "EvoCards"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), number: gv(d[0]), type: 'EvoSources', compare: "IS_AT_LEAST"
                    };
                } },
            { "name": "StackClause$string$3", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$subexpression$1$string$1", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$subexpression$1", "symbols": ["StackClause$subexpression$1$string$1"] },
            { "name": "StackClause$subexpression$1$string$2", "symbols": [{ "literal": "f" }, { "literal": "e" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$subexpression$1", "symbols": ["StackClause$subexpression$1$string$2"] },
            { "name": "StackClause", "symbols": ["Number", "StackClause$string$3", "StackClause$subexpression$1", { "literal": " " }, "EvoCards"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), number: gv(d[0]), type: 'EvoSources', compare: "IS_AT_MOST"
                    };
                } },
            { "name": "StackClause$string$4", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause", "symbols": ["MultiTarget", "StackClause$string$4", "EvoCards"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), in_evocards: d[0], type: 'EvoSources'
                    };
                } },
            { "name": "StackClause$string$5", "symbols": [{ "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "m" }, { "literal": "a" }, { "literal": "n" }, { "literal": "y" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "f" }, { "literal": "e" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$string$6", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$subexpression$2$string$1", "symbols": [{ "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$subexpression$2", "symbols": ["StackClause$subexpression$2$string$1"] },
            { "name": "StackClause$subexpression$2$string$2", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$subexpression$2", "symbols": ["StackClause$subexpression$2$string$2"] },
            { "name": "StackClause", "symbols": ["StackClause$string$5", "EvoCards", "StackClause$string$6", "StackClause$subexpression$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'EvoSources', compare: "IS_AT_MOST", relative: "targetsource-evosources"
                    };
                } },
            { "name": "SuperlativeClause$ebnf$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "SuperlativeClause$ebnf$1", "symbols": ["SuperlativeClause$ebnf$1$string$1"], "postprocess": id },
            { "name": "SuperlativeClause$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "SuperlativeClause", "symbols": ["SuperlativeClause$ebnf$1", "Superlative", { "literal": " " }, "Property"], "postprocess": function (d) {
                    return { raw_text: gv(d), type: 'SuperlativeClause',
                        superlative: d[1].superlative, field: gv(d[3]).toLowerCase() };
                } },
            { "name": "SuperlativeClause$ebnf$2$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "SuperlativeClause$ebnf$2", "symbols": ["SuperlativeClause$ebnf$2$string$1"], "postprocess": id },
            { "name": "SuperlativeClause$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "SuperlativeClause", "symbols": ["SuperlativeClause$ebnf$2", "Superlative"], "postprocess": function (d) {
                    return { raw_text: gv(d), type: 'SuperlativeClause',
                        superlative: d[1].superlative, count: true };
                } },
            { "name": "PostSuperlativeClause$subexpression$1$string$1", "symbols": [{ "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "PostSuperlativeClause$subexpression$1", "symbols": ["PostSuperlativeClause$subexpression$1$string$1"] },
            { "name": "PostSuperlativeClause$subexpression$1$string$2", "symbols": [{ "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "PostSuperlativeClause$subexpression$1", "symbols": ["PostSuperlativeClause$subexpression$1$string$2"] },
            { "name": "PostSuperlativeClause", "symbols": ["PostSuperlativeClause$subexpression$1", "Superlative"], "postprocess": function (d) {
                    return { raw_text: gv(d), type: 'SuperlativeClause',
                        superlative: d[1].superlative, count: true };
                } },
            { "name": "TraitClause$string$1", "symbols": [{ "literal": "A" }, { "literal": "A" }, { "literal": "A" }, { "literal": "A" }, { "literal": "A" }, { "literal": "A" }, { "literal": "A" }, { "literal": "A" }, { "literal": "A" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause", "symbols": ["TraitClause$string$1"] },
            { "name": "TraitClause$subexpression$1", "symbols": ["StandaloneText"] },
            { "name": "TraitClause$subexpression$1", "symbols": ["Keyword"] },
            { "name": "TraitClause$subexpression$2", "symbols": [{ "literal": " " }] },
            { "name": "TraitClause$subexpression$2", "symbols": [{ "literal": " " }] },
            { "name": "TraitClause$string$2", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause$ebnf$1$string$1", "symbols": [{ "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause$ebnf$1", "symbols": ["TraitClause$ebnf$1$string$1"], "postprocess": id },
            { "name": "TraitClause$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "TraitClause$ebnf$2$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause$ebnf$2", "symbols": ["TraitClause$ebnf$2$string$1"], "postprocess": id },
            { "name": "TraitClause$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "TraitClause$subexpression$3$string$1", "symbols": [{ "literal": "n" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause$subexpression$3", "symbols": ["TraitClause$subexpression$3$string$1"] },
            { "name": "TraitClause$subexpression$3$string$2", "symbols": [{ "literal": "t" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause$subexpression$3", "symbols": ["TraitClause$subexpression$3$string$2"] },
            { "name": "TraitClause$ebnf$3", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "TraitClause$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "TraitClause", "symbols": ["TraitClause$subexpression$1", "TraitClause$subexpression$2", "TraitClause$string$2", "TraitClause$ebnf$1", "TraitClause$ebnf$2", "TraitClause$subexpression$3", "TraitClause$ebnf$3"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'InText',
                        xxx_gv: gv(data[5]),
                        ...(gv(data[5]) == "name") ? { name_contains: data[0][0].strings } :
                            { text_contains: data[0][0].strings },
                        //and: data[0],
                        // trait unused
                        xxx_trait: data[0], text: location.source };
                } },
            { "name": "TraitClause$string$3", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause", "symbols": ["StandaloneText", "TraitClause$string$3"], "postprocess": function (d, location) { return { raw_text: gv(d), type: 'TraitClause2', traits_contain: d[0].strings }; } },
            { "name": "TraitClause$ebnf$4$subexpression$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause$ebnf$4$subexpression$1", "symbols": ["TraitClause$ebnf$4$subexpression$1$string$1"] },
            { "name": "TraitClause$ebnf$4", "symbols": ["TraitClause$ebnf$4$subexpression$1"], "postprocess": id },
            { "name": "TraitClause$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "TraitClause$subexpression$4", "symbols": [{ "literal": " " }] },
            { "name": "TraitClause$subexpression$4", "symbols": [{ "literal": " " }] },
            { "name": "TraitClause$string$4", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "TraitClause", "symbols": ["TraitClause$ebnf$4", "StandaloneText", "TraitClause$subexpression$4", "TraitClause$string$4"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'TraitMatch3', traits: data[1].strings, trait: data[1], text: location.source }; } },
            { "name": "Exception$string$1", "symbols": [{ "literal": " " }, { "literal": "(" }, { "literal": "o" }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Exception$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }, { "literal": ")" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Exception", "symbols": ["Exception$string$1", "StandaloneText", "Exception$string$2"] },
            { "name": "Exception$string$3", "symbols": [{ "literal": " " }, { "literal": "(" }, { "literal": "o" }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Exception", "symbols": ["Exception$string$3", "StandaloneText", { "literal": ")" }] },
            { "name": "CardClause$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "n" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CardClause$string$2", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CardClause", "symbols": [{ "literal": "[" }, "Trait", { "literal": "]" }, "CardClause$string$1", { "literal": "[" }, "Trait", { "literal": "]" }, "CardClause$string$2"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'CardClause', trait: data[0], in: data[1], its: data[2], name: data[3], or: data[4], trait: data[5], in: data[6], its: data[7], evolution: data[8], text: location.source }; } },
            { "name": "CardClause$string$3", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CardClause$string$4", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CardClause", "symbols": ["Object", "CardClause$string$3", "Possession", "CardClause$string$4", "Object"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'CardClause', object: data[0], in: data[1], possession: data[2], or: data[3], object: data[4], text: location.source }; } },
            { "name": "CardClause$string$5", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CardClause", "symbols": ["Object", "CardClause$string$5", "Possession"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'CardClause', object: data[0], in: data[1], possession: data[2], text: location.source }; } },
            { "name": "EffectClause$string$1", "symbols": [{ "literal": "c" }, { "literal": "a" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "b" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "l" }, { "literal": "o" }, { "literal": "c" }, { "literal": "k" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffectClause", "symbols": ["Effect", "EffectClause$string$1", "Conjunction"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'EffectClause', effect: data[0], be: data[1], conjunction: data[2], text: location.source }; } },
            { "name": "EffectClause$string$2", "symbols": [{ "literal": "d" }, { "literal": "o" }, { "literal": "n" }, { "literal": "'" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "c" }, { "literal": "t" }, { "literal": "i" }, { "literal": "v" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EffectClause", "symbols": ["Effect", "EffectClause$string$2"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'EffectClause', effect: data[0], text: location.source }; } },
            { "name": "CostClause$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CostClause$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CostClause$ebnf$1$subexpression$1", "symbols": ["CostClause$ebnf$1$subexpression$1$string$1"] },
            { "name": "CostClause$ebnf$1", "symbols": ["CostClause$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "CostClause$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CostClause", "symbols": ["CostNoun", "CostClause$string$1", "Number", "CostClause$ebnf$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), number: gv(d[2]), compare: d[3] ? "IS_AT_MOST" : "IS", type: gv(d[0]).includes("use") ? 'UseCost' : 'PlayCost'
                    };
                } },
            { "name": "CostNoun$string$1", "symbols": [{ "literal": "a" }, { "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CostNoun", "symbols": ["CostNoun$string$1"] },
            { "name": "CostNoun$string$2", "symbols": [{ "literal": "a" }, { "literal": " " }, { "literal": "m" }, { "literal": "e" }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CostNoun", "symbols": ["CostNoun$string$2"] },
            { "name": "CostNoun$string$3", "symbols": [{ "literal": "a" }, { "literal": " " }, { "literal": "u" }, { "literal": "s" }, { "literal": "e" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CostNoun", "symbols": ["CostNoun$string$3"] },
            { "name": "CostNoun$string$4", "symbols": [{ "literal": "a" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CostNoun", "symbols": ["CostNoun$string$4"] },
            { "name": "DPClause$ebnf$1", "symbols": [/[0-9]/] },
            { "name": "DPClause$ebnf$1", "symbols": ["DPClause$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "DPClause$subexpression$1$string$1", "symbols": [{ "literal": "d" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$1", "symbols": ["DPClause$subexpression$1$string$1"] },
            { "name": "DPClause$subexpression$1$string$2", "symbols": [{ "literal": "D" }, { "literal": "P" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$1", "symbols": ["DPClause$subexpression$1$string$2"] },
            { "name": "DPClause$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$2$string$1", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$2", "symbols": ["DPClause$subexpression$2$string$1"] },
            { "name": "DPClause$subexpression$2$string$2", "symbols": [{ "literal": "l" }, { "literal": "o" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$2", "symbols": ["DPClause$subexpression$2$string$2"] },
            { "name": "DPClause", "symbols": ["DPClause$ebnf$1", { "literal": " " }, "DPClause$subexpression$1", "DPClause$string$1", "DPClause$subexpression$2"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'DP', number: gv(data[0]), compare: data[3] ? "IS_AT_MOST" : "IS" };
                } },
            { "name": "DPClause$string$2", "symbols": [{ "literal": "U" }, { "literal": "N" }, { "literal": "U" }, { "literal": "S" }, { "literal": "E" }, { "literal": "D" }, { "literal": " " }, { "literal": "Y" }, { "literal": "E" }, { "literal": "T" }, { "literal": " " }, { "literal": "d" }, { "literal": "p" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "e" }, { "literal": "q" }, { "literal": "u" }, { "literal": "a" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause", "symbols": ["DPClause$string$2", "Object"], "postprocess": function (data, location) {
                    return {
                        raw_text: gv(data), type: 'DPClause', less: data[0], than: data[1], or: data[2], equal: data[3], to: data[4], object: data[5], text: location.source
                    };
                } },
            { "name": "DPClause$string$3", "symbols": [{ "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "m" }, { "literal": "u" }, { "literal": "c" }, { "literal": "h" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }, { "literal": " " }, { "literal": "D" }, { "literal": "P" }, { "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$3$string$1", "symbols": [{ "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$3", "symbols": ["DPClause$subexpression$3$string$1"] },
            { "name": "DPClause$subexpression$3$string$2", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$3", "symbols": ["DPClause$subexpression$3$string$2"] },
            { "name": "DPClause", "symbols": ["DPClause$string$3", "DPClause$subexpression$3"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'DP', compare: "IS_AT_MOST", relative: "targetsource-dp"
                    };
                } },
            { "name": "DPClause$string$4", "symbols": [{ "literal": "D" }, { "literal": "P" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "e" }, { "literal": "q" }, { "literal": "u" }, { "literal": "a" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$4$string$1", "symbols": [{ "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$4", "symbols": ["DPClause$subexpression$4$string$1"] },
            { "name": "DPClause$subexpression$4$string$2", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$subexpression$4", "symbols": ["DPClause$subexpression$4$string$2"] },
            { "name": "DPClause$ebnf$2$string$1", "symbols": [{ "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "D" }, { "literal": "P" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "DPClause$ebnf$2", "symbols": ["DPClause$ebnf$2$string$1"], "postprocess": id },
            { "name": "DPClause$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "DPClause", "symbols": ["DPClause$string$4", "DPClause$subexpression$4", "DPClause$ebnf$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'DP', compare: "IS_AT_MOST", relative: "targetsource-dp"
                    };
                } },
            { "name": "LevelClause$string$1", "symbols": [{ "literal": "a" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause", "symbols": ["LevelClause$string$1", "Comparison", "LevelClause$string$2", "Object"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'LevelClause', level: data[0], comparison: data[1], the: data[2], object: data[3], text: location.source };
                } },
            { "name": "LevelClause$subexpression$1$string$1", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$subexpression$1", "symbols": ["LevelClause$subexpression$1$string$1"] },
            { "name": "LevelClause$subexpression$1$string$2", "symbols": [{ "literal": "L" }, { "literal": "v" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$subexpression$1", "symbols": ["LevelClause$subexpression$1$string$2"] },
            { "name": "LevelClause$subexpression$1$string$3", "symbols": [{ "literal": "l" }, { "literal": "v" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$subexpression$1", "symbols": ["LevelClause$subexpression$1$string$3"] },
            { "name": "LevelClause", "symbols": ["LevelClause$subexpression$1", "Number"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'Level', number: gv(data[1]), compare: "IS" };
                } },
            { "name": "LevelClause$string$3", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$string$4", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "h" }, { "literal": "i" }, { "literal": "g" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause", "symbols": ["LevelClause$string$3", "Number", "LevelClause$string$4"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'Level', number: gv(data[1]), compare: "IS_AT_LEAST" };
                } },
            { "name": "LevelClause$ebnf$1$string$1", "symbols": [{ "literal": "a" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$ebnf$1", "symbols": ["LevelClause$ebnf$1$string$1"], "postprocess": id },
            { "name": "LevelClause$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "LevelClause$string$5", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$ebnf$2$string$1", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$ebnf$2", "symbols": ["LevelClause$ebnf$2$string$1"], "postprocess": id },
            { "name": "LevelClause$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "LevelClause$string$6", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$subexpression$2$string$1", "symbols": [{ "literal": "l" }, { "literal": "o" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$subexpression$2", "symbols": ["LevelClause$subexpression$2$string$1"] },
            { "name": "LevelClause$subexpression$2$string$2", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause$subexpression$2", "symbols": ["LevelClause$subexpression$2$string$2"] },
            { "name": "LevelClause", "symbols": ["LevelClause$ebnf$1", "LevelClause$string$5", "LevelClause$ebnf$2", "Number", "LevelClause$string$6", "LevelClause$subexpression$2"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'Level', number: gv(data[3]), compare: "IS_AT_MOST" };
                } },
            { "name": "LevelClause$string$7", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "s" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }, { "literal": " " }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelClause", "symbols": ["LevelClause$string$7"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'Level', number: gv(data[3]), compare: "IS", relative: "it-level" };
                } },
            { "name": "Superlative$subexpression$1$string$1", "symbols": [{ "literal": "h" }, { "literal": "i" }, { "literal": "g" }, { "literal": "h" }, { "literal": "e" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Superlative$subexpression$1", "symbols": ["Superlative$subexpression$1$string$1"] },
            { "name": "Superlative$subexpression$1$string$2", "symbols": [{ "literal": "l" }, { "literal": "o" }, { "literal": "w" }, { "literal": "e" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Superlative$subexpression$1", "symbols": ["Superlative$subexpression$1$string$2"] },
            { "name": "Superlative", "symbols": ["Superlative$subexpression$1"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'Superlative', superlative: gv(d) === "highest" ? "most" : "least"
                    };
                } },
            { "name": "Superlative$subexpression$2$string$1", "symbols": [{ "literal": "t" }, { "literal": "o" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Superlative$subexpression$2", "symbols": ["Superlative$subexpression$2$string$1"] },
            { "name": "Superlative$subexpression$2$string$2", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "t" }, { "literal": "o" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Superlative$subexpression$2", "symbols": ["Superlative$subexpression$2$string$2"] },
            { "name": "Superlative", "symbols": ["Superlative$subexpression$2"], "postprocess": function (d) {
                    return {
                        raw_text: gv(d), type: 'Superlative', superlative: gv(d) === "top" ? "top" : "bottom"
                    };
                } },
            { "name": "Property$string$1", "symbols": [{ "literal": "D" }, { "literal": "P" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Property", "symbols": ["Property$string$1"] },
            { "name": "Property$string$2", "symbols": [{ "literal": "d" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Property", "symbols": ["Property$string$2"] },
            { "name": "Property$string$3", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Property", "symbols": ["Property$string$3"] },
            { "name": "Property$string$4", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Property", "symbols": ["Property$string$4"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Field', text: location.source }; } },
            { "name": "Comparison$string$1", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "e" }, { "literal": "q" }, { "literal": "u" }, { "literal": "a" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Comparison", "symbols": ["Comparison$string$1"] },
            { "name": "Comparison$string$2", "symbols": [{ "literal": "g" }, { "literal": "r" }, { "literal": "e" }, { "literal": "a" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "e" }, { "literal": "q" }, { "literal": "u" }, { "literal": "a" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Comparison", "symbols": ["Comparison$string$2"] },
            { "name": "Comparison$string$3", "symbols": [{ "literal": "e" }, { "literal": "q" }, { "literal": "u" }, { "literal": "a" }, { "literal": "l" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "h" }, { "literal": "i" }, { "literal": "g" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Comparison", "symbols": ["Comparison$string$3"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Comparison', than: data[0], or: data[1], equal: data[2], than: data[3], or: data[4], equal: data[5], to: data[6], or: data[7], higher: data[8], text: location.source }; } },
            { "name": "Effect$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Effect", "symbols": ["Effect$string$1"] },
            { "name": "Effect$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Effect", "symbols": ["Effect$string$2"] },
            { "name": "Effect$string$3", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Effect", "symbols": ["Effect$string$3"] },
            { "name": "Effect$string$4", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Effect", "symbols": ["Effect$string$4"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Effect', evolution: data[0], text: location.source }; } },
            { "name": "Object$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "d" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Object", "symbols": ["Object$string$1"] },
            { "name": "Object$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "d" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "e" }, { "literal": "d" }, { "literal": " " }, { "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Object", "symbols": ["Object$string$2"] },
            { "name": "Object$string$3", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }, { "literal": "'" }, { "literal": " " }, { "literal": "s" }, { "literal": "e" }, { "literal": "c" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "y" }, { "literal": " " }, { "literal": "s" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Object", "symbols": ["Object$string$3"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Object', deleted: data[0], security: data[1], text: location.source }; } },
            { "name": "Possession$string$1", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Possession", "symbols": ["Possession$string$1"] },
            { "name": "Possession$string$2", "symbols": [{ "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Possession", "symbols": ["Possession$string$2"] },
            { "name": "Possession$string$3", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Possession", "symbols": ["Possession$string$3"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Possession', text: location.source }; } },
            { "name": "Number$ebnf$1", "symbols": [/[-0-9]/] },
            { "name": "Number$ebnf$1", "symbols": ["Number$ebnf$1", /[-0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Number", "symbols": ["Number$ebnf$1"] },
            { "name": "XSFsfg", "symbols": [{ "literal": "F" }] },
            { "name": "XSFsfg$string$1", "symbols": [{ "literal": "1" }, { "literal": "1" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$1"] },
            { "name": "XSFsfg$string$2", "symbols": [{ "literal": "1" }, { "literal": "3" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$2"] },
            { "name": "XSFsfg$string$3", "symbols": [{ "literal": "1" }, { "literal": "5" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$3"] },
            { "name": "XSFsfg$string$4", "symbols": [{ "literal": "2" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$4"] },
            { "name": "XSFsfg$string$5", "symbols": [{ "literal": "3" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$5"] },
            { "name": "XSFsfg$string$6", "symbols": [{ "literal": "4" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$6"] },
            { "name": "XSFsfg$string$7", "symbols": [{ "literal": "5" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$7"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Number', text: location.source }; } },
            { "name": "XSFsfg$string$8", "symbols": [{ "literal": "6" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$8"] },
            { "name": "XSFsfg$string$9", "symbols": [{ "literal": "7" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$9"] },
            { "name": "XSFsfg$string$10", "symbols": [{ "literal": "8" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$10"] },
            { "name": "XSFsfg$string$11", "symbols": [{ "literal": "9" }, { "literal": "0" }, { "literal": "0" }, { "literal": "0" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "XSFsfg", "symbols": ["XSFsfg$string$11"] },
            { "name": "XSFsfg", "symbols": ["Digit"] },
            { "name": "XSFsfg", "symbols": ["Digit", "Digit"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Number', digit: data[0], digit: data[1], digit: data[2], text: location.source }; } },
            { "name": "Conjunction$string$1", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Conjunction", "symbols": ["Conjunction$string$1"] },
            { "name": "Conjunction$string$2", "symbols": [{ "literal": "o" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Conjunction", "symbols": ["Conjunction$string$2"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Conjunction', text: location.source }; } },
            { "name": "String$ebnf$1", "symbols": ["Character"] },
            { "name": "String$ebnf$1", "symbols": ["String$ebnf$1", "Character"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "String", "symbols": ["String$ebnf$1"], "postprocess": function (data, location) { return { type: 'String1', text: location.source, raw_text: data.map(x => x.join("")).join("") }; } },
            { "name": "Character", "symbols": [/[\x00-\x7F]/] },
            { "name": "Digit", "symbols": [/[0-9]/], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Digit', text: location.source }; } },
            { "name": "Whitespace", "symbols": [{ "literal": " " }] },
            { "name": "Whitespace", "symbols": [{ "literal": "\t" }] },
            { "name": "Whitespace", "symbols": [{ "literal": "\n" }] },
            { "name": "Whitespace", "symbols": [{ "literal": "\r" }], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Whitespace', text: location.source }; } },
            { "name": "xxxTrait", "symbols": ["String"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Trait', string: data[0], text: location.source }; } },
            { "name": "WS", "symbols": [{ "literal": " " }] },
            { "name": "WS", "symbols": [{ "literal": "\t" }] },
            { "name": "WS", "symbols": [{ "literal": "\n" }] },
            { "name": "WS", "symbols": [{ "literal": "\r" }], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Whitespace', text: location.source }; } },
            { "name": "EvoCondition", "symbols": ["Statement"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'EvoCondition', and: data[0] }; } },
            { "name": "EvoCondition$ebnf$1", "symbols": ["Statement"], "postprocess": id },
            { "name": "EvoCondition$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$2", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "EvoCondition$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$3", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "EvoCondition$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$4", "symbols": ["Statement"], "postprocess": id },
            { "name": "EvoCondition$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$5", "symbols": [] },
            { "name": "EvoCondition$ebnf$5$subexpression$1$subexpression$1", "symbols": [{ "literal": "/" }] },
            { "name": "EvoCondition$ebnf$5$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EvoCondition$ebnf$5$subexpression$1$subexpression$1", "symbols": ["EvoCondition$ebnf$5$subexpression$1$subexpression$1$string$1"] },
            { "name": "EvoCondition$ebnf$5$subexpression$1", "symbols": ["EvoCondition$ebnf$5$subexpression$1$subexpression$1", "Statement"] },
            { "name": "EvoCondition$ebnf$5", "symbols": ["EvoCondition$ebnf$5", "EvoCondition$ebnf$5$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "EvoCondition", "symbols": ["EvoCondition$ebnf$1", "EvoCondition$ebnf$2", "Level", "EvoCondition$ebnf$3", "EvoCondition$ebnf$4", "EvoCondition$ebnf$5"], "postprocess": function (data, location) {
                    // console.error(875, "Data", data);
                    //  console.dir(data, {depth: 9});
                    const OR_array = [...data[5].map(x => x[1])];
                    if (data[4])
                        OR_array.unshift(data[4]);
                    const level_cond = [];
                    if (data[2])
                        level_cond.push(data[2]);
                    if (data[0])
                        level_cond.push(data[0]);
                    if (OR_array.length > 0)
                        level_cond.push({ raw_text: gv(OR_array), or: [...OR_array] });
                    return { line: 883,
                        d2: data[2],
                        d0: data[0],
                        raw_text: gv(data), type: 'EvoCondition', and: level_cond };
                } },
            { "name": "EvoCondition$ebnf$6", "symbols": ["Statement"], "postprocess": id },
            { "name": "EvoCondition$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$7", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "EvoCondition$ebnf$7", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$8", "symbols": ["Level"], "postprocess": id },
            { "name": "EvoCondition$ebnf$8", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$9", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "EvoCondition$ebnf$9", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$ebnf$10", "symbols": ["Statement"], "postprocess": id },
            { "name": "EvoCondition$ebnf$10", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "EvoCondition$subexpression$1", "symbols": [{ "literal": "/" }] },
            { "name": "EvoCondition$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EvoCondition$subexpression$1", "symbols": ["EvoCondition$subexpression$1$string$1"] },
            { "name": "EvoCondition", "symbols": ["EvoCondition$ebnf$6", "EvoCondition$ebnf$7", "EvoCondition$ebnf$8", "EvoCondition$ebnf$9", "EvoCondition$ebnf$10", "EvoCondition$subexpression$1", "Level", { "literal": " " }, "Statement"], "postprocess": function (data, location) {
                    const left_cond = [];
                    if (data[4])
                        left_cond.push(data[4]);
                    if (data[2])
                        left_cond.push(data[2]);
                    if (data[0])
                        left_cond.push(data[0]);
                    const right_cond = [data[6], data[8]];
                    const left = { raw_text: gv(left_cond), and: left_cond };
                    const right = { raw_text: gv(right_cond), and: right_cond };
                    return { line: 890, raw_text: gv(data), type: 'EvoCondition', or: [left, right] };
                } },
            { "name": "EvoCondition$subexpression$2", "symbols": [{ "literal": "/" }] },
            { "name": "EvoCondition$subexpression$2$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EvoCondition$subexpression$2", "symbols": ["EvoCondition$subexpression$2$string$1"] },
            { "name": "EvoCondition", "symbols": ["Statement", "EvoCondition$subexpression$2", "Statement"], "postprocess": function (data, location) {
                    const left_cond = [];
                    if (data[4])
                        left_cond.push(data[4]);
                    if (data[2])
                        left_cond.push(data[2]);
                    if (data[0])
                        left_cond.push(data[0]);
                    const right_cond = [data[6]];
                    return { line: 890, raw_text: gv(data), type: 'EvoCondition', or: [left_cond, right_cond] };
                } },
            { "name": "Statement$ebnf$1$subexpression$1", "symbols": ["Condition"] },
            { "name": "Statement$ebnf$1", "symbols": ["Statement$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "Statement$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Statement$ebnf$2", "symbols": [] },
            { "name": "Statement$ebnf$2$subexpression$1$subexpression$1", "symbols": [{ "literal": " " }] },
            { "name": "Statement$ebnf$2$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Statement$ebnf$2$subexpression$1$subexpression$1", "symbols": ["Statement$ebnf$2$subexpression$1$subexpression$1$string$1"] },
            { "name": "Statement$ebnf$2$subexpression$1", "symbols": ["Statement$ebnf$2$subexpression$1$subexpression$1", "EvoClause"] },
            { "name": "Statement$ebnf$2", "symbols": ["Statement$ebnf$2", "Statement$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Statement", "symbols": ["Statement$ebnf$1", "EvoClause", "Statement$ebnf$2"], "postprocess": function (data, location) {
                    //    console.error(136, data);
                    const array = [data[1], ...data[2].map(x => x[1])];
                    return { raw_text: array.map(x => gv(x)).join(" "), type: 'EVOCLAUSES', and: array };
                }
            },
            { "name": "Condition$string$1", "symbols": [{ "literal": "W" }, { "literal": "h" }, { "literal": "i" }, { "literal": "l" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Condition$string$2", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Condition", "symbols": ["Condition$string$1", "String", "Condition$string$2"] },
            { "name": "EvoClause$string$1", "symbols": [{ "literal": "L" }, { "literal": "E" }, { "literal": "V" }, { "literal": "E" }, { "literal": "L" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "EvoClause", "symbols": ["EvoClause$string$1"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'LevelClause', and: data[0] }; } },
            { "name": "EvoClause", "symbols": ["HasString"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'StringClause', and: data[0] }; } },
            { "name": "EvoClause", "symbols": ["StandaloneText"] },
            { "name": "EvoClause", "symbols": ["ColorInfo"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'ColorClause', and: data[0] }; } },
            { "name": "EvoClause", "symbols": ["ColorCount"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'ColorCountClause', and: data[0] }; } },
            { "name": "EvoClause", "symbols": ["StackClause"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'StackClause', and: data[0] }; } },
            { "name": "EvoClause", "symbols": ["NumberClause"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'NumberClause', and: data[0] }; } },
            { "name": "Other", "symbols": ["PlayCostLevelModifier"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Statement1', }; } },
            { "name": "Other", "symbols": ["LevelModifier"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Statement2' }; } },
            { "name": "Other", "symbols": ["StandaloneText"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Statement3' }; } },
            { "name": "PlayCostLevelModifier$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "PlayCostLevelModifier", "symbols": ["PlayCostLevelModifier$string$1", "_", "NumberOrRange", "_", "LevelModifier"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'PlayCostLevelModifier' }; } },
            { "name": "LevelModifier$string$1", "symbols": [{ "literal": "O" }, { "literal": "p" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": "a" }, { "literal": "l" }, { "literal": "T" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "LevelModifier", "symbols": ["Level", "_", "ColorInfo", "_", "LevelModifier$string$1"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'LevelModifier' }; } },
            { "name": "LevelModifier", "symbols": ["Level", "_", "StandaloneText"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'LevelModifier' }; } },
            { "name": "LevelModifier", "symbols": ["Level", "_", "Trait"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'LevelModifier' }; } },
            { "name": "LevelModifier", "symbols": ["Level"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'LevelModifier' }; } },
            { "name": "Level$subexpression$1$string$1", "symbols": [{ "literal": "L" }, { "literal": "v" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Level$subexpression$1", "symbols": ["Level$subexpression$1$string$1"] },
            { "name": "Level$subexpression$1$string$2", "symbols": [{ "literal": "L" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Level$subexpression$1", "symbols": ["Level$subexpression$1$string$2"] },
            { "name": "Level", "symbols": ["Level$subexpression$1", "_", "Digit"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Level', number: gv(data[2]), compare: "IS" }; } },
            { "name": "Level$subexpression$2$string$1", "symbols": [{ "literal": "L" }, { "literal": "v" }, { "literal": "." }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Level$subexpression$2", "symbols": ["Level$subexpression$2$string$1"] },
            { "name": "Level$subexpression$2$string$2", "symbols": [{ "literal": "L" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Level$subexpression$2", "symbols": ["Level$subexpression$2$string$2"] },
            { "name": "Level$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "h" }, { "literal": "i" }, { "literal": "g" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Level", "symbols": ["Level$subexpression$2", "_", "Digit", "Level$string$1"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'Level', number: gv(data[2]), compare: "IS_AT_LEAST" }; } },
            { "name": "NumberClause$subexpression$1$string$1", "symbols": [{ "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "NumberClause$subexpression$1", "symbols": ["NumberClause$subexpression$1$string$1"] },
            { "name": "NumberClause$subexpression$1$string$2", "symbols": [{ "literal": "P" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "s" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "NumberClause$subexpression$1", "symbols": ["NumberClause$subexpression$1$string$2"] },
            { "name": "NumberClause$ebnf$1", "symbols": ["Digit"] },
            { "name": "NumberClause$ebnf$1", "symbols": ["NumberClause$ebnf$1", "Digit"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "NumberClause$ebnf$2$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "NumberClause$ebnf$2$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "NumberClause$ebnf$2$subexpression$1$subexpression$1", "symbols": ["NumberClause$ebnf$2$subexpression$1$subexpression$1$string$1"] },
            { "name": "NumberClause$ebnf$2$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": "h" }, { "literal": "i" }, { "literal": "g" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "NumberClause$ebnf$2$subexpression$1$subexpression$1", "symbols": ["NumberClause$ebnf$2$subexpression$1$subexpression$1$string$2"] },
            { "name": "NumberClause$ebnf$2$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": "l" }, { "literal": "o" }, { "literal": "w" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "NumberClause$ebnf$2$subexpression$1$subexpression$1", "symbols": ["NumberClause$ebnf$2$subexpression$1$subexpression$1$string$3"] },
            { "name": "NumberClause$ebnf$2$subexpression$1", "symbols": ["NumberClause$ebnf$2$subexpression$1$string$1", "NumberClause$ebnf$2$subexpression$1$subexpression$1"] },
            { "name": "NumberClause$ebnf$2", "symbols": ["NumberClause$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "NumberClause$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "NumberClause", "symbols": ["NumberClause$subexpression$1", { "literal": " " }, "NumberClause$ebnf$1", "NumberClause$ebnf$2"], "postprocess": function (data, location) {
                    return { raw_text: gv(data), type: 'Number' };
                } },
            { "name": "StackClause$string$7", "symbols": [{ "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause$ebnf$1", "symbols": ["Digit"] },
            { "name": "StackClause$ebnf$1", "symbols": ["StackClause$ebnf$1", "Digit"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "StackClause$string$8", "symbols": [{ "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StackClause", "symbols": ["StackClause$string$7", "StackClause$ebnf$1", { "literal": " " }, "EvoClause", "StackClause$string$8"] },
            { "name": "HasString$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$1$subexpression$1", "symbols": ["HasString$ebnf$1$subexpression$1$string$1"] },
            { "name": "HasString$ebnf$1$subexpression$1$string$2", "symbols": [{ "literal": "w" }, { "literal": "/" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$1$subexpression$1", "symbols": ["HasString$ebnf$1$subexpression$1$string$2"] },
            { "name": "HasString$ebnf$1", "symbols": ["HasString$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "HasString$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "HasString$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString", "symbols": ["HasString$ebnf$1", "StandaloneText", "HasString$string$1"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'HasTrait', traits: data[1].strings, not: gv(data[0]) === "w/o ", d0: gv(data[0]) }; } },
            { "name": "HasString$ebnf$2$subexpression$1$string$1", "symbols": [{ "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$2$subexpression$1", "symbols": ["HasString$ebnf$2$subexpression$1$string$1"] },
            { "name": "HasString$ebnf$2$subexpression$1$string$2", "symbols": [{ "literal": "w" }, { "literal": "/" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$2$subexpression$1", "symbols": ["HasString$ebnf$2$subexpression$1$string$2"] },
            { "name": "HasString$ebnf$2", "symbols": ["HasString$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "HasString$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "HasString$subexpression$1", "symbols": [{ "literal": " " }] },
            { "name": "HasString$subexpression$1", "symbols": [{ "literal": " " }] },
            { "name": "HasString$string$2", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$2$string$1", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$2", "symbols": ["HasString$subexpression$2$string$1"] },
            { "name": "HasString$subexpression$2$string$2", "symbols": [{ "literal": "o" }, { "literal": "n" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$2", "symbols": ["HasString$subexpression$2$string$2"] },
            { "name": "HasString$string$3", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$3$string$1", "symbols": [{ "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$3", "symbols": ["HasString$subexpression$3$string$1"] },
            { "name": "HasString$subexpression$3$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$3", "symbols": ["HasString$subexpression$3$string$2"] },
            { "name": "HasString$string$4", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString", "symbols": ["HasString$ebnf$2", "StandaloneText", "HasString$subexpression$1", "HasString$string$2", "HasString$subexpression$2", "HasString$string$3", "HasString$subexpression$3", "HasString$string$4"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'HasTrait', traits_contain: data[1].strings, not: gv(data[0]) === "w/o " }; } },
            { "name": "HasString$subexpression$4", "symbols": [{ "literal": " " }] },
            { "name": "HasString$subexpression$4", "symbols": [{ "literal": " " }] },
            { "name": "HasString$string$5", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "y" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }, { "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString", "symbols": ["StandaloneText", "HasString$subexpression$4", "HasString$string$5"] },
            { "name": "HasString$ebnf$3$subexpression$1$string$1", "symbols": [{ "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$3$subexpression$1", "symbols": ["HasString$ebnf$3$subexpression$1$string$1"] },
            { "name": "HasString$ebnf$3$subexpression$1$string$2", "symbols": [{ "literal": "w" }, { "literal": "/" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$3$subexpression$1", "symbols": ["HasString$ebnf$3$subexpression$1$string$2"] },
            { "name": "HasString$ebnf$3", "symbols": ["HasString$ebnf$3$subexpression$1"], "postprocess": id },
            { "name": "HasString$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "HasString$subexpression$5", "symbols": ["StandaloneText"] },
            { "name": "HasString$subexpression$5", "symbols": ["Keyword"] },
            { "name": "HasString$subexpression$6", "symbols": [{ "literal": " " }] },
            { "name": "HasString$subexpression$6", "symbols": [{ "literal": " " }] },
            { "name": "HasString$string$6", "symbols": [{ "literal": "i" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$7$string$1", "symbols": [{ "literal": " " }, { "literal": "i" }, { "literal": "t" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$7", "symbols": ["HasString$subexpression$7$string$1"] },
            { "name": "HasString$subexpression$7$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$7", "symbols": ["HasString$subexpression$7$string$2"] },
            { "name": "HasString$subexpression$7", "symbols": [{ "literal": " " }] },
            { "name": "HasString$subexpression$8$string$1", "symbols": [{ "literal": "n" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$8", "symbols": ["HasString$subexpression$8$string$1"] },
            { "name": "HasString$subexpression$8$string$2", "symbols": [{ "literal": "n" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$8", "symbols": ["HasString$subexpression$8$string$2"] },
            { "name": "HasString$subexpression$8$string$3", "symbols": [{ "literal": "t" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$8", "symbols": ["HasString$subexpression$8$string$3"] },
            { "name": "HasString", "symbols": ["HasString$ebnf$3", "HasString$subexpression$5", "HasString$subexpression$6", "HasString$string$6", "HasString$subexpression$7", "HasString$subexpression$8"], "postprocess": function (data, location) {
                    return {
                        raw_text: gv(data), type: 'HasNameText',
                        ...(gv(data[5]) == "text") ? { text_contains: data[1][0].strings } :
                            { name_contains: data[1][0].strings },
                        not: gv(data[0]) === "w/o "
                    };
                } },
            { "name": "HasString$ebnf$4$subexpression$1$string$1", "symbols": [{ "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$4$subexpression$1", "symbols": ["HasString$ebnf$4$subexpression$1$string$1"] },
            { "name": "HasString$ebnf$4$subexpression$1$string$2", "symbols": [{ "literal": "w" }, { "literal": "/" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$4$subexpression$1", "symbols": ["HasString$ebnf$4$subexpression$1$string$2"] },
            { "name": "HasString$ebnf$4", "symbols": ["HasString$ebnf$4$subexpression$1"], "postprocess": id },
            { "name": "HasString$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "HasString$subexpression$9", "symbols": [{ "literal": " " }] },
            { "name": "HasString$subexpression$9", "symbols": [{ "literal": " " }] },
            { "name": "HasString$ebnf$5$subexpression$1$string$1", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$ebnf$5$subexpression$1", "symbols": ["HasString$ebnf$5$subexpression$1$string$1"] },
            { "name": "HasString$ebnf$5", "symbols": ["HasString$ebnf$5$subexpression$1"], "postprocess": id },
            { "name": "HasString$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "HasString$subexpression$10$string$1", "symbols": [{ "literal": "d" }, { "literal": "i" }, { "literal": "g" }, { "literal": "i" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$10", "symbols": ["HasString$subexpression$10$string$1"] },
            { "name": "HasString$subexpression$10$string$2", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$10", "symbols": ["HasString$subexpression$10$string$2"] },
            { "name": "HasString$subexpression$10$string$3", "symbols": [{ "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "HasString$subexpression$10", "symbols": ["HasString$subexpression$10$string$3"] },
            { "name": "HasString$ebnf$6$subexpression$1", "symbols": [{ "literal": "s" }] },
            { "name": "HasString$ebnf$6", "symbols": ["HasString$ebnf$6$subexpression$1"], "postprocess": id },
            { "name": "HasString$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "HasString", "symbols": ["HasString$ebnf$4", "StandaloneText", "HasString$subexpression$9", "HasString$ebnf$5", "HasString$subexpression$10", "HasString$ebnf$6"], "postprocess": function (data, location) { return { raw_text: gv(data), type: 'HasStack', not: gv(data[0]) === "w/o " }; } },
            { "name": "StandaloneText$ebnf$1", "symbols": [] },
            { "name": "StandaloneText$ebnf$1$subexpression$1$subexpression$1", "symbols": [{ "literal": "/" }] },
            { "name": "StandaloneText$ebnf$1$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "StandaloneText$ebnf$1$subexpression$1$subexpression$1", "symbols": ["StandaloneText$ebnf$1$subexpression$1$subexpression$1$string$1"] },
            { "name": "StandaloneText$ebnf$1$subexpression$1", "symbols": ["StandaloneText$ebnf$1$subexpression$1$subexpression$1", "StandaloneTextSub"] },
            { "name": "StandaloneText$ebnf$1", "symbols": ["StandaloneText$ebnf$1", "StandaloneText$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "StandaloneText", "symbols": ["StandaloneTextSub", "StandaloneText$ebnf$1"], "postprocess": function (data, location) {
                    const array = [data[0], ...data[1].map(x => x[1])]; // get all the non-token elements
                    return { raw_text: gv(data), type: 'StandaloneText', name_is: array.map(s => s.string), strings: array.map(s => s.string) };
                }
            },
            { "name": "StandaloneTextSub", "symbols": [{ "literal": "[" }, "BracketContent", { "literal": "]" }], "postprocess": function (data, location) {
                    return {
                        raw_text: gv(data),
                        type: 'StandaloneTextSub',
                        content: data[1],
                        string: data[1].string
                    };
                } },
            { "name": "Trait", "symbols": ["BracketContent"] },
            { "name": "BracketContent$ebnf$1", "symbols": ["BracketLetter"] },
            { "name": "BracketContent$ebnf$1", "symbols": ["BracketContent$ebnf$1", "BracketLetter"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "BracketContent", "symbols": ["BracketContent$ebnf$1"], "postprocess": function (data, location) {
                    //    console.error(441, data);
                    return {
                        raw_text: data.map(x => x.join("")).join(""),
                        raw_text2: gv(data),
                        string: gv(data),
                        type: 'String2'
                    };
                } },
            { "name": "BracketLetter", "symbols": [/[-a-zA-Z0-9:. +()']/] },
            { "name": "ColorInfo$ebnf$1", "symbols": [] },
            { "name": "ColorInfo$ebnf$1$subexpression$1", "symbols": [{ "literal": "/" }, "Color"] },
            { "name": "ColorInfo$ebnf$1", "symbols": ["ColorInfo$ebnf$1", "ColorInfo$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "ColorInfo", "symbols": ["Color", "ColorInfo$ebnf$1"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Color', colors: d.flat() }; } },
            { "name": "ColorInfo$ebnf$2$subexpression$1$string$1", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorInfo$ebnf$2$subexpression$1", "symbols": ["Color", "ColorInfo$ebnf$2$subexpression$1$string$1"] },
            { "name": "ColorInfo$ebnf$2", "symbols": ["ColorInfo$ebnf$2$subexpression$1"] },
            { "name": "ColorInfo$ebnf$2$subexpression$2$string$1", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorInfo$ebnf$2$subexpression$2", "symbols": ["Color", "ColorInfo$ebnf$2$subexpression$2$string$1"] },
            { "name": "ColorInfo$ebnf$2", "symbols": ["ColorInfo$ebnf$2", "ColorInfo$ebnf$2$subexpression$2"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "ColorInfo$string$1", "symbols": [{ "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorInfo", "symbols": ["ColorInfo$ebnf$2", "ColorInfo$string$1", "Color"], "postprocess": function (d, l) {
                    const array = d[0].map(x => x[0][0]);
                    return { raw_text: gv(d), type: 'Color', d2: d[2], colors: [...array, d[2][0]] };
                } },
            { "name": "ColorInfo$string$2", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorInfo", "symbols": ["Color", "ColorInfo$string$2", "Color"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Color', colors: [d[0], d[2]].flat() }; } },
            { "name": "ColorInfo$string$3", "symbols": [{ "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorInfo", "symbols": ["ColorInfo$string$3", "Color"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Color', colors: d[1].flat() }; } },
            { "name": "ColorInfo$string$4", "symbols": [{ "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorInfo", "symbols": ["Color", "ColorInfo$string$4"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Color', colors: d[0].flat() }; } },
            { "name": "Color$string$1", "symbols": [{ "literal": "B" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$1"] },
            { "name": "Color$string$2", "symbols": [{ "literal": "B" }, { "literal": "l" }, { "literal": "u" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$2"] },
            { "name": "Color$string$3", "symbols": [{ "literal": "G" }, { "literal": "r" }, { "literal": "e" }, { "literal": "e" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$3"] },
            { "name": "Color$string$4", "symbols": [{ "literal": "R" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$4"] },
            { "name": "Color$string$5", "symbols": [{ "literal": "Y" }, { "literal": "e" }, { "literal": "l" }, { "literal": "l" }, { "literal": "o" }, { "literal": "w" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$5"] },
            { "name": "Color$string$6", "symbols": [{ "literal": "P" }, { "literal": "u" }, { "literal": "r" }, { "literal": "p" }, { "literal": "l" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$6"] },
            { "name": "Color$string$7", "symbols": [{ "literal": "W" }, { "literal": "h" }, { "literal": "i" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$7"] },
            { "name": "Color$string$8", "symbols": [{ "literal": "C" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$8"] },
            { "name": "Color$string$9", "symbols": [{ "literal": "A" }, { "literal": "n" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$9"] },
            { "name": "Color$string$10", "symbols": [{ "literal": "O" }, { "literal": "r" }, { "literal": "a" }, { "literal": "n" }, { "literal": "g" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$10"] },
            { "name": "Color$string$11", "symbols": [{ "literal": "b" }, { "literal": "l" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$11"] },
            { "name": "Color$string$12", "symbols": [{ "literal": "b" }, { "literal": "l" }, { "literal": "u" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$12"] },
            { "name": "Color$string$13", "symbols": [{ "literal": "g" }, { "literal": "r" }, { "literal": "e" }, { "literal": "e" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$13"] },
            { "name": "Color$string$14", "symbols": [{ "literal": "r" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$14"] },
            { "name": "Color$string$15", "symbols": [{ "literal": "y" }, { "literal": "e" }, { "literal": "l" }, { "literal": "l" }, { "literal": "o" }, { "literal": "w" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$15"] },
            { "name": "Color$string$16", "symbols": [{ "literal": "p" }, { "literal": "u" }, { "literal": "r" }, { "literal": "p" }, { "literal": "l" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$16"] },
            { "name": "Color$string$17", "symbols": [{ "literal": "w" }, { "literal": "h" }, { "literal": "i" }, { "literal": "t" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$17"] },
            { "name": "Color$string$18", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "l" }, { "literal": "e" }, { "literal": "s" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$18"] },
            { "name": "Color$string$19", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$19"] },
            { "name": "Color$string$20", "symbols": [{ "literal": "o" }, { "literal": "r" }, { "literal": "a" }, { "literal": "n" }, { "literal": "g" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Color", "symbols": ["Color$string$20"] },
            { "name": "ColorCount$subexpression$1", "symbols": [{ "literal": " " }] },
            { "name": "ColorCount$subexpression$1", "symbols": [{ "literal": "-" }] },
            { "name": "ColorCount$string$1", "symbols": [{ "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorCount", "symbols": ["Digit", "ColorCount$subexpression$1", "ColorCount$string$1"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'ColorCount', number: gv(d[0]), compare: "IS" }; } },
            { "name": "ColorCount$string$2", "symbols": [{ "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorCount", "symbols": ["Digit", "ColorCount$string$2"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'ColorCount', number: gv(d[0]), compare: "IS" }; } },
            { "name": "ColorCount$string$3", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "e" }, { "literal": " " }, { "literal": "c" }, { "literal": "o" }, { "literal": "l" }, { "literal": "o" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "ColorCount", "symbols": ["Digit", "ColorCount$string$3"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'ColorCount', number: gv(d[0]), compare: "IS_AT_LEAST" }; } },
            { "name": "NumberOrRange$ebnf$1", "symbols": [/[0-9]/] },
            { "name": "NumberOrRange$ebnf$1", "symbols": ["NumberOrRange$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "NumberOrRange$ebnf$2$subexpression$1$ebnf$1", "symbols": [/[0-9]/] },
            { "name": "NumberOrRange$ebnf$2$subexpression$1$ebnf$1", "symbols": ["NumberOrRange$ebnf$2$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "NumberOrRange$ebnf$2$subexpression$1", "symbols": [{ "literal": "-" }, "NumberOrRange$ebnf$2$subexpression$1$ebnf$1"] },
            { "name": "NumberOrRange$ebnf$2", "symbols": ["NumberOrRange$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "NumberOrRange$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "NumberOrRange", "symbols": ["NumberOrRange$ebnf$1", "NumberOrRange$ebnf$2"] },
            { "name": "At$string$1", "symbols": [{ "literal": "A" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$1$subexpression$1", "symbols": ["At$ebnf$1$subexpression$1$string$1"] },
            { "name": "At$ebnf$1", "symbols": ["At$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "At$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "At$ebnf$2$subexpression$1$string$1", "symbols": [{ "literal": "n" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$2$subexpression$1", "symbols": ["At$ebnf$2$subexpression$1$string$1"] },
            { "name": "At$ebnf$2", "symbols": ["At$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "At$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "At$string$2", "symbols": [{ "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$3$subexpression$1$string$1", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$3$subexpression$1", "symbols": ["At$ebnf$3$subexpression$1$string$1"] },
            { "name": "At$ebnf$3", "symbols": ["At$ebnf$3$subexpression$1"], "postprocess": id },
            { "name": "At$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "At$ebnf$4$subexpression$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$4$subexpression$1", "symbols": ["At$ebnf$4$subexpression$1$string$1"] },
            { "name": "At$ebnf$4", "symbols": ["At$ebnf$4$subexpression$1"], "postprocess": id },
            { "name": "At$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "At$ebnf$5$subexpression$1$string$1", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$ebnf$5$subexpression$1", "symbols": ["At$ebnf$5$subexpression$1$string$1"] },
            { "name": "At$ebnf$5", "symbols": ["At$ebnf$5$subexpression$1"], "postprocess": id },
            { "name": "At$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "At$subexpression$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$subexpression$1", "symbols": ["At$subexpression$1$string$1"] },
            { "name": "At$subexpression$1$string$2", "symbols": [{ "literal": "b" }, { "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "l" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$subexpression$1", "symbols": ["At$subexpression$1$string$2"] },
            { "name": "At", "symbols": ["At$string$1", "At$ebnf$1", "At$ebnf$2", "At$string$2", "At$ebnf$3", "At$ebnf$4", "At$ebnf$5", "At$subexpression$1"], "postprocess": function (d, l) {
                    let which = "THIS";
                    if (tgv(d[4]) === "your")
                        which = "YOUR";
                    if (tgv(d[6]) === "opponent's")
                        which = "OPPONENT";
                    return { raw_text: gv(d), abc: gv(d[4]), dx: d, type: 'At', text: l.source, phase: gv(d[7]), which: which };
                } },
            { "name": "At$string$3", "symbols": [{ "literal": "T" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "n" }, { "literal": "e" }, { "literal": "x" }, { "literal": "t" }, { "literal": " " }, { "literal": "t" }, { "literal": "i" }, { "literal": "m" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At", "symbols": ["At$string$3", "WhenSentence"], "postprocess": function (d) {
                    return { raw_text: gv(d), type: 'At', trigger: gv(d[1]) };
                } },
            { "name": "At$string$4", "symbols": [{ "literal": "A" }, { "literal": "t" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At$string$5", "symbols": [{ "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "g" }, { "literal": "r" }, { "literal": "e" }, { "literal": "e" }, { "literal": "n" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "w" }, { "literal": "o" }, { "literal": "u" }, { "literal": "l" }, { "literal": "d" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "v" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "At", "symbols": ["At$string$4", "At$string$5"], "postprocess": function (d) {
                    return { raw_text: gv(d), type: 'At', trigger: gv(d[1]) };
                } },
            { "name": "MultiTarget$ebnf$1", "symbols": [] },
            { "name": "MultiTarget$ebnf$1$subexpression$1$ebnf$1", "symbols": [{ "literal": "," }], "postprocess": id },
            { "name": "MultiTarget$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$1$subexpression$1", "symbols": ["MultiTarget$ebnf$1$subexpression$1$ebnf$1", "MultiTarget$ebnf$1$subexpression$1$string$1", "Target"] },
            { "name": "MultiTarget$ebnf$1", "symbols": ["MultiTarget$ebnf$1", "MultiTarget$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "MultiTarget$ebnf$2", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "MultiTarget$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$3", "symbols": ["FromRegion"], "postprocess": id },
            { "name": "MultiTarget$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$4", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "MultiTarget$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$5", "symbols": ["ForEach"], "postprocess": id },
            { "name": "MultiTarget$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget", "symbols": ["Target", "MultiTarget$ebnf$1", "MultiTarget$ebnf$2", "MultiTarget$ebnf$3", "MultiTarget$ebnf$4", "MultiTarget$ebnf$5"], "postprocess": function (d, l) {
                    const array = [d[0], ...d[1].map(x => x[2])];
                    let from = d[3];
                    let foreach = d[5];
                    array.forEach(a => { a.from = from; }); // reproduce 'from' acrtoss each target
                    // check for "such"
                    for (let i = 1; i < array.length; i++) {
                        let target_and = array[i].and;
                        if (Array.isArray(target_and)) {
                            if (target_and.some(item => item.such)) {
                                // replace "and" with the "and" and "with" of the previous item
                                let previous = array[i - 1];
                                let join = [];
                                if (previous.and)
                                    join.push(...previous.and);
                                // previous.and was array, previous.with is object :<
                                if (previous.with)
                                    join.push(previous.with);
                                array[i].and = join;
                            }
                        }
                    }
                    // if we have 'such' in the second target, reapply the "and" and "with" from the first target
                    return { raw_text: gv(d), type: 'MultiTarget', case: "1ORMORE",
                        for_each: gv(foreach),
                        count: array.reduce((sum, item) => sum + (item.count || 1), 0),
                        upto: max_upto(array),
                        targets: array, from: from };
                } },
            { "name": "MultiTarget$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$string$2", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget", "symbols": ["Target", "MultiTarget$string$1", "Target", "MultiTarget$string$2", "Target"], "postprocess": function (d, l) {
                    const and = [d[0],
                        { or: [d[2], d[4]] }];
                    return { raw_text: gv(d), type: 'MultiTarget',
                        and: and };
                } },
            { "name": "MultiTarget$string$3", "symbols": [{ "literal": " " }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$string$4", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget", "symbols": ["Target", "MultiTarget$string$3", "Adjectives", "MultiTarget$string$4", "Adjectives", { "literal": " " }, "Entity"], "postprocess": function (d, l) {
                    const or = [[d[2], d[6]],
                        [d[4], d[6]]];
                    const and = [d[0], or];
                    return { raw_text: gv(d), type: 'MultiTarget', and: and };
                } },
            { "name": "MultiTarget$ebnf$6$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$6$subexpression$1", "symbols": ["MultiTarget$ebnf$6$subexpression$1$string$1", "Target"] },
            { "name": "MultiTarget$ebnf$6", "symbols": ["MultiTarget$ebnf$6$subexpression$1"] },
            { "name": "MultiTarget$ebnf$6$subexpression$2$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$6$subexpression$2", "symbols": ["MultiTarget$ebnf$6$subexpression$2$string$1", "Target"] },
            { "name": "MultiTarget$ebnf$6", "symbols": ["MultiTarget$ebnf$6", "MultiTarget$ebnf$6$subexpression$2"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "MultiTarget$ebnf$7", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "MultiTarget$ebnf$7", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$8", "symbols": ["FromRegion"], "postprocess": id },
            { "name": "MultiTarget$ebnf$8", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget", "symbols": ["Target", "MultiTarget$ebnf$6", "MultiTarget$ebnf$7", "MultiTarget$ebnf$8"], "postprocess": function (d, l) {
                    const array = [d[0], ...d[1].map(x => x[1])];
                    return { line: 559, raw_text: gv(d), type: 'MultiTarget',
                        need: "any",
                        targets: array,
                        //or: array,
                        from: d[3] };
                } },
            { "name": "MultiTarget$ebnf$9$subexpression$1$string$1", "symbols": [{ "literal": "," }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$9$subexpression$1", "symbols": ["MultiTarget$ebnf$9$subexpression$1$string$1", "Target"] },
            { "name": "MultiTarget$ebnf$9", "symbols": ["MultiTarget$ebnf$9$subexpression$1"] },
            { "name": "MultiTarget$ebnf$9$subexpression$2$string$1", "symbols": [{ "literal": "," }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$9$subexpression$2", "symbols": ["MultiTarget$ebnf$9$subexpression$2$string$1", "Target"] },
            { "name": "MultiTarget$ebnf$9", "symbols": ["MultiTarget$ebnf$9", "MultiTarget$ebnf$9$subexpression$2"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "MultiTarget$ebnf$10", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "MultiTarget$ebnf$10", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$11", "symbols": ["FromRegion"], "postprocess": id },
            { "name": "MultiTarget$ebnf$11", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget", "symbols": ["Target", "MultiTarget$ebnf$9", "MultiTarget$ebnf$10", "MultiTarget$ebnf$11"], "postprocess": function (d, l) {
                    const array = [d[0], ...d[1].map(x => x[1])];
                    return { raw_text: gv(d), type: 'MultiTarget', or: array, from: d[3] };
                } },
            { "name": "MultiTarget$ebnf$12$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$12$subexpression$1$subexpression$1", "symbols": ["MultiTarget$ebnf$12$subexpression$1$subexpression$1$string$1"] },
            { "name": "MultiTarget$ebnf$12$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$12$subexpression$1$subexpression$1", "symbols": ["MultiTarget$ebnf$12$subexpression$1$subexpression$1$string$2"] },
            { "name": "MultiTarget$ebnf$12$subexpression$1", "symbols": ["MultiTarget$ebnf$12$subexpression$1$subexpression$1", "Adjectives"] },
            { "name": "MultiTarget$ebnf$12", "symbols": ["MultiTarget$ebnf$12$subexpression$1"] },
            { "name": "MultiTarget$ebnf$12$subexpression$2$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$12$subexpression$2$subexpression$1", "symbols": ["MultiTarget$ebnf$12$subexpression$2$subexpression$1$string$1"] },
            { "name": "MultiTarget$ebnf$12$subexpression$2$subexpression$1$string$2", "symbols": [{ "literal": "," }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "MultiTarget$ebnf$12$subexpression$2$subexpression$1", "symbols": ["MultiTarget$ebnf$12$subexpression$2$subexpression$1$string$2"] },
            { "name": "MultiTarget$ebnf$12$subexpression$2", "symbols": ["MultiTarget$ebnf$12$subexpression$2$subexpression$1", "Adjectives"] },
            { "name": "MultiTarget$ebnf$12", "symbols": ["MultiTarget$ebnf$12", "MultiTarget$ebnf$12$subexpression$2"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "MultiTarget$ebnf$13", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "MultiTarget$ebnf$13", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget$ebnf$14", "symbols": ["FromRegion"], "postprocess": id },
            { "name": "MultiTarget$ebnf$14", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "MultiTarget", "symbols": ["Adjectives", "MultiTarget$ebnf$12", { "literal": " " }, "Entity", "MultiTarget$ebnf$13", "MultiTarget$ebnf$14"], "postprocess": function (d, l) {
                    let left = { entity: d[3].entity };
                    let right = { entity: d[3].entity };
                    left.adj_text = gv(d[0]);
                    // add FROM to both searches
                    left.and = d[0].adjectives.flat().concat(d[3].and);
                    // only handles 1 AND, 0 is the first
                    right.adj_text = gv(d[1][0][1]);
                    left.raw_text = left.adj_text + " " + left.entity;
                    right.raw_text = right.adj_text + " " + right.entity;
                    right.and = d[1][0][1].adjectives.flat().concat(d[3].and);
                    let array = [left, right];
                    return { bob: d[3], raw_text: gv(d), type: 'MultiTarget', targets: array,
                        count: array.reduce((sum, item) => sum + (item.count || 1), 0),
                        from: d[5] };
                } },
            { "name": "xxTarget$string$1", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$2", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$3", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$4", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$5", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$1", "xxTarget$string$2", "xxTarget$string$3", "xxTarget$string$4", "xxTarget$string$5"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$6", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$7", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$8", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$9", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$6", "xxTarget$string$7", "xxTarget$string$8", "xxTarget$string$9"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$10", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$11", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$12", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$13", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$14", "symbols": [{ "literal": "t" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$10", "xxTarget$string$11", "xxTarget$string$12", "xxTarget$string$13", "xxTarget$string$14"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$15", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$16", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$17", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$18", "symbols": [{ "literal": "t" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$15", "xxTarget$string$16", "xxTarget$string$17", "xxTarget$string$18"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$19", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$20", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$21", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$22", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$23", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$19", "xxTarget$string$20", "xxTarget$string$21", "xxTarget$string$22", "xxTarget$string$23"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$24", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$25", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$26", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$27", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$24", "xxTarget$string$25", "xxTarget$string$26", "xxTarget$string$27"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$28", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$29", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$30", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$31", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$32", "symbols": [{ "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$28", "xxTarget$string$29", "xxTarget$string$30", "xxTarget$string$31", "xxTarget$string$32"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$33", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$34", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$35", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$36", "symbols": [{ "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$33", "xxTarget$string$34", "xxTarget$string$35", "xxTarget$string$36"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$37", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$38", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$39", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$40", "symbols": [{ "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$41", "symbols": [{ "literal": "s" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$37", "xxTarget$string$38", "xxTarget$string$39", "xxTarget$string$40", "xxTarget$string$41"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "xxTarget$string$42", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$43", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$44", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget$string$45", "symbols": [{ "literal": "s" }, { "literal": "t" }, { "literal": "a" }, { "literal": "c" }, { "literal": "k" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxTarget", "symbols": ["xxTarget$string$42", "xxTarget$string$43", "xxTarget$string$44", "xxTarget$string$45"], "postprocess": function (d, l) { return { raw_text: gv(d), type: 'Target', text: l.source, which: "ALL" }; } },
            { "name": "CollectiveTarget$ebnf$1$subexpression$1", "symbols": ["Adjectives", { "literal": " " }] },
            { "name": "CollectiveTarget$ebnf$1", "symbols": ["CollectiveTarget$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "CollectiveTarget$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CollectiveTarget$ebnf$2$string$1", "symbols": [{ "literal": "f" }, { "literal": "i" }, { "literal": "l" }, { "literal": "l" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$2", "symbols": ["CollectiveTarget$ebnf$2$string$1"], "postprocess": id },
            { "name": "CollectiveTarget$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$3$subexpression$1$subexpression$1$string$1"] },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$3$subexpression$1$subexpression$1$string$2"] },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$3$subexpression$1$subexpression$1$string$3"] },
            { "name": "CollectiveTarget$ebnf$3$subexpression$1", "symbols": ["CollectiveTarget$ebnf$3$subexpression$1$subexpression$1", "Adjectives"] },
            { "name": "CollectiveTarget$ebnf$3", "symbols": ["CollectiveTarget$ebnf$3$subexpression$1"], "postprocess": id },
            { "name": "CollectiveTarget$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$1"] },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$2"] },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$3"] },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$4", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$4$subexpression$1$subexpression$1$string$4"] },
            { "name": "CollectiveTarget$ebnf$4$subexpression$1", "symbols": ["CollectiveTarget$ebnf$4$subexpression$1$subexpression$1", "WithSentence"] },
            { "name": "CollectiveTarget$ebnf$4", "symbols": ["CollectiveTarget$ebnf$4$subexpression$1"], "postprocess": id },
            { "name": "CollectiveTarget$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": "Y" }, { "literal": "Y" }, { "literal": "Y" }, { "literal": "Y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$1"] },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$2"] },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$3"] },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$4", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$4"] },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$5", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1$subexpression$1", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1$subexpression$1$string$5"] },
            { "name": "CollectiveTarget$ebnf$5$subexpression$1", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1$subexpression$1", "Target"] },
            { "name": "CollectiveTarget$ebnf$5", "symbols": ["CollectiveTarget$ebnf$5$subexpression$1"], "postprocess": id },
            { "name": "CollectiveTarget$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CollectiveTarget$ebnf$6$string$1", "symbols": [{ "literal": "x" }, { "literal": "x" }, { "literal": "x" }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": " " }, { "literal": "r" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": "e" }, { "literal": "d" }, { "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "CollectiveTarget$ebnf$6", "symbols": ["CollectiveTarget$ebnf$6$string$1"], "postprocess": id },
            { "name": "CollectiveTarget$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "CollectiveTarget", "symbols": ["CollectiveTarget$ebnf$1", "CollectiveTarget$ebnf$2", "Entity", "CollectiveTarget$ebnf$3", "CollectiveTarget$ebnf$4", "CollectiveTarget$ebnf$5", "CollectiveTarget$ebnf$6"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), type: 'collectivetarget-1',
                        and: d[0] && d[0].adjectives, with: d[4] && d[4][1],
                        count: max_number(d[0].adjectives),
                        upto: max_upto(d[0].adjectives),
                        under: d[5] && d[5][1],
                        // there's no logical reason for is_evo_card here
                        is_evo_card: true,
                        adj_text: gv(d[0]),
                        //adjs: d[0], 
                        entity: gv(d[2]), entity_txt: gv(d[2]), entity_match: d[2] };
                } },
            { "name": "Target$ebnf$1$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$1$subexpression$1$subexpression$1$string$1"] },
            { "name": "Target$ebnf$1$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$1$subexpression$1$subexpression$1$string$2"] },
            { "name": "Target$ebnf$1$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$1$subexpression$1$subexpression$1$string$3"] },
            { "name": "Target$ebnf$1$subexpression$1", "symbols": ["Target$ebnf$1$subexpression$1$subexpression$1", "Adjectives"] },
            { "name": "Target$ebnf$1", "symbols": ["Target$ebnf$1$subexpression$1"], "postprocess": id },
            { "name": "Target$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$2$subexpression$1$subexpression$1$string$1"] },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "/" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$2$subexpression$1$subexpression$1$string$2"] },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "s" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$2$subexpression$1$subexpression$1$string$3"] },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1$string$4", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "v" }, { "literal": "e" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$2$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$2$subexpression$1$subexpression$1$string$4"] },
            { "name": "Target$ebnf$2$subexpression$1", "symbols": ["Target$ebnf$2$subexpression$1$subexpression$1", "WithSentence"] },
            { "name": "Target$ebnf$2", "symbols": ["Target$ebnf$2$subexpression$1"], "postprocess": id },
            { "name": "Target$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$3$subexpression$1$subexpression$1$string$1"] },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$3$subexpression$1$subexpression$1$string$2"] },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1$string$3", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$3$subexpression$1$subexpression$1$string$3"] },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1$string$4", "symbols": [{ "literal": " " }, { "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "u" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$3$subexpression$1$subexpression$1", "symbols": ["Target$ebnf$3$subexpression$1$subexpression$1$string$4"] },
            { "name": "Target$ebnf$3$subexpression$1", "symbols": ["Target$ebnf$3$subexpression$1$subexpression$1", "Target"] },
            { "name": "Target$ebnf$3", "symbols": ["Target$ebnf$3$subexpression$1"], "postprocess": id },
            { "name": "Target$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Target$ebnf$4$subexpression$1", "symbols": [{ "literal": " " }, "PostSuperlativeClause"] },
            { "name": "Target$ebnf$4", "symbols": ["Target$ebnf$4$subexpression$1"], "postprocess": id },
            { "name": "Target$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Target$ebnf$5$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "s" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$5", "symbols": ["Target$ebnf$5$string$1"], "postprocess": id },
            { "name": "Target$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Target$ebnf$6$string$1", "symbols": [{ "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": " " }, { "literal": "r" }, { "literal": "e" }, { "literal": "t" }, { "literal": "u" }, { "literal": "r" }, { "literal": "n" }, { "literal": "e" }, { "literal": "d" }, { "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "f" }, { "literal": "f" }, { "literal": "e" }, { "literal": "c" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$ebnf$6", "symbols": ["Target$ebnf$6$string$1"], "postprocess": id },
            { "name": "Target$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Target", "symbols": ["Adjectives", { "literal": " " }, "Entity", "Target$ebnf$1", "Target$ebnf$2", "Target$ebnf$3", "Target$ebnf$4", "Target$ebnf$5", "Target$ebnf$6"], "postprocess": function (d, l, r) {
                    if (d[5] && d[5][1] && d[5][1].raw_text.startsWith("1"))
                        return r;
                    return { raw_text: gv(d), type: 'Target-2',
                        xxx_d5: d[5],
                        and: d[0].adjectives, with: d[4] && d[4][1],
                        count: max_number(d[0].adjectives),
                        upto: max_upto(d[0].adjectives),
                        under: d[5] && d[5][1],
                        // there's no logical reason for is_evo_card here
                        is_evo_card: true,
                        adj_text: gv(d[0]),
                        //adjs: d[0], 
                        entity: gv(d[2]), entity_txt: gv(d[2]), entity_match: d[2] };
                } },
            { "name": "Target", "symbols": ["Adjectives", { "literal": " " }, "Entity", { "literal": " " }, "Suffix"] },
            { "name": "Target", "symbols": ["StandaloneText"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), type: 'Target', text: l.source, and: d[0] };
                } },
            { "name": "Target$subexpression$1$string$1", "symbols": [{ "literal": "I" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$subexpression$1", "symbols": ["Target$subexpression$1$string$1"] },
            { "name": "Target$subexpression$1$string$2", "symbols": [{ "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$subexpression$1", "symbols": ["Target$subexpression$1$string$2"] },
            { "name": "Target$subexpression$1$string$3", "symbols": [{ "literal": "T" }, { "literal": "h" }, { "literal": "e" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$subexpression$1", "symbols": ["Target$subexpression$1$string$3"] },
            { "name": "Target$subexpression$1$string$4", "symbols": [{ "literal": "T" }, { "literal": "h" }, { "literal": "e" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target$subexpression$1", "symbols": ["Target$subexpression$1$string$4"] },
            { "name": "Target", "symbols": ["Target$subexpression$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), type: 'Target', it: true
                    };
                } },
            { "name": "Target$string$1", "symbols": [{ "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Target", "symbols": ["Target$string$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), type: 'Target', it: true,
                        and: [
                            {
                                raw_text: "Monster",
                                entity: 'Monster',
                                entity_txt: 'Monster',
                                entity_match: {
                                    raw_text: 'Monster',
                                    entity: 'Monster',
                                    and: [{ raw_text: 'Monster', entity_type: 'Monster' }],
                                    type: 'Entity'
                                }
                            }
                        ]
                    };
                } },
            { "name": "Suffix$string$1", "symbols": [{ "literal": "o" }, { "literal": "f" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "s" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": " " }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Suffix", "symbols": ["Suffix$string$1"] },
            { "name": "OneOffTarget$string$1", "symbols": [{ "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": " " }, { "literal": "e" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OneOffTarget$string$2", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OneOffTarget$string$3", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "OneOffTarget", "symbols": ["Adjectives", { "literal": " " }, "Entity", "OneOffTarget$string$1", "Adjectives", "OneOffTarget$string$2", "WithSentence", "OneOffTarget$string$3", "WithSentence"] },
            { "name": "xxWithWithSentence$string$1", "symbols": [{ "literal": " " }, { "literal": "w" }, { "literal": "i" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "xxWithWithSentence", "symbols": ["xxWithWithSentence$string$1", "WithSentence"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), type: 'With',
                        with: gv(d[1]) };
                } },
            { "name": "Adjectives$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjectives", "symbols": ["_Adjectives", "Adjectives$string$1", "_Adjectives"], "postprocess": function (d, l) {
                    const or = [d[0], d[2]];
                    return { raw_text: gv(d), type: 'Adjectives',
                        line: 1084,
                        or: or,
                        adjectives: [d[0].adjectives.flat(), d[2].adjectives.flat()],
                    };
                } },
            { "name": "Adjectives", "symbols": ["_Adjectives"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), type: 'Adjectives', adjectives: d[0].adjectives };
                } },
            { "name": "_Adjectives$ebnf$1", "symbols": [] },
            { "name": "_Adjectives$ebnf$1$subexpression$1", "symbols": [{ "literal": " " }, "Adjective"] },
            { "name": "_Adjectives$ebnf$1", "symbols": ["_Adjectives$ebnf$1", "_Adjectives$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "_Adjectives", "symbols": ["Article", "_Adjectives$ebnf$1"], "postprocess": function (d, l) {
                    //   console.error(184, d);
                    const array = [d[0], ...d[1].map(x => x[1])];
                    return { raw_text: gv(d), line: 1096, type: 'Adjectives',
                        adjectives: array };
                } },
            { "name": "Article$ebnf$1", "symbols": [/[0-9]/] },
            { "name": "Article$ebnf$1", "symbols": ["Article$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Article", "symbols": ["Article$ebnf$1"], "postprocess": function (d, l) { return { raw_text: gv(d), count: gv(d[0]) }; } },
            { "name": "Article$string$1", "symbols": [{ "literal": "u" }, { "literal": "p" }, { "literal": " " }, { "literal": "t" }, { "literal": "o" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$ebnf$2", "symbols": [/[0-9]/] },
            { "name": "Article$ebnf$2", "symbols": ["Article$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Article", "symbols": ["Article$string$1", "Article$ebnf$2"], "postprocess": function (d, l) { return { raw_text: gv(d), upto: true, count: gv(d[1]) }; } },
            { "name": "Article$ebnf$3", "symbols": [/[0-9]/] },
            { "name": "Article$ebnf$3", "symbols": ["Article$ebnf$3", /[0-9]/], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Article$string$2", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "m" }, { "literal": "o" }, { "literal": "r" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$ebnf$3", "Article$string$2"], "postprocess": function (d, l) { return { raw_text: gv(d), at_least: true, count: gv(d[1]) }; } },
            { "name": "Article$subexpression$1$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$subexpression$1", "symbols": ["Article$subexpression$1$string$1"] },
            { "name": "Article$subexpression$1", "symbols": [{ "literal": "a" }] },
            { "name": "Article$subexpression$1$string$2", "symbols": [{ "literal": "a" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$subexpression$1", "symbols": ["Article$subexpression$1$string$2"] },
            { "name": "Article", "symbols": ["Article$subexpression$1"], "postprocess": function (d, l) { return { raw_text: gv(d) }; } },
            { "name": "Article$subexpression$2$string$1", "symbols": [{ "literal": "A" }, { "literal": "l" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$subexpression$2", "symbols": ["Article$subexpression$2$string$1"] },
            { "name": "Article$subexpression$2$string$2", "symbols": [{ "literal": "a" }, { "literal": "l" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$subexpression$2", "symbols": ["Article$subexpression$2$string$2"] },
            { "name": "Article", "symbols": ["Article$subexpression$2"], "postprocess": function (d, l) { return { raw_text: gv(d), count: 999 }; } },
            { "name": "Article$string$3", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$3"], "postprocess": function (d, l) { return { raw_text: gv(d), player: "other" }; } },
            { "name": "Article$string$4", "symbols": [{ "literal": "b" }, { "literal": "o" }, { "literal": "t" }, { "literal": "h" }, { "literal": " " }, { "literal": "p" }, { "literal": "l" }, { "literal": "a" }, { "literal": "y" }, { "literal": "e" }, { "literal": "r" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$ebnf$4", "symbols": [{ "literal": "'" }], "postprocess": id },
            { "name": "Article$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Article", "symbols": ["Article$string$4", "Article$ebnf$4"], "postprocess": function (d, l) { return { raw_text: gv(d) }; } },
            { "name": "Article$string$5", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$5"], "postprocess": function (d, l) { return { raw_text: gv(d), player: "other" }; } },
            { "name": "Article$string$6", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$6"], "postprocess": function (d, l) { return { raw_text: gv(d), player: "other" }; } },
            { "name": "Article$string$7", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$7"], "postprocess": function (d, l) { return { raw_text: gv(d), player: "self" }; } },
            { "name": "Article$string$8", "symbols": [{ "literal": "a" }, { "literal": "n" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$8"], "postprocess": function (d, l) { return { raw_text: gv(d) }; } },
            { "name": "Article$string$9", "symbols": [{ "literal": "s" }, { "literal": "e" }, { "literal": "c" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "y" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$9"], "postprocess": function (d, l) { return { raw_text: gv(d), location: "security" }; } },
            { "name": "Article$string$10", "symbols": [{ "literal": "o" }, { "literal": "n" }, { "literal": "e" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$10"], "postprocess": function (d, l) { return { raw_text: gv(d) }; } },
            { "name": "Article$subexpression$3$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$subexpression$3", "symbols": ["Article$subexpression$3$string$1"] },
            { "name": "Article$subexpression$3$string$2", "symbols": [{ "literal": "T" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article$subexpression$3", "symbols": ["Article$subexpression$3$string$2"] },
            { "name": "Article", "symbols": ["Article$subexpression$3"], "postprocess": function (d, l) { return { raw_text: gv(d), it: true }; } },
            { "name": "Article$string$11", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$11"], "postprocess": function (d, l) { return { raw_text: gv(d), self: true }; } },
            { "name": "Article$string$12", "symbols": [{ "literal": "T" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$12"], "postprocess": function (d, l) { return { raw_text: gv(d), self: true }; } },
            { "name": "Article$string$13", "symbols": [{ "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Target", "Article$string$13"], "postprocess": function (d, l, r) {
                    let target = d[0];
                    //            if (target.from_txt === "from") return r;
                    if (target.count > 1)
                        return r;
                    return { raw_text: gv(d), under: d[0] };
                } },
            { "name": "Article$string$14", "symbols": [{ "literal": "i" }, { "literal": "t" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Article", "symbols": ["Article$string$14"], "postprocess": function (d) { return { raw_text: gv(d), under: { raw_text: "it", it: true } }; } },
            { "name": "Adjective", "symbols": ["Article"], "postprocess": id },
            { "name": "Adjective$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": "x" }, { "literal": "x" }, { "literal": "x" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$1"], "postprocess": function (d) { return { raw_text: gv(d), under: "" }; } },
            { "name": "Adjective$string$2", "symbols": [{ "literal": "o" }, { "literal": "f" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$2"], "postprocess": function (d, l) { return { raw_text: gv(d) }; } },
            { "name": "Adjective$string$3", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "c" }, { "literal": "h" }, { "literal": "1" }, { "literal": "1" }, { "literal": "1" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$3"], "postprocess": function (d, l) { return { raw_text: gv(d), such: true }; } },
            { "name": "Adjective$string$4", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "c" }, { "literal": "h" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$4"], "postprocess": function (d, l) { return { raw_text: gv(d), such: true }; } },
            { "name": "Adjective$ebnf$1$string$1", "symbols": [{ "literal": "u" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective$ebnf$1", "symbols": ["Adjective$ebnf$1$string$1"], "postprocess": id },
            { "name": "Adjective$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Adjective$string$5", "symbols": [{ "literal": "s" }, { "literal": "u" }, { "literal": "s" }, { "literal": "p" }, { "literal": "e" }, { "literal": "n" }, { "literal": "d" }, { "literal": "e" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$ebnf$1", "Adjective$string$5"], "postprocess": function (d, l) { return { raw_text: gv(d), suspended: !d[0] }; } },
            { "name": "Adjective$string$6", "symbols": [{ "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$6"], "postprocess": function (d, l) { return { raw_text: gv(d), is_evo_card: true }; } },
            { "name": "Adjective$string$7", "symbols": [{ "literal": "l" }, { "literal": "i" }, { "literal": "n" }, { "literal": "k" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$7"], "postprocess": function (d, l) { return { raw_text: gv(d), is_link_card: true }; } },
            { "name": "Adjective$string$8", "symbols": [{ "literal": "o" }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$8"], "postprocess": function (d, l) { return { raw_text: gv(d), other: true }; } },
            { "name": "Adjective$string$9", "symbols": [{ "literal": "f" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": "-" }, { "literal": "u" }, { "literal": "p" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$9"], "postprocess": function (d, l) { return { raw_text: gv(d), face: "up" }; } },
            { "name": "Adjective$string$10", "symbols": [{ "literal": "f" }, { "literal": "a" }, { "literal": "c" }, { "literal": "e" }, { "literal": "-" }, { "literal": "d" }, { "literal": "o" }, { "literal": "w" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$10"], "postprocess": function (d, l) { return { raw_text: gv(d), face: "down" }; } },
            { "name": "Adjective", "symbols": ["ColorInfo"] },
            { "name": "Adjective", "symbols": ["ColorCount"] },
            { "name": "Adjective", "symbols": ["DPClause"] },
            { "name": "Adjective", "symbols": ["LevelClause"] },
            { "name": "Adjective$string$11", "symbols": [{ "literal": "s" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "-" }, { "literal": "l" }, { "literal": "e" }, { "literal": "v" }, { "literal": "e" }, { "literal": "l" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective$string$11"] },
            { "name": "Adjective", "symbols": ["TraitClause"] },
            { "name": "Adjective", "symbols": ["SuperlativeClause"] },
            { "name": "Adjective$string$12", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Adjective", "symbols": ["Adjective", "Adjective$string$12", "Adjective"], "postprocess": function (d, l) { return { raw_text: gv(d), or: [d[0], d[2]] }; } },
            { "name": "FromRegion$string$1", "symbols": [{ "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }, { "literal": "b" }, { "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "l" }, { "literal": "e" }, { "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": "a" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion", "symbols": ["FromRegion$string$1"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), or: [
                            { raw_text: "your hand", player: 'self', location: 'hand' },
                            { raw_text: "your battle area", player: 'self', location: 'battle' }
                        ]
                    };
                } },
            { "name": "FromRegion$string$2", "symbols": [{ "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "f" }, { "literal": "i" }, { "literal": "e" }, { "literal": "l" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion", "symbols": ["FromRegion$string$2"], "postprocess": function (d, l) { return { raw_text: gv(d), location: "field" }; } },
            { "name": "FromRegion$string$3", "symbols": [{ "literal": "a" }, { "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "g" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion", "symbols": ["FromRegion$string$3"], "postprocess": function (d, l) { return { raw_text: gv(d), location: "reveal" }; } },
            { "name": "FromRegion$string$4", "symbols": [{ "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion", "symbols": ["FromRegion$string$4"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), is_evo_card: true, under: { raw_text: "this Monster", self: true }, location: "battle",
                    };
                } },
            { "name": "FromRegion$subexpression$1$string$1", "symbols": [{ "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion$subexpression$1", "symbols": ["FromRegion$subexpression$1$string$1"] },
            { "name": "FromRegion$subexpression$1$string$2", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion$subexpression$1", "symbols": ["FromRegion$subexpression$1$string$2"] },
            { "name": "FromRegion$ebnf$1", "symbols": [] },
            { "name": "FromRegion$ebnf$1$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion$ebnf$1$subexpression$1", "symbols": ["FromRegion$ebnf$1$subexpression$1$string$1", "Location"] },
            { "name": "FromRegion$ebnf$1", "symbols": ["FromRegion$ebnf$1", "FromRegion$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "FromRegion", "symbols": ["FromRegion$subexpression$1", "Whose", { "literal": " " }, "Location", "FromRegion$ebnf$1"], "postprocess": function (d, l) {
                    const locs = [d[3], ...d[4].map(x => x[1])];
                    const and = [d[1], { or: locs, raw_text: gv([d[3], d[4]]) }];
                    return { raw_text: gv(d), stuff: d, and: and };
                } },
            { "name": "FromRegion$string$5", "symbols": [{ "literal": "f" }, { "literal": "r" }, { "literal": "o" }, { "literal": "m" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion", "symbols": ["FromRegion$string$5", "Location"], "postprocess": function (d, l) {
                    const and = [d[1]];
                    return { raw_text: gv(d), and: and };
                } },
            { "name": "FromRegion$string$6", "symbols": [{ "literal": "i" }, { "literal": "n" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "FromRegion", "symbols": ["FromRegion$string$6"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), player: 'self', location: 'hand' };
                } },
            { "name": "Whose$string$1", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Whose", "symbols": ["Whose$string$1"], "postprocess": function (d, l) { return { raw_text: gv(d), player: "self" }; } },
            { "name": "Whose$string$2", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Whose", "symbols": ["Whose$string$2"] },
            { "name": "Whose$string$3", "symbols": [{ "literal": "y" }, { "literal": "o" }, { "literal": "u" }, { "literal": "r" }, { "literal": " " }, { "literal": "o" }, { "literal": "p" }, { "literal": "p" }, { "literal": "o" }, { "literal": "n" }, { "literal": "e" }, { "literal": "n" }, { "literal": "t" }, { "literal": "'" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Whose", "symbols": ["Whose$string$3"] },
            { "name": "Whose$string$4", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "i" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Whose", "symbols": ["Whose$string$4"], "postprocess": function (d, l) { return { raw_text: gv(d), player: "other" }; } },
            { "name": "Location$string$1", "symbols": [{ "literal": "h" }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Location", "symbols": ["Location$string$1"], "postprocess": function (d, l) { return { raw_text: gv(d), location: "hand" }; } },
            { "name": "Location$string$2", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "x" }, { "literal": "x" }, { "literal": "x" }, { "literal": "b" }, { "literal": "a" }, { "literal": "t" }, { "literal": "t" }, { "literal": "l" }, { "literal": "e" }, { "literal": " " }, { "literal": "a" }, { "literal": "r" }, { "literal": "e" }, { "literal": "a" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Location", "symbols": ["Location$string$2"], "postprocess": function (d, l) { return { raw_text: gv(d), location: "battle" }; } },
            { "name": "Location$string$3", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "a" }, { "literal": "s" }, { "literal": "h" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Location", "symbols": ["Location$string$3"], "postprocess": function (d, l) { return { raw_text: gv(d), location: "trash" }; } },
            { "name": "Location$string$4", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "e" }, { "literal": "v" }, { "literal": "o" }, { "literal": "l" }, { "literal": "u" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Location", "symbols": ["Location$string$4"], "postprocess": function (d, l) {
                    return {
                        raw_text: gv(d), is_evo_card: true, under: { raw_text: "this Monster", self: true }, location: "battle",
                    };
                } },
            { "name": "Location$string$5", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "i" }, { "literal": "s" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": "'" }, { "literal": "s" }, { "literal": " " }, { "literal": "l" }, { "literal": "i" }, { "literal": "n" }, { "literal": "k" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }, { "literal": "s" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Location", "symbols": ["Location$string$5"], "postprocess": function (d, l) {
                    return {
                        l: l,
                        raw_text: gv(d), plugged_to: { raw_text: "this Monster", self: true, }, location: "battle",
                    };
                } },
            { "name": "Entity", "symbols": ["Card"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: d[0].entity, and: d[0].and, type: 'Entity' }; } },
            { "name": "Entity", "symbols": ["Monster"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: d[0].entity, and: d[0].and, type: 'Entity' }; } },
            { "name": "Entity", "symbols": ["Tamer"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: d[0].entity, and: d[0].and, type: 'Entity' }; } },
            { "name": "Entity", "symbols": ["Option"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: d[0].entity, and: d[0].and, type: 'Entity' }; } },
            { "name": "Entity", "symbols": ["Token"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: d[0].entity, and: d[0].and, type: 'Entity', xxx_debug: d[0].xxx_debug }; } },
            { "name": "Entity$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Entity$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Entity", "symbols": ["StandaloneText", "Entity$ebnf$1"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: d[0].entity, and: d[0], type: 'Entity' }; } },
            { "name": "Entity$subexpression$1$string$1", "symbols": [{ "literal": " " }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Entity$subexpression$1", "symbols": ["Entity$subexpression$1$string$1"] },
            { "name": "Entity$subexpression$1$string$2", "symbols": [{ "literal": " " }, { "literal": "a" }, { "literal": "n" }, { "literal": "d" }, { "literal": "/" }, { "literal": "o" }, { "literal": "r" }, { "literal": " " }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Entity$subexpression$1", "symbols": ["Entity$subexpression$1$string$2"] },
            { "name": "Entity", "symbols": ["Entity", "Entity$subexpression$1", "Entity"], "postprocess": function (d, l) { return { raw_text: gv(d), entity: "obsolete", or: [d[0], d[2]], type: 'Entity' }; } },
            { "name": "Entity$subexpression$2$string$1", "symbols": [{ "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": "m" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Entity$subexpression$2", "symbols": ["Entity$subexpression$2$string$1"] },
            { "name": "Entity$subexpression$2$string$2", "symbols": [{ "literal": "i" }, { "literal": "t" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Entity$subexpression$2", "symbols": ["Entity$subexpression$2$string$2"] },
            { "name": "Entity", "symbols": ["Entity$subexpression$2"], "postprocess": function (d, l) { return { raw_text: gv(d), and: { raw_text: "it", it: true }, type: 'Entity' }; } },
            { "name": "Card$string$1", "symbols": [{ "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Card$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Card", "symbols": ["Card$string$1", "Card$ebnf$1"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            { raw_text: "card", entity: "card" }
                        ], type: 'Entity' };
                } },
            { "name": "Card$string$2", "symbols": [{ "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card$ebnf$2", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Card$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Card", "symbols": ["Card$string$2", "Card$ebnf$2"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            // technically when looking for "X card" we shouldn't match on "X entity"
                            // but some effects do use 'card' to refer to the entity on field
                            //    { raw_text: "card",  entity: "card" }, 
                            { raw_text: "Monster", entity_type: "Monster" }
                        ], type: 'Entity' };
                } },
            { "name": "Card$string$3", "symbols": [{ "literal": "T" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card$ebnf$3", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Card$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Card", "symbols": ["Card$string$3", "Card$ebnf$3"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            //     { raw_text: "card",  entity: "card" },
                            { raw_text: "Tamer", entity_type: "Tamer" }
                        ], type: 'Entity' };
                } },
            { "name": "Card$string$4", "symbols": [{ "literal": " " }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": "s" }, { "literal": "e" }, { "literal": "c" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card$ebnf$4", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Card$ebnf$4", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Card", "symbols": ["StandaloneText", "Card$string$4", "Card$ebnf$4"] },
            { "name": "Card$string$5", "symbols": [{ "literal": " " }, { "literal": "s" }, { "literal": "e" }, { "literal": "c" }, { "literal": "u" }, { "literal": "r" }, { "literal": "i" }, { "literal": "t" }, { "literal": "y" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card$ebnf$5", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Card$ebnf$5", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Card", "symbols": ["StandaloneText", "Card$string$5", "Card$ebnf$5"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            { raw_text: gv(d[0]), name_is: d[0].name_is },
                            { raw_text: "security", location: "security" },
                            { raw_text: "card entity", entity: "card" },
                        ], type: 'Entity' };
                } },
            { "name": "Card$string$6", "symbols": [{ "literal": "O" }, { "literal": "p" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card$ebnf$6", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Card$ebnf$6", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Card", "symbols": ["Card$string$6", "Card$ebnf$6"], "postprocess": function (d) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            // do we care about the Option entity on the board?
                            //     { raw_text: "card",  entity: "card" },
                            { raw_text: "Option", entity_type: "Option" }
                        ], type: 'Entity' };
                } },
            { "name": "Card$string$7", "symbols": [{ "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "C" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card", "symbols": ["Card$string$7"] },
            { "name": "Card$string$8", "symbols": [{ "literal": "O" }, { "literal": "p" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }, { "literal": " " }, { "literal": "C" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card", "symbols": ["Card$string$8"] },
            { "name": "Card$string$9", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }, { "literal": " " }, { "literal": "c" }, { "literal": "a" }, { "literal": "r" }, { "literal": "d" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Card", "symbols": ["Card$string$9"] },
            { "name": "Monster$subexpression$1$string$1", "symbols": [{ "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Monster$subexpression$1", "symbols": ["Monster$subexpression$1$string$1"] },
            { "name": "Monster$subexpression$1$string$2", "symbols": [{ "literal": "m" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Monster$subexpression$1", "symbols": ["Monster$subexpression$1$string$2"] },
            { "name": "Monster$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Monster$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Monster", "symbols": ["Monster$subexpression$1", "Monster$ebnf$1"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            // { raw_text: "card",  entity: "entity" },
                            { raw_text: "Monster", entity_type: "Monster" }
                        ], type: 'Entity' };
                } },
            { "name": "Monster$string$1", "symbols": [{ "literal": "d" }, { "literal": "e" }, { "literal": "l" }, { "literal": "e" }, { "literal": "t" }, { "literal": "e" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "e" }, { "literal": " " }, { "literal": "b" }, { "literal": "e" }, { "literal": "l" }, { "literal": "o" }, { "literal": "w" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Monster", "symbols": ["Monster$string$1"] },
            { "name": "Monster$string$2", "symbols": [{ "literal": "X" }, { "literal": "X" }, { "literal": "X" }, { "literal": " " }, { "literal": "t" }, { "literal": "h" }, { "literal": "a" }, { "literal": "t" }, { "literal": " " }, { "literal": "M" }, { "literal": "o" }, { "literal": "n" }, { "literal": "s" }, { "literal": "t" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Monster", "symbols": ["Monster$string$2"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), it: true, entity: gv(d), and: [
                            // { raw_text: "card",  entity: "entity" },
                            { raw_text: "Monster", entity_type: "Monster" }
                        ], type: 'Entity' };
                } },
            { "name": "Tamer$string$1", "symbols": [{ "literal": "T" }, { "literal": "a" }, { "literal": "m" }, { "literal": "e" }, { "literal": "r" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Tamer$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Tamer$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Tamer", "symbols": ["Tamer$string$1", "Tamer$ebnf$1"], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            // { raw_text: "card",  entity: "entity" },
                            { raw_text: "Tamer", entity_type: "Tamer" }
                        ], type: 'Entity' };
                } },
            { "name": "Option$string$1", "symbols": [{ "literal": "O" }, { "literal": "p" }, { "literal": "t" }, { "literal": "i" }, { "literal": "o" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Option", "symbols": ["Option$string$1"] },
            { "name": "Token$string$1", "symbols": [{ "literal": " " }, { "literal": "T" }, { "literal": "o" }, { "literal": "k" }, { "literal": "e" }, { "literal": "n" }], "postprocess": function joiner(d) { return d.join(''); } },
            { "name": "Token$ebnf$1", "symbols": [{ "literal": "s" }], "postprocess": id },
            { "name": "Token$ebnf$1", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Token$ebnf$2", "symbols": [{ "literal": "." }], "postprocess": id },
            { "name": "Token$ebnf$2", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Token$ebnf$3", "symbols": [{ "literal": " " }], "postprocess": id },
            { "name": "Token$ebnf$3", "symbols": [], "postprocess": function (d) { return null; } },
            { "name": "Token$ebnf$4", "symbols": ["AllChar"] },
            { "name": "Token$ebnf$4", "symbols": ["Token$ebnf$4", "AllChar"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "Token", "symbols": ["StandaloneText", "Token$string$1", "Token$ebnf$1", "Token$ebnf$2", "Token$ebnf$3", { "literal": "(" }, "Token$ebnf$4", { "literal": ")" }], "postprocess": function (d, l) {
                    return { raw_text: gv(d), entity: gv(d), and: [
                            { raw_text: gv(d[0]), name_is: d[0].name_is },
                            { raw_text: "Token", entity_type: "Token" },
                        ],
                        xxx_debug: gv(d[6] || ""),
                        type: 'Entity',
                        unused_chars: '123', // gv(d[6])
                    };
                } },
            { "name": "AllChar", "symbols": [/[-a-zA-Z0-9:. +()'\[\]/＜＞]/] },
            { "name": "TokenCheese$ebnf$1", "symbols": [] },
            { "name": "TokenCheese$ebnf$1$subexpression$1", "symbols": [{ "literal": "/" }, "BracketContent"] },
            { "name": "TokenCheese$ebnf$1", "symbols": ["TokenCheese$ebnf$1", "TokenCheese$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) { return d[0].concat([d[1]]); } },
            { "name": "TokenCheese", "symbols": ["BracketContent", "TokenCheese$ebnf$1"], "postprocess": function (d, l) {
                    const array = [d[0], ...d[1].map(x => x[1])];
                    return { raw_text: gv(d), type: 'TokenCheese', tokens: array };
                } }
        ],
        ParserStart: "Top"
    };
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = grammar;
    }
    else {
        window.grammar = grammar;
    }
})();
