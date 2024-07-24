import { Instance } from './instance'
import { Player } from './player';
import { Card, CardLocation, Color, colors, word_to_color } from './card';
import { Location } from './location';
import { Game } from './game';
import { GameEvent, strToEvent } from './event';

let targetdebug = 0;


// 1 monster or 1 tamer with [Tai] in its name
// your opponent's blue monster
// 1 of your suspended tamers


import { createLogger } from "./logger";
const logger = createLogger('target');


export enum Conjunction {
    DUMMY = 1, AND, OR, ALL, UNIT, SELF, SOURCE,
    PLAYER, NOT
};

export class SpecialInstance implements TargetSource {
    constructor(private value: Instance) { }
    get_n_player() { return this.value.n_me_player; }
    get_player() { return this.value.me_player; }
    get_instance() { return this.value; }
    id() { return this.value.id; }
    card_id() { return this.value.card_id(); }
    is_card() { return false; }
    is_instance() { return true; }
    location() { return this.value.location; } // Location.SHADOWREALM; }
    kind(): string { return "instance"; }
    get_card_location() { return null! };
    get_name() { return this.value.name(); }


}

export class fSpecialPlayer implements TargetSource {
    constructor(private value: Player) { }
    get_n_player() { return this.value.player_num; }
    get_player() { return this.value; }
    get_instance() { console.error("darn1"); return null!; } // death
    id() { return 0; }
    card_id() { return "illogical"; }
    is_card() { return false; }
    is_instance() { return false; }
    location() { return -3; } //  Location.SHADOWREALM; }
    kind(): string { return "fplayer"; }
    get_card_location() { return null! }
    get_name():string { return this.value.name(); }
}
// Maybe this should be a CardLocation
export class SpecialCard implements TargetSource {
    constructor(private value: CardLocation) { }
    get_n_player() { return this.value.n_me_player; }
    get_player() { return this.value.game.get_n_player(this.value.n_me_player); }
    get_instance() { console.error("darn2"); return null!; } // death
    id() { return -1; }
    card_id() { return this.value.card_id; }
    is_card() { return true; }
    is_instance() { return false; }
    location() { return this.value.location; }
    kind(): string { return "card"; }
    get_card_location() { return this.value; }
    get_name(): string { return this.value.name; }

}
export interface TargetSource {
    get_n_player(): number;
    get_player(): Player;
    get_instance(): Instance;
    id(): number;
    card_id(): string;
    is_card(): boolean;
    is_instance(): boolean;
    location(): Location;
    kind(): string;
    get_card_location(): CardLocation;
    get_name(): string;
}


// can apply to game or to an instance
enum GameTestWordOBSOLETE {

    THIS_INSTANCE, // check self for matching target
    YOU_HAVE_IN_PLAY, // what it says
    YOU_HAVE_IN_TRASH,
    OPPONENT_HAS_IN_PLAY,

    YOUR_SECURITY,
    OPPONENTS_SECURITY,
    TOTAL_SECURITY,
};

export enum GameTestType {
    TARGET_EXISTS = 1, // you/your opponent has X in play
    TARGET_HAS = 2,

    SECURITY_COUNT = 3,
    TRASH_COUNT = 4,
};

export class GameTest {
    type: GameTestType;
    td: TargetDesc;
    raw_text: string;

    constructor(type: GameTestType, td: TargetDesc) {
        this.type = type;
        this.td = td;
        this.raw_text = td.raw_text;
    }
    empty(): boolean {
        return !this.td || this.td.empty();
    }
    // test() takes a source, because it was like TargetDesc, but
    // should the source just be built in?
    test(g: Game, source: TargetSource): Instance[] | CardLocation[] {
        if (!this.td) return []
        let t = g.find_target(this.td, GameEvent.NIL, source);
        return t;
    }
    toString(): string { return this.td.toString(); }
}

import _ from 'lodash';
import { config } from 'process';

// For choosing two+ different things (1 [x] and 1 [y])
// Maybe this will take over TargetDesc at some point
// I have serious doubts about this being the right method.
export class MultiTargetDesc {
    raw_text: string;
    targets: TargetDesc[] = [];


    constructor(text: string) {
        this.raw_text = text;

        let m;
        logger.silly("MULTITARGET: " + text);
        // I've hardcoded this to "1"
        if (m = text.match(/(1) (.*) and (1) (.*)/i)) {
            let left_n = 1;
            let left_match = m[2];
            let right_n = 1;
            let right_match = m[4];

            let right;
            let left = new TargetDesc(left_match);
            if (right_match.match(/such tamer card/i)) {
                right = _.cloneDeep(left);
                for (let target of right.targets) {
                    if ("testword" in target) {
                        logger.info("testing for such: " + StatusTestWord[target.testword]);
                        if (target.testword == StatusTestWord.IS_MONSTER) {
                            target.testword = StatusTestWord.IS_TAMER;
                        }

                    }
                }
            } else {
                right = new TargetDesc(right_match);
            }
            this.targets.push(left, right);
        }
    }
    find_merged() {

    }

    match(cards: CardLocation[], a: TargetSource) {
        // find all pairs of cards that match
        // for now this is easy, just A then B, since no overlap
        // TODO: handle overlap
        let lefts: CardLocation[] = [];
        let rights: CardLocation[] = [];
        let [l, r] = this.targets;
        for (let card of cards) {
            if (l.matches(card, undefined!)) lefts.push(card);
            if (r.matches(card, undefined!)) rights.push(card);
        }
        // TODO: we will return 
        let mergedArray = lefts.concat(rights);
        return [... new Set(mergedArray)];
    }

}



//export function getTargetSource(value: Player | Instance): TargetSource {
//     return new SpecialPlayer(value);
//}

// A "targetdesc" is a description of what an effect *can* or *could*
// target. It is *not* to be used to infer what the chosen/assigned target is.
//
// It should probably never exist without being tied to a source like 
// an instance or Card.
// 
// The class has been abused to test gamestate.
export class TargetDesc {
    raw_text: string;
    conjunction: Conjunction;
    targets: (SubTargetDesc | TargetDesc)[];
    most?: compare;
    most_kind?: StatusTestWord;
    remnant: string = "";
    text?: string; // crude way of categorizing things like "all of their security monster" for now

    //	target2?: (SubTargetDesc | TargetDesc);

    empty(): boolean {
        // I guess a compound condition could also be empty? Maybe?
        return this.conjunction == Conjunction.DUMMY;
    }
    toString(): string {
        if (this.conjunction == Conjunction.SOURCE) {
            return "source"; // right now only in retaliation
        }
        if (this.conjunction == Conjunction.SELF) {
            return "self"; // 
        }
        if (this.conjunction == Conjunction.DUMMY) {
            return ""; // dummy unused target";
        }
        if (this.conjunction == Conjunction.UNIT) {
            return this.targets[0].toString();
        }
        if (this.conjunction == Conjunction.OR) {
            // assume only 2 vars
            return `( ${this.targets[0]} OR ${this.targets[1]} )`;
        }
        if (this.conjunction == Conjunction.PLAYER) {
            return `PLAYER ${this.text}`;
        }
        if (this.conjunction == Conjunction.NOT) {
            return `NOT (${this.targets[0].toString()})`;
        }

        if (this.conjunction != Conjunction.ALL) {
            console.error("OH NO 2 " + this.conjunction);
            return "ERROR";
        }
        return "[" + this.targets.join(" ") + "]";
        // + this.raw_text;
    }

    // not sure if "sort" is the best word
    // other things work one item at a time, this works on them all at once


    sort(items: Instance[]): Instance[] {
        // I'm just going to find any subtargest and sort by that
        // with the lowest level
        if (this.most) {
            let min = Math.min(...items.map(x => x.get_level()));
            return items.filter(x => x.get_level() == min);
        }
        return items;
    }

    matches(t: Instance | CardLocation, s: TargetSource): boolean {

        logger.silly("testing main target for " + Conjunction[this.conjunction]);
        if (this.conjunction == Conjunction.SELF) {
            // this works for instances, at least

            // to see if an *instance as source* self-matches
            // to a cardLocation target,
            if (s.is_instance() && ("extract" in t)) {
                return t.location == s.location() &&
                    t.card_id == s.card_id();

            }
            // hey can I merge the above and the below?
            if (s.is_card()) {
                return t.location == s.location() &&
                    t.card_id == s.card_id();


            }
            return (t.id == s.id());
        }
        if (this.conjunction == Conjunction.SOURCE) {
            // I HAVE NO IDEA HOW TO POINT TO THIS
            console.error("huh");
            return false;
        }
        if (this.conjunction == Conjunction.DUMMY) {
            //      console.error("trying to match against dummy");
            return true;
            // should DUMMY match everythying? empty set matches everything
            //			return this.targets[0].matches(t);
        }
        if (this.conjunction == Conjunction.UNIT) {
            return this.targets[0].matches(t, s);
        }
        if (this.conjunction == Conjunction.NOT) {
            return !this.targets[0].matches(t, s);
        }
        if (this.conjunction == Conjunction.OR) {
            let answers = this.targets.map(x => x.matches(t, s));
            logger.silly("OR case returned " + answers.join(",") +
                " " + this.targets.map(x => x.toString()).join(","));
            let ret = answers[0] || answers[1]; // find(x => x);
            logger.silly(ret);
            return ret; // answers[0] || answers[1];
            //            return this.targets[0].matches(t, s) ||
            //              this.targets[1].matches(t, s);
        }

        if (this.conjunction != Conjunction.ALL) {
            console.error("OH NO 1 " + this.conjunction);
            return true;
        }
        let answers = this.targets.map(x => x.matches(t, s));

        logger.silly("AND case returned " + answers.join(",") +
            " " + this.targets.map(x => x.toString()).join(","));
        let ret = answers.every(x => x);
        logger.silly(ret);
        return ret;
        //        return this.targets.every(x => x.matches(t, s));
    }

    // "type" is card or instance
    //	constructor(arg1: number);
    constructor(_text: number | string, type: string = "instance") {
        this.raw_text = "" + _text;
        logger.silly(`TARGET CTOR:<${_text}>`);
        this.targets = [];

        if (typeof _text === 'number') {
            this.raw_text = "id is " + _text;
            this.conjunction = Conjunction.UNIT;
            let std: SubTargetDesc = new SubTargetDesc("id", "" + _text);
            this.targets.push(std);
            return;
        }
        let text: string = "" + _text.trim().toLowerCase();
        if (text == "") {
            this.conjunction = Conjunction.DUMMY;
            return;
        }
        if (text.startsWith("not ")) {
            this.conjunction = Conjunction.NOT;
            this.targets[0] = new TargetDesc(text.substring(4));
            return;
        }
        if (text == "self" ||
            text.match(/this monster/i)) {
            //     logger.silly("SELF TARGET!");
            this.conjunction = Conjunction.SELF;
            return;
        }

        // PRONOUNS

        // "it" refers to a previous clause. For now I think I can assume
        // it is "what was targeted"
        if (text == "it") {
            console.error("assuming it means self");
            this.conjunction = Conjunction.SELF;
            return;
        }

        // 'this card' seems to be used for playing cards
        // from security, which means they will be in reveal
        // 'this card' shows up in some other cases but I
        // think those should be the exception
        if (text.match(/this card/)) {
            logger.silly("cheating to pluck from reveal");
            this.conjunction = Conjunction.SELF;
            //        this.targets.push(new SubTargetDesc("reveal"));
            return;
        }
        if (text == "source") {
            this.conjunction = Conjunction.SOURCE;
            return;
        }
        if (text == "monster" || text == "monster card") {
            this.conjunction = Conjunction.UNIT;
            let std: SubTargetDesc = new SubTargetDesc("monster");
            this.targets.push(std);
            return;
        }
        let or;

        // you may play SEARCH CLAUSE in/from PLACE        

        // to parse "1 X or 1 Y from your hand or trash", I need to trim off 
        // the "from your hand or trash" part first.
        // then I will make a recursive target with "1 X or 1 Y" 

        // before saying "choose 1 x or 1 y, I first need to trim off
        let m;

        this.conjunction = Conjunction.ALL;

        if (text.match(/^\s*opponent\s*$/i)) {
            this.conjunction = Conjunction.PLAYER;
            this.text = text;
            text = "";
        }


        if (m = text.match(/all of their security monster/i)) {
            // this targets a player, I guess
            this.conjunction = Conjunction.PLAYER;
            this.text = text;
            text = "";
        }

        // FROM PLACE BEGIN
        if (m = text.match(/(.*)(in|from) your trash/i)) {
            let x = new SubTargetDesc("trash");
            this.targets.push(x);
            text = m[1];
        } else if (m = text.match(/(.*)(in|from) your hand\s*(or trash)?/i)) {
            let x = new SubTargetDesc(m[3] ? "hand-or-trash" : "hand");
            this.targets.push(x);
            text = m[1];
        }
        /*
        let and;
        if (and = text.match(/(1 .*) and ((1|all) .*)/i)) {
            if (this.targets.length == 0) {
                let a = new TargetDesc(and[1]);
                let b = new TargetDesc(and[2]);
                this.conjunction = Conjunction.;
                this.targets = [a, b];
                return;
            }
            let c = new TargetDesc(text);
            this.targets.push(c);
            return;
        }
*/

        // their (whatever...)
        if (m = text.match(/^\s*(their|your opponent..)\s*(.*)/)) {
            let x = new SubTargetDesc("other");
            this.targets.push(x);
            text = m[2];
        }
        //        logger.silly("TARGET 364: " + text);

        //   logger.silly("after their: " + text);

        // if we've no matches so far, change into OR
        // otherwise, make a new recursive target, which will have no matches so far when it gets here

        // so just when do we use "or"? 
        // If we have "1 tamer or 1 monster" then hitting it here is fine

        // but if we have "a level 5 or lower monster" then we don't want to hit it here


        if (or = text.match(/(1 .*) or (1 .*)/i)) {
            if (this.targets.length == 0) {
                let a = new TargetDesc(or[1]);
                let b = new TargetDesc(or[2]);
                this.conjunction = Conjunction.OR;
                this.targets = [a, b];
                return;
            }
            let c = new TargetDesc(text);
            this.targets.push(c);
            return;
        }



        // If "or" is *after* the word monster, it's a "monster or tamers" style.
        // Eventually I'm gonna hit a lot of "ors" and choke to death. Mervamon I'm looking at you.
        if (or = text.match(/(.*monster.*) or (.*tamer.*)/i)) {
            if (this.targets.length == 0) {
                let a = new TargetDesc(or[1]);
                let b = new TargetDesc(or[2]);
                this.conjunction = Conjunction.OR;
                this.targets = [a, b];
                return;
            }
            let c = new TargetDesc(text);
            this.targets.push(c);
            return;
        }



        //   logger.silly("TARGET 383: " + text);
        // this suspended monster
        // your monster	
        // your opponent's monster
        // your monster with [X] in its name
        // tamer card with [X] in its name
        // your opponent's level 5 or lower monster

        // advance of courage isn't correctly implemented... in the official app?

        // 1 X or 1 Y is the same as 1 X or Y
        // 1 [Agumon] or 1 Tamer card with [Tai Kamiya] in its name



        let name;
        logger.silly("TEXT IS " + text);
        if (name = text.match(/1 \[(.*)\]\/\[(.*)\]/i)) {
            // this.conjunction = Conjunction.OR;

            let or = new TargetDesc("");
            or.conjunction = Conjunction.OR;
            let n1 = new SubTargetDesc("name", name[1]);
            let n2 = new SubTargetDesc("name", name[2]);
            or.targets = [n1, n2];
            this.targets.push(or);
            return;
        }

        // what to do with that number?
        if (name = text.match(/1 \[(.*)\]/)) {
            //  logger.silly("RETURNING UNIT NAME" + name[1]);
            this.conjunction = Conjunction.UNIT;
            this.targets.push(new SubTargetDesc("name", name[1]));
            return;
        }
        //  logger.silly("TARGET 405: " + text);

        //    logger.silly("alpha");
        let me = true;
        if (m = text.match(/you(r opponent)? ha..? (.*)(in play)?/i)) {
            //  logger.silly("Beta");
            if (m[1]) me = false;
            let x = new SubTargetDesc(me ? "me" : "other");
            this.targets.push(x);
            if (m[2].match(/a monster/i)) {
                //    logger.silly("gamma");
                this.targets.push(new SubTargetDesc("monster"));
                return;
            }
            //            if (m[2].match(/a tamer/i)) {
            //              this.targets.push(new SubTargetDesc("tamer"));
            //        }
            //            return;
            logger.silly("delta");
            text = m[2];
        }
        logger.silly("TARGET 426: " + text);

        // MERGE THE IMMEDIATE ABOVE WITH IMMEDIATE BELOW

        let re = new RegExp(/your (opponent'?s?)?(.*)monster(.*)/i);
        m /* (RegExpMatchArray | null | undefined) */ = text.match(re);
        me = true;
        let desc1, desc2;
        if (m) {
            if (m[1]) me = false;
            let x = new SubTargetDesc(me ? "me" : "other");
            this.targets.push(x)
            //			logger.silly(`in m, ${x.toString()}, ${x.raw_text} `);
            desc1 = m[2];
            desc2 = m[3];
            this.targets.push(new SubTargetDesc("monster"));
        } else {
            let n;
            if (n = text.match(/^(.*)tamer( card)?(.*)/i)) {
                logger.silly("tamer match");
                desc1 = n[1];
                desc2 = n[3];
                this.targets.push(new SubTargetDesc("tamer"));
                logger.silly(`d1 ${desc1} d2 ${desc2} `);
            }
        }
        if (!desc1) {
            // purple level 4 or lower monster card
            // "card" gets lost
            if (m = text.match(/^(.*)(monster|tamer)( card)?(.*)$/i)) {
                // is this needed given I have the above paragraph for tamers?
                logger.silly("-- MONSTER/TAMER-- ");
                desc1 = m[1];
                desc2 = m[4];
                this.targets.push(new SubTargetDesc(m[2])); // monster|tamer
                logger.silly(`d1 ${desc1} d2 ${desc2} `);
            }
        }

        // a COLOR tamer with X in its name
        // 1       agumon
        //DESC1: a COLOR

        // if we only have "'1' tamer card" desc1 will be '1'

        logger.silly("target DESC1 is (" + desc1 + ")"); // level 5 or lower
        logger.silly("target DESC2 is (" + desc2 + ")"); // with x in its name
        logger.silly("target text is (" + text + ")");

        if (m = desc1?.match(/\s*1\ (.*)s*/)) {
            desc1 = m[1].trim();
        }
        if (m = text?.match(/\s*1\ (.*)s*/)) {
            text = m[1].trim();
        }


        // I hate this statement, a few things break if I take it out
        if (!desc2) {
            // desc2 = "";
            desc2 = text;
            text = "";
        };

        if (!desc1) {
            desc1 = desc2;
        }

        if (desc2 == "attack") {
            this.targets.push(new SubTargetDesc("attack"));
        }

        //      logger.silly("target DESC2 is " + desc2); // with x in its name,play cost less than 5
        // 1111
        logger.silly(` d1 --${desc1}--`);
        logger.silly(` d2 --${desc2}--`);
        logger.silly(` tx --${text}--`);


        if (m = desc1?.match(/^\s*this(.*)/)) {
            let x = new TargetDesc("self");
            this.targets.push(x);
            desc1 = m[1];
        }

        if (m = desc1?.match(/^\s*another(.*)/)) {
            let x = new TargetDesc("not self");
            this.targets.push(x);
            desc1 = m[1];
        }


        if (m = desc1.match(/\s*1\ (.*)s*/)) {
            text = m[1].trim();
        }


        // ..... red ......
        //  ..... green or purple ...... 

        if (m = desc1.match(/(.*)(2|two)-color.?.? (.*)/i)) {
            let x = new SubTargetDesc("two-color");
            this.targets.push(x);
            desc1 = m[1].trim() + " " + m[3].trim();
            //            desc1 = desc1.trim();
        }

        //        let cre = "(red|blue|yellow|green|black|purple|white)";
        // allow for color to appear either before or after level
        //                        1            2    3                                         4    5                                                    
        if (m = desc1?.match(/^\s*(.*level.*?)?(a )?(red|blue|yellow|green|black|purple|white)( or (red|blue|yellow|green|black|purple|white))?(.*)$/i)) {
            logger.silly("color match");
            if (m[4]) { // or match, do two colors -- I don't think we ever target 3+ colors
                let or = new TargetDesc("");
                or.conjunction = Conjunction.OR;
                let color1 = m[3];
                let color2 = m[5];
                let s1 = new SubTargetDesc("color", color1);
                let s2 = new SubTargetDesc("color", color2);
                or.targets = [s1, s2];
                this.targets.push(or);
            } else {
                let color = m[3];
                let x = new SubTargetDesc("color", color);
                this.targets.push(x);
            }
            desc1 = (m[1] + " " + m[6]).trim();
        }

        if (m = desc1?.match(/^\s*((un)?suspended)\s*$/i)) {
            // status could be 'suspended' or 'unsuspended'
            let x = new SubTargetDesc("status", m[1]);
            this.targets.push(x);
            desc1 = "";
        }

        if (m = desc2.match(/with the (lowest) (level)/i)) {
            this.most = compare.IS_LOWEST;
            this.most_kind = StatusTestWord.LEVEL;
        }

        if (m = desc1?.match(/\s*level (\d+)\s*(or (higher|lower))?\s*(.*)/)) {
            let level = m[1];

            //			logger.silly("2DESC2 is " + desc2); // with x in its name
            //			logger.silly(`m[3] is ${m[3]} x`);
            let x = new SubTargetDesc("level", m[3], level);
            this.targets.push(x);
            desc1 = m[4];
        }


        // is this consistent?
        // play-cost more/less
        // level higher/lower
        if (m = desc2?.match(/\s*with a play.cost of (\d+)\s+(or (more|less))?\s*/i)) {
            //        logger.silly("PLAYCOST MATCH");
            let playcost = m[1];
            //			logger.silly("2DESC2 is " + desc2); // with x in its name
            //			logger.silly(`m[3] is ${m[3]} x`);
            let x = new SubTargetDesc("playcost", m[3], playcost);
            this.targets.push(x);
            desc2 = "";
        }

        if (m = desc2?.match(/\s*with (\d+)\s*DP (or (more|less))?.?.?\s*/i)) {
            //        logger.silly("PLAYCOST MATCH");
            let dp = m[1];
            //			logger.silly("2DESC2 is " + desc2); // with x in its name
            //			logger.silly(`m[3] is ${m[3]} x`);
            let x = new SubTargetDesc("DP", m[3], dp);
            this.targets.push(x);
            desc2 = "";
        }

        //logger.silly("pre name: " + desc2);
        // "in its name" or "in_its_name" for fandom STICKY SPACES HURTING US!
        if (m = desc2?.match(/\s*with (.*)\sin.(its|their).name\s*$/)) {
            //  logger.silly("WWWWW " + m[1])
            let name = m[1];
            let p;
            // if this doesn't work, name_contains could be smart enough to take a []/[] string...
            if (p = name.match(/\[(.*)\]\/\[(.*)\]/i)) {
                let or = new TargetDesc("");
                or.conjunction = Conjunction.OR;
                let n1 = new SubTargetDesc("name_contains", p[1]);
                let n2 = new SubTargetDesc("name_contains", p[2]);
                or.targets = [n1, n2];
                this.targets.push(or);
                return;
            }
            let x = new SubTargetDesc("name_contains", m[1].trim());
            this.targets.push(x);
            //		logger.silly("665DESC2 is " + desc2); // with x in its name
            desc2 = "";
        }

        this.remnant = desc1 + desc2;
        if (this.remnant.length > 0) logger.silly("REMNANT: " + this.remnant)
        return;
    }
}



// one specific thing
// I can return this *just* for testing Baldy Blow
export class SubTargetDesc {
    raw_text: string;
    count_of?: number;
    //	self_player?: boolean;
    kind?: ("monster" | "tamer" | "card" | "game" | "nul");
    testword: StatusTestWord;
    color: Color; // colors; // should this be an arrau? 
    n: number;
    str: string;
    //	target?: Target; // why is this here?
    compare: compare;
    //	cancels?: boolean; I don't think this belong here

    toString(): string {
        switch (this.testword) {
            case StatusTestWord.DP: return `DP ${compare[this.compare]} ${this.n}`;
            case StatusTestWord.HAS_COLOR: return Color[this.color];
            case StatusTestWord.HAS_TRAIT: return `Trait ${this.str}`;
            case StatusTestWord.HAS_TWO_COLOR: return "Two-color";
            case StatusTestWord.INSTANCE_ID_IS: return `ID ${this.n}`;
            case StatusTestWord.IS_MONSTER: return "MONSTER";
            case StatusTestWord.IS_OPTION: return "OPTION";
            case StatusTestWord.IS_TAMER: return "TAMER";
            case StatusTestWord.LEVEL: return `Level ${compare[this.compare]} ${this.n}`;
            case StatusTestWord.LOCATION: return `Location ${this.n}`;
            case StatusTestWord.NAME_CONTAINS: return `Name contains [${this.str}]`;
            case StatusTestWord.NAME_IS: return `Name is [${this.str}]`;
            case StatusTestWord.NIL: return "NIL!";
            case StatusTestWord.OWNER: return `Player ${this.n}`;
            case StatusTestWord.PLAY_COST: return `Play cost ${compare[this.compare]} ${this.n}`;
            case StatusTestWord.ATTACKABLE: return "ATTACKABLE";
            case StatusTestWord.STATUS: return this.str;
            default: return "ERROR"
        }
        //        return "(" + StatusTestWord[this.testword] + ": " + this.str + " " + this.n + ")";
    }

    constructor(arg: string, arg2?: string, n?: string) {
        this.raw_text = arg + " " + arg2 + " " + n;
        this.color = Color.NONE;//  colors.ERR; // Color.NONE;
        this.n = -1;
        this.testword = 0;
        this.compare = compare.NIL;
        this.str = "";

        // instance ID
        if (arg == "id") {
            this.testword = StatusTestWord.INSTANCE_ID_IS;
            this.n = parseInt(arg2!)!;
            if (!this.n) {
                console.error("bad std ctor");
            }
            return;
        }
        if (arg == "status") {
            this.testword = StatusTestWord.STATUS;
            this.str = arg2!;
        }
        if (arg == "hand") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.HAND;
        }
        if (arg == "hand-or-trash") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.HAND | Location.TRASH;
        }
        if (arg == "attack") {
            this.testword = StatusTestWord.ATTACKABLE;
        }
        if (arg == "two-color") {
            this.testword = StatusTestWord.HAS_TWO_COLOR;
        }
        if (arg == "trash") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.TRASH;
        }
        if (arg == "reveal") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.REVEAL;
        }
        if (arg == "me" || arg == "other") {
            this.testword = StatusTestWord.OWNER;
            this.n = (arg == "me") ? 1 : 0;
            //            this.str = arg;
            return;
        }
        if (arg == "tamer") {
            this.testword = StatusTestWord.IS_TAMER;
        }
        if (arg == "monster") {
            this.testword = StatusTestWord.IS_MONSTER;
        }
        if (arg == "level") {
            this.testword = StatusTestWord.LEVEL;
            this.compare = compare.IS;
            if (arg2 == "lower") this.compare = compare.IS_AT_MOST;
            if (arg2 == "higher") this.compare = compare.IS_AT_LEAST;
            if (arg2 == "lowest") this.compare = compare.IS_LOWEST;
            this.n = n ? parseInt(n) : 0;
            return;
        }
        if (arg == "playcost") {
            this.testword = StatusTestWord.PLAY_COST;
            this.compare = compare.IS;
            if (arg2 == "less") this.compare = compare.IS_AT_MOST;
            if (arg2 == "more") this.compare = compare.IS_AT_LEAST;
            this.n = n ? parseInt(n) : 0;
            return;
        }
        if (arg == "DP") {
            this.testword = StatusTestWord.DP;
            this.compare = compare.IS;
            if (arg2 == "less") this.compare = compare.IS_AT_MOST;
            if (arg2 == "more") this.compare = compare.IS_AT_LEAST;
            this.n = n ? parseInt(n) : 0;
            return;
        }
        if (arg == "color") {
            this.testword = StatusTestWord.HAS_COLOR;
            this.color = word_to_color(arg2!);
            return;
        }
        if (arg == "name_contains") {
            this.testword = StatusTestWord.NAME_CONTAINS;
            this.str = arg2!.replace(/_/ig, " ").replace(/[^-a-z0-9 \.]/ig, "").trim();
        }
        if (arg == "name_is" || arg == "name") {
            this.testword = StatusTestWord.NAME_IS;
            this.str = arg2!;
        }
        if (this.testword == 0) {
            console.error(`UNUSED TD ${arg} ${arg2} ${n} `);
            this.testword = StatusTestWord.NIL;
        }
    }



    // p:Player might need to expand to be any source we're comparing to
    // like "find a monster with DP less than this one"
    // we'll need to take in that monster 


    // I tried to make this "Target"
    // WE CAN GET A "CARD" IN HERE, THAT'S BAD
    matches(t: Instance | CardLocation   /* | Player | TargetDesc */, s: TargetSource): boolean {
        if (!t) return false;
        if (t === undefined) return false;
        logger.silly(`testing for ${StatusTestWord[this.testword]} against ${t.get_name()}`);
        switch (this.testword) {
            case StatusTestWord.NIL: console.error("NIL CASE"); return true;
            case StatusTestWord.NAME_IS: return t.name_is(this.str);
            case StatusTestWord.NAME_CONTAINS: return t.name_contains(this.str);
            case StatusTestWord.HAS_COLOR:
                // console.error("IGNORING COLOR somewhat");
                return t.has_color(this.color);

            case StatusTestWord.HAS_TWO_COLOR: return t.is_two_color();
            case StatusTestWord.IS_MONSTER: return t.is_monster();
            case StatusTestWord.IS_TAMER: return t.is_tamer();
            case StatusTestWord.IS_OPTION: return t.is_option();
            case StatusTestWord.HAS_TRAIT: return false;
            case StatusTestWord.DP: return this.do_compare(t.dp(), this.compare, this.n);
            case StatusTestWord.LEVEL: return this.do_compare(t.get_level(), this.compare, this.n);
            case StatusTestWord.PLAY_COST: return this.do_compare(t.get_playcost(), this.compare, this.n);
            case StatusTestWord.LOCATION: return (t.location & this.n) > 0;
            case StatusTestWord.STATUS: if (!("suspended" in t)) { return false; }
                if (this.str == "suspended") return t.suspended;
                if (this.str == "unsuspended") return !t.suspended;
            case StatusTestWord.OWNER:
                // I couldn't set owner at start, because it's too generic
                // But at test, we need to find the player checking.
                // this.n is 0 for "not owner" 1 for "owner"
                let tgt_plyr: number = t.n_me_player;
                // t might be a "card" or an "instance"
                if ("n_player" in t) {
                    let c: Card = (t as unknown) as Card;
                    let num_player: number = c.n_player;
                    tgt_plyr = num_player;
                }
                logger.silly(`tgt_plyr is ${tgt_plyr} and s/get/n is ${s.get_n_player()} and this.n is ${this.n}`);
                if (this.n) {
                    return tgt_plyr == s.get_n_player();
                }
                return tgt_plyr != s.get_n_player();
            case StatusTestWord.INSTANCE_ID_IS:
                let x = t.id == this.n;
                logger.silly("checking instance id of " + t.id + " is " + x);
                return x;
            case StatusTestWord.ATTACKABLE:
                if (typeof t.id === "string") return false;
                let i = s.get_instance();
                logger.silly("attacker inst is " + i.id);
                let tgt = i.can_attack();
                logger.silly("CAN ATTACK: " + tgt);
                return tgt && tgt.includes(t.id);

            default: console.error("UNKNOWN WORD: " + this.testword);
        }

        return true;
    }
    /*
    has_color(c: Color) {
        return this.color && this.color.includes(c);
    }
    has_level(l: number) {
        return this.level && this.level.includes(l);
    }*/
    do_compare(a: number, b: compare, c: number) {
        if (a === undefined || a === null || c == undefined || c == null) return false;
        if (b == compare.IS) return a == c;
        if (b == compare.IS_AT_LEAST) return a >= c;
        if (b == compare.IS_AT_MOST) return a <= c;
        console.error("unimplemented comparison " + b); return true;
    }

}
enum compare { NIL, IS, IS_AT_LEAST, IS_AT_MOST, IS_LOWEST };


export enum StatusTestWord {
    NIL,
    INSTANCE_ID_IS,
    NAME_IS,
    NAME_CONTAINS,
    HAS_COLOR,
    HAS_TWO_COLOR,
    IS_MONSTER, // maybe this should all be "is_type"
    IS_TAMER,
    IS_OPTION,
    HAS_TRAIT,
    LEVEL,
    PLAY_COST,
    DP,
    OWNER,
    LOCATION,
    ATTACKABLE,
    STATUS
}
