

declare global {
    interface String {
        after(s: string): string;
    }
}

import { Translator, TranslatorSingleton } from './translate';

let esc = "";
let red = esc + "[0;31m";
let normal = esc + "[0m";

let parserdebug = 1;


// The interesting parts of the parser only run at start-up. 
// If they hit an error, winston doesn't flush its logs.
// So we use the stupid console.logger, because we only need this 
// for debugging.

import { createLogger } from "./logger";
const logger2 = createLogger('newparser');

function do_log(...args: any[]): void {
    logger2.info(args.toString());
    // console.log(args);
}

const logger = {
    silly: (...args: any[]) => 1, // do_log(...args),
    debug: (...args: any[]) => 2, // do_log(...args),
    info: (...args: any[]) => do_log(...args),
    warn: (...args: any[]) => do_log(...args),
    error: (...args: any[]) => { do_log(...args); console.error(...args)},

}



String.prototype.after = function (s: string): string {

    let cap_this = this.toUpperCase();
    let cap_s = s.toUpperCase();
    let index = cap_this.indexOf(cap_s);
    if (index == -1) return this.toString();
    return this.substring(cap_this.indexOf(cap_s) + s.length + 0).trim();
}

import { AtomicEffect, InterruptCondition, Solid_is_triggered, StatusCondition, SubEffect, ic_to_plain_text, ic_to_string } from "./effect";
import { EventCause, GameEvent, strToEvent } from "./event";
import { Game } from "./game";
import { ALL_OF, GameTest, GameTestType, MultiTargetDesc, SpecialCard, SubTargetDesc, TargetDesc, TargetSource } from "./target";
import { Card, EvolveCondition, KeywordArray } from "./card";
import { Phase, PhaseTrigger } from "./phase";
import { Location } from "./location";
import { KeyObject } from "crypto";
import { flatMap } from "lodash";
import { CombatLoop } from './combat';


// These aren't used?
const RuleKeywords: string[] = [
    "DNA Evolve",
    "PlayXros",
    "Evolve",
    "Rule",
    // "Ace"
    // Overflow
];

// I don't know if the brackets belong here or not
const SolidKeywords: string[] = [
    "[Breeding]",
    "[Hand]",
    "[Trash]",

    "[All Turns]",
    "[Your Turn]",
    "[Opponent's Turn]",

    "[Start of Your Turn]",
    "[Start of Opponent's Turn]",
    "[Start of Your Main Phase]",
    "[Start of Opponent's Main Phase]",

    "[On Play]",
    "[On Deletion]",
    "[When Attacking]",
    "[When Evolving]",

    "[End of Attack]",
    "[End of Opponent's Turn]",
    "[End of Your Turn]",
    "[End of All Turns]",

    "[Counter]",
    "[Main]",

    "[Security]", // Need to distinguish "Security effect" from "active while face-up in Security"  

    "[Once Per Turn]",
    "[Twice Per Turn]",

    // retaliation is put here because it's a responds_to event.
    // I can't just say has_retaliation() because double retaliation
    // is a thing.
    "＜Retaliation＞",
    "<Retaliation>",
    "＜Armor Purge＞",
    "＜Armor_Purge＞",  //legacy for old format
    "<Armor Purge>", // legacy for old format
    "＜Alliance＞",
    "＜Delay＞", // description of timing



];

// These powers should be filed on the card, as they are constant
// static powers that always apply. They should never be "[On Play] <Blocker>" as that makes no sense.
const CardKeywords: string[] = [
    "＜Blocker＞",
    "＜Security Attack [-+]\\d＞",
    "＜Collision＞",
    "＜Evade＞",
    "＜Jamming＞",
    "＜Piercing＞",
    "＜Reboot＞",
    "＜Rush＞",

    "＜Absorption_-\\d＞", // this is an activation, maybe goes in cardskeywords?
    "＜Material Save \\d＞",
    "＜Save＞",
    "＜Partition \\(.* + .*\\)＞",
    "＜Raid＞",
]

// things that are actions and need a trigger to go with them.
const AtomicKeywords: string[] = [
    "＜De-evolve.?\\d＞",
    //    "＜De-evolve\\d＞",
    "＜Blast evolve＞",
    "＜Draw.(\\d)＞",
    "＜Draw.\\(\\d\\)＞",
    "<Source-Burst \\d＞",
    "＜Mind Link＞", // trigger will be [main]
    "＜Recovery.+\\d.\\(Deck\\)＞",
    "＜Blitz＞",

    // burst evo probably goes into card rules    
    "＜Burst evolve: \\d from \\[.*?\\] by returning 1 \\[.*?\\] to hand. At the end of the burst evolution turn, trash this Monster's top card.＞",

];

function parse_number(input: string): number {
    if (input.toLowerCase() == "all") return ALL_OF;
    return parseInt(input);
}

export class Card2 {
    keywords: string[];
    name_rule?: string;
    trait_rule?: string;
    playxros?: string;
    overflow?: number;
    allow?: string;
    // these two are handled elsewhere
    evolve: string[];
    dnaevolve?: string[];

    constructor() { this.evolve = []; this.keywords = []; };

    toString(short: boolean = false): string {
        let ret: string[] = ["Card:"]
        ret.push(...this.keywords);
        if (!short) {
            if (this.evolve.length > 0)
                ret.push("Evolve from: " + this.evolve.join(" OR "));
            if (this.dnaevolve) ret.push("DNA Evolve from: " + this.dnaevolve);
            if (this.name_rule) ret.push("Name: " + this.name_rule);
            if (this.trait_rule) ret.push("Trait: " + this.trait_rule);
            if (this.playxros) ret.push("Digixros: " + this.playxros);
            if (this.overflow) ret.push("Overflow: " + this.overflow);
            if (this.allow) ret.push("Allow: " + this.allow);
        } else {
            if (this.evolve) ret.push("Evolve condition");
            if (this.dnaevolve) ret.push("DNA Evolve condition");
            if (this.name_rule) ret.push("Name rule");
            if (this.name_rule) ret.push("Trait rule");
            if (this.playxros) ret.push("Digixros");
            if (this.overflow) ret.push("Overflow");
            if (this.allow) ret.push("Allow");
        }
        return ret.join(" ");
    }
}


// We build a SolidEffect2 piece-by-piece, and then change it into a SolidEffect (no 2) once it's done.
// Merging the two classes is a goal.
export class SolidEffect2 {
    //    [x: string]: string;
    raw_text: string;
    label: string;
    keywords: string[];
    once_per_turn?: boolean;
    main?: boolean;
    interrupt?: InterruptCondition; // string; // fix grammer
    interrupt_text_almost_unused?: string;
    respond_to: InterruptCondition[] = [];
    phase_trigger?: PhaseTrigger;
    cancels?: boolean;

    activate_main?: boolean; // look up the card's [main] for security. 
    effects: AtomicEffect[];

    //   solid2: SolidEffect2;
    //    atomics: AtomicEffect2[];

    alternate_allow2: TargetDesc; // should belong to Card!
    source: TargetSource;
    whose_turn?: string;

    constructor() {
        this.keywords = [];
        this.source = null!;
        this.effects = [];
        this.raw_text = "";
        this.label = "";
        this.alternate_allow2 = new TargetDesc("");
        //  this.solid2 = this;
        //this.atomics = [];
    }
    // once-per-turn function can't be put here because it's called
    // from SubEffect2 

    toPlainText(): string {
        let ret = this.keywords.join(" ");
        if (this.interrupt) {
            ret += "Interrupt: " + ic_to_plain_text(this.interrupt);
        }
        if (this.respond_to.length > 0) {
            ret += "Trigger: " + this.respond_to.map(x => ic_to_plain_text(x)).join(" or ") + ". ";
        }
        if (this.phase_trigger) {
            ret += "[" + PhaseTrigger[this.phase_trigger] + "] ";
        }
        ret += (this.effects.map(x => x.toPlainText()).join(". "));
        return ret;

    }

    toString(): string {
        let ret: string[] = ["SolidEffect: " + this.keywords.join(" ")];
        if (this.interrupt) ret.push("Interrupts: " + ic_to_string(this.interrupt));
        if (this.respond_to.length > 0) ret.push("Responds To: " + this.respond_to.map(x => ic_to_string(x)).join(" or "));
        if (this.phase_trigger) ret.push("Phase: " + PhaseTrigger[this.phase_trigger]);
        ret.push(` ${this.effects.length} [[`);
        ret.push(this.effects.map(x => x.toString()).join(" ++ "));
        ret.push("]]");
        return ret.join(" ");
    }
}

// Does the "can_activate" belong on the Solid or on the Atomic?

// There are double-if's. So we will need to put it in Atomic Effect.
// solideffect should have an interface can_activate() that look up the individual pieces
// For now it's going into Atomic Effect for historical reasons.

export class AtomicEffect2 {
    raw_text: string;
    keywords: string[];
    subs: SubEffect[];
    events: SubEffect[];

    is_cost?: boolean;
    test_condition?: GameTest;
    per_unit?: boolean;
    weirdo: SubEffect;
    optional: boolean;
    can_activate?: (arg: SolidEffect2) => boolean;
    source?: TargetSource;

    search_n?: number; // how many cards to reveal for search
    search_multitarget?: MultiTargetDesc;
    search_final?: Location; // where they go at the end

    see_security?: boolean; // should this have other things I can see?

    constructor() {
        this.raw_text = "";
        this.keywords = [];
        this.subs = [];
        this.events = this.subs;
        this.optional = false;
        this.weirdo = { game_event: GameEvent.NIL, td: new TargetDesc(""), cause: EventCause.EFFECT };
    }
    toPlainText(): string {
        let ret = []; // I should distinguish effects from keywords. // [...this.keywords];
        let keywords = [...this.keywords];
        if (this.test_condition) ret.push("If " + this.test_condition.toPlainText() + " exists,");

        if (this.optional) ret.push("optionally,");

        if (this.is_cost) ret.push("by");
        if (this.per_unit) ret.push("PER UNIT");
        if (this.can_activate) ret.push("(fn)");


        // I need different tenses for
        // When you play a monster
        // When you would play a monster
        // you do attack

        // this might belong in SubEffect?
        for (let sub of this.subs) {
            let r = GameEvent[sub.game_event].toLowerCase() + " " + sub.td.toPlainText();

            if (sub.game_event == GameEvent.MEMORY_CHANGE && sub.n) {
                if (sub.n < 0) {
                    r = `lose ${-sub.n} memory`;
                } else {
                    r = `gain ${sub.n} memory`;
                }
            } else if (sub.game_event == GameEvent.REVEAL_TO_HAND) {
                r = "do a search (...)";
                //            } else if (sub.game_event == GameEvent.PLAY) {
                //              r = "you play ";
            } else {
                let sc;
                if (sc = sub.status_condition) {
                    r += "(" + GameEvent[sc.s.game_event] + " " + sc.s.n;
                    if (sc.s.immune) r += "immune ";
                    r += "<" + sc.s.td.toString() + ">";
                    if (sc.solid) r += "{" + sc.solid.toString() + "}";
                    r += ")";
                }
            }
            ret.push(r);
        }
        // capitalize first word
        if (ret.length > 0) {
            ret[0] = ret[0][0].toUpperCase() + ret[0].slice(1);
        }

        //        ret.push(keywords.join("-"))

        return ([keywords.join("-")].concat(ret)).join(" ");
    }
    toString(): string {
        let ret = [...this.keywords];
        if (this.is_cost) ret.push("IS COST");
        if (this.per_unit) ret.push("PER UNIT");
        if (this.optional) ret.push("OPTIONAL");
        if (this.test_condition) ret.push("State Check: " + this.test_condition.toString());
        if (this.can_activate) ret.push("SPECIAL FUNCTION! ");
        ret.push(`(${this.subs.length})`);
        for (let sub of this.subs) {
            let r = GameEvent[sub.game_event] + " " + sub.td.toString();
            let sc;
            if (sc = sub.status_condition) {
                r += "(" + GameEvent[sc.s.game_event] + " " + sc.s.n;
                if (sc.s.immune) r += "immune ";
                r += "<" + sc.s.td.toString() + ">";
                if (sc.solid) r += "{" + sc.solid.toString() + "}";
                r += ")";
            }
            ret.push(r);
        }
        ret.push(`SOURCE:{${this.raw_text}}`);
        return ret.join(" && ");
    }

}

function assert(condition: boolean): void {
    if (!condition) {
        console.trace();
        let a: any = null; a.assert();
    }
}



// If "inherited" then populate the inherited keywords of cards, otherwise populate main text.
// Returns card, solideffect, array of atomiceffect, as well as the unparsed text.
export function new_parse_line(line: string, card: (Card | undefined), label: string, inherited: boolean): [Card2, SolidEffect2, AtomicEffect2[], string] {

    line = Translator.text(line);
    // should we fill in missing keywords here?

    let card2: Card2 = new Card2();
    let solid = new SolidEffect2();
    solid.label = label;
    logger.info("new parse line: " + line);

    let atomics: AtomicEffect2[] = [];
    line = line.trim();

    let m;

    ///////////////// CARD RULES

    // there is a lot of dupe code here between this and the atomickeywords
    for (let i = 0; i < CardKeywords.length; i++) {
        let cword = CardKeywords[i];
        let re = new RegExp("^\s*" + cword.replaceAll(/[＜＞ _]/ig, "."));
        logger.silly(re.toString());
        let m;
        if (m = line.match(re)) {
            logger.silly("match " + cword);
            if (card) {
                let ptr = inherited ? card.card_inherited_keywords : card.card_keywords;
                ptr[cword.replaceAll(/[＜＞_]/g, " ")] = m[0];
            }

            // legacy
            if (line.indexOf(">") > -1)
                line = line.after(">")
            else
                line = line.after("＞");
            line = line.trim();
            // get rid of reminder text
            if (m = line.match(/\s*\((.*)\)\s*(.*)/)) {
                line = m[2];
            }
            i = -1; // might have multiple
        }
    }

    // we still have a ＜KEYWORD＞! Hope it's Atomic...
    if (m = line.match(/^\s*＜(.*)＞(.*)/)) {
        let word = "＜" + m[1] + "＞";
        let unseenword = true;
        // I shouldn't ever match SolidKeywords, I just matched above
        for (let pattern of SolidKeywords) {
            if (pattern == (word)) unseenword = false;
        }
        for (let pattern of AtomicKeywords) {
            if (pattern == (word)) unseenword = false;
        }
        for (let pattern of CardKeywords) {
            if (pattern == (word)) unseenword = false;
        }
        if (unseenword) {
            logger.info("naked keyword " + word);
            logger.debug(m);
            // probably nothing left after the 
            let reminder = Translator.get_reminder(m[1]);
            logger.info("reminder is " + reminder)
            if (reminder) line = reminder;
            if (m[2].trim().length > 1)
                console.error("KEYWORD REMNANT: " + m[2]);
            logger.info("line now " + line);

        }
    }




    // New keyword with reminder text. Only wide ＜＞ support atm
    /*    while (m = line.match(/＜(.*)＞\s*\((.*)\)(.*)/)) {
            console.error(989898);
            console.error(line);
            console.error(m);
            let keyword = m[1];
            let text = m[2];
    //        let line = m[3];
            line = m[2] + ". " + m[3];
            console.error(line);
        }*/

    // remove reminders. Todo: save this to automatically parse
    //            line = line.replaceAll(/(＜.*＞.*)\s+\(.*\)/ig, '$1')



    // 1. alt evolution DESTINATION conditions, what this card can evo on top of

    if (line.match(/^.?.?Evolve/i)) {
        if (card) card.evolve.push(line.after("]"));
        // mastergame will parse the evo text
        line = "";
    }
    if (m = line.match(/^You may evolve this card from your hand onto one of your(.*)/i)) {
        card?.evolve.push(m[1]);
        line = "";
    }

    // Your Monster with [Omnimon] in_its_name can evolve into this card in your hand
    //       for a cost of 3, ignoring evolution requirements.
    // Your [Lucemon] can evolve into this card in your hand for a memory cost of 7,
    //       ignoring this card's evolution requirements.

    //     if (m = line.match(/Your ([\[\]a-z_ ]*) can evolve into this card in your hand(.*),.?.?.?(ignoring( this card's)? evolution requirements).?.?.?$/i)) {

    // does the "condition" belong here? 

    if (m = line.match(/^((if|while) (.*))?(one of )?your (.*) (can|may) evolve into this card in your hand(.*),\s*(ignoring( this card's)? evolution requirements)?/i)) {

        // wtf is this block for

        let condition = m[3]
        let source = m[5];
        let cost = m[7];
        let ignore = !!m[8];
        card?.evolve.push(`Source: [${source}] Cost:[${cost}] Ignore:[${ignore}]`);
        line = "";
    }

    // 2. dna evo conditions

    if (line.match(/^.?.?DNA_Evolve/)) {
        if (card) card.dnaevolve = line.substring(line.indexOf("]"));
        line = "";
    }
    // The name of this card/Monster is also treated as [Shoutmon]/[Starmons].
    // The name of this card/Tamer is also treated as [Kiriha_Aonuma]/[Nene_Amano].
    // [Rule] Name: Also treated as [Shoutmon]/[Ballistamon].
    // This card is also treated as having [Plug-In] in_its_name. While you have a Tamer in play, you may use this card without meeting its color requirements.
    // This card/Monster is also treated as if it's [DarkKnightmon]/[Tuwarmon].
    // This card/Monster is also treated as if its's [ChaosGallantmon].
    // This card/Monster is also treated as having the [Cyborg] trait.

    // 3. alt name and traits



    if (line.match(/^.?.?Rule.?.?.?Name:/) || line.match(/^.?The name of this/i)) {
        //if (d) if (parserdebug) logger.debug("name match")
        if (card) card.name_rule = line.after("also");
        line = "";
    }

    //This card is also treated as having [Plug-In] in_its_name. While you have a Tamer in play, you may use this card without meeting its color requi\

    if (m = line.match(/^This \S* is also treated (as .*)$/i)) {
        logger.info(m);
        // if (d) if (parserdebug) logger.debug("also match")
        // there is _one_ rule that has both (name) and (alternate_allow), gotta split for it
        let rules = line.split(".");
        logger.info(rules);
        // verify no extra words we missed
        // line without period, or sentence with period, 
        assert(rules.length == 1 || rules.length == 2 || (rules.length == 3 && rules[2] == ''));
        logger.info(111);
        line = rules[1];
        let phrase = m[1];
        //  if (parserdebug) logger.debug(phrase);
        if (m = phrase.match(/as if it.?s.?.?\s*(.*)/i)) {
            //assert(!card.name_rule);
            if (card) card.name_rule = m[1];
            line = "";
            // one of our strings has a weird whitespace in it
            // uh, names can have spaces
        } else if (m = phrase.match(/as \[(.*)\]/i)) {
            if (card) card.name_rule = m[1];
            line = "";
        } else if (m = phrase.match(/as (having .*\s*in.its.name)/i)) {
            if (card) card.trait_rule = m[1];
            line = "";
            // as having name [thingymon]
        } else if (m = phrase.match(/having the (\S*)\s*trait/i)) {
            if (card) card.trait_rule = m[1];
            line = "";
        } else {
            logger.info("unknown name match");
            assert(false);
        }
    }

    // 4. Digixros

    if (m = line.match(/^.?.?DigiXros -(\d)/i)) {
        let reduce = parseInt(m[1]);
        let sources = line.after("]");
        if (card) card.playxros = `Reduce by ${reduce} with ${sources}`;
        line = "";
    }

    // 5. Overflow (belongs with card keywords maybe?
    if (m = line.match(/.?Overflow .-(\d)./i)) {
        if (card) {
            card.overflow = 0 - parseInt(m[1]);
            if (parserdebug) logger.debug("OVERFLOW HIT " + card.overflow);
            card.card_keywords["ACE"] = "ACE";
            card.card_keywords["Overflow"] = m[0];
        }
        if (card2) {
            card2.overflow = 0 - parseInt(m[1]);
            card2.keywords.push("ACE");
            card2.keywords.push("Overflow");
        }
        line = "";
    }


    // 6. alternate option use
    //If you have a Monster with the [Hybrid] trait in play, you may use this Option card without meeting its color requirements.

    if (m = line.match(/^(If|While) you have (.*), you may use this (Option )?card/i)) {
        if (parserdebug) logger.debug("alternate allow");
        if (card) card.allow = m[2];
        line = "";
    }




    ///////////////// SOLID EFFECTS

    solid.raw_text = line;

    logger.info("solidkeyword");
    line = line.trim();
    for (let i = 0; i < SolidKeywords.length; i++) {
        let sword = SolidKeywords[i];
        //        if (d) if (parserdebug) logger.debug(word);        
        if (line.startsWith(sword)) {
            solid.keywords.push(sword);
            line = line.substring(sword.length);
            line = line.trim();
            i = -1; // start over

            let self = new TargetDesc("self");
            let on_self: InterruptCondition = {
                ge: GameEvent.NIL,
                td: self
            };
            switch (sword) {
                case "[Main]": solid.main = true; continue;
                case "[Once Per Turn]": solid.once_per_turn = true; continue;

                case "[Start of Your Turn]": solid.phase_trigger = PhaseTrigger.START_OF_YOUR_TURN; continue;
                case "[Start of Your Opponent's Turn]": solid.phase_trigger = PhaseTrigger.START_OF_OPPONENTS_TURN; continue;
                case "[Start of All Turns]": solid.phase_trigger = PhaseTrigger.START_OF_ALL_TURNS; continue;
          
                case "[End of Your Turn]": solid.phase_trigger = PhaseTrigger.END_OF_YOUR_TURN; continue;
                case "[End of Opponent's Turn]": solid.phase_trigger = PhaseTrigger.END_OF_OPPONENTS_TURN; continue;
                case "[End of All Turn]": solid.phase_trigger = PhaseTrigger.END_OF_ALL_TURNS; continue;
        
                case "[Your Turn]": solid.whose_turn = "mine"; continue;
                case "[Opponent's Turn]": solid.whose_turn = "theirs"; continue;
                case "[Start of Your Main Phase]": solid.phase_trigger = PhaseTrigger.START_OF_YOUR_MAIN; continue;
                case "[Start of Opponent's Main Phase]": solid.phase_trigger = PhaseTrigger.START_OF_OPPONENTS_MAIN; continue;
                case "[End of Attack]": solid.phase_trigger = PhaseTrigger.END_OF_ATTACK; continue;
            }

            let cost: AtomicEffect2 = new AtomicEffect2();
            let t = new AtomicEffect2();


            switch (sword) {
                case "[When Evolving]": on_self.ge = GameEvent.EVOLVE; break;
                case "[On Play]": on_self.ge = GameEvent.PLAY; break;
                case "[On Deletion]": on_self.ge = GameEvent.DELETE; break;
                case "<Retaliation>":
                case "＜Retaliation＞": on_self.ge = GameEvent.DELETE;

                    on_self.cause = EventCause.NORMAL_BATTLE;
                    t.raw_text = "Retaliation";
                    let s = {
                        game_event: GameEvent.DELETE,
                        td: new TargetDesc("source"),
                        cause: EventCause.EFFECT
                    };
                    t.events.push(s);
                    t.weirdo = s;
                    solid.effects.push(t);

                    break;
                case "<Armor Purge>":
                case "＜Armor Purge＞":
                case "＜Armor_Purge＞":
                    let trigger: InterruptCondition = {
                        ge: GameEvent.DELETE, td: self
                    }; // when self would be deleted
                    let trash_top: SubEffect = {
                        game_event: GameEvent.DEVOLVE_FORCE, n: 1,
                        label: "lose top card", td: self,
                        cause: EventCause.EFFECT
                    }; // trash_top_card_of_this_monster:
                    cost.optional = true;
                    cost.events = [trash_top];
                    cost.weirdo = trash_top;
                    cost.is_cost = true;
                    let canceller: SubEffect = {
                        game_event: GameEvent.CANCEL,
                        label: "cancel deletion",
                        td: new TargetDesc("self"),
                        cause: EventCause.EFFECT
                    };
                    solid.raw_text = "Armor Purge";
                    solid.interrupt = trigger;
                    solid.cancels = true;
                    solid.effects = [cost];

                    let second = new AtomicEffect2();
                    second.optional = true;
                    second.events = [canceller];
                    second.weirdo = canceller;

                    solid.effects.push(second);

                    cost.can_activate = () => {
                        // default test
                        return true;
                    }
                    continue; // don't set respond_to 
                case "[When Attacking]":
                    on_self.ge = GameEvent.ATTACK_DECLARE;
                    on_self.td = new TargetDesc("any");
                    on_self.source = self;
                    break;
                case "＜Alliance＞":
                    on_self.ge = GameEvent.ATTACK_DECLARE;
                    on_self.td = new TargetDesc("any");
                    on_self.source = self;

                    make_alliance(solid);
                    break;
                // trigger condition: i declare attack

                default: continue; // don't run below if we didn't match above
            }
            // <armor_purge> doesn't respond, it interrupts
            if (parserdebug) logger.debug("SET RESPOND TO ON 1 " + sword);
            if (on_self) solid.respond_to.push(on_self);


        }
    }

    if (m = line.match(/^\s*\(.*?\)\s*(.*)$/i)) {
        // eat parentheses explanation, does this belong in the loop
        line = m[1];
    }

    if (line.match(/^\s*Activate this card.?.?.?.??Main.?.?.? effect\.?\s*$/i)) {
        solid.activate_main = true;
        line = "";
    }



    // Interruptive on play/use: Not sure if this belongs a card
    // effect or a solid effect

    // ... I guess it activates in "reveal". Okay.
    if (m = line.match(/^When you would (use|play|evolve into) this (card|monster)( from your hand)?,(.*)/i)) {
        solid.interrupt_text_almost_unused = "On reveal of self";
        line = m[4];
    }

    // look for "it" clauses, and replace with last known noun phrase
    line = replace_it(line);


    // check if parse_when and parse_at can be merged
    if (m = line.match(/^At (.*?),(.*)/)) {
        let at = parse_at(m[1]);
        if (at) solid.phase_trigger = at;
        line = m[2];
    }

    //// RESPONDS TO! all "WHEN" stuff should be here
    if (m = line.match(/^When (.*?),(.*)/)) {
        let when = parse_when(m[1]);
        line = m[2];
        if (m[1].match(/would/i)) {
            solid.interrupt = when;
        } else {
            if (parserdebug) logger.debug("SET RESPOND TO ON 2 " + when);
            solid.respond_to.push(when);
        }
        if (parserdebug) logger.debug("WHEN text:" + m[1] + ". Then I got back:");
        if (parserdebug) logger.debug(ic_to_string(when));
    }



    line = line.trim();
    ///////////////// BREAKING INTO ATOMIC EFFECTS
    if (line[line.length - 1] != ".")
        line += "."


    // If the next sentence starts with "For each" it's probably modifying the previous sentence.
    if (m = line.match(/^(([^.]*?).\s*For each([^.]*?)\.)(.*)/)) {
        logger.info("for each looking backwards: " + m[1]);
        let [a1, l1] = parse_atomic(m[1], label);
        atomics.push(a1);
        line = l1;
        // See if there's a second part.
        if (m[4] && m[4].length > 2) {
            let [a2, l2] = parse_atomic(m[4], label);
            atomics.push(a2);
            line += " " + l2;
        }
        line = line.trim();
    }

    if (m = line.match(/^by (.*?), (.*?)\.(.*)/i)) {
        // where does the "cost / effect" logic go? 
        let [a1, l1] = parse_atomic(m[1], label);
        a1.is_cost = true;
        a1.optional = true;
        let [a2, l2] = parse_atomic(m[2], label);
        // todo: have a cancels? flag on the atomic
        if (a2.events[0].game_event == GameEvent.CANCEL) {
            logger.info("is a canceller");
            solid.cancels = true;
        }
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2 + " " + m[3];
        // 3 sentence, like giant missle
    }

    if (m = line.match(/^you may ([^.]*?) to (.*?)\.(.*)/i)) {
        logger.info("old style cost");
        // where does the "cost / effect" logic go? 
        let [a1, l1] = parse_atomic(m[1], label);
        a1.is_cost = true;
        let [a2, l2] = parse_atomic(m[2], label, solid);
        if (a2.events[0].game_event == GameEvent.CANCEL)
            solid.cancels = true;

        // we completely parsed the two clauses, suggesting this was a good match
        if (l1.length + l2.length == 0) {
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = m[3];
        } else {
            if (parserdebug) logger.debug("couldn't parse YOU MAY (x) TO (y)");
            // try something else
        }
    }
    // "X and Y for the turn" is "X for the turn" and "Y for the turn"
    // I should have a separate 'determine the time limit' subroutine.

    if (m = line.match(/(for the turn,)?\s*(this monster )(.*),? and (.*?)( for the turn)?\./i)) {
        logger.info("trying an internal split");
        if (!m[1] && !m[5]) {
            logger.info("neither turn clause");
        } else {
            let time = m[1] || m[5];
            let left = m[2] + m[3] + " " + time;
            let right = m[2] + m[4] + " " + time;
            logger.info(`left is ${left} and right is ${right}`);
            // TODO: I could merge this clause with the below, it's just an extra clause
            let [a1, l1] = parse_atomic(left, label);
            let [a2, l2] = parse_atomic(right, label);
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = l1 + " " + l2;
        }
        // just a 2 secntence thing
    }

    // this is too specific. "X. If this effect Y. Then, Z." 

    if (m = line.match(/(.*) (If this effect .*)Then, (.*?)\./i)) {
        // TODO: I could merge this clause with the below, it's just an extra clause
        let [a1, l1] = parse_atomic(m[1], label);
        let [a2, l2] = parse_atomic(m[2], label);
        let [a3, l3] = parse_atomic(m[3], label);
        atomics.push(a1, a2, a3);
        solid.effects.push(a1, a2, a3);
        line = l1 + " " + l2 + " " + l3;
        // just a 2 secntence thing
    }



    if (m = line.match(/(.*) Then,(.*?)\.(.*?)\./i)) {
        // TODO: I could merge this clause with the below, it's just an extra clause
        let [a1, l1] = parse_atomic(m[1], label);
        let [a2, l2] = parse_atomic(m[2], label);
        let [a3, l3] = parse_atomic(m[3], label);
        atomics.push(a1, a2, a3);
        solid.effects.push(a1, a2, a3);
        line = l1 + " " + l2 + " " + l3;
        // just a 2 secntence thing
    }

    // We don't want to hit "REVEAL X, IF IT IS" here
    if (m = line.match(/^([^Reveal].*)\. (If (.*))/i)) {
        let [a1, l1] = parse_atomic(m[1], label);
        let [a2, l2] = parse_atomic(m[2], label);
        atomics.push(a1, a2);
        if (m = line.match(/(.*) Then,(.*)/i)) {
            let [a1, l1] = parse_atomic(m[1], label);
            let [a2, l2] = parse_atomic(m[2], label);
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = l1 + " " + l2;
        }

        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
    }


    if (m = line.match(/(.*) Then,(.*)/i)) {
        let [a1, l1] = parse_atomic(m[1], label);
        let [a2, l2] = parse_atomic(m[2], label);
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
    }
    if (line.length > 1) {
        let [_atom, _line] = parse_atomic(line, label, solid);
        line = _line;
        atomics.push(_atom);
        solid.effects.push(_atom);
    }
    if (line.length > 1)
        if (parserdebug) logger.debug("REMNANT: " + red + line + normal);
        else
            line = "";

    //    if (parserdebug) logger.debug("DEBUG BUG " + solid.effects.length + " " + atomics.length);
    return [card2, solid, atomics, line];


}

// targetdesc is "find this thing and if we do we pass"
// It won't meet conditions like "we have 3 cards in security"

// SAME LOGIC FOR "PARSE WHEN"?
// we've already eaten the "if"
function parse_if(line: string): GameTest {
    logger.info("parse if: " + line);
    let m;
    // in play is ending up in first match
    if (m = line.match(/you have (.*?)( in play)?$/i)) {
        return new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc("your " + m[1]));
        //        atomic.state_check = m[1];
    }
    // same in play issue as above. non-greedy doesn't fix this
    if (m = line.match(/your opponent has (.*?)( in play)?$/i)) {
        return new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc("their " + m[1]));
    }

    // while you have N (or more) cards in hand
    // while this monster has <Piercing>
    // while this monster is suspended
    // While your opponent has (2 or more Monster with no evolution cards) in play
    // while you have (a blue tamer) in play
    // while you have 3 or more memory
    // While there are 5 or more cards in your opponent's trash
    // While you have another Monster in play with the same name as this Monster

    if (m = line.match(/(that monster) is (.*)/i)) {
        let td1 = new TargetDesc(m[1]);
        let td2 = new SubTargetDesc(m[2]);
        let td = new TargetDesc(""); td.targets.push(td1, td2);
        return new GameTest(GameTestType.TARGET_EXISTS, td);
    }


    if (m = line.match(/this monster (is|has) (suspended)/i)) {
        // if we target "this suspended monster" we
        // break it into "this" which is self and "suspended"
        // so it can only apply its effect while it has a hit
        let td = new TargetDesc("this suspended monster");
        return new GameTest(GameTestType.TARGET_EXISTS, td);
        // always return true, just to get it working for now
    }

    if (parserdebug) logger.debug(red + "IF/WHILE: " + line + normal);
    // the below will generate random results
    logger.info('near the end');
    return new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc(line));
    //    return new TargetDesc("");
}

function parse_at(line: string): PhaseTrigger | false {
    if (line.match(/(the ?)end of your turn/)) return PhaseTrigger.END_OF_YOUR_TURN;
    return false;
}

function parse_when(line: string): InterruptCondition {

    let m;
    logger.info("parse_when: " + line);

    // INTERRUPTIVE

    if (m = line.match(/one of your Monster would evolve into a (.*)/i)) {
        let int_evo: InterruptCondition = {
            ge: GameEvent.EVOLVE,
            td: new TargetDesc("your " + m[1]),
            cause: EventCause.ALL
        }
        return int_evo;
    }

    if (m = line.match(/(.*) would (.*)/)) {
        line = m[1].trim() + " " + m[2].trim();
    }

    logger.info(line);
    if (m = line.match(/(you) (play) (.*)/)) {
        let verbed: InterruptCondition = {
            ge: GameEvent.PLAY,
            td: new TargetDesc("your " + m[3]),
        };
        return verbed;
    }

    if (m = line.match(/(.*)? (is|be) deleted( (in|by) battle)?/i)) {
        let deleted_in_battle: InterruptCondition = {
            ge: GameEvent.DELETE,
            td: new TargetDesc(m[1]),
            //            td: self
            cause: m[3] ? EventCause.NORMAL_BATTLE : undefined,
        };
        return deleted_in_battle;
    }

    if (m = line.match(/an opponent's monster is played or evolve.(.*)/i)) {
        logger.warn("only handling evo condition");
        let int_evo: InterruptCondition = {
            ge: GameEvent.EVOLVE,
            td: new TargetDesc("their monster"),
            cause: EventCause.ALL
        }
        return int_evo;
    }


    if (line.match(/this Monster deletes an opponent.s Monster in battle/i)) {
        //  let self = new TargetDesc("self");
        let defeat_other: InterruptCondition = {
            ge: GameEvent.DELETE,
            td: new TargetDesc("source"),
            //            td: self
            cause: EventCause.NORMAL_BATTLE,
        };
        return defeat_other;
    }

    if (line.match(/an attack target is switched/i)) {
        return {
            ge: GameEvent.ATTACK_TARGET_SWITCH,
            td: new TargetDesc("")
        }
    }

    // bt5 When your level 5 green Monster attacks
    // ex2 you attack with a Monster with [Gargomon]/[Rapidmon] in_its_name
    // bt13 When your Monster with [Gaomon] or [Gaogamon] in its name attacks
    if (m = line.match(/you attack with a (.*)/i)) {
        // let my_td = new TargetDesc("your " + m[1]);
        return {
            ge: GameEvent.ATTACK_DECLARE,
            td: new TargetDesc(""),
            source: new TargetDesc("your " + m[1]) // i dunno if I need this
        }
    }

    //    When this Monster attacks your opponent's Monster, lose 2 memory. ",

    // If we already have a [when attacking] trigger we should modify that
    // instead of making a new trigger

    if (m = line.match(/(.*monster.*) attacks(.*)/i)) {
        let into = m[2];
        let my_td;
        if (into.match(/(opponent|player)$/i)) {
            my_td = new TargetDesc("opponent");
        } else {
            my_td = new TargetDesc(into);
        }

        return {
            ge: GameEvent.ATTACK_DECLARE,
            td: my_td,
            source: new TargetDesc(m[1])
        }

    }


    // an effect suspends this Monster

    //one of your Monster is suspended by (an ＜Alliance＞) effect
    //   console.error(line);
    if (m = line.match(/(.*) is suspended by an?( .Alliance.)? effect/i)) {
        let cause = m[1] ? EventCause.ALLIANCE : EventCause.EFFECT;
        return {
            ge: GameEvent.SUSPEND,
            td: new TargetDesc(m[1]),
            cause: cause
            // source: new TargetDesc("self")
        }
    }
    if (m = line.match(/an effect (plays|evolves) (another monster)/i)) {
        let cause = EventCause.EFFECT;
        return {
            ge: m[1] == "plays" ? GameEvent.PLAY : GameEvent.EVOLVE,
            td: new TargetDesc(m[2]),
            cause: cause
            // source: new TargetDesc("self")
        }
    }


    if (m = line.match(/an effect (un)?suspends one of your monster/i)) {
        let cause = EventCause.EFFECT;
        return {
            ge: m[1] ? GameEvent.UNSUSPEND : GameEvent.SUSPEND,
            td: new TargetDesc("your monster"),
            cause: cause
            // source: new TargetDesc("self")
        }
    }

    if (m = line.match(/an effect (un)?suspends this monster/i)) {
        let into = m[1];
        let my_td = new TargetDesc("self");
        return {
            ge: m[1] ? GameEvent.UNSUSPEND : GameEvent.SUSPEND,
            td: my_td,
            cause: EventCause.EFFECT
            // source: new TargetDesc("self")
        }
    }

    // handles present and past tense
    if (m = line.match(/((a|any|this) monster) (is|becomes)?\s*(un)?suspend(ed|s)?(.*)/i)) {
        let my_td = new TargetDesc(m[1]);
        // what am i doing with m[4]? I should anchor to end
        return {
            ge: m[4] ? GameEvent.UNSUSPEND : GameEvent.SUSPEND,
            td: my_td,
            // source: new TargetDesc("self")
        }
    }

    // this is *any* health, whoops
    if (m = line.match(/a card is removed from (a|your) security stack/i)) {
        return {
            ge: GameEvent.CARD_REMOVE_FROM_HEALTH,
            td: new TargetDesc("")
        }
    }
    if (m = line.match(/a card is added to (a|your) security stack/i)) {
        return {
            ge: GameEvent.CARD_ADD_TO_HEALTH,
            td: new TargetDesc("")
        }
    }
    if (m = line.match(/(a) card is trashed (from your deck)/i)) {
        // I don't think this is right
        return { ge: GameEvent.MOVE_CARD, td: new TargetDesc("self") };
    }
    if (m = line.match(/(this) card is trashed (from your deck)/i)) {
        return { ge: GameEvent.MOVE_CARD, td: new TargetDesc("self") };
    }

    if (line.match(/a card is trashed (from your hand)? (by your effect)?/i) ||
        line.match(/you trash a card in your hand (using one of your effects)?/i)) {
        return { ge: GameEvent.TRASH_FROM_HAND, td: new TargetDesc("self") };
    }



    if (parserdebug) logger.debug(red + "WHEN: " + line + normal);
    return { ge: GameEvent.NIL, td: new TargetDesc("") };
}

//export
function parse_atomic(line: string, label: string, solid?: SolidEffect2): [AtomicEffect2, string] {



    logger.info("atomic " + line);

    // bullshit I shouldn't need, I think it's just for eating keywords
    for (let i = 0; i < 5; i++) line = line.replace(/^\s*\[[^\]]*\]\s*/g, '');

    if (parserdebug) logger.debug("DEBUG: ATOMIC2 IS " + line);

    let atomic = new AtomicEffect2();
    atomic.raw_text = line;
    let thing: {
        game_event: GameEvent, td: TargetDesc, td2?: TargetDesc,
        choose: number,
        n: number, immune: boolean, n_mod: string, n_max: number,
        n_target?: TargetDesc, // "suspend 1 monster for each tamer"
        cause: EventCause,
        cost_change?: any
    } = {
        game_event: GameEvent.NIL,
        td: new TargetDesc(""), choose: 0, n: 0,
        immune: false,
        n_mod: "", n_max: 0,
        cause: EventCause.EFFECT,
    };
    let m;

    // not distinguishing between 'prevent 1' and 'prevent all'
    if (m = line.match(/prevent (1 of those Monster's|that) deletion/i)) {

        let canceller: SubEffect = {
            game_event: GameEvent.CANCEL,
            label: "cancel deletion",
            td: new TargetDesc("self"),
            cause: EventCause.EFFECT
        };

        atomic.events = [canceller];
        atomic.weirdo = canceller;
        line = "";
    }



    //////////////////////// CONDITIONS! The "if" clause could come before the keyword!

    // the number of cards in your security stack levelss than or equal to your opponent's
    // you have 6 or less cards in your hand

    // cheating to put this here

    // this should all be in parse_if, shame

    if (m = line.match(/the number of cards in your security stack is less than or equal to your opponent..,?(.*)/i)) {
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('card check clause');
            if (!e.source) return false;
            if (parserdebug) logger.debug('got a source');
            let sec_size = e.source.get_player().security.length;
            let other_size = e.source.get_player().other_player.security.length;
            if (parserdebug) logger.debug(`my stack is ${sec_size} theirs is ${other_size}`);
            return (sec_size <= other_size);
        };
        line = m[1];
    }
    if (m = line.match(/you have (\d+) or (fewer|less|more) cards in (your )?(hand|trash|security stack),(.*)/i)) {
        let size: number = parseInt(m[1]);
        let comp: string = m[2];
        let place: string = m[4];
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('card check clause');
            if (!e.source) return false;
            let p = e.source.get_player();
            let pile;
            switch (place) {
                case "hand": pile = p.hand; break;
                case "trash": pile = p.trash; break;
                case "security stack": pile = p.security; break;
                default: return false;
            }
            let len: number = pile.length;
            if (parserdebug) logger.debug(`${place} LENGTH IS ${len} size is ${size}`);
            if (comp == "more") return len >= size;
            return (len <= size);
        };
        line = m[5];
    }
    // this is also a cheat
    if (m = line.match(/you have (\d+) memory or less(.*)/i)) {
        let tgt = parseInt(m[1]);
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('mem check clause');
            if (!e.source) return false;
            let mem = e.source.get_player().game.get_memory();
            if (parserdebug) logger.debug("MEM  IS " + mem);
            return (mem <= tgt);
        };
        line = m[2];
    }


    //    this effect deleted one of your Monster
    //    this effect suspends your Monster
    if (m = line.match(/this effect (delete|suspend).?.( one of)? your monster,(.*)/i)) {
        // I think I
        let verb = m[1];
        atomic.can_activate = function (e: SolidEffect2) {
            let test_for = (verb == "delete" ? GameEvent.DELETE : GameEvent.SUSPEND);
            if (parserdebug) logger.debug('wendigo check, parserdebug ' + parserdebug);
            logger.debug('wendigo check clause');
            // if first effect was DELETE, was successful, and targeted me player
            let at = e.effects[0];
            let w = e.effects[0].events[0];
            logger.debug("w ge is " + GameEvent[w.game_event]);
            logger.debug("e source is " + e.source);
            if (!e.source) return false;
            if (w.game_event != test_for) return false;
            if (!w.chosen_target) return false;  // no target
            logger.debug("chosen target player is " + w.chosen_target.n_me_player);
            logger.debug("source player is " + e.source.get_n_player());
            if (w.chosen_target.n_me_player != e.source.get_n_player()) return false;
            logger.info("cost paid is " + at.cost_paid);
            if (!at.cost_paid) return false;
            return true;
        };
        line = m[3];
    }

    if (m = line.match(/the attacking monster is \[(.*)\],(.*)/i)) {
        let name = m[1];
        atomic.can_activate = function (e: SolidEffect2) {
            let game = e.source.get_player().game;
            let combat_loop = game.root_loop.combatloop as CombatLoop;
            if (!combat_loop) return false;
            //           if (! ("attacker" in combat_loop)) return false;
            let attacker = combat_loop.attacker;
            if (!("has_name" in attacker)) return false;
            if (attacker && attacker.has_name(name)) {
                console.error("setting last thing in ATTACK MONSTER");
                game.set_last_thing([attacker]);
                return true;
            }
            return false;
        }
    }

    //  If no Monster was deleted by this effect,
    if (m = line.match(/no monster was deleted by this effect(.*)/i)) {
        // I think I
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('gallantmon check, parserdebug ' + parserdebug);
            logger.debug('gallantmon check clause');
            // if first effect was DELETE, was successful, and targeted me
            let w = e.effects[0].events[0];
            logger.debug("w ge is " + GameEvent[w.game_event]);
            logger.debug("e source is " + e.source);
            if (!e.source) return false;
            if (w.game_event != GameEvent.DELETE) return false;

            if (!w.chosen_target) return true;  // nothing was deleted
            return false;
        };
        line = m[1];
    }

    ///// DONE WITH CUSTOM FUNCTION IF, NOW TRADITIONAL IF


    // so how do I split sentences across the comma?
    // I'm going to have clauses within the "if" that have them
    if (m = line.match(/^\s*If (.*?),(.*)/i)) {
        if (parserdebug) logger.debug("IF MATCH");
        //        console.info(m);
        //        if (parserdebug) logger.debug(m);
        atomic.test_condition = parse_if(m[1]);
        line = m[2];

    }

    if (m = line.match(/^While (.*),(.*)/i)) {
        atomic.test_condition = parse_if(m[1]);
        line = m[2];
    }

    logger.info("after if/while " + line);




    //    console.log(line);
    for (let i = 0; i < AtomicKeywords.length; i++) {
        let aword = AtomicKeywords[i];
        let re = new RegExp("^\\s*" + aword.replaceAll(/[＜＞ _]/ig, "."), "i");
        //        if (parserdebug) logger.debug(re);
        let m;
        //      console.log(re);
        if (m = line.match(re)) {
            //        console.log("MATCH");
            logger.info(m);
            //          if (parserdebug) logger.debug(aword);
            atomic.keywords.push(aword);
            //        if (parserdebug) logger.debug("ATOMIC KEYWORDS NOW " + atomic.keywords.join("--"));
            if (aword.match(/De.evolv/i)) {
                if (parserdebug) logger.debug("devolv line");
                if (parserdebug) logger.debug(line);
                // first get rid of parens
                if (m = line.match(/(.*)\(.*?\)(.*)/)) {
                    line = m[1] + " " + m[2];

                }
                if (parserdebug) logger.debug("After parents");
                if (parserdebug) logger.debug(line);
                //          <devolve n> (target) . Extra
                //                upto       _    tgt     tgt     rest
                //                  1        [2]  3       4       5

                let dline = line + ".";
                // devolve 3 monsters. Then recover 1.
                if (m = dline.match(/(\d)[＞>](.*?)(\d|all)(.*?)\.(.*)/i)) {

                    // we need to match "<de-evolve #> X of target" with optional parens and period
                    //                   1       2     3   4    5 6       7
                    //     if (m = line.match(/(\d)[＞>](.*?)(\d)(.*?)(\((.*?)\))?(.*)/i)) {

                    //if (m = line.match(/(\d)[＞>](.*?)(\d)(.*?)[\.(](.*)/i)) {
                    //    if (m = line.match(/(\d)[＞>](.*?)(\(.*)/i)) {                    
                    if (parserdebug) logger.debug(JSON.stringify(m));
                    thing.game_event = GameEvent.DEVOLVE;
                    thing.n = parseInt(m[1]);
                    if (parserdebug) logger.debug("n mod is set");
                    thing.n_mod = "upto"; // "upto" is only for selecting the number of things to devolve, not the targets

                    thing.n_max = parseInt(m[1]);
                    let filler = m[2];
                    thing.choose = parse_number(m[3]);
                    thing.td = new TargetDesc(m[4]);
                    line = m[5];
                    if (parserdebug) logger.debug("target " + m[4]);
                }
            } else if (aword.match("Recovery")) {
                thing.game_event = GameEvent.CARD_ADD_TO_HEALTH;
                thing.n = parseInt(m[1]);
                thing.td = new TargetDesc("deck");
                line = line.after(">")
                line = line.after("＞");
            } else if (aword.match("Draw")) {
                thing.game_event = GameEvent.DRAW;
                thing.n = parseInt(m[1]);
                if (thing.n == 0) thing.n = 1;
                thing.td = new TargetDesc("player");
                line = line.after(">")
                line = line.after("＞");
            } else {
                line = line.after("＞");
                line = line.after(">")
            }
            line = line.trim();
            if (line[0] == ".") line = line.substring(1);
            // if (parserdebug) logger.debug("BEFORE PARENS: " + line);
            if (m = line.match(/^\s*\(.*?\)\s*\.?\s*(.*)$/i)) {
                // eat parentheses explanation
                line = m[1];
            }
            i = -1; // start over to look for more words...
        }

    }

    // DO X. For each Y, modify X. <-- handles this case
    // For each X, Do y.  <-- doesn't handle this case
    // see also for each waaaay below

    if (m = line.match(/(.*?)For each of (.*), add (\d+) to (.*)/)) {
        thing.n_mod = `counter,td2,${m[3]}`; // td2 is unused in most effects
        thing.td2 = new TargetDesc(m[2]);
        line = m[1];
    }
    // 

    if (m = line.match(/you may\s*(.*)/i)) {
        atomic.optional = true;
        line = m[1];
    }

    line = line.trim();

    if (m = line.match(/Search your security stack. (.*)/)) {
        atomic.see_security = true;
        line = m[1];
    }


    if (m = line.match(/play (\d+) (\[.*\] Tokens?) (.*cost.*)\((.*)\)(.*)/i)) {
        thing.game_event = GameEvent.PLAY;
        thing.choose = parseInt(m[1])
        thing.n = parseInt(m[1])
        thing.td = new TargetDesc(m[2]);
        thing.n_mod = "for free";
        line = m[4];
    }   

    //    1 of your Monster may evolve into a green Monster card in your hand
    //  for its evolution cost. When it would evolve by this effect, reduce the cost by 2.

    //you may evolve this Monster into a 2-color green card in your hand for its evolution cost. 
    //When this Monster would evolve with this effect, reduce the evolution cost by 2.
    let evo_source = "";
    let evo_dest = "";
    let evo_cost = 0; 
    let evo_reduced;
    let evo_ignore = false;
    let evo_from = "";
    let evo_free = false;
    //    console.error(line);

    let stat_cond: StatusCondition | null = null;

    //1 of your Monster may evolve into a red Monster card in your hand for its evolution cost. When it would evolve by this effect, reduce the cost by 2.

    //you may evolve it into a [xxx] in your trash for a evolution cost of 3.

    // this monster may evolve into [xxx] from your trash for a evolution cost of 3, ignoring its evolution requirements.",

    // this monster may evolve intp [yyy] from your (hand)for a evolution/memory cost of 3, ignoring its evolution requirements
    // Search your security stack.
    //This Monster may evolve into a yellow Monster card with the [Vaccine] trait among them without paying the cost. 
    //This Monster may evolve into a yellow Monster card with the [Vaccine] trait among them without paying the cost
    // <alliance> boost : (should also say "from your hand or trash"
    if (m = line.match(/(.*)ignoring( its)? evolution requirements/)) {
        evo_ignore = true;
        line = m[1].trim();
    }
    if (m = line.match(/(.*)When (it|this Monster) would evolve ...?.? this effect, reduce the( evolution)? cost by (\d)/i)) {
        evo_reduced = parseInt(m[4]);
        line = m[1];
    }

    if (m = line.match(/(.*)for an? evolution cost of (\d+)/)) {
        evo_cost = parseInt(m[2])
        line = m[1];
    }

    // how to distinguish "[when attacking] this may evolve into Bob" from a passive "this may evolve into bob"?? 
    if (Solid_is_triggered(solid)) {
        //                  1    2             3               4    56              7                          8             
        if (m = line.match(/(.*?)( may )?evolve(.*) into ?a?n? (.*) ((in|from) your (hand|trash)|among them)\s*(without paying the cost)?/i)) {
            if (m[8]) {
                evo_cost = 0;
                evo_free = true;
            }
                // if already set to true above, don't change setting. evolution is *usually* optional, anyway
            atomic.optional ||= !!m[2];
            // you may evolve XX
            if (m[1] && !m[1].match(/you/i)) {
                evo_source = m[1];
                // XX may evolve
            } else {
                evo_source = m[3];
            }
            evo_dest = m[4];
            evo_from = m[7]; // from hand? from trash? from security? from hammerspace?

            if (parserdebug) logger.debug(`evo source <${evo_source}> evo dest <${evo_dest}> evo cost <${evo_cost}>`);
            line = "";
        }

        if (evo_dest) {
            logger.info(`dest ${evo_dest} source ${evo_source} from ${evo_from} cost ${evo_cost} reduced ${evo_reduced} ignore ${evo_ignore}`);

            thing.game_event = GameEvent.EVOLVE;
            // for .EVOLVE the "target" is the card.
            // I'm gonna need a special effect loop clause for this anyway.
            thing.choose = 1;
            let td_text = evo_dest;
            if (evo_from) td_text += " from your " + evo_from;
            thing.td = new TargetDesc(td_text); 
            thing.td2 = new TargetDesc(evo_source);
            thing.n = evo_cost;
            thing.cost_change = [];
            if (evo_reduced)
                thing.cost_change.push({ n_mod: "reduced", n: evo_reduced });
            thing.n_mod = "";
            if (evo_ignore)
                thing.n_mod = "ignore requirements ";
            if (evo_free) {
                thing.n_mod += "for free";
            }

            //        thing.n_mod = "reduced";
            //      line = "";
        }
    }

    let expiration = undefined; // I brought this paragraph up

    if (m = line.match(/This monster ... evolve into an? \[(.*)\] in your hand for a memory cost of (\d+)/i)) {
        // "ignore requirements" is implied
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1;
        thing.td = new TargetDesc("self"),
            stat_cond = {
                s: {
                    game_event: GameEvent.MAY_EVO_FROM,
                    n: parseInt(m[2]),
                    td: new TargetDesc("dummy"), // I really need this to be optional
                    cause: EventCause.EFFECT, // really?
                    n_mod: m[1]
                },
                exp_description: expiration
            };
        line = "";
    }


    //    if (parserdebug) logger.debug("DEBUG: ATOMIC2 AFTER KEYWORDS IS " + line);

    /*
    this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash
    in any order as the bottom evolution cards of one of your [Guilmon],
    that Monster may evolve into [Gallantmon] in your hand
    for the cost, ignoring its level.
    The Monster evolved by this effect gets +2000 DP for the turn.
 
    
    By placing this Tamer and 1 [Gargomon] and 1 [Rapidmon] from your trash
    as the bottom evolution cards of one of your [Terriermon],
    that Monster may evolve into [MegaGargomon] in your hand
    for a evolution cost of 4, ignoring its evolution requirements.
    The Monster evolved by this effect gains <Rush> for the turn.
    */


    if (m = line.match(/reduce the (evolution|play)\s*cost by (\d)\.?/)) {
        // we need to update the solid effect to say it modifies play cost
        if (!solid) {
            // it's a passive effect!
            //            let b: any = null; b.no_solid();
        }
        thing.game_event = GameEvent.MODIFY_COST;
        thing.n = parseInt(m[2]);
        thing.n_mod = "reduced";
        line = "";
    }


    if (m = line.match(/plac..?.? this tamer and 1 (.*) and 1 (.*) from your trash.*?one of your (.*?).s bottom/i)) {
        logger.debug("bio merge");
        // like evolve, take_under needs 2 targets
        thing.game_event = GameEvent.EVOSOURCE_ADD;
        thing.td = new TargetDesc("1 of your [Terriers]");
        thing.cause = EventCause.EFFECT;
        thing.choose = 1;
        // let stat_cond = null;
        line = "";
    }

    // Place this card under 1 of your green Monster.

    if (m = line.match(/place (this card) under 1 of (.*)/i)) {
        thing.game_event = GameEvent.EVOSOURCE_ADD;
        thing.td = new TargetDesc(m[2]); // where to put the card
        //thing.td2 = new TargetDesc(m[1]); // the "from"
        thing.choose = 1;
        line = "";
    }

    //Then, place this card into your battle area.
    // in the battle area, into your battle area
    if (m = line.match(/place this card in.?.? ....? battle area/i)) {
        thing.game_event = GameEvent.PLACE_IN_FIELD;
        thing.td = new TargetDesc("this card");
        thing.choose = 1
        line = "";
    }

    if (m = line.match(/Reveal the top card.? of your deck. If it is a (black card)?.*add it to your hand.*(Trash the rest)/i)) {
        atomic.search_n = 1; // parseInt(m[1]);
        thing.game_event = GameEvent.REVEAL_TO_HAND;
        thing.choose = 1;
        atomic.search_multitarget = new MultiTargetDesc(m[1]);
        thing.td = new TargetDesc(m[1]);
        atomic.search_final = Location.TRASH;
        line = "";
    }
    //Reveal the top 3 cards of your deck. Add 1 green Monster card and 1 such Tamer
    //   card among them to the hand. Return the rest to the bottom of the deck. place this card in the battle area

    //Reveal the top 2 cards of your deck.
    //Add 1 green card among them to your hand. Place the rest at the bottom of your deck in any order. Then, place this card into your battle area.

    if (m = line.match(/Reveal the top (\d+) cards of your deck. Add (.*?) among them to ....? hand. (Return|Place) the (rest|remaining cards) .. the bottom.*/i)) {   // atomic.unused_search_choose = [];
        atomic.search_n = parseInt(m[1]) // parseInt(m[1]);
        thing.game_event = GameEvent.REVEAL_TO_HAND;

        // I am totally cheating these search types
        thing.choose = 2;
        thing.n_mod = "upto";
        if (m[2].match(/1 (\w*) card/)) {
            thing.choose = 1;
            thing.n_mod = "";
        }
        atomic.search_multitarget = new MultiTargetDesc(m[2]);
        //      thing.multitarget
        thing.td = new TargetDesc(m[2]);
        atomic.search_final = Location.DECK;
        line = "";
    }

    // you may used to be here


    // if at start, we've got another subeffect, like <draw 1> and +2000 DP
    if (m = line.match(/^and (.*)/)) {
        if (parserdebug) logger.debug("DEBUG: ATOMIC2 FOUND 'AND'");
        let proper_thing: SubEffect = thing;
        atomic.subs.push(proper_thing);  // finish the old one, start a new one

        thing = {
            game_event: GameEvent.NIL,
            td: new TargetDesc(""), choose: 0, n: 0, n_mod: "", n_max: 0,
            immune: false,
            cause: EventCause.EFFECT,
        };

        line = m[1];
    }





    ///// EXPIRATION, this implies a status condition

    const for_the_turn_re = new RegExp("^(.*)for (the|this) turn.{0,2}$", "i");
    if (m = line.match(for_the_turn_re)) {
        expiration = { END_OF_TURN: "THIS" };
        //    if (parserdebug) logger.debug("EXPIRATION");
        //     if (parserdebug) logger.debug(expiration);

        line = m[1]
    } else if (m = line.match(/^(.*)until the end of( their| your opponent's| your)? turn,?(.*)$/i)) {
        //			if (parserdebug) logger.debug("UNTIL WHEN, EFFECT");
        expiration = { END_OF_TURN: m[2] == " your" ? "YOUR" : "OPPONENT" };
        line = m[1] + " " + m[3];
        //	if (parserdebug) logger.debug("UNTIL 2:" + effect);
        //    if (parserdebug) logger.debug("EXPIRATION");
        //    if (parserdebug) logger.debug(expiration);
    }
    if (expiration) { if (parserdebug) logger.debug("expiration"); if (parserdebug) logger.debug(JSON.stringify(expiration)); }
    // if (parserdebug) logger.debug("AFTER EXPIRY LINE IS " + line);


    //    if (parserdebug) logger.debug("RECURSIVE?: " + line);
    // since this is recursive it needs to be one of the first ones.
    if (m = line.match(/(.*)gains? "(.*)"/i)) {
        if (parserdebug) logger.info("FOUND RECURSIVE");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1;
        let [_0, nested_solid_effect, _1] = new_parse_line(m[2], undefined, label, false); // how could we pass through a card here, we won't have any card keywords
        // we don't give card keywords by effect inside quote marks
        if (parserdebug) logger.info(`NESTED EFFECT: ${_0} ${nested_solid_effect} ${_1}`);
        stat_cond = {
            s: {
                game_event: GameEvent.NIL,
                td: new TargetDesc(""), // this doesn't need a target
                cause: EventCause.EFFECT // default to everything being an effect
            },
            solid: nested_solid_effect,
            // can't assign this, not proper recursion
            // solid: nested_solid_effect,
            exp_description: expiration
        }
        thing.td = new TargetDesc(m[1]);
        line = "";
    }


    let proper_thing: SubEffect;

    //your opponent's effects can't delete this Monster or return it to the hand or deck

    /////// STATUS CONDITIONS  If no expiration, they are continuous/persistent/both?

    // I'm doing this as two (three?) separate effects
    if (m = line.match(/(.*)your opponent.s effects can.t delete (this Monster )or return (it|this monster) to the hand or deck(.*)/i)) {
        logger.warn("ignoring field-to-hand");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1; // we do need to target
        thing.td = new TargetDesc(m[2]); // "this monster"
        stat_cond = {
            s: {
                game_event: GameEvent.DELETE,
                td: new TargetDesc("opponent"), // This may be the opposite of what I want
                immune: true,
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        };
        proper_thing = thing;
        proper_thing.status_condition = stat_cond;
        atomic.subs.push(proper_thing);
        thing = {
            game_event: GameEvent.GIVE_STATUS_CONDITION,
            td: new TargetDesc(m[2]), choose: 1, n: 0,
            immune: true,
            n_mod: "", n_max: 0,
            cause: EventCause.EFFECT
        };
        stat_cond = {
            s: {
                game_event: GameEvent.TO_BOTTOM_DECK,
                td: new TargetDesc("opponent"), // This may be the opposite of what I want
                immune: true,
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        };

        line = m[1] + " " + m[3]
    }



    // 1 of their monster can't unsuspend
    if (m = line.match(/(\d) of (.*) can.t unsuspend (or evolve)?(.*)/i)) {
        let count: number = parseInt(m[1]);
        thing.choose = count;
        //			thing['game_event'] = GameEvent.ALL;
        thing.n = count;
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.td = new TargetDesc(m[2]);
        stat_cond = {
            s: {
                game_event: GameEvent.UNSUSPEND,
                td: new TargetDesc(""),
                immune: true,
                cause: EventCause.ALL // for any reason... maybe use 0?
            },
            exp_description: expiration
        };
        // I need to either
        //  1) wrap both immunities into one effect, which has its advantages, or
        //  2) say "the targets of this are the targets of the last thing" and I think
        //     this will be helpful in many more cases. ... Like, <Alliance> uses this.
        //     Already did. How did I do <Alliance>?
        if (m[3]) {
            proper_thing = thing;
            proper_thing.status_condition = stat_cond;
            atomic.subs.push(proper_thing);
            thing = {
                game_event: GameEvent.GIVE_STATUS_CONDITION,
                td: new TargetDesc(m[2]), choose: count, n: count,
                immune: true,
                n_mod: "previous sub", n_max: 0,
                cause: EventCause.EFFECT
            };
            stat_cond = {
                s: {
                    game_event: GameEvent.EVOLVE,
                    td: new TargetDesc(""), // can't evolve, from any source or for any cause
                    immune: true,
                    cause: EventCause.ALL
                },
                exp_description: expiration
            }
        }
        line = m[4]
    }

    // this monster is unaffected by your opponent's monster's effects.",
    if (m = line.match(/(.*) is\s*(un|not|n't)\s*affected.by (.*effects.*)/i)) {
        //			thing['game_event'] = GameEvent.ALL;
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1; // we do need to target
        thing.td = new TargetDesc(m[1]);
        let target = "";
        if (m[3].match(/monster/i)) {
            target = "their monster";
        }
        stat_cond = {
            s: {
                game_event: GameEvent.ALL,
                td: new TargetDesc(target), // This may be the opposite of what I want
                immune: true,
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        };
        line = ""
    }


    // TODO: this probably could follow into the clause below
    if (line.match(/suspend(ing)? this tamer/i) || line.match(/suspend to attack/)) {
        thing.game_event = GameEvent.SUSPEND;
        thing.choose = 1;
        thing.td = new TargetDesc("self");
        line = ""; // do we lose anything?
    }


    line = line.trim();
    ////// Imperatives (sentence starts with verb)

    if (m = line.match(/set your memory to (\d)/)) {
        //        thing.choose = parseInt(m[1]);
        thing.game_event = GameEvent.MEMORY_SET;
        thing.n = parseInt(m[1]);
        line = "";
    }

    if (m = line.match(/^Return (\d)(.*) from (your)?\s*trash.*hand/i)) {
        thing.choose = parseInt(m[1]);
        thing.game_event = GameEvent.TRASH_TO_HAND;
        thing.td = new TargetDesc(m[2] + " in your trash");
        line = "";
    }


    if (m = line.match(/^Return (\d) of(.*) to the bottom of the.?.? deck/i)) {
        thing.choose = parseInt(m[1]);
        thing.game_event = GameEvent.TO_BOTTOM_DECK;
        thing.td = new TargetDesc(m[2]);
        line = "";
    }

    if (m = line.match(/^Return (\d) of(.*) to (its owner.s|the) hand/i)) {
        thing.choose = parseInt(m[1]);
        // "reveal" is dumb, but does it work?
        thing.game_event = GameEvent.FIELD_TO_HAND;
        thing.td = new TargetDesc(m[2]);
        line = "";
    }


    if (m = line.match(/change the attack target to (.*)$/i)) {
        thing.choose = parseInt(m[1]);
        // "reveal" is dumb, but does it work?
        thing.game_event = GameEvent.ATTACK_TARGET_SWITCH;
        thing.choose = 1;
        thing.td = new TargetDesc(m[1]);
        line = "";
    }

    line = line.trim();

    if (m = line.match(/trash(ing)? the top (\d+ )?cards? of (your|their|both players.?) decks?/i)) {
        // we need two separate SubEffects, because if we try to trash from both and only 1 player
        // has cards, we need to know which happened for triggered
        let count = 1;
        if (m[2]) count = parseInt(m[2]);
        let player = m[3];
        thing.game_event = GameEvent.MOVE_CARD;
        thing.n = count;
        // if me, make thing(me)
        // if them, make thing(them)
        // if both, make thing(me) then other thing(them)
        thing.td2 = new TargetDesc(player == "their" ? "their deck" : "our deck");
        thing.td = new TargetDesc("trash");
        if (player.startsWith("both")) {
            proper_thing = thing;
            atomic.subs.push(proper_thing);
            thing = {
                game_event: GameEvent.MOVE_CARD,
                // "n" is set but not really used. effectloop needs to
                // "target" everything we trash, so we can respond to
                // specific things being trashed
                td: new TargetDesc("trash"), choose: count, n: count,
                td2: new TargetDesc("their deck"),
                immune: false,
                cause: EventCause.EFFECT,
                n_mod: "", n_max: 0
            }
        }
        line = "";
    }


    if (m = line.match(/trash(ing)? the top card of (your|their|your opponent.s) security stack/i)) {
        thing.game_event = GameEvent.CARD_REMOVE_FROM_HEALTH;
        // chosen_target should be a player
        cause: EventCause.EFFECT,
            thing.td = (m[2] == "your") ? new TargetDesc("me") : new TargetDesc("opponent"),
            thing.n = 1;
        line = "";
    }

    // UNHANDLED Choose any number of your opponent's Monster and Tamers whose combined play costs
    // UNHANDLED choose any number of your opponent's Monster so that their play cost total is up to 6 
    // Choose any number of your opponent's Monster whose play costs add up to 15 or less and
    // Choose any number of your opponent's Monster whose total DP adds up to 10000 or less 

    // choose THINGS whose X add up to N and VERB them
    if (m = line.match(/\s*choose any number of (your .*)? whose (combined play costs?|total DP) adds? up to (\d+) or less and (.*) them/i)) {
        let verb = m[4];
        if (verb.toLowerCase() == "delete") {
            thing.game_event = GameEvent.DELETE;
        } else {
            console.error(verb);
            let a: any = null; a.choose_sum();
        }
        let total = parseInt(m[3]);
        thing.n = total;
        thing.choose = total;
        thing.n_mod = "upto total";
        // only show things that fit in the cap
        thing.td = new TargetDesc(m[1] + " with " + total + " DP or less");
        thing.cause = EventCause.EFFECT;
        line = "";
    }

    

    line = line.trim();
    // this handles VERB and VERB-ing
    line = line.replaceAll("deleting", "delete");
    // I want to use "PLAY" here but I think I handle it some place else??
    for (let key of ["DELETE", "SUSPEND", "UNSUSPEND", "HATCH"]) {
        // easy keywords
        if (line.toUpperCase().startsWith(key)) {

            logger.warn("found " + key);
            if (parserdebug) logger.info("found simple verb: " + key);
            thing.game_event = strToEvent(key);
            if (m = line.match(/^\w+ (\d|all) of (.*?)(for each (.*))?$/i)) {
                // delete 2 of your opponent's monster
                thing.choose = parse_number(m[1]);
                thing.td = new TargetDesc(m[2]);
                if (m[3]) {
                    thing.n_mod = "foreach";
                    thing.n_target = new TargetDesc(m[4]);
                }
            } else {
                thing.choose = 1;
                let target = line.after(key);
                if (target.startsWith("ing")) target = target.after("ing").trim();
                logger.warn(`line is ${line} key is ${key} target is ${target}`);
                thing.td = new TargetDesc(target);
            }
            if (key == "HATCH") thing.choose = 0; // nothing to target
            line = "";
        }

    }
    /*
        if (m = line.toUpperCase().startsWith(/^(Delete|) (.*)/i)) {
            thing.game_event = GameEvent.DELETE;
            thing.td = new TargetDesc(m[2])
            line = "";
        }
    */

    ///// MEMORY
    logger.warn(12345);
    logger.warn(line);


    if (m = line.match(/(.*)(gain|lose) (\d+) memory(\s*for each)?/i)) {
        thing.game_event = GameEvent.MEMORY_CHANGE;
        thing.n = parseInt(m[3]);
        if (m[2].match(/lose/i)) thing.n = 0 - thing.n;
        if (m[4]) atomic.per_unit = true;
        line = m[1]
    }


    ///// MUST ATTACK. Is "this monster attacks" also text?
    if (m = line.match(/Attack with (this monster)/i)) {
        thing.game_event = GameEvent.MUST_ATTACK;
        thing.td2 = new TargetDesc(m[1]); 
        line = "";
    }

    // Add this card to/into/its your/the/owners hand.
    if (m = line.match(/\s*add this card (.{2,20}) hand\.?\s*/i)) {
        //       if (parserdebug) logger.debug("play match");
        thing.game_event = GameEvent.TRASH_TO_HAND; // "reveal" isn't right but it's generic enough that it adds from anywhere. Maybe all *_TO_HAND should be merged.
        thing.choose = 1;
        thing.td = new TargetDesc("this card");
        line = "";
    }


    // -: 'Play this card without paying the cost.', 
    // +: 'Play this card without paying its memory cost.', <-- obsolete? fandom gave it up
    //・You may play 1 [Terry]/[Looney] from your hand without paying the cost.

    if (m = line.match(/play\s*(.*)\s*(without paying (the|its) (play |memory )?cost)/i)) {
        if (parserdebug) logger.debug("play match");
        thing.game_event = GameEvent.PLAY;
        thing.choose = 1;
        thing.td = new TargetDesc(m[1]);
        line = "";
        thing.n_mod = "free";
    }
    //You may play 1 green Tamer card or 1 level 3 Monster card with
    //[Lopmon] in_its_name from your hand with the play cost reduced by 2.\n' +
    if (m = line.match(/play\s*(.*)\s*with the (play |use |memory )?cost reduced by (\d)/i)) {
        if (parserdebug) logger.debug("play match");
        thing.game_event = GameEvent.PLAY;
        thing.choose = 1;
        thing.td = new TargetDesc(m[1]);
        line = "";
        thing.n = parseInt(m[3]);
        thing.n_mod = "reduced";
    }


    // this is both a "WHEN EVENT HAPPENS" and "DO A THING" ??
    //// TRASHING CARDS 
    if (m = line.match(/trash(ing)?\s*(up to\s*)?(\d+) card.? (in|from) your hand/i)) {
        thing.game_event = GameEvent.TRASH_FROM_HAND;
        thing.n = 0; // really??? parseInt(m[3]);
        thing.choose = parseInt(m[3]);
        thing.td = new TargetDesc("1 card in your hand");
        if (m[2]) thing.n_mod = "upto";
        line = ""; // maybe too aggressive to just assume we eat everything    
    }

    if (m = line.match(/trash(ing)? (\d) (.* (in|from) your hand)(.*)/i)) {
        thing.game_event = GameEvent.TRASH_FROM_HAND;
        thing.choose = parseInt(m[2]);
        thing.td = new TargetDesc(m[3]);
        line = m[5]; // maybe too aggressive to just assume we eat everything    
    }


    //////// descriptives, subject-verb-object


    // How to handle "1 of your opponent's monster and all of their security monster"?

    if (m = line.match(/(.*)\s+(get|gain).?\s*([-0-9+]* DP(.*))/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        // having this out breaks blocker-dp-boost
        if (!thing.choose) thing.choose = 1;
        thing.choose = 1;
        stat_cond = {
            s: {
                game_event: GameEvent.DP_CHANGE,
                n: parseInt(m[3]),
                td: new TargetDesc(""), // I really need this to be optional
                cause: EventCause.EFFECT

            },
            exp_description: expiration
        };
        //        if (and = text.match(/(1 .*) and ((1|all) .*)/i)) {
        let split;
        let target = m[1];
        if (true && target.startsWith("up to ")) {
            thing.n_mod = "upto";
            target = target.substring(6);
        }
        /*
        if (/^\d of/.test(target)) {
            thing.choose = parseInt(target[0]);
            target = target.substring(5);
        }
            */

        if (split = target.toLowerCase().match(/^(\d|all) (of )?(.*)/)) {
            if (split[1] == "all") {
                thing.choose = 0;
                target = "blanket " + split[3];
                // we aren't consuming the split[3] atm
            } else {
                thing.choose = parse_number(split[1]);
                target = split[3];
            }
        }

        // let this special case go first. Try to unfactor this.
        if (split = line.match(/((.*) and )?(all of (their|your opponent's) security monster)/i)) {
            let target1 = split[1] ? split[2] : "your monster with [XXX] in its name";
            let target2 = split[3]
            thing.td = new TargetDesc(target2);
            thing.choose = 0;
            // prep target2. If we have target 1, push target 2 and then make target 1
            proper_thing = thing;
            proper_thing.status_condition = stat_cond;
            atomic.subs.push(proper_thing);
            stat_cond = {
                s: {
                    game_event: GameEvent.DP_CHANGE,
                    n: parseInt(m[3]),
                    td: new TargetDesc(target2),
                    cause: EventCause.EFFECT
                },
                exp_description: expiration
            }
            thing = {
                game_event: GameEvent.GIVE_STATUS_CONDITION,
                td: new TargetDesc(target1), choose: 1, n: 1,
                immune: false,
                cause: EventCause.EFFECT,
                n_mod: "", n_max: 0
            }
        } else {
            thing.td = new TargetDesc(target);
        }
        line = m[4]
    }

    let blanket = "";
    // At the start of a sentence, like (all of) (your monsters) (get +2000 DP)
    // That becomes a status on the player which additionally has its own targets
    if (line.toLowerCase().startsWith("all of")) {
        thing.choose = ALL_OF;
        line = line.after("all of").trim();
        blanket = "blanket ";
    }
    // The second clause is working but it shouldn't be.
    if (m = line.match(/(.*?)(may attack|attacks)( a player|...?.? opponent.s monster)?\s*(without suspending)?\.?(.*With this effect, .* can attack .* played)?/i)) {
        // I tried a few things here, I think MUST_ATTACK works best
        thing.game_event = GameEvent.MUST_ATTACK;
        thing.n_mod = (m[4] || "") + " " + (m[5] || "");
        //        thing.game_event = GameEvent.MUST_ATTACK; // not "must" but declared optional earlier
        atomic.optional = !!m[2].match(/may/i);
        // effect can't attack players.
        let tgt = m[3] ? "player" : "";
        if (m[3] && m[3].match(/monster/i)) tgt = "your opponent's monster";
        thing.td = new TargetDesc(tgt);
        thing.td2 = new TargetDesc(m[1]);
        line = "";
    }
    /*
        if (m = line.match(/^all of (.*monsters?)(.*)/)) {
            thing.choose = 99;
        }*/

    if (m = line.match(/^(.*)cannot be deleted in battle/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        if (!thing.choose) thing.choose = 1;
        thing.choose = 0;
        thing.td = new TargetDesc(blanket + m[1]),
            stat_cond = {
                s: {
                    immune: true,
                    game_event: GameEvent.DELETE,
                    td: new TargetDesc("dummy"), // I really need this to be optional
                    cause: EventCause.NORMAL_BATTLE || EventCause.SECURITY_BATTLE
                },
                exp_description: expiration
            };

        line = "";
    }


    if (m = line.match(/This monster is unblockable/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1;
        thing.td = new TargetDesc("self"),
            stat_cond = {
                s: {
                    game_event: GameEvent.UNBLOCKABLE,
                    td: new TargetDesc("dummy"), // I really need this to be optional
                    cause: EventCause.EFFECT,
                },
                exp_description: expiration
            };
        line = "";
    }




    if (m = line.match(/(This monster) can.t attack( players)?/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 0;
        thing.td = new TargetDesc(m[1]);
        stat_cond = {
            s: {
                game_event: GameEvent.ATTACK_DECLARE,
                td: new TargetDesc("opponent"), // I really need this to be optional
                cause: EventCause.ALL, // really?
                immune: true,
            },
            exp_description: expiration
        };
        line = "";
    }

    // gains <EFFECT>  until...
    //                  1      (2)            (3)             (4)
    if (m = line.match(/(.*)\s+(get|gain).?\s*(＜.*＞)\s*(.*)/i)) {
        if (parserdebug) logger.info(`effect gain: ${m[1]} gets ${m[3]}`);
        // ALLIANCE is a solid effect.
        // We should both give the keyword *and* the effect.
        //        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1; //?
        let keywords: KeywordArray = {};
        let word = m[3];
        if (parserdebug) logger.debug(`word is ${word}`);
        let solid: SolidEffect2 | undefined = undefined;
        if (word.match(/Alliance/i)) {
            keywords[word] = word;

            solid = new SolidEffect2();
            solid.label = "[Alliance]"; // gifted alliance in brackets?
            make_alliance(solid);
        } else if (word.match(/Jamming/i)) {
            keywords[word] = word;

            //   solid.label = "[Jamming]"
        } else if (word.match(/Security Attack/i)) {
            keywords["＜Security Attack＞"] = word; // "＜Security Attack +1＞";

        } else {
            keywords[word] = word;

        }
        //        keywords[
        //      keywords["＜Security Attack＞"] = "＜Security Attack -4＞";
        stat_cond = {
            s: {
                cause: EventCause.EFFECT,
                game_event: GameEvent.KEYWORD,
                n: 55555,
                td: new TargetDesc(""), // I really need this to be optional
            },
            solid: solid,
            keywords: keywords,
            exp_description: expiration
        };
        //        if (and = text.match(/(1 .*) and ((1|all) .*)/i)) {
        thing.td = new TargetDesc(m[1]);
        line = m[4]
    }


    proper_thing = thing;
    if (stat_cond) {
        proper_thing.status_condition = stat_cond;
    }
    atomic.subs.push(proper_thing);


    return [atomic, line];
}

function make_alliance(solid: SolidEffect2): void {
    //let solid = new SolidEffect2;
    //solid.label = "Alliance";

    let self = new TargetDesc("self");
    let on_self: InterruptCondition = {
        ge: GameEvent.NIL,
        td: self
    };

    on_self.ge = GameEvent.ATTACK_DECLARE;
    on_self.td = new TargetDesc("any");
    on_self.source = self;


    // cost: suspend 1 of my unsuspended monster
    let suspend_other: SubEffect = {
        game_event: GameEvent.SUSPEND,
        choose: 1,
        cause: EventCause.EFFECT | EventCause.ALLIANCE,
        label: "suspend for alliance", td: new TargetDesc("your unsuspended monster")
    };
    let cost = new AtomicEffect2();
    cost.optional = true;
    cost.events = [suspend_other];
    cost.weirdo = suspend_other;
    cost.is_cost = true;

    solid.effects = [cost];
    let t = new AtomicEffect2();
    t.raw_text = "Alliance Boost";
    // let stat_cond = null;

    // the first effect targets a monster
    // the second effect needs to get that monster's stats
    // effect loop needs to look up that first monster's stats somehow
    // It can certainly refer to the previous effect and what it targeted
    // 

    let alliance_dp: SubEffect = {
        game_event: GameEvent.GIVE_STATUS_CONDITION,
        td: new TargetDesc("self"),
        choose: 1,
        status_condition: {
            s: {
                cause: EventCause.EFFECT | EventCause.ALLIANCE,
                game_event: GameEvent.DP_CHANGE,
                n_function: function (se: SolidEffect2) {
                    // return DP of target of first effect
                    return se.effects[0].events[0].chosen_target.dp();
                },
                n: 8888,
                td: new TargetDesc("")
            },
            exp_description: { END_OF_ATTACK: "" }
        },
        cause: EventCause.EFFECT,
    };
    t.events.push(alliance_dp);

    let keywords: KeywordArray = {};
    keywords["＜Security Attack＞"] = "＜Security Attack +1＞";
    //＜Security Attack [-+]\\d＞
    // Both the subeffect that gives the boost *and* the boost itself are labeled "ALLIANCE" is that right?
    let alliance_sa: SubEffect = {
        cause: EventCause.EFFECT | EventCause.ALLIANCE,
        game_event: GameEvent.GIVE_STATUS_CONDITION,
        td: new TargetDesc("self"),
        choose: 1,
        status_condition: {
            s: {
                cause: EventCause.EFFECT | EventCause.ALLIANCE,
                game_event: GameEvent.KEYWORD,
                n: 8888,
                td: new TargetDesc("")
            },
            keywords: keywords,
            exp_description: { END_OF_ATTACK: "" }
        }
    };
    t.events.push(alliance_sa);

    t.weirdo = alliance_sa;
    solid.effects.push(t);
    if (parserdebug) logger.debug("SET RESPOND TO ON 3 " + t);
    solid.respond_to.push(on_self); // will get overwritten in some places
    //  return solid;
}

function replace_it(line: string): string {
    // by sheer luck, "it d" is always either a canceller or a did-effect-happen checker
    if (!line.match(/ it [^d]/))
        return line;
    // would evolve also handled easily
    if (line.match(/ it would evo/))
        return line;
    // searcher is it own issue, let's make that future-us's problem
    if (line.match(/reveal/i))
        return line;
    if (line.match(/ and it /i)) // "noun X and Y" same as "noun X and it Y"
        return line;
    if (line.match(/ under it /i)) 
        return line;
    // in 179 out of 232 cases, "it" means "self"  
    if (line.match(/this monster/i)) {
        return line.replaceAll(" it ", " this Monster ");
    }
    // If we handle all the below, we can undo the above replaceAll

//    return line.replaceAll(" it ", " that ");

    //Until the end of your opponent's turn, 1 of your opponent's Monster gains ＜Security Attack -1＞. If you have a [XXX] in play, 3 of your opponent's Monster gain it instead.


   // console.error(line);

    return line;
}


if (require.main === module) {



    let filename = "/tmp/master.txt";
    if (process.argv.length > 2) { filename = process.argv[2]; }

    let fs = require('fs');
    let thingy: string = "test";
    try {
        thingy = fs.readFileSync(filename, 'utf8');
    } catch (error) {
        //
    }

    //  let ccc:Card = new Card("");
    for (let line of thingy.split("\n")) {
        if (line.match(/When you would play this card, you may place specified cards from your hand.battle area under it. Each placed card reduces the play cost/i)) {
            continue;
        }
        if (line == "Ace") continue; // what does this keyword even mean?
        let [card, solid, atomics] = new_parse_line(line, undefined, 'test', false);

        if (parserdebug) logger.debug("=== " + line);

        if (parserdebug) logger.debug(card.toString());
        if (parserdebug) logger.debug(solid.toString());
        for (let i = 0; i < atomics.length; i++) {
            if (parserdebug) logger.debug(`ATOMIC ${i}: ` + atomics[i].toString());
        }


    }

    // Execute test code here
} else {
    if (parserdebug) logger.debug("newparser included as library");

    // Use your library code as needed
}
