


import Instance = require('./instance');
import Player = require('./player');
import { Card } from './card';
import Phase = require('./phase');


interface CardArray {
    [key: string]: Card
}

// called mastergame for historical reasons, should change it to
// like "SingletonDB" or "Spike" or "Stone." Yeah, Stone, that's
// a cool name. Okay, from now on this class is called "Stone."
let fs = require('fs');

import { createLogger } from "./logger";
import { Translator } from './translate';
const logger = createLogger('mastergame');

class Mastergame {

    //    normal_circles: string[];
    //   inverse_circles: string[];
    private cards: CardArray;
    raw_data: any;
    prefixes: any = {};
    prefix_keys: string[];

    // search sorted list for one entry with a prefix match
    findPrefix(arr: string[], prefix: string): string[] {
        let low = 0;
        let high = arr.length - 1;
        while (low < high) {
            let mid = Math.floor((low + high) / 2);
            if (arr[mid] < prefix) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        let prefixMatches: string[] = [];
        while (arr[low] && arr[low].startsWith(prefix)) {
            prefixMatches.push(arr[low]);
            low++;
        }

        return prefixMatches;
    }

    // removed old find-by-prefix b7624cef7e15692357f6cb00ffde71c9e18a4dd1
    all_cards() { return this.cards; } // only used in this file for debugging 

    // this doesn't make a copy, I hope
    get_card_data(id: string) {
        let c = this.cards[id];
        return c.JSON_data();        
    }

    get_card(pre: string) {
        let c = this.cards[pre];
        if (c) return c;
        let keys = this.findPrefix(this.prefix_keys, pre.toUpperCase());
        if (keys.length == 1) {
            let id = this.prefixes[keys[0]];
            c = this.cards[id];
            if (c) return c;
        }
        return false;

    }


    put_card_in_index(new_card: Card): void {
        let id = new_card.id;
        if (this.cards[id]) {
            return; // do nothing
        }
        this.cards[id] = new_card;
        let name = new_card.name.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
        let set = id.split("-")[0];
        let identifier = set + "-" + name;
        logger.silly(`putting ${id} ${identifier} in index`);
        this.prefixes[identifier] = id;
    }

    // loads card
    private load_card(thus: Mastergame, filename: string) {
        try {
            let thingy = fs.readFileSync('./db/' + filename, 'utf8');
            logger.debug("file got " + filename);
            let new_card = new Card({}, thingy);
            this.put_card_in_index(new_card);
        } catch (e) {
            logger.warn(`couldn't find card ${filename}, skipping`);
        }

    }

    constructor(mode: string = "normal") {

        // let thingy: string = "test";
        this.cards = {};
        logger.debug("mode is " + mode);
        let corpus = "fandom";

        if (true || corpus == "fandom") {

            let files: string[] = [];
            fs.readdirSync("./db")
                .filter(function (file: string) {
                    return file.substr(-9) === '.html.txt';
                })
                .forEach(function (file: string) {
                    files.push(file);
                });

            for (let filename of files) {
                this.load_card(this, filename);
            }
        }

        function read_text(thus: Mastergame, filename: string) {
            console.log(filename);
            let thingy: string = "";
            try {
                thingy = fs.readFileSync(filename, 'utf8');
            } catch (error2: any) {
                logger.warn(`couldn't read ${filename}, skipping`);
                return; 
            }
            thingy = Translator.text(thingy);
            console.log(thingy.length);
            if (thingy.length < 3) return;
            let customs = thingy.split("=====");
            for (let custom of customs) {
                if (custom.length < 10) continue;
                let new_card = new Card({}, custom);
                thus.put_card_in_index(new_card);    
            }
        }

        function read_json(thus: Mastergame, filename: string, populate: boolean = true) {
            // if (mode != "normal") return;
            let thingy: string = "[]";
            try {
                thingy = fs.readFileSync(filename, 'utf8');
            } catch (error2: any) {
                logger.warn(`couldn't read ${filename}, skipping`);
                return; 
            }
            thingy = Translator.text(thingy);
            console.log(thingy.length);
            var obj;
            try { 
                obj = JSON.parse(thingy);
            } catch (error2: any) {
                logger.error(`couldn't parse ${filename}, skipping`);
                logger.error(error2);
                return; 
            }
            for (let i = 0; i < obj.length; i++) {
                if (process.env.INPUT_CARD == "test") console.log(obj[i]);
                let card = new Card(obj[i], populate ? undefined : "no");
                thus.put_card_in_index(card);
            }
        }
        // set this env variable to parse all effects at start-up
        let parse_all = !! process.env.PARSE_ALL;
        read_json(this, "starters.json", parse_all);
        read_json(this, "cards.json", parse_all);
        read_json(this, "tokens.json", parse_all);
        read_text(this, "customs.txt");

        this.prefix_keys = Object.keys(this.prefixes).sort();
        let counter = 0;
        for (let key in this.cards) {
            let msg = `list ${counter++} ${this.cards[key].id} ${this.cards[key].summary.substring(0, 100)}`;
            logger.warn(msg);
        }
        logger.debug("before ctor, length is " + Reflect.ownKeys(this.cards).length);
    }
}

export = Mastergame;

// call directly to test parser
if (require.main === module) {
    let m = new Mastergame("test");
    let cards = m.all_cards();
    for (let id in cards) {
        let c = cards[id];
        c.fandom_input = "del";
        console.log("==>" + id + "  " + c.name);
        console.dir(c, { depth: 3 });
        console.log("FX");
        for (let solid of c.new_effects) console.log(solid.toString());
        console.log("INHERIT");
        for (let solid of c.new_inherited_effects) console.log(solid.toString());
        console.log("SECURITY");
        for (let solid of c.new_security_effects) console.log(solid.toString());

    }
}