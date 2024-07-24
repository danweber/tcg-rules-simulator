

declare global {
    interface String {
        after(s: string): string;
    }
}

let esc = "";
let red = esc + "[0;31m";
let normal = esc + "[0m";

let parserdebug = 1;


// The interesting parts of the parser only run at start-up. 
// If they hit an error, winston doesn't flush its logs.
// So we use the stupid console.logger, because we only need this 
// for debugging.

//import { createLogger } from "./logger";
//const logger = createLogger('newparser');

function do_log(...args: any[]): void { 
    //logger.info(...args);
}

const logger =  {
    silly: (...args: any[]) => do_log(...args),
    debug: (...args: any[]) => do_log(...args),
    info: (...args: any[]) => do_log(...args),
    warn: (...args: any[]) => do_log(...args),
}



String.prototype.after = function (s: string): string {
    return this.substring(this.indexOf(s) + s.length + 1).trim();
}


import { AtomicEffect, InterruptCondition, StatusCondition, SubEffect, ic_to_string } from "./effect";
import { EventCause, GameEvent, strToEvent } from "./event";
import { Game } from "./game";
import { GameTest, GameTestType, MultiTargetDesc, SpecialCard, SubTargetDesc, TargetDesc, TargetSource } from "./target";
import { Card, DigivolveCondition, KeywordArray } from "./card";
import { Phase, PhaseTrigger } from "./phase";
import { Location } from "./location";
import { KeyObject } from "crypto";
import { flatMap } from "lodash";


// These aren't used?
const RuleKeywords: string[] = [
    "DNA Digivolve",
    "DigiXros",
    "Digivolve",
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
    "[When Digivolving]",

    "[End of Attack]",     // after when digivolving
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
    "＜Barrier＞",
    "＜Collision＞",
    "＜Decoy .*＞",
    "＜Evade＞",
    "＜Fortitude＞",
    "＜Jamming＞",
    "＜Piercing＞",
    "＜Reboot＞",
    "＜Rush＞",
    // move to solid since it's a timing
    "＜Digisorption_-\\d＞", // this is an activation, maybe goes in cardskeywords?
    "＜Material Save \\d＞", 
    "＜Save＞",
    "＜Partition \\(.* + .*\\)＞",
    "＜Raid＞",
]

// things that are actions and need a trigger to go with them.
const AtomicKeywords: string[] = [
    "＜De-evolve.\\d＞",
//    "＜De-evolve\\d＞",
    "＜Blast evolve＞",
    "＜Draw.(\\d)＞",
    "＜Draw.\\(\\d\\)＞",
    "＜Digi-Burst \\d＞",
    "＜Mind Link＞", // trigger will be [main]
    "＜Recovery.+\\d.\\(Deck\\)＞",
    "＜Blitz＞",

    // burst digi probably goes into card rules    
    "＜Burst evolve: \\d from \\[.*?\\] by returning 1 \\[.*?\\] to hand. At the end of the burst evolution turn, trash this Monster's top card.＞",

];


export class Card2 {
    keywords: string[];
    name_rule?: string;
    trait_rule?: string;
    digixros?: string;
    overflow?: number;
    allow?: string;
    // these two are handled elsewhere
    evolve: string[]; // DigivolveCondition; // should be array
    dnaevolve?: string; // DNADigivolveCondition; // maybe not array?

    constructor() { this.evolve = []; this.keywords = []; };

    toString(short: boolean = false): string {
        let ret: string[] = ["Card:"]
        ret.push(...this.keywords);
        if (!short) {
            if (this.evolve.length > 0)
                ret.push("Digivolve from: " + this.evolve.join(" OR "));
            if (this.dnaevolve) ret.push("DNA Digivolve from: " + this.dnaevolve);
            if (this.name_rule) ret.push("Name: " + this.name_rule);
            if (this.trait_rule) ret.push("Trait: " + this.trait_rule);
            if (this.digixros) ret.push("Digixros: " + this.digixros);
            if (this.overflow) ret.push("Overflow: " + this.overflow);
            if (this.allow) ret.push("Allow: " + this.allow);
        } else {
            if (this.evolve) ret.push("Digivolve condition");
            if (this.dnaevolve) ret.push("DNA Digivolve condition");
            if (this.name_rule) ret.push("Name rule");
            if (this.name_rule) ret.push("Trait rule");
            if (this.digixros) ret.push("Digixros");
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

    line = line.replaceAll("digivolution", "evolution");
    line = line.replaceAll(/digivolve/ig, "evolve");
    line = line.replaceAll("digimon", "monster");
    line = line.replaceAll("Digimon", "Monster");

    line = line.replaceAll(/(＜.*＞.*)\s+\(.*\)/ig, '$1')

    let card2: Card2 = new Card2();
    let solid = new SolidEffect2();
    solid.label = label;
    logger.info("new parse line: " + line);

    let atomics: AtomicEffect2[] = [];
    line = line.trim();

    let m;

    ///////////////// CARD RULES

    // 0. keywords

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
            i = -1; // might have multiple
        }
    }

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

    // 2. dna digi conditions

    if (line.match(/^.?.?DNA_Evolve/)) {
        //      let d: DNADigivolveCondition = {};
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
        if (card) card.digixros = `Reduce by ${reduce} with ${sources}`;
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
                case "[Your Turn]": solid.whose_turn = "mine"; continue;
                case "[Opponent's Turn]": solid.whose_turn = "theirs"; continue;
                case "[Start of Your Main Phase]": solid.phase_trigger = PhaseTrigger.START_OF_YOUR_MAIN; continue;
                case "[End of Attack]": solid.phase_trigger = PhaseTrigger.END_OF_ATTACK; continue;
            }

            let cost: AtomicEffect2 = new AtomicEffect2();
            let t = new AtomicEffect2();


            switch (sword) {
                case "[When Digivolving]": on_self.ge = GameEvent.EVOLVE; break;
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
    if (m = line.match(/^by (.*?), (.*)/i)) {
        // where does the "cost / effect" logic go? 
        let [a1, l1] = parse_atomic(m[1], label);
        a1.is_cost = true;
        let [a2, l2] = parse_atomic(m[2], label);
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
        // 3 sentence, like giant missle
    }

    if (m = line.match(/^you may (.*?) to (.*)/i)) {
        // where does the "cost / effect" logic go? 
        let [a1, l1] = parse_atomic(m[1], label);
        a1.is_cost = true;
        let [a2, l2] = parse_atomic(m[2], label, solid);
        // we completely parsed the two clauses, suggesting this was a good match
        if (l1.length + l2.length == 0) {
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = "";
        } else {
            if (parserdebug) logger.debug("couldn't parse YOU MAY (x) TO (y)");
            // try something else
        }
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
        let [_atom, _line] = parse_atomic(line, label);
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
    if (m = line.match(/you have (.*?)( in play)?/i)) {
        return new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc(line));
        //        atomic.state_check = m[1];
    }

    if (m = line.match(/your opponent has/i)) {
        return new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc(line));
    }

    // while you have N (or more) cards in hand
    // while this monster has <Piercing>
    // while this monster is suspended
    // While your opponent has (2 or more Monster with no evolution cards) in play
    // while you have (a blue tamer) in play
    // while you have 3 or more memory
    // While there are 5 or more cards in your opponent's trash
    // While you have another Monster in play with the same name as this Monster


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



function parse_when(line: string): InterruptCondition {

    let m;

    // INTERRUPTIVE

    if (m = line.match(/one of your Monster would evolve into a (.*)/i)) {
        let int_digi: InterruptCondition = {
            ge: GameEvent.EVOLVE,
            td: new TargetDesc("your " + m[1]),
            cause: EventCause.ALL
        }
        return int_digi;
    }

    // non-interruptive


    if (m = line.match(/an opponent.s monster is deleted( in battle)?/i)) {
        let defeat_other: InterruptCondition = {
            ge: GameEvent.DELETE,
            td: new TargetDesc("your opponent's monster"),
            //            td: self
            //  cause: m[1] ? EventCause.NORMAL_BATTLE : undefined,
        };
        return defeat_other;
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

    if (m = line.match(/this monster attacks(.*)/i)) {
        let into = m[1];
        let my_td;
        if (into.match(/monster/i)) {
            my_td = new TargetDesc("monster");
        } else if (into.match(/(opponent|player)/i)) {
            my_td = new TargetDesc("opponent");
        } else {
            my_td = new TargetDesc("");
        }
        return {
            ge: GameEvent.ATTACK_DECLARE,
            td: my_td,
            source: new TargetDesc("self")
        }

    }

    // an effect suspends this Monster

    //one of your Monster is suspended by (an ＜Alliance＞) effect
    //   console.error(line);
    if (m = line.match(/one of your monster is suspended by an?( .Alliance.)? effect/i)) {
        let cause = m[1] ? EventCause.ALLIANCE : EventCause.EFFECT;
        return {
            ge: GameEvent.SUSPEND,
            td: new TargetDesc("your monster"),
            cause: cause
            // source: new TargetDesc("self")
        }
    }
    if (m = line.match(/an effect suspends one of your monster/i)) {
        let cause = EventCause.EFFECT;
        return {
            ge: GameEvent.SUSPEND,
            td: new TargetDesc("your monster"),
            cause: cause
            // source: new TargetDesc("self")
        }
    }



    if (m = line.match(/an effect suspends this monster/i)) {
        let into = m[1];
        let my_td = new TargetDesc("self");
        return {
            ge: GameEvent.SUSPEND,
            td: my_td,
            cause: EventCause.EFFECT
            // source: new TargetDesc("self")
        }
    }
    if (m = line.match(/this monster becomes suspended(.*)/i)) {
        let into = m[1];
        let my_td = new TargetDesc("self");
        return {
            ge: GameEvent.SUSPEND,
            td: my_td,
            // source: new TargetDesc("self")
        }
    }

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




    //////////////////////// CONDITIONS! The "if" clause could come before the keyword!

    // the number of cards in your security stack is less than or equal to your opponent's
    // you have 6 or less cards in your hand

    // cheating to put this here

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

    if (m = line.match(/you have (\d) or (fewer|less|more) cards in (your )?hand,(.*)/i)) {
        let size: number = parseInt(m[1]);
        let comp: string = m[2];
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('card check clause');
            if (!e.source) return false;
            let len = e.source.get_player().hand.length;
            if (parserdebug) logger.debug("HAND LENGTH IS " + len + " size is " + size);
            if (comp == "more") return len >= size;
            return (len <= size);
        };
        line = m[4];
    }
    // this is also a cheat
    if (m = line.match(/you have 2 memory or less(.*)/i)) {
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('mem check clause');
            if (!e.source) return false;
            let mem = e.source.get_player().game.get_memory();
            if (parserdebug) logger.debug("MEM  IS " + mem);
            return (mem <= 2);
        };
        line = m[1];
    }


    //    this effect deleted one of your Monster
    if (m = line.match(/this effect deleted one of your monster(.*)/i)) {
        // I think I
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('wendigo check, parserdebug ' + parserdebug);
            logger.debug('wendigo check clause');
            // if first effect was DELETE, was successful, and targeted me
            let w = e.effects[0].events[0];
            logger.debug("w ge is " + GameEvent[w.game_event]);
            logger.debug("e source is " + e.source);
            if (!e.source) return false;
            if (w.game_event != GameEvent.DELETE) return false;
            if (!w.chosen_target) return false;  // no target
            logger.debug("chosen target player is " + w.chosen_target.n_me_player);
            logger.debug("source player is " + e.source.get_n_player());
            if (w.chosen_target.n_me_player != e.source.get_n_player()) return false;
            console.error("assuming successful deletion for wendigo");
            return true;
        };
        line = m[1];
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





    for (let i = 0; i < AtomicKeywords.length; i++) {
        let aword = AtomicKeywords[i];
        let re = new RegExp("^\\s*" + aword.replaceAll(/[＜＞ _]/ig, "."));
        //        if (parserdebug) logger.debug(re);
        let m;
        if (m = line.match(re)) {
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

                //                upto       _    tgt     tgt     rest
                //                  1        [2]  3       4       5
                if (m = line.match(/(\d)[＞>](.*?)(\d|all)(.*?)\.(.*)/i)) {

                    // we need to match "<de-evolve #> X of target" with optional parens and period
                    //                   1       2     3   4    5 6       7
                    //     if (m = line.match(/(\d)[＞>](.*?)(\d)(.*?)(\((.*?)\))?(.*)/i)) {

                    //if (m = line.match(/(\d)[＞>](.*?)(\d)(.*?)[\.(](.*)/i)) {
                    //    if (m = line.match(/(\d)[＞>](.*?)(\(.*)/i)) {                    
                    if (parserdebug) logger.debug("ddddde-digi");
                    if (parserdebug) logger.debug(JSON.stringify(m));
                    thing.game_event = GameEvent.DEVOVLVE;
                    thing.n = parseInt(m[1]);
                    if (parserdebug) logger.debug("n mod is set");
                    thing.n_mod = "upto";
                    thing.n_max = parseInt(m[1]);
                    let filler = m[2];
                    thing.choose = parseInt(m[3]);
                    if (m[3] == "all") thing.choose = 50;
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

    //    1 of your Monster may evolve into a green Monster card in your hand
    //  for its evolution cost. When it would evolve by this effect, reduce the cost by 2.

    //you may evolve this Monster into a 2-color green card in your hand for its evolution cost. 
    //When this Monster would evolve with this effect, reduce the evolution cost by 2.
    let evosource = "";
    let digidest = "";
    let digicost = 0;
    let digireduced;
    let digiignore = false;
    let evofrom = "";
    //    console.error(line);

    let stat_cond: StatusCondition | null = null;

    // Search your security stack.
    //This Monster may evolve into a yellow Monster card with the [Vaccine] trait among them without paying the cost. 
     //This Monster may evolve into a yellow Monster card with the [Vaccine] trait among them without paying the cost
    // <alliance> boost : (should also say "from your hand or trash"
    if (m = line.match(/(.*)( may )?evolve(.*) into an? (.*) (in your hand|from your hand|among them) (without paying|for) .?.?.?( evolution)? cost.(.*)/i)) {
        let other = m[8];
        let reduce = other.match(/When (it|this Monster) would evolve ...?.? this effect, reduce the( evolution)? cost by (\d)/i);

        // X may evolve not handled here
        if (m[1] && !m[1].match(/you/i)) {
            evosource = m[1];
        } else {
            evosource = m[3];
        }
        digidest = m[4];
        let evofrom = m[6]; // from hand? from trash? from security
        if (reduce) digicost = parseInt(reduce[3]);
        if (parserdebug) logger.debug(`digisource <${evosource}> digidest <${digidest}> digicost <${digicost}>`);
        if (m[6] == "without paying") thing.n_mod = "free";
        line = "";
    }
    if (digidest) {
        thing.game_event = GameEvent.EVOLVE;
        // for .EVOLVE the "target" is the card.
        // I'm gonna need a special effect loop clause for this anyway.
        thing.choose = 1;
        thing.td = new TargetDesc(digidest);
        thing.td2 = new TargetDesc(evosource);
        thing.n = 0 + digicost;
        thing.cost_change = [];
        thing.cost_change.push({ n_mod: "reduced", n: digicost });
        //        thing.n_mod = "reduced";
        //      line = "";
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


    if (m = line.match(/reduce the evolution cost by (\d)\.?/)) {
        // we need to update the solid effect to say it modifies play cost
        if (!solid) {
            let b: any = null; b.no_solid();
        }
        thing.game_event = GameEvent.MODIFY_COST;
        thing.n = parseInt(m[1]);
        thing.n_mod = "reduced";
        line = "";
    }


    if (m = line.match(/plac..?.? this tamer and 1 (.*) and 1 (.*) from your trash.*?one of your (.*?).s bottom/i)) {
        logger.debug("bio merge");
        // like evolve, take_under needs 2 targets
        thing.game_event = GameEvent.DIGISOURCE_ADD;
        thing.td = new TargetDesc("1 of your [Terriermon]");
        thing.cause = EventCause.EFFECT;
        thing.choose = 1;
        // let stat_cond = null;
        line = "";
    }

    // Place this card under 1 of your green Monster.

    if (m = line.match(/place (this card) under 1 of (.*)/i)) {
        thing.game_event = GameEvent.DIGISOURCE_ADD;
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

    //    console.error(123123123);
    //  console.error(line);
    if (m = line.match(/Reveal the top card.? of your deck. If it is a (black card)?.*add it to your hand.*(Trash the rest)/i)) {
        //        console.error(m);
        // atomic.unused_search_choose = [];
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
        if (m[2].match(/1 (\w*) card/)) thing.choose = 1;

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
    let expiration = undefined;

    const for_the_turn_re = new RegExp("^(.*)for (the|this) turn.{0,2}$", "i");
    if (m = line.match(for_the_turn_re)) {
        expiration = { END_OF_TURN: "THIS" };
        //    if (parserdebug) logger.debug("EXPIRATION");
        //     if (parserdebug) logger.debug(expiration);

        line = m[1]
    } else if (m = line.match(/^(.*)until the end of( their| your opponent's)? turn,?(.*)$/i)) {
        //			if (parserdebug) logger.debug("UNTIL WHEN, EFFECT");
        expiration = { END_OF_TURN: m[2] ? "OPPONENT" : "YOUR" };
        line = m[1] + " " + m[3];
        //	if (parserdebug) logger.debug("UNTIL 2:" + effect);
        //    if (parserdebug) logger.debug("EXPIRATION");
        //    if (parserdebug) logger.debug(expiration);
    }
    if (expiration) { if (parserdebug) logger.debug("expiration"); if (parserdebug) logger.debug(JSON.stringify(expiration)); }
    // if (parserdebug) logger.debug("AFTER EXPIRY LINE IS " + line);


    //    if (parserdebug) logger.debug("RECURSIVE?: " + line);
    // since this is recursive it needs to be one of the first ones.
    if (m = line.match(/(.*)gains "(.*)"/i)) {
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
    if (m = line.match(/(.*)your opponent.s effects can.t delete (this Monster )or return it to the hand or deck(.*)/i)) {
        logger.warn("ignoring field-to-hand");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.immune = true;
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
        thing.immune = true;
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

    if (m = line.match(/(.*) is not affected.by your opponent.s monster.s effects/i)) {
        //			thing['game_event'] = GameEvent.ALL;
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.immune = true;
        thing.choose = 1; // we do need to target
        thing.td = new TargetDesc(m[1]);
        stat_cond = {
            s: {
                game_event: GameEvent.ALL,
                td: new TargetDesc("their monster"), // This may be the opposite of what I want
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

    // the (your)? here is entirely due to a typo on fandom
    if (m = line.match(/^Return (\d)(.*) from (your)?\s*trash.*hand/i)) {
        thing.choose = parseInt(m[1]);
        thing.game_event = GameEvent.TRASH_TO_HAND;
        thing.td = new TargetDesc(m[2] + " in your trash");
        line = "";
    }

    // the (your)? here is entirely due to a typo on fandom
    if (m = line.match(/^Return (\d) of(.*) to the bottom of the.?.? deck/i)) {
        thing.choose = parseInt(m[1]);
        thing.game_event = GameEvent.TO_BOTTOM_DECK;
        thing.td = new TargetDesc(m[2]);
        line = "";
    }

    // the (your)? here is entirely due to a typo on fandom
    if (m = line.match(/^Return (\d) of(.*) to its owner.s hand/i)) {
        thing.choose = parseInt(m[1]);
        // "reveal" is dumb, but does it work?
        thing.game_event = GameEvent.FIELD_TO_HAND;
        thing.td = new TargetDesc(m[2]);
        line = "";
    }



    line = line.trim();

    if (m = line.match(/trash the top card of their security stack/i)) {
        thing.game_event = GameEvent.CARD_REMOVE_FROM_HEALTH;
        // chosen_target should be a player
        cause: EventCause.EFFECT,
            thing.td = new TargetDesc("opponent");
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
        if (verb == "delete") {
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
    // I want to use "PLAY" here but I think I handle it some place else??
    for (let key of ["DELETE", "SUSPEND", "UNSUSPEND", "HATCH"]) {
        // easy keywords
        if (line.toUpperCase().startsWith(key)) {
            if (parserdebug) logger.debug("found simple verb: " + key);
            thing.game_event = strToEvent(key);
            if (m = line.match(/^\w+ (\d) of (.*?)(for each (.*))?$/i)) {
                // delete 2 of your opponent's monster
                thing.choose = parseInt(m[1]);
                thing.td = new TargetDesc(m[2]);
                if (m[3]) {
                    thing.n_mod = "foreach";
                    thing.n_target = new TargetDesc(m[4]);
                }
            } else {
                thing.choose = 1;
                let target = line.after(key);
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


    if (m = line.match(/(.*)(gain|lose) (\d+) memory(\s*for each)?/i)) {
        thing.game_event = GameEvent.MEMORY_CHANGE;
        thing.n = parseInt(m[3]);
        if (m[2].match(/lose/i)) thing.n = 0 - thing.n;
        if (m[4]) atomic.per_unit = true;
        line = m[1]
    }



    ///// MUST ATTACK
    if (m = line.match(/Attack with this monster/i)) {
        thing.game_event = GameEvent.MUST_ATTACK;
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
    //・You may play 1 [Terriermon]/[Lopmon] from your hand without paying the cost.

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

    //////// descriptives, subject-verb-object


    // How to handle "1 of your opponent's monster and all of their security monster"?

    if (m = line.match(/(.*)\s+(get|gain).?\s*([-0-9+]* DP(.*))/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        // having this out breaks blocker-dp-boost
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
        if (/^\d of/.test(target)) {
            thing.choose = parseInt(target[0]);
            target = target.substring(5);
        }
        if (target.startsWith("all of")) {
            thing.choose = 0;
            target = target.after("all of ");
        }

        if (split = line.match(/(.*) and (all of their security monster)/i)) {
            let target1 = split[1];
            let target2 = split[2];
            thing.td = new TargetDesc(target2);
            thing.choose = 0;
            proper_thing = thing;
            proper_thing.status_condition = stat_cond;
            atomic.subs.push(proper_thing);
            stat_cond = {
                s: {
                    game_event: GameEvent.DP_CHANGE,
                    n: parseInt(m[3]),
                    td: new TargetDesc(""), // I really need this to be optional
                    cause: EventCause.EFFECT
                },
                exp_description: expiration
            };
            thing = {
                game_event: GameEvent.GIVE_STATUS_CONDITION,
                td: new TargetDesc(target1), choose: 1, n: 1,
                immune: false,
                cause: EventCause.EFFECT,
                n_mod: "", n_max: 0
            };
        } else {
            thing.td = new TargetDesc(target);
        }
        line = m[4]
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


    if (m = line.match(/This monster ... evolve into an? \[(.*)\] in your hand for a memory cost of (\d). ignoring/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1;
        thing.td = new TargetDesc("self"),
            stat_cond = {
                s: {
                    game_event: GameEvent.MAY_DIGI_FROM,
                    n: parseInt(m[2]),
                    td: new TargetDesc("dummy"), // I really need this to be optional
                    cause: EventCause.EFFECT, // really?
                    n_mod: m[1]
                },
                exp_description: expiration
            };
        line = "";
    }

    if (m = line.match(/(This monster) can.t attack( players)?/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = 1;
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
        game_event: GameEvent.SUSPEND, n: 1,
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
