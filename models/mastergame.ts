


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
const logger = createLogger('card');

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
        let name = new_card.name.toUpperCase().replaceAll(/[^A-Z]/g, "");
        let set = id.split("-")[0];
        let identifier = set + "-" + name;
        logger.silly(`putting ${id} ${identifier} in index`);
        this.prefixes[identifier] = id;
    }

    // loads card
    private load_card(thus: Mastergame, card_id: string) {
        let filename = `fandom-${card_id}.html.txt`;
        try {
        let thingy = fs.readFileSync('./db/' + filename, 'utf8');
        logger.debug("file got " + card_id);
        let new_card = new Card({}, thingy);
        this.put_card_in_index(new_card);
        } catch (e) {
            logger.warn(`couldn't find card ${card_id}, skipping`);
        }

    }

    constructor(mode: string = "normal") {

        // let thingy: string = "test";
        this.cards = {};
        logger.debug("mode is " + mode);

        if (true) {

        this.load_card(this, "BT1-009"); // we have all surrounding 10
        this.load_card(this, "BT1-019"); // we have all surrounding 10
        this.load_card(this, "BT1-020"); // we have all surrounding 10
        this.load_card(this, "BT1-028"); // we have all surrounding 10

        //this.load_card(this, "BT1-037"); // we have all surrounding 10
        for (let i = 30; i <= 39; i++) {
            this.load_card(this, "BT1-0" + i);
            this.load_card(this, "BT14-0" + i);
        }
        for (let i = 60; i <= 69; i++) {
            this.load_card(this, "BT1-0" + i);
        }

        this.load_card(this, "ST1-16"); // we have all surrounding 10
        this.load_card(this, "ST2-13"); // we have all surrounding 10


        this.load_card(this, "BT2-067"); // we have all surrounding 10
        this.load_card(this, "BT3-089"); // we have all surrounding 10

        this.load_card(this, "BT4-108"); // cyclonic kick, does it work?

        this.load_card(this, "P-101");  // two-color non-green
        this.load_card(this, "P-102"); // we have all surrounding 10
        this.load_card(this, "P-103");
        this.load_card(this, "P-104");
        this.load_card(this, "P-105");
        this.load_card(this, "P-106"); // this is one training, can get the rest too
        this.load_card(this, "P-107");
        this.load_card(this, "P-108");

        this.load_card(this, "BT11-051"); // ogremon
        this.load_card(this, "BT8-091"); // willissssss....
        this.load_card(this, "BT8-109"); // flame hellstyhe
        this.load_card(this, "ST3-01");
        this.load_card(this, "ST3-02"); // yellow salamon
        this.load_card(this, "BT3-112");
        this.load_card(this, "BT2-070");
        this.load_card(this, "BT5-039");

        this.load_card(this, "EX2-045"); // calumon 
        this.load_card(this, "EX2-061"); // ex2 henry 

        this.load_card(this, "EX4-002");
        this.load_card(this, "EX4-031");
        this.load_card(this, "EX4-032");
        this.load_card(this, "EX4-033"); // terry assistant
        this.load_card(this, "EX4-034");
        this.load_card(this, "EX4-057"); // green purple antylmon 

        this.load_card(this, "BT9-051"); // green blue Panjyamon_(X_Antibody)
        this.load_card(this, "BT5-052"); // vanilal green garbagemon 
        this.load_card(this, "BT8-039"); // rapidmon golden classic
        this.load_card(this, "BT8-042"); // two color level5 non-green
        this.load_card(this, "BT16-061"); // two color level5 non-green
    }
        this.load_card(this, "DW1-02");
        this.load_card(this, "DW1-03");
        this.load_card(this, "DW1-04");
        this.load_card(this, "DW1-05");


        if (mode == "test" || mode == "normal") {
            for (let st of [7, 8, 
                15,
                16,
                17]) {
                for (let n = 1; n <= 17; n += 1) {
                    if (st < 9 && n > 12) continue; // only 12 cards in st7,st8?
                    if (st == 17 && n > 13) continue; // only 13 cards in st17
                    let cn = ("" + n).padStart(2, '0');
                    let card_id = `ST${st}-${cn}`;
                    this.load_card(this, card_id);
                }
            }

        }


        // if (mode != "normal") return;
        let thingy: string = "test";
        try {
            thingy = fs.readFileSync('/tmp/starters.json', 'utf8');
        } catch (error) {
            try {
                thingy = fs.readFileSync('./starters.json', 'utf8');
            } catch (error2: any) {
                logger.error("really failed");
                thingy = "[]";
                logger.error(error2.toString());
            }
        }
        this.raw_data = thingy;
        var obj = JSON.parse(thingy);

        for (let i = 0; i < obj.length; i++) {
            let card = new Card(obj[i]);
            this.put_card_in_index(card);
        }

        this.prefix_keys = Object.keys(this.prefixes).sort();
        let counter = 0;
        for (let key in this.cards) {
            logger.debug(`list ${counter++} ${this.cards[key].id} ${this.cards[key].summary.substring(0, 100)}`);
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