let fs = require('fs');
let filename = "translate.txt";

interface KeywordArray {
    [key: string]: string
}


import { createLogger } from "./logger";
const logger = createLogger('translator');


export class TranslatorSingleton {
    pairs: [string, string][] = [];


    private keywords: KeywordArray = {};

    constructor() {
        try {
            let files = fs.readFileSync(filename, 'utf8');
            let lines = files.split("\n");
            for (let line of lines) {
                // tab-separated phrases, or space-separated words
                // minimal error-checking here
                if (line.length < 2) continue;
                if (line.includes("\t")) {
                    let [left, right] = line.split("\t");
                    if (line.startsWith("＜")) {
                        this.keywords[left] = right;
                    } else {
                        this.pairs.push([left, right]);
                        //                        this.pairs.push([ this.escape_regexp(left),
                        //                                      this.escape_regexp(right);
                    }
                } else {
                    this.pairs.push(line.split(" "));
                }
            }
        } catch (e) {
            throw (e);
        }
            //   console.error(this.pairs);
             //  console.error(111111);
             //  console.error(this.keywords);
    }

    private escape_regexp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    private reminder_replace(line: string) {
        let m;
        // [^] for multiline match
        //        if (m = line.match(/([^]*)(＜[^＞]*＞)(\s*)\((.*)\)([^]*)/m)) {
        if (m = line.match(/(.*)(＜[^＞]*＞)(\s*)\((.*)\)(.*)/m)) {

            let first: string = m[1];
            let keyword: string = m[2];
            let spaces: string = m[3]
            let reminder: string = m[4];
            let rest: string = m[5];

            // simple
            if (!this.keywords[keyword]) {
                this.keywords[keyword] = reminder;
                //console.error(`ZZZ [${keyword}] [${reminder}]`);
            }
            line = first + keyword + spaces + rest;
        }

        // take out all other parens we didn't already catch
        line = line.replaceAll(/(＜.*＞.*)\s+\(.*\)/ig, '$1')
        return line.trim();
    }

    get_reminder(word: string) {
        
        let tag = "＜" + word + "＞";
        if (this.keywords[tag]) {
            return this.keywords[tag];
        }
        for (const key in this.keywords) {
            if (this.keywords.hasOwnProperty(key)) {
                // todo: precalculate these
                let re = new RegExp(key, "ig");
                tag = tag.replaceAll(re, this.keywords[key]);
            }
        }
        return tag;
    }

    // this can end up run twice on the same text. that's bad!
    text(_input: string): string {
        //        console.error(`_input length is ${_input.length}`);
        let lines = _input.split("\n");
        let output: string[] = [];
        for (let input of lines) {
            //          console.error(`input length is ${input.length}`);
            for (let pair of this.pairs) {
                input = input.replaceAll(pair[0], pair[1]);
            }
            input = this.reminder_replace(input);
            output.push(input);
        }
        return output.join("\n");
    }
    check_for_keywords(line: string, strings: string[], regexps: string[]): [string, string?] {
        // we still have a ＜KEYWORD＞! Hope it's Atomic...
        let m;
        // console.error(96, strings);
        // console.error(97, regexps); 
        let keyword;
        if (m = line.match(/^\s*＜(.*)＞(.*)/)) {
            keyword = '＜' + m[1] + '＞';
            logger.info(" keyword " + line);
            let word = "＜" + m[1] + "＞";
            let unseenword = true;
            // I shouldn't ever match SolidKeywords, I just matched above
            for (let str of strings) {
                if (str == (word)) {
                    logger.warn("MATCHED s " + str);
                    unseenword = false;
                }
            }
            for (let pattern of regexps) {
                if (word.match(new RegExp(pattern, 'i'))) {
                    logger.warn("MATCHED r " + pattern);
                    unseenword = false;
                }
            }
            if (unseenword) {
                logger.info("naked keyword " + word);
                //logger.debug(m);
                // probably nothing left after the 
                let reminder = Translator.get_reminder(m[1]);
                logger.info("keyword reminder is " + reminder)
                if (reminder) {
                    line = reminder;
                }
                if (m[2].trim().length > 1) {
                    logger.warn("KEYWORD REMNANT:1 " + m[2] + " line was " + line);
                    if (reminder) {
                        line += m[2].trim();
                    }
                }
                logger.info("line now " + line);

            }
        }
        return [line, keyword];

    }
}
export let Translator: TranslatorSingleton = new TranslatorSingleton();