import { Instance } from './instance'
import { Player } from './player';
import { Card, CardLocation, Color, colors, word_to_color } from './card';
import { Location, location_to_string } from './location';
import { Game } from './game';
import { GameEvent, strToEvent } from './event';

let targetdebug = 0;


// 1 monster or 1 tamer with [Tai] in its name
// your opponent's blue monster
// 1 of your suspended tamers
type ValueGetter = (obj: Instance) => number;


import { createLogger } from "./logger";
const logger = createLogger('target');

export let ALL_OF = 999;

export enum Conjunction {
    DUMMY = 1, OR, ALL,
    UNIT, SELF, SOURCE,
    PLAYER, NOT,
    LAST_THING,
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
    get_name(simple: boolean) { return this.value.name(simple); }
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
    get_name(simple: boolean) { return this.value.name(); }
}
// Maybe this should be a CardLocation
export class SpecialCard implements TargetSource {
    constructor(private value: CardLocation) { }
    get_n_player() { return this.value.n_me_player; }
    get_player() { return this.value.game.get_n_player(this.value.n_me_player); }
    get_instance() { logger.error("darn2"); return null!; } // death
    id() { return -1; }
    card_id() { return this.value.card_id; }
    is_card() { return true; }
    is_instance() { return false; }
    location() { return this.value.location; }
    kind(): string { return "card"; }
    get_card_location() { return this.value; }
    get_name(simple: boolean): string { return this.value.name; }

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
    get_name(simple: boolean): string;
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
    TARGET_HAS_NOT_USED_YET = 2,

    SECURITY_COUNT_NOT_USED_YET = 3,
    TRASH_COUNT_NOT_USED_YET = 4,

    RESPONDING_TO = 5,

    CARDS_IN_LOCATION = 6,
    ATTACKER_IS = 7

};

export class GameTest {
    type: GameTestType;
    td?: TargetDesc;
    raw_text?: string;
    condition?: InterruptCondition;
    count: number = 1;

    constructor(type: GameTestType, td?: TargetDesc,
        condition?: InterruptCondition, count?: string,
        text?: string
    ) {
        this.type = type;
        this.td = td;
        if (td) {
            this.raw_text = td.raw_text;
        } else {
            // trim garbage off either end
            this.raw_text = text?.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
        }
        this.condition = condition;
        if (count) this.count = parseInt(count);
    }
    no_use_me_empty(): boolean {
        return !this.td || this.td.empty();
    }
    // test() takes a source, because it was like TargetDesc, but
    // should the source just be built in?
    //    test(g: Game, source: TargetSource): Instance[] | CardLocation[] {
    test(g: Game, source: TargetSource, subs?: SubEffect[]): string[] {
        if (this.type === GameTestType.CARDS_IN_LOCATION) {
            logger.info(`testing for ${this.raw_text} / ${this.count}`);
            let n = 0;
            for (let p of [source.get_player(), source.get_player().other_player]) {
                logger.info(`for P${p.player_num} has ${p.trash.length} trash, and ${p.hand.length} hand`);
            }
            if (this.raw_text === "your trash") {
                n = source.get_player().trash.length;
            } else if (this.raw_text === "your opponent's hand") {
                n = source.get_player().other_player.hand.length;
            } else {
                logger.error("BAD CARD TEST: " + this.raw_text);
            }
            n = Math.floor(n / this.count);
            return new Array(n).fill("CARD");
        }

        if (this.type == GameTestType.TARGET_EXISTS) {
            if (!this.td) return []
            let l = Location.UNKNOWN;
            let e = GameEvent.NIL;
            if (this.td.raw_text.includes("security")) {
                l = Location.SECURITY; // search security
            }
            if (this.td.raw_text.includes("card")) {
                e = GameEvent.STACK_ADD; // search security
            }
            let t = g.find_target(this.td, e, source, false, l);
            logger.info("checking game test " + this.count + "?, " + t.map(c => c.get_name()).join(","));

            // it would be better to check this number some place else
            // but this is where we have the information
            if (this.count == 0) {
                // if zero, it's a "have none", otherwise it's "have at least N"
                return t.length == 0 ? ["X"] : [];
            }
            if (t.length >= this.count)
                return t.map(i => i.get_name());
            else
                return [];
        }
        if (this.type == GameTestType.RESPONDING_TO) {
            logger.info("checking respond to, subs is " + subs?.length);
            if (!subs) return [];
            let t = subs.filter(s => Instance.match_certain_effect(s, this.condition!, source.get_n_player())); // 
            return t.map(s => GameEvent[s.game_event])
        }
        if (this.type === GameTestType.ATTACKER_IS) {

            let combat_loop = g.root_loop.combatloop as CombatLoop;
            if (!combat_loop) return [];
            let l = Location.UNKNOWN;
            let e = GameEvent.NIL;
            if (!this.td) return [];
            let tgts = g.find_target(this.td, e, source, false, l);
            let attacker = combat_loop.attacker;
            if (!attacker) return [];
            if (tgts.some( t => t === attacker))  return [attacker.get_name()];
            return [];
            /*
            if (attacker && attacker.has_name(name)) {
                logger.warn("setting last thing in ATTACK MONSTER");
                game.set_last_thing([attacker]);
                return true;
            }
            return false;*/

        }
        console.error("unknown type " + GameTestType[this.type]);
        return [];
    }
    toString(): string { return this.toPlainText(); }
    toPlainText(): string {
        switch (this.type) {
            case GameTestType.TARGET_EXISTS: return "exists: " + this.td!.toPlainText();
            case GameTestType.RESPONDING_TO: return "what happened: " + ic_to_plain_text(this.condition!);
            default: return "UNKNOWN";
        }
    }
}

import _ from 'lodash';
import { config } from 'process';
import { subtle } from 'crypto';
import { CombatLoop } from './combat';
import { ic_to_plain_text, InterruptCondition, SolidEffect, SubEffect } from './effect';

// change "[X]/[Y]" or "[X] or [Y]" into array
function split_names(name: string): string[] {
    name = name.replace(/\]\/\[/ig, "] or [");
    return name.split("] or [");
}

// For choosing two+ different things (1 [x] and 1 [y])
// Maybe this will take over TargetDesc at some point
// multitarget includes numbers!! finally!! it makes sense!
export class MultiTargetDesc {
    raw_text: string;
    targets: TargetDesc[] = [];
    choose: number = 0;

    count(): number { return this.choose ? this.choose : this.targets.length; }

    mod_max(by: number): number {
        for (let t of this.targets) {
            let r = t.mod_max(by);
            if (r != -1) return r;
        }
        return -1;
    }

    // compatability items
    empty(): boolean { return this.targets.length == 1 && this.targets[0].empty() }
    conjunction: Conjunction = Conjunction.DUMMY; //  { return this.targets[0].conjunction; }
    remnant: string = "MULTI-REMNANT"; // } this.targets.map( t => t.remnant ).join("+") }; 
    toPlainText(): string { return this.targets.map(t => t.toPlainText()).join(" _and_ "); }
    toString(): string { return this.targets.map(t => t.toString()).join("+"); }

    sort(items: Instance[]): Instance[] { logger.error("unimplemented"); return items; }

    constructor(text: string) {
        this.raw_text = text;

        let m;
        logger.info(`MULTITARGET CTOR:<${text}>`);
        let from = "";
        // A, B, C from your X or Y
        if (m = text.match(/(.*)( from your hand or battle area)/)) {
            from = m[2];
            text = m[1];
        }

        // A and B
        // A, B, and C
        // capture them both by making serial comma optional
        // I've hardcoded this to "1"
        if (m = text.match(/(\d+ (.*),\s*)?(\d+) (.*),? and (\d+) (.*)/i)) {
            let first_n = parseInt(m[1]);
            let first_match = m[2];
            let left_n = parseInt(m[3]);
            let left_match = m[4];
            let right_n = parseInt(m[5]);
            let right_match = m[6];

            let first;
            if (m[1]) {
                first = new TargetDesc(left_match + from);
            }
            let right;
            let left = new TargetDesc(left_match + from);
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
                right = new TargetDesc(right_match + from);
            }
            this.targets.push(left, right);
        } else {
            if (m = text.match(/(\d+) of (.*)/)) {
                text = m[2];
                this.choose = parseInt(m[1]);
            }
            let only = new TargetDesc(text);
            this.targets.push(only);
        }
    }
    UNUSED_find_merged() {

    }
    matches(t: Instance | CardLocation, s: TargetSource, g: Game): boolean {
        // matches if any target matches; when "pick 1 X and 1 Y"  we can show
        // all things that match either. (Later the user picks a pair.)
        return this.targets.some(tgt => tgt.matches(t, s, g));
    }
    match(cards: CardLocation[], a: TargetSource) {
        // find all pairs of cards that match
        // for now this is easy, just A then B, since no overlap
        // TODO: handle overlap
        let lefts: CardLocation[] = [];
        let rights: CardLocation[] = [];
        let [l, r] = this.targets;
        for (let card of cards) {
            if (l.matches(card, undefined!, undefined!)) lefts.push(card);
            if (r.matches(card, undefined!, undefined!)) rights.push(card);
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
    most?: COMPARE;
    most_kind?: StatusTestWord;
    remnant: string = "";
    text?: string; // crude way of categorizing things like "all of their security monster" for now

    //	target2?: (SubTargetDesc | TargetDesc);
    mod_max(by: number): number {
        for (let t of this.targets) {
            let r = t.mod_max(by);
            if (r != -1) return r;
        }
        return -1;
    }
    empty(): boolean {
        // I guess a compound condition could also be empty? Maybe?
        return this.conjunction == Conjunction.DUMMY;
    }
    toPlainText(): string {
        if (this.conjunction == Conjunction.SOURCE) {
            return "err"; // right now only in retaliation
        }
        if (this.conjunction == Conjunction.SELF) {
            return "this"; // 
        }
        if (this.conjunction == Conjunction.DUMMY) {
            return ""; // dummy unused target";
        }
        if (this.conjunction == Conjunction.UNIT) {
            return this.targets[0].toString();
        }
        if (this.conjunction == Conjunction.OR) {
            return `( ${this.targets.map(x => x.toPlainText()).join(" OR ")} )`;
        }
        if (this.conjunction == Conjunction.PLAYER) {
            return "player"; // this.text || "err"; // this will say "your opponent" automatically, right? Or "their secufity stack"?
        }
        if (this.conjunction == Conjunction.NOT) {
            return `not (${this.targets[0].toString()})`;
        }
        if (this.conjunction == Conjunction.LAST_THING) {
            return `it`;
        }

        if (this.conjunction != Conjunction.ALL) {
            logger.error("OH NO 3 " + this.conjunction);
            return "ERROR";
        }
        // this could be out of order, technically
        let ret = this.targets.map(x => x.toPlainText()).join(" ");
        if (this.most && this.most_kind) {
            ret += ` with ${COMPARE[this.most]} ${StatusTestWord[this.most_kind]} `;
        }
        return ret;
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
            return `( ${this.targets.join("OR")} )`;
        }
        if (this.conjunction == Conjunction.PLAYER) {
            return `PLAYER ${this.text}`;
        }
        if (this.conjunction == Conjunction.NOT) {
            return `NOT (${this.targets[0].toString()})`;
        }
        if (this.conjunction == Conjunction.LAST_THING) {
            return `IT`;
        }

        if (this.conjunction != Conjunction.ALL) {
            logger.error(`OH NO 2 ${this.conjunction} ${Conjunction[this.conjunction]}`);
            return "ERROR";
        }
        return "[" + this.targets.map(t => t.toString()).join(", ") + "]";
        // + this.raw_text;
    }

    // not sure if "sort" is the best word
    // other things work one item at a time, this works on them all at once


    sort(items: Instance[]): Instance[] {
        // I'm just going to find any subtargest and sort by that
        // with the lowest level
        // let fn: ValueGetter = x => x.get_level();
        if (!this.most) return items;
        logger.info(`SORT ${this.most}, ${this.most_kind}`);
        let fn: ValueGetter = (x => 0);
        switch (this.most_kind) {
            case StatusTestWord.LEVEL: fn = (x => x.get_level()); break;
            case StatusTestWord.PLAY_COST: fn = (x => x.get_playcost()!); break;
            case StatusTestWord.DP: fn = (x => x.dp()); break;
        }
        let min: number;
        if (this.most == COMPARE.IS_HIGHEST) {
            min = Math.max(...items.map(fn));
        } else {
            min = Math.min(...items.map(fn));
        }
        let ret = items.filter(x => fn(x) === min);
        return ret;
    }

    matches(t: Instance | CardLocation, s: TargetSource, g: Game): boolean {
        logger.silly("testing main target for " + Conjunction[this.conjunction]);
        if (this.conjunction == Conjunction.SELF) {
            // this works for instances, at least
            // CS1-08 [On Deletion] Play this card without paying its cost.
            // Trash is kinda distinguishable: it matters which of two identical cards we remove,
            // and "play this card" should only match the card that was at top of the instance.
            //// 
            // We handle this by returning all instances, and game.ts::find_target() filters.
            // Maybe a test for (s.get_instance().top() == t) in here would work, and maybe
            // it belongs in here, if we can figure out we're looking for a CardLocation
            logger.info(`insatnce ${s.is_instance()} and card ${s.is_card()} extract ${("extract" in t) ? "TRUE" : "FALSE"}`);
            // to see if an *instance as source* self-matches
            // to a cardLocation target,
            logger.info(`tid is ${t.id} and sid is ${s.get_name(true)}`);
            //return (t.id == s.id());

            if (s.is_instance() && ("extract" in t)) {
                logger.info(`instance looking for self card ${t.location} == ${s.location()}, ` +
                `${t.card_id} = ${s.card_id()}, ${t.card.id} === ${s.get_instance().top().id} ` + 
                ` SAME IS ${t.card == s.get_instance().top()}`);

                if (t.location == Location.FIELD) {
                    // we're on field, say yes for any card in this stack
                    return t.location == s.location() && s.id() == t.instance;
                }

                // source is an instant, looking for SELF CARD
                return t.location == s.location() &&
                    t.card_id == s.card_id() 
                    && t.card == s.get_instance().top()
                    // what if i want to search in this card's stack?
                    ;
            }

            // hey can we merge the above and the below?
            if (s.is_card()) {
                logger.info(` t location ${Location[t.location]} card_is ${t.card_id} and ` +
                    ` s location ${Location[s.location()]} card_is ${s.card_id()}`);
                return t.location == s.location() &&
                    t.card_id == s.card_id();

            }
            return (t.id == s.id());
        }
        if (this.conjunction == Conjunction.SOURCE) {
            // I HAVE NO IDEA HOW TO POINT TO THIS
            logger.error("huh");
            return false;
        }
        if (this.conjunction == Conjunction.DUMMY) {
            //      console.error("trying to match against dummy");
            return true;
            // should DUMMY match everythying? empty set matches everything
            //			return this.targets[0].matches(t);
        }
        if (this.conjunction == Conjunction.UNIT) {
            return this.targets[0].matches(t, s, g);
        }
        if (this.conjunction == Conjunction.NOT) {
            return !this.targets[0].matches(t, s, g);
        }
        if (this.conjunction == Conjunction.OR) {
            let answers = this.targets.map(x => x.matches(t, s, g));
            logger.debug("OR case returned " + answers.join(",") +
                " " + this.targets.map(x => x.toString()).join(","));
            let ret = answers.find(x => x);
            //            let ret = answers[0] || answers[1]; // find(x => x);
            logger.debug("" + ret);
            return ret ? true : false; // answers[0] || answers[1];
            //            return this.targets[0].matches(t, s) ||
            //              this.targets[1].matches(t, s);
        }
        if (this.conjunction == Conjunction.LAST_THING) {
            let last = g.get_last_thing();
            if (!last || last.length == 0) {
                logger.error("no last thing");
                return false;
            }
            let last_thing = last[0];
            logger.info(`tid is ${t.id} and last_thing is ${last_thing.id}`);

            // maky not work for CardLocation
            return (t.id == last_thing.id);

        }


        if (this.conjunction != Conjunction.ALL) {
            // how could we possibly not match on player? 
            logger.error("OH NO 1 " + this.conjunction);
            return true;
        }
        for (let tgt of this.targets) {
            //            console.error("tgt " + tgt.toPlainText());
        }
        let answers = this.targets.map(x => x.matches(t, s, g));

        logger.info("AND case " + (t && t.get_name(true)) + " returned " + answers.join(",") +
            " " + this.targets.map(x => x.toString()).join(","));
        let ret = answers.every(x => x);
        logger.debug(`AND for ${t && "get_name" in t && t.get_name(true)} is ${ret}`);
        return ret;
        //        return this.targets.every(x => x.matches(t, s));
    }

    // "type" is card or instance
    //	constructor(arg1: number);
    constructor(_text: number | string, type: string = "instance") {

        // clean garbage at front
        this.raw_text = "" + _text;

        // searching for 1 [Fredchu] fails, but searching for [Fredchu] succeeds
        if (_text) logger.info(`TARGET CTOR:<${_text}>`);
        this.targets = [];
        if (typeof _text === 'number') {
            this.raw_text = "id is " + _text;
            this.conjunction = Conjunction.UNIT;
            let std: SubTargetDesc = new SubTargetDesc("id", "" + _text);
            this.targets.push(std);
            return;
        }
        let text: string = "" + _text.replace(/^[,.\s]+/, '').trim().toLowerCase();
        if (text == "") {
            this.conjunction = Conjunction.DUMMY;
            return;
        }
        if (text.startsWith("not ")) {
            this.conjunction = Conjunction.NOT;
            this.targets[0] = new TargetDesc(text.substring(4));
            return;
        }
        // THIS MONSTER and THIS TAMER shoudl verify self still is those thigns
        if (text == "self" || text == "this monster" || text == "this tamer") {
            this.conjunction = Conjunction.SELF;
            return;
        }
        if (text.startsWith("of ")) {
            text = text.substring(3);
        }

        // PRONOUNS

        // if the attacking monster is XXX

        // "it" refers to a previous clause. For now I think I can assume
        // it is "what was targeted"
        if (text == "it" || text.match(/that monster/) || text.match(/those monsters?/)) {
            // LAST_THING is singular but should be a set
            // also "The tamer that was played" should make sure we also match that
            this.conjunction = Conjunction.LAST_THING;
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

        this.conjunction = Conjunction.ALL;

        let m;


        // "all of" can be used in two ways
        // 1. delete all of your opponent's monsters. This is isntant and hits everything
        // 2. all of your opponent's monster gain effect persistent (can he handled either way)
        // 3. all of your opponent's minster gain effect until X (needs to be put on player)

        // To be passed in for blanket is 
        if (m = text.match(/^blanket (your|your opponent's|their) (monster)/i)) {

            this.conjunction = Conjunction.PLAYER;
            let person = (m[1] == "your") ? "your" : "their";
            this.text = `all of ${person} monster`;
            logger.info(this.text);
            text = "";
        }


        if (text.match(/^\s*opponent\s*$/i)) {
            this.conjunction = Conjunction.PLAYER;
            this.text = text;
            text = "";
        }

        if (m = text.match(/(all of their )?security monster/i)) {
            // this targets a player, I guess
            this.conjunction = Conjunction.PLAYER;
            this.text = "all of their security monster";
            text = "";
        }

        // FROM PLACE BEGIN
        if (m = text.match(/(.*)(in|from) (your|the) trash/i)) {
            let x = new SubTargetDesc("trash");
            this.targets.push(x);
            if (m[3] == "your") this.targets.push(new SubTargetDesc("me"));
            text = m[1].trim();
            logger.info("trash, rest of line is " + text + ".");
        } else if (m = text.match(/(.*)(in|from) your hand\s*(or trash)?\s*(or battle area)?/i)) {
            let t = m[3] ? "hand-or-trash" : "hand";
            if (m[4]) t += "-or-field";
            let x = new SubTargetDesc(t);
            this.targets.push(x)
            text = m[1];
        } else if (m = text.match(/(.*)(in|from) your hand\s*(or trash)?/i)) {
            console.error("how can we ever be in here?");
            let x = new SubTargetDesc(m[3] ? "hand-or-trash" : "hand");
            this.targets.push(x);
            text = m[1];

        } else if (m = text.match(/(.*)(in play)/i)) {
            let x = new SubTargetDesc("field");
            this.targets.push(x);
            text = m[1];
        } else if (m = text.match(/(.*)((in|from) your face.up security cards?)/i)) {
            let x = new SubTargetDesc("security");
            this.targets.push(x);
            let y = new SubTargetDesc("face", "up");
            this.targets.push(y);
            text = m[1];
        }
        // this breaks searcher-typhoon!
        text = text.trim();

        /*
                // strip "1" at the start
                if (m = text.match(/^(\d+ )?\[(.*)\]$/)) {
                    text = m[2];
                }*/

        // sometimes we get nunbers, sometimes we don't
        if (m = text.match(/^(\d+ )?\[(.*)\]$/)) {
            // this.conjunction = Conjunction.UNIT;
            if (m[1] && m[1] != "1 ") {
                logger.error("unexpected match: " + JSON.stringify(m));
            }
            let name = split_names(m[2])
            let std = name.map(n => new SubTargetDesc("name", n));
            if (std.length == 1) {
                this.targets.push(...std);
                return;
            }
            let or = new TargetDesc("");
            or.conjunction = Conjunction.OR;
            or.targets = std;
            this.targets.push(or);
            return
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
            let x = new SubTargetDesc("their");
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
        // 1 X or 1 Y --- or 1 X or Y
        if (or = text.match(/(1? ?.*) or (1 .*)/i)) {
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


        // "Your red X or Y" becomes "Your red X" or "your red Y".
        /*        if (m = text.match(/^your opponent.?.?\s+(.*)/i)) {
                    logger.info("theirs");
                    this.targets.push(new SubTargetDesc("their"));
                    text = m[1].trim();
                    logger.info("remains is " + text);
                }*/
        if (m = text.match(/^your (.*)/i)) {
            logger.info("mine");
            this.targets.push(new SubTargetDesc("me"));
            text = m[1].trim();
            logger.info("remains is " + text);
        }

        if (m = text.match(/^(a )?(red|blue|yellow|green|black|purple|white) (.*)/i)) {
            this.targets.push(new SubTargetDesc("color", m[2]));
            text = m[3].trim();
            logger.info("remains is " + text);
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

        text = text.trim();

        let name;
        logger.silly("TEXT IS " + text);
        if (name = text.match(/1 \[(.*)\]\/\[(.*)\]$/i)) {
            // this.conjunction = Conjunction.OR;
            let or = new TargetDesc("");
            or.conjunction = Conjunction.OR;
            let n1 = new SubTargetDesc("name", name[1]);
            let n2 = new SubTargetDesc("name", name[2]);
            or.targets = [n1, n2];
            this.targets.push(or);
            return;
        }

        // add a $ here and we get one error
        // what to do with that number?
        if (name = text.match(/1 \[(.*)\]$/)) {
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
            let x = new SubTargetDesc(me ? "me" : "their");
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



        if (m = text.match(/^1 other monster(.*)$/i)) {
            // is this needed given I have the above paragraph for tamers?
            let self = new TargetDesc("");
            self.conjunction = Conjunction.SELF;
            let not = new TargetDesc("");
            not.conjunction = Conjunction.NOT;
            not.targets = [self];
            this.targets.push(not);
            text = m[1];
        }

        let std_candidate;



        // Monster with X or Y
        //   Monster with X   Monster with Y
        if (m = text.match(/^monsters?\s*(card )?\s*(.*)/i)) {
            logger.info("monster");
            this.targets.push(new SubTargetDesc("monster"));
            if (m[1]) this.targets.push(new SubTargetDesc("card"));
            text = m[2];
        }



        logger.debug("Nowtext " + text);

        // try full match
        logger.info("trying full match " + text);
        let full_cnd: (TargetDesc | SubTargetDesc)[] | false;
        full_cnd = SubTargetDesc.full_candidate(text);
        if (full_cnd) {
            this.targets.push(...full_cnd);
            text = "";
        }

        // try AND match
        logger.debug("trying and " + text);
        if (m = text.match(/(.*) (and|with) (.*)/)) {
            logger.debug(m[1]);
            logger.debug(m[3]);
            let s1 = SubTargetDesc.full_candidate(m[1]);
            let s2 = SubTargetDesc.full_candidate(m[3]);
            // if both match, then go for it
            // overwrite existing calsues?
            if (s1 && s2) {
                logger.info("and hit");
                this.targets.push(...s1, ...s2); // AND                 
                return;
            }
        }

        // "your X or Y" is "your X" or "your Y"
        // I should really strip off the "your" first...
        logger.debug("trying or: " + text);
        if (m = text.match(/(.*) or (.*)/)) {
            logger.info("OR candidates:");
            logger.info(m[1]);
            logger.info(m[2]);
            let s1: (TargetDesc | SubTargetDesc)[] | false;
            let s2: (TargetDesc | SubTargetDesc)[] | false;
            s1 = SubTargetDesc.full_candidate(m[1]);
            s2 = SubTargetDesc.full_candidate(m[2]);
            if (s1 && s2) {
                logger.info(`or hit: <${m[1]}> <${m[2]}>`);
                logger.info(`or hit: <${s1.length}> <${s2.length}>`);
                let or = new TargetDesc("");
                or.conjunction = Conjunction.OR;
                let t1 = new TargetDesc("");
                t1.conjunction = Conjunction.ALL; // default?
                t1.targets = s1;
                let t2 = new TargetDesc("");
                t2.conjunction = Conjunction.ALL; // default?
                t2.targets = s2;
                logger.info(`or hit: <${t1.toString()}> <${t2.toString()}>`);
                or.targets = [t1, t2];
                this.targets.push(or);
                return;
            }
        }

        while (std_candidate = SubTargetDesc.candidate(text)) {
            this.targets.push(std_candidate[0]);
            text = std_candidate[1];
        }


        /// below here is legacy

        let re = new RegExp(/your (opponent'?s?)?(.*)monster(.*)/i);
        m /* (RegExpMatchArray | null | undefined) */ = text.match(re);
        me = true;
        let desc1, desc2;
        if (m) {
            if (m[1]) me = false;
            let x = new SubTargetDesc(me ? "me" : "their");
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

        logger.info("target DESC1 is (" + desc1 + ")"); // level 5 or lower
        logger.info("target DESC2 is (" + desc2 + ")"); // with x in its name
        logger.info("target text is (" + text + ")");

        let x;
        if (desc1)
            if (x = SubTargetDesc.full_candidate(desc1)) {
                this.targets.push(...x);
                desc1 = "";
            }

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


        // move 


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



        std_candidate = SubTargetDesc.candidate(desc2);
        if (std_candidate) {
            this.targets.push(std_candidate[0]);
            desc2 = std_candidate[1];
        }


        if (m = desc2.match(/with the (lowest|highest) (dp|level|play.?cost)/i)) {
            this.most = (m[1] == "lowest") ? COMPARE.IS_LOWEST : COMPARE.IS_HIGHEST;
            switch (m[2].toLocaleLowerCase()) {
                case "level": this.most_kind = StatusTestWord.LEVEL; break;
                case "dp": this.most_kind = StatusTestWord.DP; break;
                default: /* "play cost":*/ this.most_kind = StatusTestWord.PLAY_COST; break;

            }
            desc2 = "";
        }


        // is this consistent?
        // play-cost more/less
        // level higher/lower

        /*
         
        */



        //logger.silly("pre name: " + desc2);
        // "in its name" or "in_its_name" for fandom STICKY SPACES HURTING US!
        logger.info("m2 is " + desc2);

        this.remnant = desc1 + desc2;
        if (this.remnant.length > 0) logger.warn("REMNANT: " + this.remnant)
        return;
    }
}



// one specific thing
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
    compare: COMPARE;
    relative?: string;
    //	cancels?: boolean; I don't think this belong here

    mod_max(by: number): number {
        if (this.compare != COMPARE.NIL) {
            this.n += by;
            return this.n;
        }
        return -1;
    }

    toPlainText(): string {
        let range = "ERR";

        switch (this.compare) {
            // with (at most 2500) ATK
            // with (the biggest) rank
            // with (3) mana
            case COMPARE.IS_AT_MOST: range = `at most ${this.n}`; break;
            case COMPARE.IS_AT_LEAST: range = `or least ${this.n}`; break;
            case COMPARE.IS_LOWEST: range = "the lowest"; break;
            case COMPARE.IS_HIGHEST: range = "the highest"; break;
            case COMPARE.IS: range = String(this.n); break;
        }

        switch (this.testword) {

            case StatusTestWord.DP: return `with ${range} DP`;
            case StatusTestWord.HAS_COLOR: return `that is ${Color[this.color]}`;
            case StatusTestWord.HAS_TRAIT: return `with trait ${this.str} `;
            case StatusTestWord.IS_EVO_CARD: return `is evo card `;
            case StatusTestWord.HAS_TWO_COLOR: return "Two-color";
            case StatusTestWord.SOURCE_COUNT: return `with ${range} sources`;
            case StatusTestWord.INSTANCE_ID_IS: return `ID ${this.n} `;
            case StatusTestWord.IS_TOKEN: return "Token";
            case StatusTestWord.IS_MONSTER: return "Monster";
            case StatusTestWord.IS_OPTION: return "Option";
            case StatusTestWord.IS_TAMER: return "Tamer";
            case StatusTestWord.LEVEL: return `with ${range} level`;
            case StatusTestWord.LOCATION: return `in ${location_to_string(this.n)}`;
            case StatusTestWord.NAME_CONTAINS: return `whose name contains[${this.str}]`;
            case StatusTestWord.TRAIT_CONTAINS: return `whose trait contains[${this.str}]`;
            case StatusTestWord.NAME_IS: return `Name is[${this.str}]`;
            case StatusTestWord.NIL: return "NIL!";
            case StatusTestWord.OWNER: return (this.n == 0) ? "your opponent's" : "your";
            case StatusTestWord.PLAY_COST: return `with ${range} play cost`;
            case StatusTestWord.ATTACKABLE: return "ATTACKABLE";
            case StatusTestWord.STATUS: return this.str;
            case StatusTestWord.HAS_INHERITED: return `with inherited`;
            case StatusTestWord.HAS_STACK_ADD: return `with stackadd`;
            case StatusTestWord.FACEUP: return `face ${this.n ? "up" : "down"}`;
            case StatusTestWord.CARD: return 'card';
            case StatusTestWord.KEYWORD: return 'with ' + this.str;
            default: return "ERROR2"
        }
        //        return "(" + StatusTestWord[this.testword] + ": " + this.str + " " + this.n + ")";
    }

    toString(): string {
        switch (this.testword) {
            case StatusTestWord.DP: return `DP ${COMPARE[this.compare]} ${this.n} `;
            case StatusTestWord.HAS_COLOR: return Color[this.color];
            case StatusTestWord.HAS_TRAIT: return `Trait ${this.str} `;
            case StatusTestWord.IS_EVO_CARD: return `is evo card `;
            case StatusTestWord.HAS_TWO_COLOR: return "Two-color";
            case StatusTestWord.SOURCE_COUNT: return `source-count ${COMPARE[this.compare]} ${this.n} `;
            case StatusTestWord.INSTANCE_ID_IS: return `ID ${this.n} `;
            case StatusTestWord.IS_TOKEN: return "TOKEN";
            case StatusTestWord.IS_MONSTER: return "MONSTER";
            case StatusTestWord.IS_OPTION: return "OPTION";
            case StatusTestWord.IS_TAMER: return "TAMER";
            case StatusTestWord.LEVEL: return `Level ${COMPARE[this.compare]} ${this.n} `;
            case StatusTestWord.LOCATION: return `Location ${this.n} `;
            case StatusTestWord.NAME_CONTAINS: return `Name contains[${this.str}]`;
            case StatusTestWord.TRAIT_CONTAINS: return `Trait contains[${this.str}]`;
            case StatusTestWord.NAME_IS: return `Name is[${this.str}]`;
            case StatusTestWord.NIL: return "NIL!";
            case StatusTestWord.OWNER: return `Player ${this.n} `;
            case StatusTestWord.PLAY_COST: return `Play cost ${COMPARE[this.compare]} ${this.n} `;
            case StatusTestWord.ATTACKABLE: return "ATTACKABLE";
            case StatusTestWord.STATUS: return this.str;
            case StatusTestWord.HAS_INHERITED: return `with inherited`;
            case StatusTestWord.HAS_STACK_ADD: return `with stackadd`;
            case StatusTestWord.FACEUP: return `face ${this.n ? "up" : "down"}`;
            case StatusTestWord.CARD: return 'card';
            case StatusTestWord.KEYWORD: return `KEYWORD (${this.str})`;
            default: return "ERROR3"
        }
        //        return "(" + StatusTestWord[this.testword] + ": " + this.str + " " + this.n + ")";
    }
    // if we can completely parge a subtarget, return it here
    // this lets us decompose "X and/or Y" phrases easily

    static full_candidate(str: string): (TargetDesc | SubTargetDesc)[] | false {
        let input_str = str;
        let targets: (TargetDesc | SubTargetDesc)[] = [];
        logger.debug("trying full " + str);
        let std_candidate;
        while (std_candidate = SubTargetDesc.candidate(str)) {
            targets.push(std_candidate[0]);
            str = std_candidate[1];
            logger.debug(`trying pushing ${std_candidate[0]} remaining ${str}`);
        }
        str = str.trim();
        logger.debug("done, str is " + str);
        logger.debug("done, tgt is " + targets.toString());
        if (str.length < 2) {
            logger.info("full match of <" + input_str + ">, returning " + targets.length + " " + targets.map(t => t.toString()).join("|"));
            return targets;
        }
        logger.info("not full match, remainder is " + str.length + " " + str);
        return false;
    }

    static candidate(str: string): [TargetDesc, string] | [SubTargetDesc, string] | false {
        logger.info("trying candidate: " + str);
        let ret = SubTargetDesc._candidate(str);
        logger.info("ret is " + ret.toString());
        return ret;

    }

    // partial matches allowed
    static _candidate(str: string): [TargetDesc, string] | [SubTargetDesc, string] | false {
        let m;
        // logger.info("trying candidate: " + str);
        str = str.trim();


        if (str.startsWith("any of")) str = str.after("any of").trim();
        if (str.startsWith("one of")) str = str.after("one of").trim();
        if (str.startsWith("a ")) str = str.after("a ").trim();
        if (str.startsWith("an ")) str = str.after("an ").trim();
        if (str.startsWith("1 ")) str = str.after("1 ").trim(); // I hate eating the number

        if (m = str.match(/^(.*)(with .*) or (with .*)$/i)) {
            let m1 = this.candidate(m[2]);
            let m2 = this.candidate(m[3]);
            if (m1 && m2) {
                let [c1, x1] = m1;
                let [c2, x2] = m2;
                if ((x1 + x2).trim().length <= 1) {
                    let or = new TargetDesc("");
                    or.conjunction = Conjunction.OR;
                    or.targets = [m1[0], m2[0]];
                    return [or, m[1]];
                }
            }
        }

        if (m = str.match(/^\s*((un)?suspended)\s*(.*)$/i)) {
            // status could be 'suspended' or 'unsuspended'
            let x = new SubTargetDesc("status", m[1]);
            return [x, m[3]]
        }

        if (m = str.match(/^this (.*)$/i)) {
            // status could be 'suspended' or 'unsuspended'
            let x = new TargetDesc("self");
            return [x, m[1]]
        }

        if (m = str.match(/^1 Monster card(.*)/i)) {
            logger.warn("eating number, eating card");
            let x = new SubTargetDesc("monster");
            return [x, m[1].trim()]
        }

        if (m = str.match(/^monster( cards?)?(.*)/i)) {
            let x = new SubTargetDesc("monster");
            return [x, m[2].trim()]
        }

        if (m = str.match(/^.?.?\s*evolution cards/i)) {
            let x = new SubTargetDesc("evocards");
            return [x, ""];
        }

        if (m = str.match(/^(a )?(red|blue|yellow|green|black|purple|white)( or (red|blue|yellow|green|black|purple|white))?(.*)/i)) {
            let [color1, color2, two, extra] = [m[2], m[4], m[3], m[5]];
            if (two) {
                let or = new TargetDesc("");
                or.conjunction = Conjunction.OR;
                let s1 = new SubTargetDesc("color", color1);
                let s2 = new SubTargetDesc("color", color2);
                or.targets = [s1, s2];
                return [or, extra.trim()];
            }
            let x = new SubTargetDesc("color", color1);
            return [x, extra.trim()]
        }

        // "face up" or "face-up" ?
        if (m = str.match(/^face.(up|down) security cards?(.*)/i)) {
            let and = new TargetDesc("");
            and.conjunction = Conjunction.ALL;
            let x1 = new SubTargetDesc("security");
            let x2 = new SubTargetDesc("face", m[1]);
            let x3 = new SubTargetDesc("card");
            and.targets = [x1, x2, x3];
            return [and, m[2].trim()];
        }

        if (m = str.match(/^from (your |their )?(hand or trash|trash|security( stack))(.*)/i)) {
            let x = new SubTargetDesc(m[2]);
            if (m[1]) {
                // this isn't working?
                let and = new TargetDesc("");
                and.conjunction = Conjunction.ALL;
                let x1 = new SubTargetDesc(m[1]);
                and.targets = [x, x1];
                return [and, m[4].trim()];
            }
            return [x, m[4].trim()]
        }

        if (m = str.match(/^(1 )?card(.*)/)) {
            let x = new SubTargetDesc("card");
            str = m[2];
            // TODO: save this subtargetdesc so we only hit cards
        }

        if (str == "card") {
            let x = new SubTargetDesc("card");
            // this breaks a bunch
            //            return [x, ""];
        }

        if (m = str.match(/^Lv.(\d+)(.*)/i)) {
            let x = new SubTargetDesc("level", undefined, m[1]);
            return [x, m[2].trim()]
        }

        if (m = str.match(/(has )?(＜|<)(.*?)(>|＞)(.*)/)) {
            let x = new SubTargetDesc("keyword", m[3]);
            return [x, m[5].trim()]

        }


        if (m = str.match(/^(with )?(a )?digixros requirements?(.*)/)) {
            let x = new SubTargetDesc("digixros");
            return [x, m[3].trim()]
        }

        // 
        if (m = str.match(/^with a level(.*)/)) {
            let x = new SubTargetDesc("level", "higher", "1");
            return [x, m[1].trim()]

        }


        // see also https://discord.com/channels/681578268729540663/749146995708395601/1307730244341465108
        // see also https://discord.com/channels/681578268729540663/749146995708395601/1297972161931120713
        //  https://discord.com/channels/681578268729540663/749146995708395601/1288872285687779471


        // [Atomic]. Then, delete 1 of your opponent's Monster with DP less than or equal to the Monster played with this effect.
        //  * "the monster played"
        //  * We save the DP at the time the first atomic happened
        //  * We can memo all the stats in the first atomic object
        //  * Now how does "td.match" know that number? 
        //  * Pass in whole atomic, td.match parses "atomic-memo-dp" to look up the saved memo DP
        // [atomic] Delete 1 of your opponent's Monster with DP less than or equal to the chosen Monster
        //  * "the chosen monster"
        //  * any solution should work here, but I guess go with seeing at the time of choosing and memoize there.
        //  * td.match gets "atomic-memo-dp" and looks it up.
        // [Trigger], delete 1 of your opponent's Monsters with as much or less DP as that Monster.
        // * "that monster" could be multiple :(
        //  * "that monster" means use the DP at the time of processing, which fails if not there.
        //  * In this case we need to keep a reference to the thing that caused the trigger in the trigger
        //  * It's an array of references.
        //  * td gets "trigger-reference-dp". It looks up the trigger and gets the current value of dp. (need to choose array)
        // [Trigger] delete 1 of your opponent's monster whose level is less than or equal to the played Monsters's level.
        //  * "the played Monster" could be multiple :(
        //  * Again, save the references to the things that caused the trigger in the trigger
        //  * td gets "trigger-memo-level". It looks up the trigger and their level.
        // [cost] , return 1 of your opponent's Monster with as much or less DP as the Monster this effect suspended
        //  * "as the monster this effect suspended"
        //  * can't be interrupted so anything works
        // [cost] delete 1 of your opponent's Monster with DP less than or equal to the deleted monster's DP
        // [Atomic.] delete 1 of your opponent's monster with DP less than or equal to the monster played with this effect
        //  * "the monster played by this effect"
        //  * can't be interrupted so anything works
        //  * use atomic-memo-level
        // with DP less than or equal to this monster
        //  * the easiest case
        //  * there is no trigger, but technically we can use the trigger 
        //  * doesn't even need to reference a prior thing!
        //  * could just reference TargetSource
        // with DP less than or equal to (the DP of your monster with the biggest DP)
        //  * Doens't exist yet! 
        //  * doesn't even need to reference a prior thing!
        //  * could just reference TargetSource
        //  * td.match is "targetsource", okay that works

        if (m = str.match(/^(with )?DP (less) than or equal to (this monster)(.*)$/i)) {
            // I think I need a dynamic function here, because at the time of
            // processing I grab the monster's DP. And it might not be me.
            let relative = "targetsource-dp"
            let x = new SubTargetDesc("DP", m[2], "", relative);
            return [x, m[4]]
        }
        if (m = str.match(/^(with )?(as much or (less)) DP as (this monster)(.*)$/i)) {
            // I think I need a dynamic function here, because at the time of
            // processing I grab the monster's DP. And it might not be me.
            let relative = "targetsource-dp"
            let x = new SubTargetDesc("DP", m[3], "", relative);
            return [x, m[5]]
        }

        if (m = str.match(/^your opponent'?s? (.*)$/i)) {
            return [new SubTargetDesc("their"), m[1]]
        }
        if (m = str.match(/^your (.*)$/i)) {
            return [new SubTargetDesc("me"), m[1]]
        }
        if (m = str.match(/^their (.*)$/i)) {
            return [new SubTargetDesc("their"), m[1]]
        }

        if (m = str.match(/^(an)?other (.*)$/i)) {
            return [new TargetDesc("not self"), m[2]]
        }

        if (m = str.match(/^token.$/)) {
            return [new SubTargetDesc("token"), ""]

        }

        if (m = str.match(/^(with )?inherited.effects$/i)) {
            return [new SubTargetDesc("with inherited"), ""]
        }

        /*
        // could return two things to put in array
        if (m = str.match(/^your other (.*)$/i)) {
            let you = new SubTargetDesc("me");
            let other = new TargetDesc("not self");
            let both = new TargetDesc("");
            both.conjunction = Conjunction.ALL; // is all the default? 
            both.targets = [you, other];
            return [both, m[1]]
        }*/

        /*
        other(.*)$/i)) {
            let your_other = new TargetDesc("");
            your_other.
            let other = new SubTargetDesc("not self");
            let you = new SubTargetDesc("player");

            return [x, m[1]];
        }*/

        // I should anchor-left here, but it breaks some test cases
        if (m = str.match(/(.*)\s*level (\d+)\s*(or (higher|lower))?( card)?\s*(.*)$/)) {
            let prefix = m[1];
            let level = m[2];
            let compare = m[4];
            let card = m[5]; // we shouldn't forget this
            let suffix = m[6];
            let x = new SubTargetDesc("level", compare, level);
            return [x, (prefix + " " + suffix).trim()];
        }
        if (m = str.match(/^(with )?a? ?play.?cost (of )?(\d+)\s+(or (more|less|lower))?\s*/i)) {
            //        logger.silly("PLAYCOST MATCH");
            let playcost = m[3];
            let x = new SubTargetDesc("playcost", m[5], playcost);
            return [x, ""]
        }
        //                  1       2       3               4   5  
        if (m = str.match(/^(with )?(\d+)\s*(DP|play.?cost) (or (more|less))?.?.?\s*/i)) {
            //        logger.silly("PLAYCOST MATCH");
            let what = (m[3] == "dp") ? "DP" : "playcost";
            let n = m[2];
            let x = new SubTargetDesc(what, m[5], n);
            return [x, ""]
        }

        if (m = str.match(/^\s*(with )(\d or more )??evolution cards\s*$/i)) {
            //			logger.silly("2DESC2 is " + desc2); // with x in its name
            //			logger.silly(`m[3] is ${m[3]} x`);
            let n = m[2] ? m[2] : "1";
            let x = new SubTargetDesc("sourcecount", "more", n);
            return [x, ""]
        }

        str = str.trim();
        if (m = str.match(/^(card )?(with|w\/)?\s*(\[.*\])\sin.(its|their).name\s*$/)) {
            //  logger.silly("WWWWW " + m[1])
            let name = m[3];
            let p;
            // if this doesn't work, name_contains could be smart enough to take a []/[] string...
            if (p = name.match(/\[(.*)\]\/\[(.*)\]/i)) {
                let or = new TargetDesc("");
                or.conjunction = Conjunction.OR;
                let n1 = new SubTargetDesc("name_contains", p[1]);
                let n2 = new SubTargetDesc("name_contains", p[2]);
                or.targets = [n1, n2];
                return [or, ""]
            }
            let x = new SubTargetDesc("name_contains", name.trim());
            return [x, ""]
        }

        // too bad I can't return an array
        if (m = str.match(/^\[(.*)\].token.?(.*)/)) {
            let and = new TargetDesc("");
            and.conjunction = Conjunction.ALL;
            let n1 = new SubTargetDesc("token");
            let n2 = new SubTargetDesc("name_is", m[1]);
            and.targets = [n1, n2];
            return [and, ""];
        }
        /*
        if (m = str.match(/^\[(.*)\].trait monster (cards)?(.*)/)) {
            let and = new TargetDesc("");
            and.conjunction = Conjunction.ALL;
            let trait = new SubTargetDesc("has_trait", m[1]);
            let n2 = new SubTargetDesc("monster");
            and.targets = [trait, n2];
            return [and, m[3]];
        }*/
        if (m = str.match(/^(w\/\s*)\[(.*)\].trait(.*)/)) {
            let x = new SubTargetDesc("has_trait", m[2]);
            return [x, m[3]];
        }



        if (m = str.match(/^(the )?\[(.*)\].(in one of its traits|trait)\s*(.*)/)) {
            let verb = (m[3] == "trait") ? "has_trait" : "trait_contains";
            let traits = m[2];
            // if traits has ] followed by non-\, this isn't a good match
            logger.info("traits is " + traits);
            if (!traits.match(/\][^\/]/)) {
                logger.info("traits are good");
                let p = traits.split("/");
                let std: SubTargetDesc[] = [];
                for (let t of p) {
                    let x = new SubTargetDesc(verb, t);
                    std.push(x);
                }
                if (std.length > 1) {
                    let or = new TargetDesc("");
                    or.conjunction = Conjunction.OR;
                    or.targets = std;
                    logger.info(or.toString());
                    return [or, m[4].trim()]
                } else {
                    logger.info(std[0].toString());

                    return [std[0], m[4].trim()]
                }
            }
        }

        // maybe move lower? // [fred] or [fred]s
        if (m = str.match(/^\[(.*)\]s?$/i)) {
            let name = split_names(m[1]);
            let std = name.map(n => new SubTargetDesc("name", n));
            if (std.length == 1) {
                return [std[0], ""];
            }
            let or = new TargetDesc("");
            or.conjunction = Conjunction.OR;
            or.targets = std;
            return [or, ""]
        }

        str = str.trim();
        logger.debug("yyy here");
        // is the below used any more?
        if (m = str.match(/^(card )?with( the)? \[(.*)\].(in one of its traits|trait)\s*$/)) {
            let traits = m[3];
            logger.info("traitsx is " + traits);
            logger.info("traitsx match is " + traits.match(/\][\[]/));
            if (!traits.match(/\][^\/]/)) {

                let p;
                // if this doesn't work, trait_contains could be smart enough to take a []/[] string...
                p = traits.split("/");
                let std: SubTargetDesc[] = [];
                let verb = m[4] == "trait" ? "has_trait" : "trait_contains";
                for (let t of p) {
                    let x = new SubTargetDesc("trait_contains", t);
                    std.push(x);
                }
                if (std.length > 1) {
                    let or = new TargetDesc("");
                    or.conjunction = Conjunction.OR;
                    or.targets = std;
                    logger.info(or.toString());
                    return [or, ""]
                } else {
                    logger.info(std[0].toString());

                    return [std[0], ""]
                }
            }
        }

        logger.info("candidate not found");
        return false;
    }

    constructor(arg: string, arg2?: string, n?: string, relative?: string) {
        this.raw_text = arg + " " + arg2 + " " + n;
        this.color = Color.NONE;//  colors.ERR; // Color.NONE;
        this.n = -1;
        this.testword = 0;
        this.compare = COMPARE.NIL;
        this.str = "";
        this.relative = relative;


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
        if (arg == "security") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.SECURITY;
        }
        if (arg == "face") {
            this.testword = StatusTestWord.FACEUP;
            this.n = (arg2 == "up") ? 1 : 0;
        }
        if (arg == "card") {
            this.testword = StatusTestWord.CARD;
        }
        if (arg == "keyword") {
            this.testword = StatusTestWord.KEYWORD;
            this.str = arg2!;
        }
        if (arg == "field") {
            // this one shouldn't be needed, in theory, but trash/field fusion effects 
            // might mean it is
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.FIELD;
        }
        if (arg == "hand-or-trash") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.HAND | Location.TRASH;
        }
        if (arg == "hand-or-field") {
            this.testword = StatusTestWord.LOCATION;
            this.n = Location.HAND | Location.FIELD;
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
        if (arg == "me" || arg == "their") {
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
        if (arg == "token") {
            this.testword = StatusTestWord.IS_TOKEN;
        }
        if (arg == "digixros") {
            this.testword = StatusTestWord.HAS_STACK_ADD;
        }
        if (arg == "level") {
            this.testword = StatusTestWord.LEVEL;
            this.compare = COMPARE.IS;
            if (arg2 == "lower") this.compare = COMPARE.IS_AT_MOST;
            if (arg2 == "higher") this.compare = COMPARE.IS_AT_LEAST;
            if (arg2 == "lowest") this.compare = COMPARE.IS_LOWEST;
            this.n = n ? parseInt(n) : 0;
            return;
        }
        if (arg == "playcost" || arg == "DP" || arg == "sourcecount") {
            switch (arg) {
                case "playcost": this.testword = StatusTestWord.PLAY_COST; break;
                case "DP": this.testword = StatusTestWord.DP; break;
                case "sourcecount": this.testword = StatusTestWord.SOURCE_COUNT; break;
            }
            this.compare = COMPARE.IS;
            if (arg2 == "lower") this.compare = COMPARE.IS_AT_MOST;
            if (arg2 == "less") this.compare = COMPARE.IS_AT_MOST;
            if (arg2 == "more") this.compare = COMPARE.IS_AT_LEAST;
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
        if (arg == "trait_contains") {
            this.testword = StatusTestWord.TRAIT_CONTAINS;
            this.str = arg2!.replace(/_/ig, " ").replace(/[^-a-z0-9 \.]/ig, "").trim();
        }
        if (arg == "has_trait") {
            this.testword = StatusTestWord.HAS_TRAIT;
            this.str = arg2!.replace(/_/ig, " ").replace(/[^-a-z0-9 \.]/ig, "").trim();
        }
        if (arg == "evocards") {
            this.testword = StatusTestWord.IS_EVO_CARD;
        }
        if (arg == "name_is" || arg == "name") {
            this.testword = StatusTestWord.NAME_IS;
            this.str = arg2!;
        }
        if (arg == "with inherited") {
            this.testword = StatusTestWord.HAS_INHERITED;
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
    matches(t: Instance | CardLocation   /* | Player | TargetDesc | deck */, s: TargetSource): boolean {
        if (!t) return false;
        if (t === undefined) return false;
        logger.silly(`testing for ${StatusTestWord[this.testword]} against ${t.get_name(true)} `);
        switch (this.testword) {
            case StatusTestWord.NIL: console.error("NIL CASE"); return true;
            case StatusTestWord.NAME_IS: return t.name_is(this.str);
            case StatusTestWord.NAME_CONTAINS: return t.name_contains(this.str);
            case StatusTestWord.TRAIT_CONTAINS: return t.trait_contains(this.str);
            case StatusTestWord.HAS_INHERITED: return t.new_inherited_effects().length > 0;
            case StatusTestWord.HAS_STACK_ADD: return t.has_stack_add();
            case StatusTestWord.FACEUP: return ("face_up" in t) && t.face_up() == true;
            case StatusTestWord.CARD: return t.kind == "CardLocation";
            case StatusTestWord.KEYWORD: {
                //                console.error("TESTING FOR KEYWORD " + this.str);   
                return t.has_keyword(this.str);
            }
            case StatusTestWord.HAS_COLOR:
                // console.error("IGNORING COLOR somewhat");
                return t.has_color(this.color);

            case StatusTestWord.HAS_TWO_COLOR: return t.is_two_color();
            case StatusTestWord.IS_TOKEN: return t.is_token();
            case StatusTestWord.IS_MONSTER: return t.is_monster(); // _cached();
            case StatusTestWord.IS_TAMER: return t.is_tamer();
            case StatusTestWord.IS_OPTION: return t.is_option();
            case StatusTestWord.HAS_TRAIT: return t.has_trait(this.str);
            case StatusTestWord.IS_EVO_CARD: return t.is_evo_card();
            case StatusTestWord.DP: return this.do_compare(t.dp(), s);
            case StatusTestWord.LEVEL: return this.do_compare(t.get_level(), s);
            case StatusTestWord.PLAY_COST: return this.do_compare(t.get_playcost()!, s);
            case StatusTestWord.SOURCE_COUNT: return this.do_compare(t.get_source_count(), s);
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
                logger.debug(`tgt_plyr is ${tgt_plyr} and s / get / n is ${s.get_n_player()} and this.n is ${this.n} `);
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

    do_compare(a: number, s: TargetSource) {
        let b = this.compare;
        let c = this.n;
        let relative = this.relative;
        if (relative == "targetsource-dp") {
            let i = s.get_instance();
            c = i.dp();
            logger.info("relative set c to " + c);
        }
        logger.debug(`a ${a} b ${COMPARE[b]} c ${c}`);

        if (a === undefined || a === null || c == undefined || c == null) return false;
        if (b == COMPARE.IS) return a == c;
        if (b == COMPARE.IS_AT_LEAST) return a >= c;
        if (b == COMPARE.IS_AT_MOST) return a <= c;
        logger.error("unimplemented comparison " + b); return true;
    }

}
enum COMPARE { NIL, IS, IS_AT_LEAST, IS_AT_MOST, IS_LOWEST, IS_HIGHEST };


export enum StatusTestWord {
    NIL,
    INSTANCE_ID_IS,
    NAME_IS,
    NAME_CONTAINS,
    HAS_TRAIT,
    TRAIT_IS__unused,
    TRAIT_CONTAINS,
    HAS_COLOR,
    HAS_TWO_COLOR,
    KEYWORD,
    SOURCE_COUNT, // we will also want "x" in sources
    IS_TOKEN,
    IS_MONSTER, // maybe this should all be "is_type"
    IS_TAMER,
    IS_OPTION,
    LEVEL,
    PLAY_COST,
    DP,
    OWNER,
    LOCATION,
    ATTACKABLE,
    STATUS,
    HAS_STACK_ADD,
    HAS_INHERITED, // can we make more generic?
    CARD, // compared to instance... is this used?
    FACEUP,
    IS_EVO_CARD,
}