

import { SolidEffectLoop, SolidsToActivate } from './effectloop';
import { parse_detach } from './parse-actions';

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

function do_log_info(...args: any[]): void {
    //console.log(args);
    logger2.info(args.toString());
}
function do_log_warn(...args: any[]): void {
    //console.warn(args);
    logger2.warn(args.toString());
}
function do_log_error(...args: any[]): void {
    //console.error(args);
    logger2.error(args.toString());
}

const logger = {
    silly: (...args: any[]) => 1, // do_log(...args),
    debug: (...args: any[]) => 2, // do_log(...args),
    info: (...args: any[]) => do_log_info(...args),
    warn: (...args: any[]) => do_log_warn(...args),
    error: (...args: any[]) => do_log_error(...args)

}



String.prototype.after = function (s: string): string {

    let cap_this = this.toUpperCase();
    let cap_s = s.toUpperCase();
    let index = cap_this.indexOf(cap_s);
    if (index == -1) return this.toString();
    return this.substring(cap_this.indexOf(cap_s) + s.length + 0).trim();
}

import { AtomicEffect, InterruptCondition, Solid_is_triggered, StatusCondition, SubEffect, ic_to_plain_text, ic_to_string, ica_to_plain_text, ica_to_string, status_cond_to_string } from "./effect";
import { EventCause, GameEvent, strToEvent } from "./event";
import { ALL_OF, Conjunction, DynamicNumber, ForEachTarget, ForEachTargetCreator, GameTest, GameTestType, MultiTargetDesc, SingleGameTest, SpecialCard, SubTargetDesc, TargetDesc, TargetSource } from "./target";
import { Card, EvolveCondition, KeywordArray, parse_color } from "./card";
import { Phase, PhaseTrigger } from "./phase";
import { Location } from "./location";
import { parseStringEvoCond } from './parse-evocond';


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
    "[Security]",
    "[Health]",

    "[All Turns]",
    "[Your Turn]",
    "[Opponent's Turn]",

    "[Start of Your Turn]",
    "[Start of Opponent's Turn]",
    "[Start of Your Main Phase]",
    "[Start of Opponent's Main Phase]",

    "[Effect]", // dummy trigger
    "[On Play]",
    "[On Deletion]",
    "[When Attacking]",
    "[When Evolving]",
    "[When Linking]",

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
    // this should be removed from SolidKeywords
    //  "＜Delay＞", // description of timing????
    //  "＜Ice Clad＞", // description of timing



];

// These powers should be filed on the card, as they are constant
// static powers that always apply. They should never be "[On Play] <Blocker>" as that makes no sense.
const CardKeywords: string[] = [
    "＜Blocker＞",
    "＜Security Attack [-+]\\d＞",
    "＜Link [-+]\\d＞",
    //    "＜Collision＞",
    "＜Jamming＞",
    "＜Piercing＞",
    "＜Reboot＞",
    "＜Rush＞",

    //  "＜Absorption_-\\d＞", // this is an activation, maybe goes in cardskeywords?
    //  "＜Partition \\(.* + .*\\)＞",
]

// things that are actions and need a trigger to go with them.
const AtomicKeywords: string[] = [
    "＜De-evolve.?\\d＞",
    "＜Blast evolve＞",
    "＜Blast DNA evolve(.*?)＞",
    "＜Draw.(\\d)＞",
    "＜Draw.\\(\\d\\)＞",
    // "<Source-Burst \\d＞",
    "＜Recovery.+(\\d).\\(Deck\\)＞",
    //  "＜Delay＞", // this is a cost

    // burst evo probably goes into card rules    
    "＜Burst evolve: \\d from \\[.*?\\] by returning 1 \\[.*?\\] to hand. At the end of the burst evolution turn, trash this Monster's top card.＞",
];

function parse_number(input: string): number {
    if (!input) return 0;
    let i = input.toLowerCase();
    if (i == "all" || i == "any") return ALL_OF;
    if (i.startsWith("those")) return ALL_OF; // multiple IT
    return parseInt(input);
}

export class Card2 {
    keywords: string[];
    name_rule?: string;
    trait_rule?: string;
    stack_summon?: string;
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
            if (this.stack_summon) ret.push("StackSummon: " + this.stack_summon);
            if (this.overflow) ret.push("Overflow: " + this.overflow);
            if (this.allow) ret.push("Allow: " + this.allow);
        } else {
            if (this.evolve) ret.push("Evolve condition");
            if (this.dnaevolve) ret.push("DNA Evolve condition");
            if (this.name_rule) ret.push("Name rule");
            if (this.trait_rule) ret.push("Trait rule");
            if (this.stack_summon) ret.push("StackSummon");
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
    card_label: string;
    keywords: string[];
    once_per_turn?: boolean;
    main?: boolean;
    active_zone?: Location;
    interrupt?: InterruptCondition[]; // string; // fix grammer
    interrupt_text_almost_unused?: string;
    respond_to: InterruptCondition[] = [];
    phase_trigger?: PhaseTrigger;
    cancels?: boolean;
    interrupt_count: number = 0;
    rules: boolean = false;

    activate_main?: boolean; // look up the card's [main] for security. 
    effects: AtomicEffect[];

    //   solid2: SolidEffect2;
    //    atomics: AtomicEffect2[];

    source: TargetSource;
    whose_turn?: string;

    constructor() {
        this.keywords = [];
        this.source = null!;
        this.effects = [];
        this.raw_text = "";
        this.label = "";
        this.card_label = "uu?";
        //  this.solid2 = this;
        //this.atomics = [];
    }
    // once-per-turn function can't be put here because it's called
    // from SubEffect2 

    toPlainText(): string {
        let ret = this.keywords.join(" ");
        if (this.interrupt) {
            ret += "Interrupt: " + ica_to_plain_text(this.interrupt);
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
        if (this.interrupt) ret.push("Interrupts: " + ica_to_string(this.interrupt));
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

    is_cost: number = 0;
    test_condition?: GameTest;
    flags?: any; // catch-all 
    per_unit?: boolean;
    per_unit_test?: TargetDesc;
    weirdo: SubEffect;
    optional: boolean;
    ask_other?: boolean; // other player decides if it's optional
    can_activate?: (arg: SolidEffect2, l?: SolidEffectLoop) => boolean;
    source?: TargetSource;

    search_n?: number; // how many cards to reveal for search
    search_multitarget?: MultiTargetDesc;
    search_final?: Location; // where they go at the end

    see_security?: boolean; // should this have other things I can see?
    sta?: SolidsToActivate;

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
        if (this.test_condition) ret.push(`If ${this.test_condition.toPlainText()} exists,`);

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
                if (sub.status_condition) {
                    for (sc of sub.status_condition) {
                        r += "(" + GameEvent[sc.s.game_event] + " " + sc.s.n;
                        if (sc.s.immune) r += "immune ";
                        r += "<" + sc.s.td.toString() + ">";
                        if (sc.solid) r += "{" + sc.solid.toString() + "}";
                        r += ")";
                    }
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
            if (sub.n_mod) r += `(${sub.n_mod}) `;
            if (sub.status_condition)
                for (let sc of sub.status_condition) {
                    r += "(" + GameEvent[sc.s.game_event] + " " + sc.s.n;
                    if (sc.s.immune) r += "immune ";
                    r += "<" + sc.s.td.toString() + ">";
                    if (sc.solid) r += "{" + sc.solid.map(s => s.label).join(",") + "}";
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

function oldStyleCost(sentence: boolean) {


}

function splitParagraph(paragraph: string): string[] {
    let sentences = [];
    let currentSentence = '';
    let inQuotes = false;
    let escapeNext = false;
    let i = 0;

    while (i < paragraph.length) {
        let char = paragraph[i];

        if (char === '"' && !escapeNext) {
            inQuotes = !inQuotes;
        }

        if (char === '\\' && !escapeNext) {
            escapeNext = true;
        } else {
            escapeNext = false;
        }

        if (char === '.' && !inQuotes && (i + 1 < paragraph.length && paragraph[i + 1] === ' ')) {
            sentences.push(currentSentence.trim() + '.');
            currentSentence = '';
            i++; // Skip the space after the period
        } else {
            currentSentence += char;
        }

        i++;
    }

    if (currentSentence.trim()) {
        sentences.push(currentSentence.trim());
    }

    return sentences;
}


function s1litParagraph(paragraph: string): string[] {
    //    const sentenceEndings = /(?<!\.\.\.)(?<![a-zA-Z]\.\s)(?<!\.\'\"\")\./;
    let sentences = [];
    let currentSentence = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let char of paragraph) {
        if (char === '"' && !escapeNext) {
            inQuotes = !inQuotes;
        }
        if (char === '\\' && !escapeNext) {
            escapeNext = true;
        } else {
            escapeNext = false;
        }
        if (char === '.' && !inQuotes) {
            sentences.push(currentSentence.trim() + '.');
            currentSentence = '';
        } else {
            currentSentence += char;
        }
    }

    if (currentSentence.trim()) {
        sentences.push(currentSentence.trim());
    }

    return sentences;
}



// If "inherited" then populate the inherited keywords of cards, otherwise populate main text.
// Returns card, solideffect, array of atomiceffect, as well as the unparsed text.
export function new_parse_line(line: string, card: (Card | undefined), label: string, kind: "main" | "inherited" | "link" | "security"): [Card2, SolidEffect2, AtomicEffect2[], string] {


    line = Translator.text(line);
    // should we fill in missing keywords here?

    let card2: Card2 = new Card2();
    let solid = new SolidEffect2();
    solid.label = label;
    solid.card_label = card ? card.card_id : "...";
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
            if (kind === "security") console.error(437, kind);

            if (card) {
                let ptr = (kind === "inherited") ? card.card_inherited_keywords :
                    (kind === "link" ? card.card_linked_keywords : card.card_keywords);
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

    let keyword;
    [line, keyword] = Translator.check_for_keywords(line, SolidKeywords, (AtomicKeywords).concat(CardKeywords))
    if (card && keyword) {
        if (kind === "security") console.error(462, kind);
        let ptr = (kind === "inherited") ? card.card_inherited_keywords :
            (kind === "link" ? card.card_linked_keywords : card.card_keywords);
        ptr[keyword.replaceAll(/[＜＞_]/g, " ")] = keyword;
    }
    logger.warn("ignoring " + keyword);



    // 1. alt evolution DESTINATION conditions, what this card can evo on top of

    if (line.match(/^.?.?Evolve/i)) {
        if (card) card.UNUSEDevolve.push(line.after("]"));
        // mastergame will parse the evo text
        line = "";
    }
    if (m = line.match(/^You may evolve this card from your hand onto one of your(.*)/i)) {
        card?.UNUSEDevolve.push(m[1]);
        line = "";
    }

    // Your Monster with [xxx] in_its_name can evolve into this card in your hand
    //       for a cost of 3, ignoring evolution requirements.
    // Your [yyy] can evolve into this card in your hand for a memory cost of 7,
    //       ignoring this card's evolution requirements.

    //     if (m = line.match(/Your ([\[\]a-z_ ]*) can evolve into this card in your hand(.*),.?.?.?(ignoring( this card's)? evolution requirements).?.?.?$/i)) {

    // does the "condition" belong here? 

    if (m = line.match(/^((if|while) (.*))?(one of )?your (.*) (can|may) evolve into this card in your hand(.*),\s*(ignoring( this card's)? evolution requirements)?/i)) {
        logger.error("using unused data structure");
        // wtf is this block for

        let condition = m[3]
        let source = m[5];
        let cost = m[7];
        let ignore = !!m[8];
        card?.UNUSEDevolve.push(`Source: [${source}] Cost:[${cost}] Ignore:[${ignore}]`);
        line = "";
    }

    // 2. dna evo conditions

    // eat the extra fields that showed up around December 9th
    if (m = line.match(/^.?.?DNA.Evolve\](.*?)(Evolve unsuspended)/i)) {
        logger.error("UNUSED");
        if (card) card.dnaevolve = m[2].trim();
        line = "";
    }
    // The name of this card/Monster is also treated as [AAA]/[BBB].
    // The name of this card/Tamer is also treated as [AAA]/[BBB].
    // [Rule] Name: Also treated as [AAA]/[BBBB].
    // This card is also treated as having [Plug-CCC] in_its_name. While you have a Tamer in play, you may use this card without meeting its color requirements.
    // This card/Monster is also treated as if it's [XXX]/[YYY].
    // This card/Monster is also treated as if its's [XXX]. // its's, really?
    // This card/Monster is also treated as having the [YY] trait.

    // 3. alt name and traits


    if (line.match(/^.?.?Rule.?.?.?Name:/) || line.match(/^.?The name of this/i)) {
        //if (d) if (parserdebug) logger.debug("name match")
        if (card) card.name_rule = line.after("also");
        line = "";
    }
    if (line.match(/^.?.?Rule.?.?.?Trait:/i)) {
        if (card) card.trait_rule = line.after("Trait: ");
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
        } else if (m = phrase.match(/as (having .*\s*in.(?:its.)?name)/i)) {
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

    // [a] x [b] x [c]  -> grab (up to) all
    // [a] / [b] / [c]  -> just 1, so just say limit 1
    // this will break on [a]/[b] x [c]/[d]
    if (m = line.match(/^.?.?DigiXros -(\d)/i)) {
        let reduce = parseInt(m[1]);
        let sources = line.after("]").trim();
        if (card) {
            logger.error("stack summon parsing from text not well-tested"); // see Card.parse_stack_summon()
            let n;
            if (n = line.match(/^(\d+|∞)\s*(.*)/)) {
                card.stack_summon_limit = parseInt(n[1]);
                line = n[2];
            }
            card.stack_summon_n = reduce;
            card.stack_summon_list = sources.split(" x "); // maybe unused
        }
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

    // 
    if (m = line.match(/^(If|While) (.*), you (can|may) (.*ignore.*)/i)) {
        if (card) card.allow = parse_if(m[2]);
        line = "";
    }
    if (m = line.match(/^(.*) also meets this card.s color requirement/i)) {
        if (card) card.color_allow = parse_color(m[1]);
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
            logger.info(`sword is ${sword} line is ${line}`);
            let self = new TargetDesc("self");
            let on_self: InterruptCondition = {
                ge: GameEvent.NIL,
                td: self
            };
            switch (sword) {
                // hope this [security] doesn't collide with the other
                case "[Health]":
                case "[Security]": solid.active_zone = Location.SECURITY; continue;
                case "[Hand]": solid.active_zone = Location.HAND; continue;
                case "[Trash]": solid.active_zone = Location.TRASH; continue;
                case "[Breeding]": solid.active_zone = Location.EGGZONE; continue;

                case "[Main]": solid.main = true; continue;
                case "[Once Per Turn]": solid.once_per_turn = true; continue;

                case "[Start of Your Turn]": solid.phase_trigger = PhaseTrigger.START_OF_YOUR_TURN; continue;
                case "[Start of Your Opponent's Turn]": solid.phase_trigger = PhaseTrigger.START_OF_OPPONENTS_TURN; continue;
                case "[Start of All Turns]": solid.phase_trigger = PhaseTrigger.START_OF_ALL_TURNS; continue;

                case "[End of Your Turn]": solid.phase_trigger = PhaseTrigger.END_OF_YOUR_TURN; continue;
                case "[End of Opponent's Turn]": solid.phase_trigger = PhaseTrigger.END_OF_OPPONENTS_TURN; continue;
                case "[End of All Turns]": solid.phase_trigger = PhaseTrigger.END_OF_ALL_TURNS; continue;

                case "[Your Turn]": solid.whose_turn = "mine"; continue;
                case "[Opponent's Turn]": solid.whose_turn = "theirs"; continue;
                case "[Start of Your Main Phase]": solid.phase_trigger = PhaseTrigger.START_OF_YOUR_MAIN; continue;
                case "[Start of Opponent's Main Phase]": solid.phase_trigger = PhaseTrigger.START_OF_OPPONENTS_MAIN; continue;
                case "[End of Attack]": solid.phase_trigger = PhaseTrigger.END_OF_ATTACK; continue;

            }

            let cost: AtomicEffect2 = new AtomicEffect2();
            let t = new AtomicEffect2();


            switch (sword) {
                case "[Effect]": on_self.ge = GameEvent.ACTIVATE; break; // should never hit
                case "[When Evolving]": on_self.ge = GameEvent.EVOLVE; break;
                case "[When Linking]": on_self.ge = GameEvent.PLUG;
                    on_self.td = new TargetDesc("this card"); // odd, this is card or instance
                    break;
                    break;
                case "[On Play]": on_self.ge = GameEvent.PLAY; break;
                case "[On Deletion]": on_self.ge = GameEvent.DELETE; break;
                // TODO: no hard-coding keywords
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
                        cause: EventCause.EFFECT,
                        choose: new DynamicNumber(1),
                    }; // trash_top_card_of_this_monster:
                    cost.optional = true;
                    cost.events = [trash_top];
                    cost.weirdo = trash_top;
                    cost.is_cost = 1;
                    let canceller: SubEffect = {
                        game_event: GameEvent.CANCEL,
                        label: "cancel deletion",
                        td: new TargetDesc("self"),
                        cause: EventCause.EFFECT
                    };
                    solid.raw_text = "Armor Purge";
                    solid.interrupt = [trigger];
                    solid.cancels = true;
                    solid.effects = [cost];

                    let second = new AtomicEffect2();
                    second.optional = false; // saving isn't optional once we purge
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

    [line, keyword] = Translator.check_for_keywords(line, SolidKeywords, AtomicKeywords.concat(CardKeywords))

    if (keyword) solid.keywords.push(keyword);



    if (m = line.match(/^\s*\(.*?\)\s*(.*)$/i)) {
        // eat parentheses explanations. does this belong in the loop
        line = m[1];
    }

    // this special case should be handled by the new .ACTIVATE code
    if (line.match(/^\s*Activate this card.?.?.?.??Main.?.?.? effect\.?\s*$/i)) {
        solid.activate_main = true;
        line = "";
    }



    // Interruptive on play/use/evolve of THIS CARD


    // look for "it" clauses, and replace with last known noun phrase
    line = replace_it(line);


    // we don't have a trigger yet, so "at" can be our trigger
    if (!Solid_is_triggered(solid) && !solid.keywords.includes("[Security]")) {
        if (m = line.match(/^(At .*?),(.*)/)) {
            let at = parse_at(m[1]);
            if (at) solid.phase_trigger = at.phase;

            line = m[2];
        }
    }

    // I believe this sepecific line is needed for "when dna evolving:"
    if (!Solid_is_triggered(solid) && !solid.keywords.includes("[Security]")) {
        //// RESPONDS TO! all "WHEN" stuff should be here
        if (m = line.match(/^When (.*?),(.*)/)) {
            logger.info("line is " + line);
            // "when ... this card ...," is probably an interrupt on the play/use/evo of this card
            if (m[1].includes("this card")) {
                logger.warn("play interrupt " + m[1]);
                // I need to flag that this effect is present before an instance is made
                // ... is there any cardlocation that interrupts play *besides* self?
                card!.play_interrupt = solid;
                logger.warn(`XYZ card is ${card!.get_name()} solid is ${solid.label}`);
            }
            let when: InterruptCondition[] = parse_when(m[1], solid);
            logger.info("PARSE_WHEN " + when.toString());
            line = m[2];
            if (m[1].match(/would/i)) {
                solid.interrupt = when;
            } else {
                if (parserdebug) logger.debug("SET RESPOND TO ON 2 " + when);
                solid.respond_to.push(...when);
            }
            if (parserdebug) logger.debug("WHEN text:" + m[1] + ". Then I got back:");
            if (parserdebug) logger.debug(ica_to_string(when));
        }
    }


    line = line.trim();
    ///////////////// BREAKING INTO ATOMIC EFFECTS
    if (line[line.length - 1] != ".")
        line += "."

    /*
    


    // X. For each Z, mod X effect.
    // Y. X For each Z, mod X effect.
    // If the next sentence starts with "For each" it's probably modifying the previous sentence.
    //                   123              45                   6          7
    if (m = line.match(/^((([^.]*?).))?\s*(([^.]*?).\s*For each([^.]*?)\.)(.*)/)) {
        logger.info("for each looking backwards: " + m[1]);
        line = "";
        if (m[1]) { // does "Y" sentence exist.
            let [a0, l0] = parse_atomic(m[1], label, solid, card);
            atomics.push(a0);
            line = l0;
        }
        let [a1, l1] = parse_atomic(m[4], label, solid, card); // "X" sentence, 
        atomics.push(a1);
        line += " " + l1;
        // See if there's a second part.
        if (m[4] && m[4].length > 2) {
            let [a2, l2] = parse_atomic(m[4], label, solid, card);
            atomics.push(a2);
            line += " " + l2;
        }
        line = line.trim();
    }

    */


    if (m = line.match(/Burst Evolve: (\d) from \[(.*)\] by returning 1 \[(.*)\]/i)) {
        // this is handled elsewhere? or not for this kind of card?
    }







    // search W, you may X from it. If you did, Y. Then, Z.
    // we should be able to pull this clause out and then do the test.
    if (m = line.match(/^\s*(Search your security stack).\s*(?:and)?\s*(.*)\.(.*)\.\s*Then\s*(.*)/i)) {
        // if i push, they end up in the wrong order. darn.
        logger.info("split: searcher");
        let [a1,] = parse_atomic(m[1], label, solid, card);
        let [a2,] = parse_atomic(m[2], label, solid, card);
        let [a3,] = parse_atomic(m[3], label, solid, card);
        let [a4,] = parse_atomic(m[4], label, solid, card);
        atomics.push(a4, a3, a2, a1);
        //      atomics.push(a1);
        //       line = "";
        //       line = m[2];
        line = "";
    }


    // new style.
    // 1. split into sentences.
    // 2. if two sentences need to be merged 
    logger.info("before: " + line);

    /*
    if (m = line.match(/(Reveal.*\.) Then, (.*)/)) {
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = "";
    }*/

    //    let grammared = parseStringEvoCond(line, "SolidEffect");
    //  if (grammared) {


    if (line.includes("would next")) {
        let grammared = parseStringEvoCond(line, "EffSentence");
        if (grammared) {
            line = grammared.rendered;
        }
    }

    // "Monster/" indicates token
    if (line.includes("Delay")) {
        let grammared = parseStringEvoCond(line, "EffSentence");
        if (grammared) {
            logger.info("super new split: DELAY GRAM " + line);

            if (m = line.match("(.*＜Delay＞).(・.*)")) {
                logger.info("super new split: Delay＞ do X.");

                const clause1 = (m[1]).trim();
                const clause2 = m[2].trim();
                let [a1, l1] = parse_atomic(clause1, label, solid, card);
                let [a2, l2] = parse_atomic("Activate the effect below:" + clause2, label, solid, card);
                a1.is_cost = 1;
                a1.optional = true;
                atomics.push(a1, a2);
                solid.effects.push(a1, a2);

                logger.info("SDa1 " + a1.events.map(x => GameEvent[x.game_event]).join(","));
                logger.info("SDa2 " + a2.events.map(x => GameEvent[x.game_event]).join(","));


                // by tradition, this is just a single thing
                line = "";
            }
        }
    }

    // try an early parse. TODO: move as much in here as we can, for now limit to tokens

        if (line.includes("Monster/")) {
        console.error(997, line);
        let grammared = parseStringEvoCond(line, "EffSentence");
        if (grammared) {
            console.error(1000, grammared);
            logger.info("super new split: FULL PARSE " + line);


                let [a1, l1] = parse_atomic(line, label, solid, card, {}, grammared);
                atomics.push(a1);
                solid.effects.push(a1);
                logger.info("SDa1 " + a1.events.map(x => GameEvent[x.game_event]).join(","));
                // by tradition, this is just a single thing
                line = "";
            }
        }


    const sentences: string[] =
        //line.startsWith("Reveal") ? [line] : 
        splitParagraph(line);
    // for now, skip searchers

    // see if the next sentence should be merged
    for (let n = 0; n < sentences.length - 1; n++) {
        let next_sentence = sentences[n + 1];
        let merge = false;
        if (sentences[n].includes("Delay")) merge = true;
        // Play a N cost. For each X, increase N by 2.
        if (next_sentence.includes("increase")) merge = true;

        // more generic "For each" or "For every" assuming it always modifies the prior thing
        //        if (next_sentence.startsWith("For every") || next_sentence.startsWith("For each")) merge = true;


        // when it would evo by this effect, reduce the cost by 2
        // technically, the second clause interrupts the first? 
        if (next_sentence.includes("reduce")) merge = true;
        // With this effect it can attack the turn it was played
        if (next_sentence.includes("With this effect")) merge = true;
        // For each X, add 2 to N.
        if (next_sentence.match(/add \d/)) merge = true;

        if (merge) {
            sentences[n] += " " + next_sentence;
            sentences[n + 1] = "";
        }
    }

    for (let n = sentences.length - 1; n >= 0; n--) {
        if (sentences[n].length < 3) {
            sentences.splice(n, 1);
        }
    }
    for (let n = 0; n < sentences.length; n++) {
        logger.info(`sentence ${n} ${sentences[n]}`);
        //   console.error(n, sentences[n]);
    }

    if (true) {
        for (let sentence of sentences) {
            let firstsentence = sentence.split(". ")[0];

            // eat "Then,"
            if (m = sentence.match(/(?:Then)?,? ?(.*)/)) {
                sentence = m[1];
            } else {
                console.error("how did this not match?");
            }
            logger.info("new split: " + sentence);
            // break up two atomics in a sentence. (not accounting for IF)

            // nearly obsolete
            if (m = /*first*/sentence.match("(＜Delay＞).(・.*)")) {
                logger.info("new split: Delay＞ do X.");
                const clause1 = (m[1]).trim();
                const clause2 = m[2].trim();
                let [a1, l1] = parse_atomic(clause1, label, solid, card);
                let [a2, l2] = parse_atomic("Activate the effect below:" + clause2, label, solid, card);
                a1.is_cost = 1;
                a1.optional = true;
                atomics.push(a1, a2);
                solid.effects.push(a1, a2);

                logger.info("Da1 " + a1.events.map(x => GameEvent[x.game_event]).join(","));
                logger.info("Da2 " + a2.events.map(x => GameEvent[x.game_event]).join(","));

                continue;

            }

            // making clauses like this sucks ⚪s
            if (true)
                if (m = firstsentence.match(/^(At|The next time) (.*)/i)) {
                    // for some fun, get the grammar to realize this is a nested effect 
                    logger.info("new split: At The Next time");
                    const clause1 = (m[0]).trim();
                    let [a1, l1] = parse_atomic(clause1, label, solid, card);
                    atomics.push(a1);
                    solid.effects.push(a1);
                    continue;


                }

            // (if/while...) by Y, Z. 
            // use first sentence so we don't eat a by in the second
            if (m = firstsentence.match(/(.*)(by .*?), (.*)/i)) {
                if (m[1].length < 2 || m[1].match(/,\s+$/)) {
                    if (m = sentence.match(/(.*by .*?), (.*)/i)) {

                        const clause1 = (m[1]).trim();
                        // this isn't a complete sentence so EffSentence shouldn't hit it, but 
                        // we handle treating "deleting 1 monster" as a proper English.
                        let grammared = parseStringEvoCond(clause1, "EffSentence");
                        if (grammared) {
                            // MOSTLY DUPED from other "grammared.effect.forEach"
                            grammared.effect.forEach((fx: any, index: number) => {
                                let temp_grammar = { ...grammared };
                                temp_grammar.effect = [fx];
                                let pmay = index > 0 ? { previous_may: true } : {};
                                let [a1, l1] = parse_atomic(fx.raw_text, label, solid, card, pmay, temp_grammar);
                                // assume they must all point to the same target1
                                if (false && index > 0) {
                                    a1.weirdo.td = new MultiTargetDesc("it");
                                    a1.events[0].td = new MultiTargetDesc("it");
                                }
                                a1.is_cost = grammared.effect.length - index;
                                a1.optional = true;
                                atomics.push(a1);
                                solid.effects.push(a1);
                            })

                        } else {
                            let [a1, l1] = parse_atomic(clause1, label, solid, card);
                            logger.info("a1 " + a1.events.map(x => GameEvent[x.game_event]).join(","));
                            a1.is_cost = 1;
                            a1.optional = true;
                            atomics.push(a1);
                            solid.effects.push(a1);
                        }

                        const clause2 = m[2].trim();
                        let [a2, l2] = parse_atomic(clause2, label, solid, card);
                        logger.info("new split: cost. By X, Y.");
                        logger.info("a2 " + a2.events.map(x => GameEvent[x.game_event]).join(","));
                        if (a2.events[0].game_event == GameEvent.CANCEL) {
                            logger.info("is a canceller");
                            solid.cancels = true;
                        }
                        atomics.push(a2);
                        solid.effects.push(a2);

                        continue;
                    }
                }
            }

            // old style cost
            if (m = sentence.match(/you may ([^.]*?) to (.*)\./i)) {
                logger.info("new split: old style cost?");

                let [a1, l1] = parse_atomic(m[1], label, solid, card);
                a1.is_cost = 1;
                a1.optional = true;
                let [a2, l2] = parse_atomic(m[2], label, solid, card);
                if (a2.events[0].game_event == GameEvent.CANCEL)
                    solid.cancels = true;

                // we completely parsed the two clauses, suggesting this was a good match
                if (l1.length + l2.length == 0) {
                    logger.info("new split: yes, old style cost");
                    atomics.push(a1, a2);
                    solid.effects.push(a1, a2);
                    continue;
                } else {
                    logger.info("new split: no, couldn't parse");
                    // BUG: parse_atomic has side effects; did we undo them?
                    if (parserdebug) logger.info("couldn't parse YOU MAY (x) TO (y)");
                    // try something else
                }
            }

            // before the below suckage, give the grammar a chance
            //console.error(1162, sentence);
            let grammared = parseStringEvoCond(sentence, "EffSentence");
            if (grammared) {
                logger.info("new split: EffSentence match, atomic count is " + grammared.effect.length);
                // not everything that gets parsed here is necessarily going to have a vald tree
                // we end up reparsing the sentence needlessly
                // if (grammared.effect.length > 1) console.error(1168, grammared);
                // DUPED to other grammared.effect.forEach
                grammared.effect.forEach((fx: any, index: number) => {
                    //console.error(1198, "index", index);
                    let temp_grammar = { ...grammared };
                    temp_grammar.effect = [fx];
                    let pif = index > 0 ? { previous_if: true } : {};
                    //console.error(1202, temp_grammar);
                    let [a1, l1] = parse_atomic(sentence, label, solid, card, pif, temp_grammar);
                    // assume they must all point to the same target1
                    if (false && index > 0) {
                        a1.weirdo.td = new MultiTargetDesc("it");
                        a1.events[0].td = new MultiTargetDesc("it");
                    }
                    atomics.push(a1);
                    solid.effects.push(a1);
                })
                continue;
            }


            if (false && grammared) {
                logger.info("new split: EffSentence match");

                // we end up reparsing the sentence needlessly
                let [a1, l1] = parse_atomic(sentence, label, solid, card);
                atomics.push(a1);
                solid.effects.push(a1);
                continue;
            }





            // 
            if (m = sentence.match(/(.*) , and (.*)\./i)) {
                logger.info("new split: bogus space-comma-space-and");
                let [a1, l1] = parse_atomic(m[1], label, solid, card);
                let [a2, l2] = parse_atomic(m[2], label, solid, card);
                atomics.push(a1, a2);
                solid.effects.push(a1, a2);
                continue;
            }
            if (m = sentence.match(/(for the turn,)?\s*(this monster )(.*),? and (.*?)( for the turn)?\./i)) {
                let time = m[1] || m[5];
                if (time) {
                    logger.info("new split: trying an internal split");
                    // This has problems, but is the skeleton to use for otyher things.
                    // What it gets right: "for the turn, this monsters "EFFECT" and "EFFECT"
                    // What gets wrong:
                    //  * only "for the turn"
                    //  * no good reason to limit to "this monster"
                    //  * "Thing GAINS X AND Y" becomes "Thing GAINS X" and "Thing Y"
                    //  * Doesn't check for successful parsing
                    let left = m[2] + m[3] + " " + time;
                    let right = m[2] + m[4] + " " + time;
                    logger.info(`left is ${left} and right is ${right}`);
                    let [a1, l1] = parse_atomic(left, label, solid, card);
                    let [a2, l2] = parse_atomic(right, label, solid, card);
                    atomics.push(a1, a2);
                    solid.effects.push(a1, a2);
                    continue;
                }
            }

            let clause1, clause2, previous_if = false;
            // <keyword> and other thing
            // we don't need the comma here but some bad translations have them
            if (m = sentence.match(/^(.*)(＜.*?＞)[,\s]*(and|then) (.*)/i)) {
                const prelude = m[1];
                // what could be in prelude besides an "if"? 
                // we already ate "WHEN""
                previous_if = !!prelude.match(/if /i);
                if (prelude.length < 2 || prelude.match(/,\s+$/) &&
                    //    !(prelude.match(/n't/))
                    true
                ) {
                    // bad, we can't handle negative checks, punt to atomic to handle it
                    clause1 = prelude + m[2];
                    clause2 = m[4];
                    logger.info("new split: keyword and Y.");
                }
            }

            // other thing and <keyword>. Omitting "if" clauses here. Also trim to a shorter length
            // so we don't eat "give this instance <Keyword> and <Keyword>"
            if (m = sentence.match(/^((?:If(.*?),)?.{1,30}) and (＜.*?＞)\.?/i)) {
                clause1 = m[1];
                clause2 = m[3];
                previous_if = !!clause1.match(/if /i);
                logger.info("new split: Y and keyword");
            }

            // just 1 card needs this?
            if (m = sentence.match(/^(.*), then (.*)/i)) {
                //       console.error(m);
                clause1 = m[1];
                clause2 = m[2];
                previous_if = !!clause1.match(/if /i);
                logger.info("new split: X then Y in one sentence");
            }
            // using previous_if is bad.
            // I should have an array of atomics that all chain from one if
            if (clause1 && clause2) {
                logger.info(1121, previous_if, clause2, clause1);
                let [a1, l1] = parse_atomic(clause1, label, solid, card);
                let [a2, l2] = parse_atomic(clause2, label, solid, card, { previous_if: previous_if }); // not independent!        
                atomics.push(a1, a2);
                solid.effects.push(a1, a2);
                continue;
            }

            let [a, l] = parse_atomic(sentence, label, solid, card);
            atomics.push(a);
            solid.effects.push(a);
        }
        line = "";
    }

    // distinguish
    // 1. X. For each Y, modify X.
    // 2. X. For each Y, Z.
    // first is one atomic. second is two atomics.


    // If the next sentence starts with "For each" OR has the word "INCREASE" it's probably modifying the previous sentence.
    //                   12             34                   5          6
    let look_backwards;
    // X. Y. Foreach, modify y.
    let modify_test = false;
    if (m = line.match(/^(([^.]+?)\.\s)?(([^.]*?).\s*For each([^.]*?)\.)(.*)/)) {
        if (m[5].includes("add") || m[5].includes("increase")) modify_test = true;
        if (modify_test) {
            look_backwards = m;
        }
    }
    if (!look_backwards) {
        // X. If y, modify X.    34
        if (m = line.match(/^()()(([^.]*?).\s*([^.]*increase[^.]*)\.)(.*)/)) {
            modify_test = true;
            if (modify_test) {
                look_backwards = m;
            }
        }
    }
    if (look_backwards) {
        m = look_backwards;
        logger.info("split: for each looking backwards: " + m[1]);
        line = "";
        if (m[1]) { // does "Y" sentence exist.
            let [a0, l0] = parse_atomic(m[1], label, solid, card);
            atomics.push(a0); // I'm pushing this in first!!!
            line = l0;
        }
        let [a1, l1] = parse_atomic(m[3], label, solid, card);
        atomics.push(a1);
        line += " " + l1;
        // See if there's a second part.
        if (m[6] && m[4].length > 2) {
            let [a2, l2] = parse_atomic(m[6], label, solid, card);
            atomics.push(a2);
            line += " " + l2;
        }
        atomics.reverse(); // the reversings of order-of-effect will continue until morale improves
        line = line.trim();
    }


    // (if X), by Y, Z. This one was tricky.  We need to split into atomics yet keep the if-clause.
    if (m = line.match(/^(?:If (.*),)?\s*by (.*?), (.*?)\.(.*)/i)) {
        // where does the "cost / effect" logic go? 
        logger.info("split: (if X,) by Y, Z.");
        let [a1, l1] = parse_atomic(m[2], label, solid, card);
        a1.is_cost = 1;
        a1.optional = true;
        if (m[1]) a1.test_condition = parse_if(m[1]);
        let [a2, l2] = parse_atomic(m[3], label, solid, card);
        // todo: have a cancels? flag on the atomic
        if (a2.events[0].game_event == GameEvent.CANCEL) {
            logger.info("is a canceller");
            solid.cancels = true;
        }
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2 + " " + m[4];
    }

    if (false)
        if (m = line.match(/^you may ([^.]*?) to (.*?)\.(.*)/i)) {
            logger.info("split: old style cost");
            // where does the "cost / effect" logic go? 
            let [a1, l1] = parse_atomic(m[1], label, solid, card);
            a1.is_cost = 1;
            let [a2, l2] = parse_atomic(m[2], label, solid, card);
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
        logger.info("split: trying an internal split");
        if (!m[1] && !m[5]) {
            logger.info("neither turn clause");
        } else {
            let time = m[1] || m[5];
            let left = m[2] + m[3] + " " + time;
            let right = m[2] + m[4] + " " + time;
            logger.info(`left is ${left} and right is ${right}`);
            let [a1, l1] = parse_atomic(left, label, solid, card);
            let [a2, l2] = parse_atomic(right, label, solid, card);
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = l1 + " " + l2;
        }
        // just a 2 secntence thing
    }

    // "X. If you did, Y, then Z." <-- not here. 
    // "X. If you did, Y. Then Z." <-- here
    // this is too specific. "X. If this effect Y. Then, Z." 

    if (m = line.match(/(.*) (If (you d.*?|this effect .*?))Then, (.*?)\./i)) {
        logger.info("split: X. if it did/n't happen, Y. Then Z.");
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        let [a3, l3] = parse_atomic(m[4], label, solid, card);
        atomics.push(a1, a2, a3);
        solid.effects.push(a1, a2, a3);
        line = l1 + " " + l2 + " " + l3;
    }

    // You may X. Then, if Y, do V, (and W, and Z until T).
    // You may X. If you did, Y, then Z.
    //                  1                 2    3                               4          5
    if (m = line.match(/(.*)\. (?:Then, )?(If (.*?|you d.*?|this effect .*?)), (.*), (?:and|then) (.*)\./i)) {
        logger.info("split: X. if it did/n't happen, Y and  Z.");
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let clause2 = m[2] + ", " + m[4];
        let [a2, l2] = parse_atomic(clause2, label, solid, card);
        let [a3, l3] = parse_atomic(m[5], label, solid, card, { previous_if: true }); // not independent!
        atomics.push(a1, a2, a3);
        solid.effects.push(a1, a2, a3);
        line = l1 + " " + l2 + " " + l3;
    }




    // X. Then, if Y, by W, Z.
    if (m = line.match(/(.*) Then, (if .*?, by .*?),(.*)\./i)) {
        logger.info("split: X. Then if Y, by W, Z.");
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        let [a3, l3] = parse_atomic(m[3], label, solid, card);
        atomics.push(a1, a2, a3);
        solid.effects.push(a1, a2, a3);
        line = l1 + " " + l2 + " " + l3;
        // just a 2 secntence thing
    }

    // some effects contain periods within them, such as "give your opponent '[start of main] Attack.'" and <Rush>."
    // we should token out the quotes before we get here. for now, check that third clause isn't degenerate
    // X. Then, Y. Z.
    if (m = line.match(/(.*[.,]) Then,? (.*?)\.(.*?)\./i)) {
        if (m[3].length > 4) {
            logger.info("split: X. Then Y. Z.");
            let [a1, l1] = parse_atomic(m[1], label, solid, card);
            let [a2, l2] = parse_atomic(m[2], label, solid, card);
            let [a3, l3] = parse_atomic(m[3], label, solid, card);
            atomics.push(a1, a2, a3);
            solid.effects.push(a1, a2, a3);
            line = l1 + " " + l2 + " " + l3;
            // just a 2 secntence thing
        }
    }

    // We don't want to hit "REVEAL X, IF IT IS" here
    if (m = line.match(/^([^Reveal].*)\. (If (.*))/i)) {
        logger.info(`split: non-searcher <${m[1]}> && <${m[2]}>`);
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        logger.info("l1 is now " + l1);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        // console.log("a1", a1, "l1", l1, "a2", a2, "l2", l2, "done");
        atomics.push(a1, a2);
        if (m = line.match(/(.*) Then,(.*)/i)) {
            // is this clause intended?
            logger.info(`split:  extra then? <${m[1]}> && <${m[2]}>`);
            let [a1, l1] = parse_atomic(m[1], label, solid, card);
            let [a2, l2] = parse_atomic(m[2], label, solid, card);
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = l1 + " " + l2;
        }
        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
    }


    if (m = line.match(/(.*[.,]) Then,? (.*)/i)) {
        logger.info("split: X then Y");
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
    }

    // Without "Then," How do we decide if the two sentences should be processed separately
    // or together? Kind by kind? 

    if (m = line.match(/(.*)\. (At .*)/i)) {
        logger.info("split: X. At (Y, Z).");
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
    }

    line = line.trim();
    // <draw 1> and trash 1 shouldn't be atomic. 
    if (m = line.match(/^(＜.*?＞)\s*and (.*)/i)) {
        logger.info("split: keyword and Y.");
        let [a1, l1] = parse_atomic(m[1], label, solid, card);
        let [a2, l2] = parse_atomic(m[2], label, solid, card);
        atomics.push(a1, a2);
        solid.effects.push(a1, a2);
        line = l1 + " " + l2;
    }

    // Keep some sentences together as one unit, like:
    //  "evo... when this would evo by this effect"
    //  "attack... with this effect, it can attack.."
    // "Reveal..." although it's past time we decomposed this into proper pieces
    if (line.match(/(.*?)\. (When|With) (.*)/) ||
        line.match(/Reveal.*/)) {
        logger.info("grouped sentences in " + line + " , don't split");
    } else {
        if (m = line.match(/(.*?)\. (.*)/i)) {
            logger.info("split: X. Y. breaking into two sentences.");
            let [a1, l1] = parse_atomic(m[1], label, solid, card);
            let [a2, l2] = parse_atomic(m[2], label, solid, card);
            atomics.push(a1, a2);
            solid.effects.push(a1, a2);
            line = l1 + " " + l2;
        }
    }


    if (line.length > 1) {
        logger.info("split: single effect");
        let [_atom, _line] = parse_atomic(line, label, solid, card);
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

function parse_if(line: string, orline?: string): GameTest {

    let ret: GameTest = new GameTest(0);
    ret.my_raw_text = line;
    let t = single_parse_if(line);
    ret.singles.push(t);
    if (orline) {
        ret.singles.push(single_parse_if(orline));
    }
    return ret;
}

function single_parse_if(line: string): SingleGameTest {
    logger.info("parse if: " + line);
    let m;
    // TODO: fix the place that's passing this in with an "if" (in "GRAM", where else?)
    if (m = line.match(/if (.*),/i)) {
        line = m[1];
    }

    let grammared = parseStringEvoCond("If " + line, "IfClause");
    if (grammared) {
        //           console.log(1596, "IF ");
        //           console.dir(grammared, {depth: 6 });       

        // reparsing 
        if (grammared.testtype === "TARGET_EXISTS") {
            let tgt = grammared.passive_text;
            let td = new MultiTargetDesc(tgt);

            return new SingleGameTest(GameTestType.TARGET_EXISTS, td);
        }
    }

    //                  1                                2        3                          4              5                                         
    if (m = line.match(/(you|your opponent) (?:have|has) (\d+ or (fewer|less|more)) cards in (your |their )?(hand|trash|security stack)/i)) { // ,( or .*?,)?(.*)/i)) {
        let player = "your";
        if (m[1].match(/opponent/)) player = "your opponent's";
        let count: string = m[2];
        let location = player + " " + m[5];
        return new SingleGameTest(GameTestType.CARDS_IN_LOCATION,
            undefined, undefined, count, location);
    }

    if (m = line.match(/(you have|your opponent has) (\d+ memory or (less|more))/i)) {
        let target = new TargetDesc(m[1]);
        return new SingleGameTest(GameTestType.MEMORY, undefined, undefined, m[2], m[0]);
    }
    if (m = line.match(/(you have|your opponent has) (\d+ or (less|more)) memory/i)) {
        let target = new TargetDesc(m[1]);
        return new SingleGameTest(GameTestType.MEMORY, undefined, undefined, m[2], m[0]);
    }

    if (m = line.match(/your tamers have (\d)( or (more|fewer))? total colors/i)) {
        //   let count = m[1] ? "0" : m[3];
        console.error("missing test");
        // return new SingleGameTest(GameTestType.TARGET_EXISTS, new TargetDesc("your " + m[4]), undefined, count);
    }


    //    if (m = line.match(/you have (.*)/)) {
    //      let multi = parseStringEvoCond(m[1], "MultiTarget");
    // }

    // in play is ending up in first match


    if (m = line.match(/you (don.t )?have (an? )?(no )?(\d or (?:more|fewer))?(.*?)( in play)?$/i)) {
        let count = m[1] ? "0" : m[4];
        if (m[3]) count = "0";
        return new SingleGameTest(GameTestType.TARGET_EXISTS, new MultiTargetDesc("your " + m[5].trim()), undefined, count);
        // changed this one 1 MultiTarget
    }

    // same in play issue as above. non-greedy doesn't fix this
    if (m = line.match(/your opponent has (no)?(\d or more)?(.*?)( in play)?$/i)) {
        let count = m[1] ? "0" : m[2];
        return new SingleGameTest(GameTestType.TARGET_EXISTS, new TargetDesc("their " + m[3]), undefined, count);
    }

    if (m = line.match(/(.*) is in this Monster's evolution cards$/i)) {
        return new SingleGameTest(GameTestType.TARGET_EXISTS, new TargetDesc(`this monster with ${m[1]} in its evolution cards`));
    }
    if (m = line.match(/this Monster has (.*) in its evolution cards$/i)) {
        return new SingleGameTest(GameTestType.TARGET_EXISTS, new TargetDesc(`this monster with ${m[1]} in its evolution cards`));
    }

    if (m = line.match(/(.*) have (\d or more)( total)? colors/)) {
        return new SingleGameTest(GameTestType.COMPARE_COUNT, new TargetDesc(m[1]), undefined, m[2], "color");
    }

    if (m = line.match(/there (is|are) (\d or more)?(.*?)$/i)) {
        return new SingleGameTest(GameTestType.TARGET_EXISTS, new TargetDesc(m[3]), undefined, m[2]);
    }

    if (m = line.match(/the attacking monster is (.*)/i)) {
        let target = new TargetDesc(m[1]);
        return new SingleGameTest(GameTestType.ATTACKER_IS, target);
    }

    if (m = line.match(/dna evolving/i)) {
        // the evolution is over. But we're responding to it.
        let check_evo: InterruptCondition = {
            ge: GameEvent.EVOLVE,
            td: new TargetDesc("self"),
            cause: EventCause.DNA
        }
        let test = new SingleGameTest(GameTestType.RESPONDING_TO, undefined, check_evo);
        return test;
    }

    // while you have N (or more) cards in hand
    // while this monster has <Piercing>
    // while this monster is suspended
    // While your opponent has (2 or more Monster with no evolution cards) in play
    // while you have (a blue tamer) in play
    // while you have 3 or more memory
    // While there are 5 or more cards in your opponent's trash
    // While you have another Monster in play with the same name as this Monster


    // this was unused in its prior format
    if (m = line.match(/(that monster) has (.*)/i)) {
        let td1 = new TargetDesc(m[1]);
        let td2 = new TargetDesc(m[2]);
        let td = new TargetDesc("");
        td.conjunction = Conjunction.ALL; // I should make this the defauilt!
        td.targets.push(td1, td2);
        return new SingleGameTest(GameTestType.TARGET_EXISTS, td);
    }

    // MERGE WITH ABOVE!
    // while this monster has <Piercing>
    // maybe "has" is redundant, I guess it would be implied?
    if (m = line.match(/(this monster) has (.*)/i)) {
        let td1 = new TargetDesc(m[1]); // 
        let td2 = new TargetDesc(m[2]);
        let td = new TargetDesc("");
        td.conjunction = Conjunction.ALL; // We should make this the defauilt!
        td.targets.push(td1, td2);
        return new SingleGameTest(GameTestType.TARGET_EXISTS, td);
    }


    if (m = line.match(/this monster (is|has) (suspended)/i)) {
        // if we target "this suspended monster" we
        // break it into "this" which is self and 
        // so it can only apply its effect while it has a hit
        let td = new TargetDesc("this suspended monster");
        return new SingleGameTest(GameTestType.TARGET_EXISTS, td);
        // always return true, just to get it working for now
    }

    if (parserdebug) logger.debug(red + "IF/WHILE: " + line + normal);
    // the below will generate random results
    logger.info('near the end');
    return new SingleGameTest(GameTestType.TARGET_EXISTS, new TargetDesc(line));
    //    return new TargetDesc("");
}

// This could be *either* a trigger *or* setting up a delayed reaction
function parse_at(line: string): any | false {
    let phrase = parseStringEvoCond(line, "At");
    //    phrase = find_in_tree(phrase, "At");
    let trigger: any = {};
    if (!phrase) {
        console.error("failed to parse at " + line);
        return false;
    }
    if (phrase.trigger) {
        trigger.interrupt = parse_when(phrase.trigger);
        return trigger;
    }
    if (phrase.phase === "battle") {
        trigger["END_OF_BATTLE"] = true;
        trigger.phase = PhaseTrigger.END_OF_BATTLE;
        return trigger;
    }
    if (phrase.phase === "turn") {
        trigger["END_OF_TURN"] = phrase.which;
        trigger.phase = PhaseTrigger.END_OF_ALL_TURNS;
        return trigger;
    }
    console.error("how?");
    console.error(phrase);
    return false;
}

function parse_when(line: string, solid?: SolidEffect2): InterruptCondition[] {
    // I should abandon this layer
    let _obj: InterruptCondition | InterruptCondition[] = _parse_when(line, solid);
    let ret: InterruptCondition[] = [];
    if (Array.isArray(_obj)) {
        for (let obj of _obj) {
            let ic = new InterruptCondition();
            ic.ge = obj.ge; ic.td = obj.td; ic.td2 = obj.td2; ic.cause = obj.cause;
            ic.td3 = obj.td3; ic.not_cause = obj.not_cause;
            ic.source = obj.source;
            ret.push(ic);
        }
    } else {
        let obj = _obj;
        let ic = new InterruptCondition();
        ic.ge = obj.ge; ic.td = obj.td; ic.td2 = obj.td2; ic.cause = obj.cause;
        ic.td3 = obj.td3; ic.not_cause = obj.not_cause;
        ic.source = obj.source;
        ret.push(ic);
    }
    return ret;
}

function _parse_when(line: string, solid?: SolidEffect2): InterruptCondition | InterruptCondition[] {

    let m;
    logger.info("parse_when: " + line);

    let ret: InterruptCondition[] = [];

    // remember we cn have both:
    // you would play this card
    // this card would be played

    let grammared = parseStringEvoCond(line, "WhenSentence");
    // console.error(line);
    if (grammared) {
        //  console.error("WHEN", grammared);
        //  console.dir(grammared, { depth: 99 });

        let w = grammared.When;
        if (w.event.includes("EVOLVE")) {
            // can i recognize what it *was* properly, on a non-interruptive?`
            let cause = w.effect ? EventCause.EFFECT : EventCause.ALL;
            if (w.dna) cause = EventCause.DNA;
            if (w.appfuse) cause = EventCause.APP_FUSE;
            let int_evo: InterruptCondition = {
                ge: GameEvent.EVOLVE,
                // again, we're re-grammaring
                td2: new MultiTargetDesc(w.before?.raw_text || ""),
                td: new MultiTargetDesc(w.after?.raw_text || ""),
                cause: cause
            }
            //console.log("grammared and consumed: " + line);
            ret.push(int_evo);
        }

        if (w.event.includes("PLAY")) {
            let mtd = new MultiTargetDesc(w.target.raw_text);

            //            console.error("mtd", mtd);
            //            console.error("wwww", w);
            let with_from = w.target.targets;
            with_from.forEach((x: any) => x.from = w.from); // assign "from" of multitarget to all individual targets
            mtd.parse_matches = with_from; // no reparse, plus get the .from pulled in
            let int_evo: InterruptCondition = {
                ge: GameEvent.PLAY,
                td: mtd,
                cause: w.effect ? EventCause.EFFECT : EventCause.ALL
            }
            ret.push(int_evo);
        }

        if (w.event.includes("LINK")) {
            let int_evo: InterruptCondition = {
                ge: GameEvent.PLUG,
                td: new TargetDesc(""),
                td2: new MultiTargetDesc(w.target.raw_text),
                cause: w.effect ? EventCause.EFFECT : EventCause.ALL
            }
            ret.push(int_evo);
        }


        if (["UNSUSPEND", "SUSPEND"].includes(w.event)) {
            let int_evo: InterruptCondition = {
                ge: strToEvent(w.event),
                // again, we're re-grammaring
                td: new TargetDesc(w.target.raw_text),
                cause: EventCause.ALL
            }
            //console.log("grammared and consumed: " + line);
            ret.push(int_evo);
        }

        if (false)
            if (["DELETE"].includes(w.event)) {
                let int_evo: InterruptCondition = {
                    ge: strToEvent(w.event),
                    // again, we're re-grammaring
                    td: new TargetDesc(w.target.raw_text),
                    cause: EventCause.ALL // incorrect!
                }
                console.log("grammared and consumed: " + line);
                return int_evo;
            }

        //console.log("grammared but unhandled: " + line);
        //console.dir(grammared, { depth: 6 });
        if (ret.length > 0) return ret;

    }
    //console.log("ungrammared: " + line);


    // INTERRUPTIVE .  should I capture both "would" and "would be"?
    if (m = line.match(/(.*) would (next )?(.*)/)) {
        line = m[1].trim() + " " + m[3].trim();
    }



    //                  1          2   3                                 4                 5                         6
    if (m = line.match(/(any of )?(.*) (leave the battle area|be deleted)( other than .*)?( by an opponent.s effect)?( .. battle)?/i)) {
        // td2 is being overloaded with additional target information on CAUSE
        // td3 is being overloaded with on NOT_CAUSE
        let cause = EventCause.ALL;
        let other = m[4];
        let not_cause = EventCause.NONE;
        let td3;
        if (other) {    // other than in/by battle, other than by your effect
            if (other.match(/battle/)) {
                not_cause |= (EventCause.NORMAL_BATTLE | EventCause.SECURITY_BATTLE);
                cause -= (EventCause.NORMAL_BATTLE | EventCause.SECURITY_BATTLE);
                // we should'nt need cause here but some tests break, figure out why
            }
            if (other.match(/your effect/)) {
                not_cause |= EventCause.EFFECT;
                td3 = new TargetDesc("your effects")
            }
        }

        //   if (m[4]) cause -= (EventCause.NORMAL_BATTLE | EventCause.SECURITY_BATTLE);
        if (m[5]) cause = EventCause.EFFECT;
        if (m[6]) cause = EventCause.NORMAL_BATTLE | EventCause.SECURITY_BATTLE;
        let td2 = m[5] ? new TargetDesc("their effects") : new TargetDesc("")
        let event = m[3].match(/delete/i) ? GameEvent.DELETE : GameEvent.ALL_REMOVAL;
        let int_removal: InterruptCondition = {
            ge: event, // not enough, but just to test
            td: new TargetDesc(m[2]), // react if this is attacked
            td2: td2, // match with cause source
            td3: td3, // match with not-cause source
            cause: cause,
            not_cause: not_cause
        }
        return int_removal;
    }

    // evo into a specific thing
    if (m = line.match(/((one|any) of )?(.*) evolves? into (a )?(.*)/i)) {
        let int_evo: InterruptCondition = {
            ge: GameEvent.EVOLVE,
            td2: new TargetDesc(m[3]),
            td: new TargetDesc("your " + m[5]),
            cause: EventCause.ALL
        }
        return int_evo;
    }

    // interrupt play/use, 3rd person. ignoring clauses like "from the hand" for now
    if (m = line.match(/(.*) be (play|use)e?d?(.*)/)) {
        let verbed: InterruptCondition = {
            ge: strToEvent(m[2]),
            td: new TargetDesc(m[1]),
        };
        return verbed;
    }




    // interrupt play/use, 2nd person
    if (m = line.match(/(you) (play|use) (.*)/)) {
        let verbed: InterruptCondition = {
            ge: strToEvent(m[2]),
            td: new TargetDesc("your " + m[3]),
        };
        return verbed;
    }

    // interrupt evo
    logger.info(line);
    if (m = line.match(/(.*) (evolve) into (this card)( from your hand)?/)) {
        if (m[4]) logger.warn("not restricting to hand");
        let evo: InterruptCondition = {
            ge: strToEvent(m[2]),
            td2: new TargetDesc(m[1]),
            td: new TargetDesc("your " + m[3])
        };
        return evo;
    }



    if (m = line.match(/(.*)? (is|be|are) deleted( (in|by) battle)?\s*(or returned to .{1,9} hand)?/i)) {
        let deleted_in_battle: InterruptCondition = {
            ge: GameEvent.DELETE,
            td: new TargetDesc(m[1]),
            //            td: self
            cause: m[3] ? EventCause.NORMAL_BATTLE | EventCause.SECURITY_BATTLE : undefined,
        };
        let bounced: InterruptCondition;
        if (m[5]) {
            bounced = {
                ge: GameEvent.FIELD_TO_HAND,
                td: new TargetDesc(m[1]),
            };
            return [deleted_in_battle, bounced];
        }

        return deleted_in_battle;
    }

    // gets linked... note that td2 is what gets linked. we could further say "linked by a XXX" in theory
    if (m = line.match(/(.*) gets linked OBSOLETE/i)) {
        let plug_evo: InterruptCondition = {
            ge: GameEvent.PLUG,
            td: new TargetDesc(""),
            td2: new TargetDesc(m[1]),
            cause: EventCause.ALL
        }
        return plug_evo;
    }



    // is played or evolves
    if (m = line.match(/(opponent's|your) monsters? (.. played or )?evolve.(.*)/i)) {

        let mon = m[1].match(/your/i) ? "your monster" : "their monster";
        let int_evo: InterruptCondition = {
            ge: GameEvent.EVOLVE,
            td: new TargetDesc(mon),
            cause: EventCause.ALL
        }
        let ret = [int_evo];
        if (m[2]) {
            let int_play: InterruptCondition = {
                ge: GameEvent.PLAY,
                td: new TargetDesc(mon),
                cause: EventCause.ALL
            }
            ret.push(int_evo);
        }
        return ret;
    }
    // an effect...
    // adds cards to your hand
    // adds cards to your or your opponent's hand
    // adds cards to your opponent's hand

    if (m = line.match(/adds cards to (.*) hand/i)) {
        let which = m[1];
        let int_play: InterruptCondition = {
            ge: GameEvent.ADD_CARD_TO_HAND,
            td: new TargetDesc(which),
            cause: EventCause.EFFECT
        }
        return int_play;
    }


    if (m = line.match(/((?:any|one) of your .*) (?:be|is) played( or evolve)?(.*)/i)) {
        let int_play: InterruptCondition = {
            ge: GameEvent.PLAY,
            td: new TargetDesc(m[1]),
            cause: EventCause.ALL
        }
        if (m[2]) {
            let int_evo: InterruptCondition = {
                ge: GameEvent.EVOLVE,
                td: new TargetDesc(m[1]),
                cause: EventCause.ALL
            }
            return [int_evo, int_play];
        }
        return int_play;
    }



    if (line.match(/this Monster deletes (an|your) opponent.s Monster in battle/i)) {
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
        let ic: InterruptCondition =
        {
            ge: GameEvent.ATTACK_TARGET_SWITCH,
            td: new TargetDesc("")
        }
        return ic;
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


    if (m = line.match(/effects? (plays?|evolves?) (.*)/i)) {
        let cause = EventCause.EFFECT;
        return {
            ge: m[1].startsWith("play") ? GameEvent.PLAY : GameEvent.EVOLVE,
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
    if (m = line.match(/(.*?) (is|becomes)?\s*(un)?suspend(ed|s)?$/i)) {
        let my_td = new TargetDesc(m[1]);
        // what am i doing with m[4]? I should anchor to end
        return {
            ge: m[3] ? GameEvent.UNSUSPEND : GameEvent.SUSPEND,
            td: my_td,
            // source: new TargetDesc("self")
        }
    }

    // this is *any* health, whoops
    if (m = line.match(/a card is removed from (a|your) security stack/i)) {
        return {
            ge: GameEvent.MOVE_CARD,
            td: new TargetDesc(""),  // to
            td2: new TargetDesc("security") // from
        }
    }
    if (m = line.match(/a card is added to (a|your) security stack/i)) {
        return {
            ge: GameEvent.MOVE_CARD,
            td: new TargetDesc(m[1] == "your" ? "your security" : "security"),
            td2: new TargetDesc(""), // from anywhere
        }
    }
    if (m = line.match(/(a) card is trashed (from your deck)/i)) {
        // I don't think this is right
        return {
            ge: GameEvent.MOVE_CARD,
            td: new TargetDesc(""),
            td2: new TargetDesc("your deck")
        };
    }
    if (m = line.match(/(this) card is trashed (from your deck)/i)) {
        return {
            ge: GameEvent.MOVE_CARD,
            td: new TargetDesc("self"),
            td2: new TargetDesc("your deck")
        };
    }


    if (m = line.match(/an effect trashes (this evolution card)/i)) {
        if (solid) solid.active_zone = Location.TRASH; // implicitly a [trash] effect
        return {
            ge: GameEvent.EVOSOURCE_REMOVE,
            td: new TargetDesc("this card"),
        };
    }


    if (m = line.match(/(this card) is trashed from your hand( by .*your effects)?/)) {
        let by_own = new TargetDesc(m[2] ? "your effects" : "");
        if (solid) solid.active_zone = Location.TRASH; // implicitly a [trash] effect
        return {
            ge: GameEvent.TRASH_FROM_HAND,
            td: new TargetDesc(m[1]),
            td2: by_own
        };

    }

    if (m = line.match(/a card is trashed (from your hand)?( by .*your effect)?/i) ||
        line.match(/you trash a card in your hand ()(using one of your effects)?/i)) {
        let by_own = new TargetDesc(m[2] ? "your effects" : "");
        return {
            ge: GameEvent.TRASH_FROM_HAND,
            td: new TargetDesc("card"),
            td2: by_own
        };
    }

    if (m = line.match(/a (.*) is trashed from your hand/)) {
        return { ge: GameEvent.TRASH_FROM_HAND, td: new TargetDesc(m[1]) };

    }


    if (parserdebug) logger.debug(red + "WHEN: " + line + normal);
    return { ge: GameEvent.NIL, td: new TargetDesc("") };
}

// TODO: move *all* status effets in here
function parse_give_status(s: string, card: Card): StatusCondition | false {
    let m;
    let internal_stat_cond: StatusCondition;
    logger.info("parse_give_status: " + s);
    // 2. get DP
    // end $ breaks test?
    if (m = s.match(/^()(get|gain).?\s*([-0-9+]* DP(.*))/i)) {
        internal_stat_cond = {
            s: {
                game_event: GameEvent.DP_CHANGE,
                n: parseInt(m[3]),
                td: new TargetDesc(""),
                cause: EventCause.EFFECT

            },
            exp_description: undefined
        };
        return internal_stat_cond;
    }
    // 1. get keyword
    if (m = s.match(/^()(get|gain).?\s*(＜.*＞)\s*$/i)) {
        if (parserdebug) logger.info(`effect gain: ${m[1]} gets ${m[3]}`);
        // ALLIANCE is a solid effect.
        // We should both give the keyword *and* the effect.
        //        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        let keywords: KeywordArray = {};
        let words_s = m[3];
        let solid: SolidEffect2[] = [];
        const words = words_s.match(/＜[^＞]*＞/g) || [];
        for (let word of words) {
            if (word.match(/Alliance/i)) {
                keywords[word] = word;
                let s = new SolidEffect2();
                s.card_label = card ? card.card_id : "no_card";
                s.label = "[Alliance]"; // gifted alliance in brackets?
                make_alliance(s);
                solid.push(s);
                s.raw_text = "<Alliance>";
            } else if (word.match(/Jamming/i)) {
                keywords[word] = word;
                //   solid.label = "[Jamming]"
            } else if (word.match(/Security Attack/i)) {
                keywords["＜Security Attack＞"] = word;
            } else if (word.match(/Link/i)) {
                keywords["＜Link＞"] = word;
            } else {
                keywords[word] = word;
                let [fx, test] = Translator.check_for_keywords(word, [], []);
                // parsing "word" works for alliance
                let [_0, nested_solid_effect, _1] = new_parse_line(word, undefined, word, "main");
                // how could we pass through a card here, we won't have any card keywords
                // if we have no effects, our attempts at parsing the keyword failed
                if (nested_solid_effect.effects.length > 0)
                    solid.push(nested_solid_effect);
            }
        }
        internal_stat_cond = {
            s: {
                cause: EventCause.EFFECT,
                game_event: GameEvent.KEYWORD,
                n: 55,
                td: new TargetDesc(""),
            },
            solid: solid,
            keywords: keywords,
            exp_description: undefined
        };
        //        if (and = text.match(/(1 .*) and ((1|all) .*)/i)) {
        return internal_stat_cond;
    }
    return false;

}

function nested_solids(input: string, label: string, card?: Card): SolidsToActivate {
    let sta: SolidsToActivate = new SolidsToActivate();
    let effects_text = input
    let effects = effects_text.split("・");
    for (let effect of effects) {
        if (effect.length < 2) continue;
        let text = "[Effect] " + effect;
        let [, nested_solid_effect,] = new_parse_line(text, card, label, "main");
        logger.info(1768, nested_solid_effect.respond_to.length);
        sta.solids.push(nested_solid_effect);
        logger.info("nested solid cancel is " + nested_solid_effect.cancels);
    }
    return sta;
}


//export
function parse_atomic(line: string, label: string, solid: SolidEffect2,
    card: Card | undefined, flags?: any, incoming_grammar?: any
): [AtomicEffect2, string] {
    logger.info("atomic " + line);
    if (!solid) logger.info("Warning, no solid");
    // bullshit I shouldn't need, I think it's just for eating keywords
    for (let i = 0; i < 5; i++) line = line.replace(/^\s*\[[^\]]*\]\s*/g, '');

    //    console.error("pa", line);


    if (parserdebug) logger.debug("DEBUG: ATOMIC2 IS " + line);

    let atomic = new AtomicEffect2();
    atomic.raw_text = line;
    atomic.flags = flags;
    let thing: {
        game_event: GameEvent, td: TargetDesc, td2?: TargetDesc, td3?: TargetDesc,
        choose: DynamicNumber,
        n: number, immune: boolean, n_mod: string, n_max: number,
        n_count_tgt?: ForEachTarget, // "suspend 1 monster for each tamer"
        n_repeat?: GameTest, // repeat (Devolve 1) N times
        cause: EventCause,
        cost_change?: any,
        delayed_effect?: SolidEffect2,
        delayed_phase_trigger?: Phase,
        delayed_interrupt?: InterruptCondition[],
        n_test?: GameTest;
    } = {
        game_event: GameEvent.NIL,
        td: new TargetDesc(""), choose: new DynamicNumber(0), n: 0,
        immune: false,
        n_mod: "", n_max: 0,
        cause: EventCause.EFFECT,
    };

    let m;
    let expiration = undefined;
    let proper_thing: SubEffect;
    let stat_conds: StatusCondition[] = [];

    if (m = line.match(/(.*),\s*$/)) {
        line = m[1];
    }
    if (m = line.match(/(.*)\.\s*$/)) {
        //        line = m[1];
    }
    if (m = line.match(/(?:Then)?,? ?(.*)/)) {
        line = m[1];
    }
    line = line.trim();

    // use new-style parser for play (except for stack summon)

    let foreach;

    if (line.startsWith("＜xxxDelay＞.・")) {
        // is this branch even used?
        let nested = line.after("＜Delay＞.・")
        if (atomic.test_condition) console.error("warning over-writing test contidion");
        atomic.test_condition = new GameTest(GameTestType.NOT_THIS_TURN);

        let proper_thing: any = { ...thing };
        proper_thing.game_event = GameEvent.TRASH_FROM_FIELD;
        proper_thing.td = new TargetDesc("this card");
        proper_thing.choose = new DynamicNumber(1);
        line = "";
        atomic.subs.push(proper_thing);

        thing.game_event = GameEvent.ACTIVATE;
        atomic.sta = nested_solids(nested, label, card);
        atomic.sta.count = 1;
        line = "";
    }

    if (
        (
            line.toLowerCase().includes("play") ||
            //   line.toLowerCase().includes("trash") ||
            line.toLowerCase().includes("placing") ||
            line.toLowerCase().includes("place") ||
            line.toLowerCase().includes("return") ||
            line.toLowerCase().includes("attack") ||
            line.toLowerCase().includes("link") ||
            line.toLowerCase().includes("app fuse") ||
            line.toLowerCase().includes("can't attack") ||
            line.toLowerCase().includes("choose") ||

            line.toLowerCase().includes("suspend") ||
            line.toLowerCase().includes("bottom of the deck") ||
            line.toLowerCase().includes("top of the deck") ||
            line.toLowerCase().includes("evolution card") ||
            line.toLowerCase().includes("delay") ||
            line.toLowerCase().includes("de-evolve") ||

            line.toLowerCase().includes("add") ||
            line.toLowerCase().includes("give") ||
            line.toLowerCase().includes("gets") ||
            line.toLowerCase().includes("delete") ||
            line.toLowerCase().includes("don't affect")


        )
        && !line.toLowerCase().includes("1 your")
        && !line.toLowerCase().includes("3 your")
    ) {
        //console.error(2399, line);
        let grammared = incoming_grammar || parseStringEvoCond(line, "EffSentence");
        let action_args, target, x;
        if (grammared) {
            if (grammared.if) {
                // we're double parsing this :(
                atomic.test_condition = parse_if(grammared.if);
            }
            if (grammared.duration) {
                expiration = grammared.duration.expiration;
            }
            //console.log("GRAM"); console.dir(grammared, { depth: 99 });
            const effs = grammared.effect;
            const eff = effs[0]; // we only handle one effect in here. We should call parse_atomic multiple times for multiple effects
            const optional = eff.optional;
            if (optional) atomic.optional = true;
            if (eff.is_cost) atomic.is_cost = 1;
            action_args = eff.action_args;
            if (action_args?.optional) atomic.optional = true;
            // part of action
            if (action_args?.for_each) foreach = action_args.for_each;
            // extra sentence
            // just slappin' the for_each here w/o a care in the world.
            // with the grammar we should have a better idea of 
            // just what is being for_each'd.

            //   console.error("action_args", action_args);
            if (eff.action === 'give status') {
                target = action_args.target;
                thing.game_event = GameEvent.GIVE_STATUS_CONDITION;

                x = new MultiTargetDesc(target.raw_text);
                thing.td = x;
                thing.choose = x.choose;
                if (x.upto) thing.n_mod += "upto; ";
                // we need to handle "upto" transparently without n_mod


                let nested, keyword_gains, status, dp_change;
                if (nested = action_args.nested_effect) {
                    let [_0, nested_solid_effect, _1] = new_parse_line(nested, card, label, "main"); // how could we pass through a card here, we won't have any card keywords
                    stat_conds.push({
                        s: {
                            game_event: GameEvent.NIL,
                            td: new TargetDesc(""), // this doesn't need a target
                            cause: EventCause.EFFECT
                        },
                        solid: [nested_solid_effect],
                        exp_description: expiration
                    });
                    line = "";
                }
                if (dp_change = action_args.dp_change) {
                    let s1 = parse_give_status(dp_change, card!);
                    if (s1) {
                        s1.exp_description = expiration;
                        stat_conds.push(s1);
                    } else {
                        console.error("no s1");
                    }
                    line = "";
                }
                if (keyword_gains = action_args.keyword_gains) {
                    let s1 = parse_give_status(keyword_gains, card!);
                    if (s1) {
                        s1.exp_description = expiration;
                        stat_conds.push(s1);
                    } else {
                        console.error("no s1");
                    }
                    line = "";
                }
                if (status = action_args.status) {
                    // forging some stuff here
                    if (!Array.isArray(status)) status = [status];
                    for (let each of status) {
                        const target = each.target || "";
                        logger.debug("target status", target, status);
                        const cause = each.cause || EventCause.ALL;
                        stat_conds.push({
                            s: {
                                game_event: strToEvent(each.event),
                                td: new TargetDesc(target),
                                cause: cause, // step
                                immune: each.immune,
                                n: Number(each.n)
                            },
                            exp_description: expiration
                        });
                        line = "";
                    }
                }
                if (line !== "") {
                    console.error("UNHANDLED");
                }
                line = "";
            }

            // TUCK is more generic than EVOSOURCE_ADD

            if (eff.action === 'link' || eff.action === 'evolve' ||
                eff.action === 'PlaceCard' || eff.action === 'MoveToSecurity' ||
                eff.action === 'EvoSourceDoubleRemove' ||
                eff.action === 'Tuck') {
                // WAIT! we're not checking this is a valid link!
                target = action_args.target;
                let target2 = action_args.target2;
                thing.game_event = strToEvent(eff.action);

                // if we use PlaceCard our target better not be an instance
                let target_entity = target.targets[0].entity;
                //console.error(2542, "XXXXXXX", GameEvent[thing.game_event], target_entity, line);
                if (thing.game_event === GameEvent.TARGETED_CARD_MOVE && (!target_entity || !target_entity.match(/card/))) {
                    // we likely have an "it" object, fall back to old code. or if we're not "moving" a card.
                    console.error("can't do it");
                } else {

                    // TUCK is for instance, TARGET_CARD_MOVE for cardlocatiion
                    if (thing.game_event === GameEvent.TUCK &&
                        target.raw_text.includes(" card ")) {
                        // for moving non-card to security, use this instead
                        thing.game_event = GameEvent.TARGETED_CARD_MOVE;
                    }

                    if (thing.game_event === GameEvent.TARGETED_CARD_MOVE &&
                        !target.raw_text.includes(" card ") && false) {
                        // for moving non-card to security, use this instead
                        thing.game_event = GameEvent.FIELD_TO_SECURITY;
                    }
                    if (action_args.dna) thing.cause = EventCause.DNA;
                    if (action_args.appfuse) {
                        console.log("app fuse is set");
                        thing.cause = EventCause.APP_FUSE;

                    }
                    x = new MultiTargetDesc(target.raw_text);
                    thing.td = x;
                    thing.choose = x.choose;
                    if (!thing.choose.value()) {
                        // chase all these down
                        logger.error("forcing choose to be 1 instead of " + thing.choose);
                        thing.choose = new DynamicNumber(1);
                    }
                    let y = new MultiTargetDesc(target2.raw_text);
                    if (eff.action === 'EvoSourceDoubleRemove') {
                        // parse_matches needed because it effectively puts "under td1" in the match
                        //y.parse_matches = [target2];
                    }
                    y.parse_matches = target2.targets;

                    thing.td2 = y;
                    if (action_args.no_cost) thing.n_mod += "for free; ";
                    if (action_args.place_location) thing.n_mod += action_args.place_location + "; ";
                    line = "";
                }
            }



            if (eff.action === 'play') {

                target = action_args.target;
                thing.game_event = GameEvent.PLAY;

                // we already grammared the multitarget, we don't need to re-parse...
                //  thing.td = new MultiTargetDesc("");
                x = new MultiTargetDesc(target.raw_text);
                thing.td = x;
                thing.choose = x.choose;
                if (!thing.choose.value()) {
                    // chase all these down
                    logger.error("forcing choose to be 1 instead of " + thing.choose);
                    thing.choose = new DynamicNumber(1);
                }

                if (thing.choose.value() > 1) {
                    // dumbly assuming multitarget must be upto
                    // we are using "upto" to capture overlap logic
                    // but "play 2 X" isn't an "upto"
                    logger.error("not doing 'upto' for multitarget, which we should");
                    // breaks too many test cases
                    //thing.n_mod += "upto; ";
                }
                if (action_args.no_cost) thing.n_mod += "for free; ";
                line = "";
            }

            if (eff.action === 'MoveCard') {
                target = "hand"; //  action_args.target;
                thing.game_event = GameEvent.MOVE_CARD
                x = new TargetDesc(target); // not target.raw_text!
                thing.td = x;
                thing.choose = new DynamicNumber(0); // no targets needed
                thing.n = 1;

                let target2 = "your bottom security"; // action_args.target2;
                x = new TargetDesc(target2); // not target2.raw_text
                thing.td2 = x; // target 2
                line = "";
            }

            if (eff.action === 'attack') {
                target = action_args.target;
                thing.game_event = GameEvent.MUST_ATTACK
                x = new MultiTargetDesc(target.raw_text);
                thing.td2 = x; // target 2
                if (action_args.without_suspending) thing.n_mod += "without suspending; "
                const target2 = action_args.target2_text || "";
                thing.td = new TargetDesc(target2);
                // is the below needed any more?
                if (action_args.optional) atomic.optional = true;
                thing.choose = x.choose;
                line = "";
            }


            if (eff.action === 'suspend' || eff.action === "unsuspend"
                || eff.action === 'Choose'
                || eff.action === 'devolve'
                || eff.action === 'delete' || eff.action === 'XXXEntityStrip') {
                target = action_args.target;
                thing.game_event = strToEvent(eff.action) // targets an instance!
                thing.n = action_args.number;
                // for de-evolve and other keywords
                if (action_args.for_each && eff.action === 'devolve') {
                    thing.n_repeat = new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc(foreach));
                    foreach = undefined;
                }
                x = new MultiTargetDesc(target.raw_text);
                thing.td = x;
                thing.n_mod += "devolve";
                thing.n_max = thing.n;
                thing.choose = x.choose;
                if (x.upto) thing.n_mod += "upto; ";
                if (action_args.place) thing.n_mod += action_args.place + "; ";
                line = "";
            }

            if (eff.action === 'topdeck') {

                //        if (m = line.match(/^Return(ing)? (.*) to the (top|bottom|hand)(?: of .{1,14} deck)?/i)) {
                //      let dest = m[3];
                let mod_dest = "top deck";
                target = action_args.target;
                thing.game_event = GameEvent.TARGETED_CARD_MOVE; // targets an instance!
                thing.n_mod = mod_dest;

                x = new MultiTargetDesc(target.raw_text);
                thing.td = x;
                thing.choose = x.choose
                line = "";
            }

            if (eff.action === 'bottomdeck') {

                //        if (m = line.match(/^Return(ing)? (.*) to the (top|bottom|hand)(?: of .{1,14} deck)?/i)) {
                //      let dest = m[3];
                let mod_dest = "bottom deck";
                target = action_args.target;
                thing.game_event = GameEvent.TO_BOTTOM_DECK; // targets an instance!
                thing.n_mod = mod_dest;

                x = new MultiTargetDesc(target.raw_text);
                thing.td = x;
                thing.choose = x.choose;
                line = "";
            }
            if (eff.action === 'SourceStrip') {
                target = action_args.target;
                thing.choose = new DynamicNumber(parseInt(action_args.choose));
                thing.game_event = GameEvent.EVOSOURCE_REMOVE;
                if (target.raw_text.includes("link cards"))
                    thing.game_event = GameEvent.TRASH_LINK;
                x = new MultiTargetDesc(target.raw_text);
                //x.parse_matches = target;
                thing.td = x;
                line = "";

            }
            if (eff.action === 'PlugStripXXXXX') {
                target = action_args.target;
                thing.choose = new DynamicNumber(parseInt(action_args.choose))
                thing.game_event = GameEvent.TRASH_LINK;
                x = new MultiTargetDesc(target.raw_text);
                //x.parse_matches = target;
                thing.td = x;
                line = "";
            }
            // awakening of sun can't find this yet.
            // also, "if X, delay" won't hit this since we haven't removed if
            if (eff.action === 'Delay') {
                console.error("XXXXXX XX");
                let nested = eff.nested_solid.raw_text;
                if (atomic.test_condition) console.error("warning over-writing test contidion");
                atomic.test_condition = new GameTest(GameTestType.NOT_THIS_TURN);



                thing.game_event = GameEvent.ACTIVATE;
                console.error(2250, nested);
                atomic.sta = nested_solids(nested, label, card);
                atomic.sta.count = 1;
                line = "";
            }

            // if we have a full "For each X, modify effect Y" then classic parsing will handle that below
            if (grammared?.for_each) line = grammared.for_each;
        }

    }

    if (m = line.match(/\s*Activate (\d+|all) of the (?:.*?effects.*?):(.*)/)) {
        thing.game_event = GameEvent.ACTIVATE;
        atomic.sta = nested_solids(m[2], label, card);
        atomic.sta.count = parse_number(m[1]);
        line = "";
    }

    if (m = line.match(/activate the effect below\s*((\d) times)?.?\s*・\s*(.*)/i)) {
        let sta: SolidsToActivate = new SolidsToActivate();
        sta.count = 1;
        if (m[1]) {
            thing.n_repeat = new GameTest(GameTestType.COUNT, undefined, undefined, m[1]);
        }
        let effects_text = "[Effect] " + m[3];
        let [, nested_solid_effect,] = new_parse_line(effects_text, card, label, "main");
        logger.info(1799, nested_solid_effect.respond_to.length);
        sta.solids.push(nested_solid_effect);

        thing.game_event = GameEvent.ACTIVATE;
        /*   atomic.sta = nested_solids(m[3], label, card);
           atomic.sta.count = 1;
           if (m[1]) {
               thing.n_repeat = new GameTest(GameTestType.COUNT, undefined, undefined, m[1]);
           }
           atomic.sta.count = parse_number(m[1]);*/
        line = "";
        atomic.sta = sta;
    }

    // If we're in here, we already have our trigger
    // A pending SolidEffect gets made.
    if (m = line.match(/^((?:At|The next time) .*?),(.*)/)) {
        let at = parse_at(m[1]);
        if (at) {
            let [_a, delayed, _b, _c] = new_parse_line(m[2], card, label, "main");
            thing.game_event = GameEvent.CREATE_PENDING_EFFECT;
            thing.choose = new DynamicNumber(0);
            thing.delayed_effect = delayed;
            if (at.interrupt) {
                thing.delayed_interrupt = at.interrupt;
            } else {
                thing.delayed_phase_trigger = at;
            }
            line = "";
        }
    }



    // for each X, Y
    // do Y for each Y


    // DO X. For each Y, modify X. <-- handles this case

    // see also another "for each" waaaay below
    //                  1                2             3                          4



    // is "each" an indication that this is a thing we did?
    if (m = line.match(/(.*?)For (each|each of|every) (.*), (?:increase|add)(?:.*?)(\d+)(.*)/)) {
        // counter
        // td2: where we store our thing
        // 1 ... nothing
        // 2000 or whatever we mod by per unit

        const fet = ForEachTargetCreator(m[3]) // gets parsed down below
        thing.td3 = fet as any as TargetDesc; // ugly override
        thing.n_mod = `counter,n_count_tgt,1,${m[4]}; `; // td2 is unused in most effects
        //  thing.td2 = new TargetDesc(m[3]);
        if (m[3].match(/effect/)) // for each done by the prior effect
            thing.n_mod = `counter,unit,1,${m[4]}; `;
        line = m[1];
    }

    if (m = line.match(/(.*?)For each card placed, reduce the play cost by (\d)/)) {
        // this magic is happening in effectloop when we stack summon
        // sorry if that feels like cheating. which it probably is.
        line = m[1];
    }


    // could this clause be more generic for the above? modify the prior thing?
    // for each X, delete y. or for each X, modify the N of your previous action.
    // For each X, Do y.  
    if (m = line.match(/^For (?:each|every) (.*),(.*)/i)) {
        foreach = m[1];
        line = m[2];
    }


    // some foreach are "for each N on field, do a thing"
    // others are "for each N you did, do a thing"
    // This Monster gets +1000 DP for each of your opponent's suspended Tamers
    // Do y for each X.
    // for eachX, gain Y.

    //     For each of your opponent's Monster suspended by this effect
    if (m = line.match(/(.*) for (?:each|every) (.*?)\.?$/i)) {
        foreach = m[2];
        line = m[1];
    }
    if (foreach) {
        logger.info("foreach parse: " + foreach);
        logger.info("line is " + line);
        if (m = foreach.match(/(\d+) cards in (.*)/i)) {
            thing.n_repeat = new GameTest(GameTestType.CARDS_IN_LOCATION,
                undefined, undefined, m[1], m[2]);
            // for each X this thing VERBed
        } else if (foreach.match(/(card|tamer) (?:this.effect )?(trashed|returned|placed|suspended)/i)) {
            atomic.per_unit = true;
            // for each X you VERB wioth this thing
        } else if (foreach.match(/(card|tamer) you (trashed|returned|placed|suspended)/i)) {
            atomic.per_unit = true;
            // for each of Y VERBd by this effect, where Y matters. 
        } else if (m = foreach.match(/(?:of )?(.*) (trashed|returned|placed|suspended) (?:by|with) this effect/i)) {
            // This is *both* test for things on board *and* see if they were successfully paid
            // Do we 1. Test in GameTest, and somehow figure out what this effect did?
            // or 2. Use a variation of atomic.per_untit
            atomic.per_unit_test = new TargetDesc(m[1]);
            atomic.per_unit = true;
            // "for each one" means "for each thing we just did"
        } else if (foreach === "one") {
            atomic.per_unit = true;
            // keywords cannot be altered; todo make this able to identify keyword effects
        } else if (line.includes("Draw ") ||
            line.includes("De-Evolve") ||
            line.includes("Security A") ||
            line.includes("Link") //. whhat's this for?
        ) {
            logger.info("REPEAT KEYWORD");
            thing.n_repeat = new GameTest(GameTestType.TARGET_EXISTS, new TargetDesc(foreach));
        } else {
            // how many targets we can hit
            thing.n_count_tgt = ForEachTargetCreator(foreach);
        }
    }
    // if X, increase n by delta
    // "further" may imply a second reduction, instead of changing the first
    if (m = line.match(/(.*) If (.*?), (increase|further) (.*) by ([-0-9]*)/)) {
        thing.n_test = parse_if(m[2]);
        thing.n_mod = `counter,test,1,${m[5]}`;
        line = m[1];
    }

    // WARNING: not distinguishing between 'prevent 1' and 'prevent all'
    if (line.match(/prevent (1 of those Monster's|that) deletion/i) ||
        line.match(/prevent .*/) ||
        line.match(/(?:it|they) do.?.?n.t leave/)) {

        let canceller: SubEffect = {
            game_event: GameEvent.CANCEL,
            label: "cancel deletion",
            td: new TargetDesc("self"),
            cause: EventCause.EFFECT
        };
        solid.cancels = true;
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

    if (false)
        //                  1                                2        3                          4              5    
        if (m = line.match(/(you|your opponent) (?:have|has) (\d+) or (fewer|less|more) cards in (your |their )?(hand|trash|security stack),( or .*?,)?(.*)/i)) {
            if (m[6]) logger.error("ignoring second OR in IF");
            let size: number = parseInt(m[2]);
            let comp: string = m[3];
            let place: string = m[5];
            let who: string = m[1];
            atomic.can_activate = function (e: SolidEffect2) {
                if (parserdebug) logger.debug('card check clause');
                if (!e.source) return false;
                let p = e.source.get_player();
                if (who === "your opponent") p = p.other_player;
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
            line = m[7];
        }
    // this is also a cheat
    if (false)
        if (m = line.match(/you have (\d+) (?:memory or less|or less memory)(.*)/i)) {
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
    //    you do/dod
    m = line.match(/this effect (didn't )?(delete|suspend|evolve|trash)(.*?),(.*)/i);
    if (!m) m = line.match(/(?:it|you) ()(do|did)(),(.*)/i);
    if (m) {
        //    if (m = line.match(/this effect (delete|suspend|evolve).?.( one of)? your monster,(.*)/i)) {
        // I think I
        let invert: boolean = !!m[1]; // defaults to false
        let verb = m[2];
        let hitting_own = m[3] && m[3].match(/your monster/i)
        line = m[4];
        atomic.can_activate = function (e: SolidEffect2, l?: SolidEffectLoop) {
            let test_for: GameEvent = strToEvent(verb);
            if (parserdebug) logger.info(' check, parserdebug ' + parserdebug);
            logger.info('wendigo check clause, default is ' + invert);
            // if first effect was DELETE, was successful, and targeted me player

            logger.warn(`l is ${!!l}`);
            let prev = l ? l.n_effect - 1 : 0;
            logger.warn(`prev is ${prev}`);
            let at = e.effects[prev];
            // assume only 1 subevent
            let w = at.events[0];
            logger.info("w ge is " + GameEvent[w.game_event]);
            if (w.game_event === GameEvent.ACTIVATE) {
                // go back further
                prev = prev - 1;
                at = e.effects[prev];
                w = at.events[0];
            }
            logger.info("e source is " + e.source);
            if (!e.source) return invert;
            if (test_for != GameEvent.NIL && w.game_event != test_for) {
                logger.error(`prior event was the wrong one! it was ${GameEvent[w.game_event]}  i want ${GameEvent[test_for]}  `);
                return invert;

            }
            logger.info("wct is " + (!!w.chosen_target));
            if (hitting_own) {
                if (!w.chosen_target) return invert;  // no target
                logger.info("chosen target player is " + w.chosen_target.n_me_player);
                logger.info("source player is " + e.source.get_n_player());
                if (w.chosen_target.n_me_player != e.source.get_n_player()) return invert;
            }
            logger.info("cost paid is " + at.cost_paid);
            if (!at.cost_paid) return invert;
            return !invert;
        };
    }


    //  If no Monster was deleted by this effect,
    if (m = line.match(/no monster was deleted by this effect(.*)/i)) {
        atomic.can_activate = function (e: SolidEffect2) {
            if (parserdebug) logger.debug('gallantmon check, parserdebug ' + parserdebug);
            logger.debug('duke check clause');
            // if first effect was DELETE, was successful, and targeted me
            let at = e.effects[0];
            let w = at.events[0];
            logger.debug("w ge is " + GameEvent[w.game_event]);
            logger.debug("e source is " + e.source);
            if (!e.source) return false;
            if (w.game_event != GameEvent.DELETE) return false;
            if (!w.chosen_target) return true;  // nothing was targeted...
            if (!at.cost_paid) return true; // nothing was deleted (maybe prior test not needed?)
            return false;
        };
        line = m[1];
    }




    ///// DONE WITH CUSTOM FUNCTION IF, NOW TRADITIONAL IF
    // so how do I split sentences across the comma?
    // I'm going to have clauses within the "if" that have them
    //                                   1     2    3      4
    if (m = line.match(/^\s*(?:If|While) (.*?),( or (.*?),)?(.*)/i)) {
        if (parserdebug) logger.debug("IF MATCH");
        let iff = m[2] ? m[1] + " or " + m[3] : m[1];
        //        iff = m[1];
        atomic.test_condition = parse_if(m[1], m[3]);
        line = m[4].trim();
    }

    if (line == "＜Delay＞") {
        if (atomic.test_condition) {
            atomic.test_condition.conjunction = Conjunction.ALL;
            atomic.test_condition.singles.push(new SingleGameTest(GameTestType.NOT_THIS_TURN));
        } else {
            atomic.test_condition = new GameTest(GameTestType.NOT_THIS_TURN);
        }
        thing.game_event = GameEvent.TRASH_FROM_FIELD;
        thing.td = new TargetDesc("this card");
        thing.choose = new DynamicNumber(1);
        line = "";
    }


    /*
    if (m = line.match(/^While (.*?),(.*)/i)) {
        atomic.test_condition = parse_if(m[1]);
        line = m[2];
    }*/


    // change "by X" into "X" because the layer above this one should have recognized the cost
    if (m = line.trim().match(/^by (.*)/i)) {
        logger.warn(1705, m);
        line = m[1].trim();
        atomic.is_cost = 1;
        atomic.optional = true;
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
                // devolve 3 monsters. Then recover 1. ERROR, this shouldn't be ahndled at the atomic level!
                //                   1        2     3      4    .           5         
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
                    thing.n_mod = "devolve"; // "upto" is only for selecting the number of things to devolve, not the targets

                    thing.n_max = parseInt(m[1]);
                    let filler = m[2];
                    thing.choose = new DynamicNumber(parse_number(m[3]));
                    thing.td = new TargetDesc(m[4]);
                    line = m[5];
                    if (parserdebug) logger.debug("target " + m[4]);
                }
            } else if (aword.match("Recovery")) {
                thing.game_event = GameEvent.MOVE_CARD;
                thing.n = parseInt(m[1]);
                thing.td = new TargetDesc("your security");
                thing.td2 = new TargetDesc("your deck");
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
    logger.info("now line is " + line);
    // 


    if (m = line.match(/you may\s*(.*)/i)) {
        atomic.optional = true;
        line = m[1];
    }

    if (m = line.match(/your opponent may\s*(.*)/i)) {
        atomic.optional = true;
        atomic.ask_other = true;
        line = m[1];
    }

    line = line.trim();

    if (m = line.match(/Trash the top card of (.*)/i)) {
        if (!m[1].includes("deck") && !m[1].includes("security")) { // skip 'trash top of deck' or 'trash top of security' effects
            thing.game_event = GameEvent.DEVOLVE_FORCE;
            thing.td = new TargetDesc(m[1]);
            thing.choose = new DynamicNumber(1);
            line = "";
        }
    }




    //    "effect": "[When evolving] Trash any 1 evo card under 1 of your opponent's monsters.",
    //  // You may trash any 1 Option card from 1 monster's evolution cards
    // By trashing 2 of this Monster's evolution cards, activate the effect below
    if (m = line.match(/trash(?:ing)?(?: any)? (\d+) of (this monster.s evolution cards)/i)) {
        thing.game_event = GameEvent.EVOSOURCE_REMOVE;
        thing.td = new TargetDesc(m[2]);
        thing.choose = new DynamicNumber(parseInt(m[1]))
        line = "";
    }

    if (m = line.match(/trash(?:ing)? this card/i)) {
        thing.game_event = GameEvent.TRASH_FROM_FIELD;
        thing.td = new TargetDesc(m[2]);
        thing.choose = new DynamicNumber(1);
        line = "";
    }

    if (m = line.match(/shuffle your/i)) {
        thing.game_event = GameEvent.SHUFFLE;
        line = "";
    }

    if (m = line.match(/Search your security stack/i)) {
        logger.error("searching is revealing to all");
        thing.game_event = GameEvent.SEARCH;
        // thing.choose = new DynamicNumber(0);
        thing.n_mod = "your security";
        atomic.see_security = true; // ?? do we need this
        line = ""; // shouldnt' have anything else here
    }

    //                       1     2                3     4     5
    if (m = line.match(/play (\d+) (\[.*\] Tokens?) (.*)\((.*)\)(.*)/i)) {
        thing.game_event = GameEvent.PLAY;
        thing.choose = new DynamicNumber(parseInt(m[1]))
        thing.n = parseInt(m[1])
        thing.td = new TargetDesc(m[2]);
        thing.n_mod = "for free";
        line = m[5];
    }


    // detach sources card 
    // see also "from the evolution cards of (.*)", which is not yet handled
    if (m = line.match(/(.*)from this monster's evolution cards( or from your trash)?,?(.*)/i)) {
        // don't use "play" here
        if (!m[1].match(/play/i)) {
            line = (m[1].trim() + " " + m[3].trim()).trim();
            let detach = parse_detach(line);
            if (detach) {
                if (Array.isArray(detach)) {
                    // these shouldn't be simultaneous events, but right now nothing interrupts either
                    // this is a tough thing 
                    // NOTE: assumes only 2-element array
                    let proper_thing: any = { ...thing };
                    let d0 = detach[0];
                    for (let item in d0) {
                        proper_thing[item] = d0[item];
                    }
                    //                if (d0.choose) thing.choose = d0.choose;
                    proper_thing.choose ||= 1;
                    atomic.subs.push(proper_thing);
                    detach = detach[1];
                }
                // typescript makes this more painful           
                thing.game_event = detach.game_event;
                thing.td = detach.td;
                thing.td2 = detach.td2;
                thing.choose = detach.choose || 1;
                thing.n_mod = detach.n_mod;
                line = "";
            }
        }

        // * place (in battle area, under instance, bottom security, bottom deck, top of security
        // * play (.) without paying (.*) cost
        // * return to hand, bottom deck, 
        // * return OR play
        // * return AND place
        // play XXX without paying the cost
        // return(ing), place(ing), play
        // * trashing <-- this is an already handled mechanic, EVOSOURCE_TRASH
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



    // put fusion evolve before normal evolve
    if (m = line.match(/2 of your monsters? (may )?DNA evolve into (.*?)\./i)) {
        let into = m[2];
        atomic.optional ||= !!m[1];
        thing.game_event = GameEvent.EVOLVE;
        thing.cause = EventCause.DNA; // not the cause, but still a flag
        thing.td = new TargetDesc(into);
        line = "";
    }

    // is this optional?
    if (m = line.match(/(.*) and (.*?)(may )?DNA evolve into (.*)/i)) {
        let left = m[1] + " in play";
        let right = m[2] + " in play";
        let into = m[4];
        atomic.optional ||= !!m[3];
        thing.game_event = GameEvent.EVOLVE;
        thing.cause = EventCause.DNA; // not the cause, but still a flag
        thing.td = new TargetDesc(into);
        thing.td2 = new TargetDesc(left);
        thing.td3 = new TargetDesc(right);
        line = "";

    }

    // is this optional? we ate "you may" above
    if (m = line.match(/(you )?(may )?(DNA evolve) (.*) and (.*) into (.*)(by paying)?/)) {
        let left = m[4] + " in play";
        let right = m[5] + " in play";
        let into = m[6];
        atomic.optional ||= !!m[2];
        thing.game_event = GameEvent.EVOLVE;
        thing.cause = EventCause.DNA; // not the cause, but still a flag
        thing.td = new TargetDesc(into);
        thing.td2 = new TargetDesc(left);
        thing.td3 = new TargetDesc(right);
        line = "";
    }


    //1 of your Monster may evolve into a red Monster card in your hand for its evolution cost. When it would evolve by this effect, reduce the cost by 2.

    //you may evolve it into a [xxx] in your trash for a evolution cost of 3.

    // this monster may evolve into [xxx] from your trash for a evolution cost of 3, ignoring its evolution requirements.",

    // this monster may evolve intp [yyy] from your (hand)for a evolution/memory cost of 3, ignoring its evolution requirements
    // Search your security stack.
    //This Monster may evolve into a yellow Monster card with the [Vaccine] trait among them without paying the cost. 
    //This Monster may evolve into a yellow Monster card with the [Vaccine] trait among them without paying the cost
    // <alliance> boost : (should also say "from your hand or trash"
    if (m = line.match(/(.*)ignoring( its)? evolution requirements( and)?(.*)/)) {
        evo_ignore = true;
        line = m[1].trim() + " " + m[4].trim();
    }
    if (m = line.match(/(.*)When (it|this Monster) would evolve ...?.? this effect, reduce the( evolution)? cost by (\d)/i)) {
        evo_reduced = parseInt(m[4]);
        line = m[1];
    }
    if (m = line.match(/(.*)for an? (evolution |memory )?cost of (\d+)/)) {
        evo_cost = parseInt(m[3])
        line = m[1];
    }
    //   '1 of your Monster without [X YYY] in its evolution cards may evolve into a Monster card with the [X Antibody] trait in your hand with the evolution cost reduced by 1. If it did, place this card as its bottom evolution card.',
    // how to distinguish "[when attacking] this may evolve into Bob" from a passive "this may evolve into bob"?? 

    if (Solid_is_triggered(solid)) {
        //                  1    2             3                4    56                      7                                           8           9                                   10      
        if (m = line.match(/(.*?)( may )?evolv(?:e|ing)(.*) into ?a?n? ?(.*) ((in|from) (?:your|the) (hand|trash|face.up security cards?)|among them)\s*,?\s?(with the evolution cost reduced by (\d)+|without paying the cost)?/i)) {
            if (m[8]) {
                if (m[9]) {
                    evo_reduced = parseInt(m[9]);
                } else {
                    evo_cost = 0;
                    evo_free = true;
                }
            }
            // if already set to true above, don't change setting. evolution is *usually* optional, anyway
            atomic.optional ||= !!m[2];
            // you may evolve XX
            if (m[1] && !m[1].match(/\byou\b/i)) {
                evo_source = m[1];
                // XX may evolve
            } else {
                evo_source = m[3];
            }
            evo_dest = m[4];
            evo_from = m[7]; // from hand? from trash? from security? from hammerspace?

            if (parserdebug) logger.debug(`evo source <${evo_source}> evo dest <${evo_dest}> evo cost <${evo_cost}>`);
            line = "";
        } else if (m = line.match(/evolv(?:e|ing) (it) into (this card) without paying the cost/)) {
            evo_free = true;
            evo_dest = m[2];
            evo_source = m[1];
            line = "";
        }

        if (m = line.match(/(.*?)( may )?evolve into (that card)/i)) {
            evo_source = m[1]
            atomic.optional ||= !!m[2];
            evo_dest = m[3]
            line = "";
        }



        if (evo_dest) {
            logger.info(`dest ${evo_dest} source ${evo_source} from location ${evo_from} cost ${evo_cost} reduced ${evo_reduced} ignore ${evo_ignore}`);
            thing.game_event = GameEvent.EVOLVE;
            // for .EVOLVE the "target" is the card.
            // I'm gonna need a special effect loop clause for this anyway.
            thing.choose = new DynamicNumber(1);
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
    } else {
        logger.error("NOT TRIGGERED!");
    }

    // this should be more generic than "in your hand"
    if (m = line.match(/This monster ... evolve into a?n? ?\[(.*)\] in (your|the) hand/i)) {
        // "ignore requirements" is implied
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc("self"),
            stat_conds.push({
                s: {

                    game_event: GameEvent.MAY_EVO_FROM,
                    n: evo_cost, // previously set
                    td: new TargetDesc("dummy"),
                    cause: EventCause.EFFECT, // really?
                    n_mod: m[1]
                },
                exp_description: expiration
            });
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


    if (m = line.match(/reduce (?:the )?(?:its )?(use|memory|evolution|play)\s*cost(?: of the evolution)? by (\d)\.?/)) {
        // we need to update the solid effect to say it modifies play cost
        if (!solid) {
            console.error("no solid for modify cost");
            // it's a passive effect!
            //            let b: any = null; b.no_solid();
        }
        thing.game_event = GameEvent.MODIFY_COST;
        thing.n = parseInt(m[2]);
        thing.n_mod = "reduced";
        line = "";
        logger.info("MODIFY_COST: " + thing.n + " " + thing.n_mod);

    }

    // built for stack summon
    //    console.error(line);
    if (m = line.match(/plac(e|ing) (up to (\d+) )?(.*from your .*hand.*battle.*) under (it|that monster)/i)) {
        //console.error(m);
        // the target is our choices;
        thing.game_event = GameEvent.STACK_ADD;
        //        thing.td = new TargetDesc(m[2]);

        let tgt = m[4].trim();
        let numbers = false;
        let n;
        if (n = tgt.match(/(.*)w.different card numbers/)) {
            tgt = n[1];
            numbers = true;
        }
        // a x b c c
        //Lv.4 w/[xxx]/[Rareyym]\u00a0in its name x Lv.4 w/[Dog]\u00a0trait
        //       3 Lv.4 [Zabbo]\u00a0trait monster cards w/different card numbers
        let multi = new MultiTargetDesc(tgt);
        if (m[2]) thing.choose = new DynamicNumber(parseInt(m[3]));
        let c = multi.count()
        if (c.value() > 1) thing.choose = c;
        thing.td = multi;
        thing.n_mod = "upto different " + (numbers ? "number" : "name");

        line = "";
    }

    if (m = line.match(/plac..?.? this tamer and 1 (.*) and 1 (.*) from your trash.*?one of your (.*?).s bottom/i)) {
        // like evolve, take_under needs 2 targets
        thing.game_event = GameEvent.EVOSOURCE_ADD;
        thing.td = new TargetDesc("1 of your [Terriers]");
        thing.cause = EventCause.EFFECT;
        thing.choose = new DynamicNumber(1);
        // let stat_cond = null;
        line = "";
    }

    // place this monster to
    if (m = line.match(/place (.*) to (?:1|one) of (.*?)(as its bottom evolution card.?)?$/i)) {
        thing.game_event = GameEvent.TUCK;
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(m[1]);
        thing.td2 = new TargetDesc(m[2]); // where to put the card
        /*   thing.game_event = GameEvent.TARGETED_CARD_MOVE; this targets the cards you move 
        thing.td = new TargetDesc(m[1]);
        thing.td2 = new TargetDesc(m[2]);*/
        line = "";
    }


    // Place this card under 1 of your green Monster.
    if (m = line.match(/place (this card) under (?:1|one) of (.*)/i)) {
        logger.warn("evo_source add is obsolete, use target_card_move");
        thing.game_event = GameEvent.EVOSOURCE_ADD;
        thing.td = new TargetDesc(m[2]); // where to put the card
        /*   thing.game_event = GameEvent.TARGETED_CARD_MOVE; this targets the cards you move 
        thing.td = new TargetDesc(m[1]);
        thing.<td2> = new TargetDesc(m[2]);*/
        thing.choose = new DynamicNumber(1);
        line = "";
    }

    // Place this card under 1 of your green Monster.
    if (false)
        if (m = line.match(/place (this card) as (its) bottom evolution card/i)) {
            logger.warn("evo_source add is obsolete, use target_card_move");
            thing.game_event = GameEvent.EVOSOURCE_ADD;
            thing.td = new TargetDesc(m[2]); // where to put the card
            /*   thing.game_event = GameEvent.TARGETED_CARD_MOVE; this targets the cards you move 
            thing.td = new TargetDesc(m[1]);
            thing.td2 = new TargetDesc(m[2]);*/
            thing.choose = new DynamicNumber(1);
            line = "";
        }


    // placing 1 lv 5 or lower (x or y) from your trash as this monster's bottom card
    if (m = line.match(/plac(e|ing) (up to (\d) )?(.* from your (.*))\s*(as this monster's bottom (.*)card|under it)/i)) {
        let tgt = m[4];
        thing.n_mod = `bottom`; // where the added cards go... is this even necessary?
        if (m[2]) thing.n_mod += "upto ";
        let n;
        if (n = tgt.match(/(.*)with different names(.*)/)) {
            let s = n[1].trim() + " " + n[2].trim();
            tgt = s;
            thing.n_mod += "different name";
        }
        // targeted_card_move, or stack_add?
        // if i can pull from field or trash, stack_add, otherwise targeted_card_move
        // this needs some more though
        thing.game_event = m[5].includes("battle area") ? GameEvent.STACK_ADD : GameEvent.TARGETED_CARD_MOVE;
        thing.n = 1;
        thing.choose = new DynamicNumber(parse_number(m[3]) || 1);
        thing.td = new TargetDesc(tgt); // from
        thing.td2 = new TargetDesc('self');
        line = "";
    }

    if (m = line.match(/plac(e|ing) (this card) as (its) bottom (.*)card/i)) {
        let tgt = m[2];
        thing.game_event = GameEvent.TARGETED_CARD_MOVE;
        thing.n = 1;
        thing.choose = new DynamicNumber(parse_number(tgt));
        thing.td = new TargetDesc(tgt); // from
        thing.td2 = new TargetDesc('it');
        thing.n_mod = `bottom`;
        line = "";
    }


    //By placing (1 Monster card with the [XXX] trait in your hand) face up as the bottom security card
    //Place (this card) face up as the top security card
    // Place this card          on     top of your security stack
    if (m = line.match(/plac(e|ing) (.*?)( face.up)? (as|at|on).*?(top|bottom).*?security/i)) {
        let tgt = m[2];
        let face = m[3] ? "face-up" : "face-down";
        let top = m[5];
        thing.game_event = GameEvent.TARGETED_CARD_MOVE;
        if (tgt.includes("card")) {
            // abandoned code path?
            thing.game_event = GameEvent.TARGETED_CARD_MOVE;
        }
        thing.n = 1;
        thing.choose = new DynamicNumber(parse_number(tgt));

        thing.td = new TargetDesc(tgt); // from
        thing.td2 = new TargetDesc("security");
        thing.n_mod = `${face} ${top}`;
        line = "";
    }

    //Then, place this card into your battle area.
    // in the battle area, into your battle area
    if (m = line.match(/place this card in.?.? ....? battle area/i)) {
        thing.game_event = GameEvent.PLACE_IN_FIELD;
        thing.td = new TargetDesc("this card");
        thing.choose = new DynamicNumber(1);
        line = "";
    }

    if (m = line.match(/Reveal the top card.? of your deck. If it is a (black card)?.*add it to your hand.*(Trash the rest)/i)) {
        console.error("obsoelete");
        atomic.search_n = 1; // parseInt(m[1]);
        thing.game_event = GameEvent.REVEAL_TO_HAND;
        thing.choose = new DynamicNumber(1);
        atomic.search_multitarget = new MultiTargetDesc(m[1]);
        thing.td = new TargetDesc(m[1]);
        atomic.search_final = Location.TRASH;
        line = "";
    }
    //Reveal the top 3 cards of your deck. Add 1 green Monster card and 1 such Tamer
    //   card among them to the hand. Return the rest to the bottom of the deck. place this card in the battle area

    //Reveal the top 2 cards of your deck.
    //Add 1 green card among them to your hand. Place the rest at the bottom of your deck in any order. Then, place this card into your battle area.

    line = line.trim();

    if (m = line.match(/^Reveal(.*)card(?:.*)your deck\.?$/i)) {
        m = m[1].match(/.*(\d).*/);
        let count = (m && parseInt(m[1])) || 1;
        thing.n = count;
        thing.game_event = GameEvent.REVEAL; // assume from deck
        thing.td = new TargetDesc("player");
        line = "";
    }

    if (m = line.match(/^Add (.*) among them to .* hand\.?\s*$/i)) {
        thing.game_event = GameEvent.REVEAL_TO_HAND;
        let multitarget = new MultiTargetDesc(m[1]);
        thing.td = multitarget;
        thing.choose = new DynamicNumber(multitarget.count().value());
        if (thing.choose.value() > 1)
            thing.n_mod = "upto";
        line = ""
    }

    if (m = line.match(/^Trash the re(st|.* cards)*\.?$/i)) {
        thing.game_event = GameEvent.REVEAL_CLEAR;
        thing.n = Location.TRASH;
        line = ""
    }

    if (m = line.match(/^(Return|Place) the re.* (?:to|at) the (top|bottom).*deck( in any order)?\.?$/i)) {
        thing.game_event = GameEvent.REVEAL_CLEAR;
        thing.n = Location.DECK;
        thing.n_mod = m[1];
        line = ""
    }



    if (false)
        if (m = line.match(/Reveal the top (\d+) cards of your deck. Add (.*?) among them to ....? hand. (Return|Place|Trash) the (rest|remaining cards)(the bottom)?/i)) {   // atomic.unused_search_choose = [];
            atomic.search_n = parseInt(m[1]) // parseInt(m[1]);
            thing.game_event = GameEvent.REVEAL_TO_HAND;

            // I am totally cheating these search types
            thing.choose = new DynamicNumber(2);
            thing.n_mod = "upto";
            if (m[2].match(/1 (\w*) card/)) {
                thing.choose = new DynamicNumber(1);
                thing.n_mod = "";
            }
            atomic.search_multitarget = new MultiTargetDesc(m[2]);
            //      thing.multitarget
            thing.td = new TargetDesc(m[2]);
            atomic.search_final = m[3] == "Trash" ? Location.TRASH : Location.DECK;
            line = "";
        }

    // you may used to be here


    // if at start, we've got another subeffect, like <draw 1> and +2000 DP
    // ERROR! <Draw 1> and +2000 DP are *not* simultaneous!
    if (m = line.match(/^and (.*)/)) {
        if (parserdebug) logger.debug("DEBUG: ATOMIC2 FOUND 'AND'");
        let proper_thing: SubEffect = thing;
        atomic.subs.push(proper_thing);  // finish the old one, start a new one

        thing = {
            game_event: GameEvent.NIL,
            td: new TargetDesc(""), choose: new DynamicNumber(0), n: 0, n_mod: "", n_max: 0,
            immune: false,
            cause: EventCause.EFFECT,
        };

        line = m[1];
    }





    ///// EXPIRATION, this implies a status condition
    const for_the_turn_re = new RegExp("^(.*)for (the|this) turn[.,]?(.*)$", "i");
    if (m = line.match(for_the_turn_re)) {
        expiration = { END_OF_TURN: "THIS" };
        //    if (parserdebug) logger.debug("EXPIRATION");
        //     if (parserdebug) logger.debug(expiration);

        line = m[1].trim() + " " + m[3].trim();
    } else if (m = line.match(/^(.*)until the end of( their| your opponent's| your)?(?: next)? turn,?(.*)$/i)) {
        //			if (parserdebug) logger.debug("UNTIL WHEN, EFFECT");
        expiration = { END_OF_TURN: m[2] == " your" ? "YOUR" : "OPPONENT" };
        line = m[1] + " " + m[3];
    } else if (m = line.match(/^(.*)until (their) turn ends,?(.*)$/i)) {
        //			if (parserdebug) logger.debug("UNTIL WHEN, EFFECT");
        expiration = { END_OF_TURN: m[2] == "your" ? "YOUR" : "OPPONENT" };
        line = m[1] + " " + m[3];
        //	if (parserdebug) logger.debug("UNTIL 2:" + effect);
        //    if (parserdebug) logger.debug("EXPIRATION");
        //    if (parserdebug) logger.debug(expiration);
    } else if (m = line.match(/^(.*)during (.*) unsuspend phase.?(.*)$/i)) {
        expiration = { UNSUSPEND: "YOUR" };
        line = m[1].trim() + " " + m[3].trim();
    }
    if (expiration) {
        if (parserdebug) {
            logger.info("expiration");
            logger.info(JSON.stringify(expiration));
            logger.info("exporation line now " + line);
        }
    }
    // if (parserdebug) logger.debug("AFTER EXPIRY LINE IS " + line);


    if (m = line.match(/(.*)none of(.*) can (.*)/i)) {
        logger.info("old line: " + line);
        line = `${m[1]}all of${m[2]} can't ${m[3]}`;
        logger.info("new line: " + line);
    }

    //    if (parserdebug) logger.debug("RECURSIVE?: " + line);
    // since this is recursive it needs to be one of the first ones.
    if (m = line.match(/(.*)gains? "(.*)"/i)) {
        if (parserdebug) logger.info("FOUND RECURSIVE");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;

        let [_0, nested_solid_effect, _1] = new_parse_line(m[2], card, label, "main"); // how could we pass through a card here, we won't have any card keywords
        // we don't give card keywords by effect inside quote marks
        if (parserdebug) logger.info(`NESTED EFFECT: ${_0} ${nested_solid_effect} ${_1}`);
        stat_conds.push({
            s: {
                game_event: GameEvent.NIL,
                td: new TargetDesc(""), // this doesn't need a target
                cause: EventCause.EFFECT // default to everything being an effect
            },
            solid: [nested_solid_effect],
            // can't assign this, not proper recursion
            // solid: nested_solid_effect,
            exp_description: expiration
        })
        // this is duplicate code, but attempting to refactor breaks tests
        let tgt = m[1];

        thing.choose = new DynamicNumber(parseInt(tgt));
        let temp_m;

        if (temp_m = tgt.match(/all of (.*)/i)) {
            thing.choose = new DynamicNumber(0);
            tgt = "blanket " + temp_m[1];
        }

        thing.td = new TargetDesc(tgt);
        line = "";
    }









    //your opponent's effects can't delete this Monster or return it to the hand or deck

    /////// STATUS CONDITIONS  If no expiration, they are continuous/persistent/both?

    // memory floodgate => put into effectloop.ts


    // I'm doing this as two (three?) separate effects
    if (m = line.match(/(.*)your opponent.s effects can.t delete (this Monster )or return (it|this monster) to the hand or deck(.*)/i)) {
        logger.warn("ignoring field-to-hand");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = new DynamicNumber(1); // we do need to target
        thing.td = new TargetDesc(m[2]); // "this monster"
        stat_conds.push({
            s: {
                game_event: GameEvent.DELETE,
                td: new TargetDesc("opponent"), // This may be the opposite of what I want
                immune: true,
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });
        proper_thing = thing;
        logger.warn("use array");
        proper_thing.status_condition = [...stat_conds]; stat_conds.length = 0;
        atomic.subs.push(proper_thing);
        thing = {
            game_event: GameEvent.GIVE_STATUS_CONDITION,
            td: new TargetDesc(m[2]), choose: new DynamicNumber(1), n: 0,
            immune: true,
            n_mod: "", n_max: 0,
            cause: EventCause.EFFECT
        };
        stat_conds.push({
            s: {
                game_event: GameEvent.TO_BOTTOM_DECK,
                td: new TargetDesc("opponent"), // This may be the opposite of what I want
                immune: true,
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });

        line = m[1] + " " + m[3]
    }

    line = line.trim();

    // 1. persistent: all your yellow monsters get +310 DP. 
    // 2. blanket: when X triggers, until Y, all your opponent's monsters get +1000 DP.
    let blanket = "";
    // make a blanket if it expires; otherwise it's persistent and gets re-applied constantly, autoamtically
    if (true) {
        // At the start of a sentence, like (all of) (your monsters) (get +2000 DP)
        // That becomes a status on the player which additionally has its own targets
        if (line.toLowerCase().startsWith("all of")) {
            thing.choose = new DynamicNumber(ALL_OF);
            line = line.after("all of").trim();
            if (expiration) blanket = "blanket ";
        } else if (m = line.match(/^(up to )?(\d+) of (.*)/)) {
            thing.choose = new DynamicNumber(parseInt(m[2])); // isn't this what parse_number is for??
            line = m[3];
            if (m[1]) thing.n_mod = "upto";
            //            blanket = "blanket ";
        }
    }

    /*
    // can't unsuspend during next unsuspend phase
    // assuming singular for now, test for blanket
    if (m = line.match(/(.*) doesn.t unsuspend during(.*)/)) {
                thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.td = new TargetDesc(blanket + m[2]);
        stat_cond = {
            s: {
                game_event: GameEvent.UNSUSPEND,
                td: new TargetDesc(""),
                immune: true,
                cause: EventCause.ALL // for any reason... maybe use 0?
            },
            exp_description: expiration
        };
 
    }*/

    // 1 of their monster can't unsuspend
    if (m = line.match(/^()(.*)(?:don.t|doesn.t|can.t|cannot) (un)?suspend( or evolve)?(.*)/i)) {
        //			thing['game_event'] = GameEvent.ALL;
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1); // why 1?
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.td = new MultiTargetDesc(m[2], blanket); // this blanket value is apparently unused?
        stat_conds.push({
            s: {
                game_event: m[3] ? GameEvent.UNSUSPEND : GameEvent.SUSPEND,
                td: new TargetDesc(""),
                immune: true,
                cause: EventCause.ALL // for any reason... maybe use 0?
            },
            exp_description: expiration
        })
        // I need to either
        //  1) wrap both immunities into one effect, which has its advantages, or
        //  2) say "the targets of this are the targets of the last thing" and I think
        //     this will be helpful in many more cases. ... Like, <Alliance> uses this.
        //     Already did. How did I do <Alliance>?
        if (m[4]) {
            proper_thing = thing;
            proper_thing.status_condition = [...stat_conds]; stat_conds.length = 0;
            logger.warn("use array?");
            atomic.subs.push(proper_thing);
            thing = {
                game_event: GameEvent.GIVE_STATUS_CONDITION,
                td: new TargetDesc(m[2]), choose: thing.choose, n: thing.n,
                immune: true,
                n_mod: "previous sub", n_max: 0,
                cause: EventCause.EFFECT
            };
            stat_conds.push({
                s: {
                    game_event: GameEvent.EVOLVE,
                    td: new TargetDesc(""), // can't evolve, from any source or for any cause
                    immune: true,
                    cause: EventCause.ALL
                },
                exp_description: expiration
            })
        };
        line = m[5]
    }

    // this monster is unaffected by your opponent's monster's effects.",
    if (m = line.match(/(.*) is\s*(un|not|n't)\s*affected.by (.*effects.*)/i)) {
        //			thing['game_event'] = GameEvent.ALL;
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = new DynamicNumber(1); // we do need to target
        thing.td = new TargetDesc(m[1]);
        let target = "";
        if (m[3].match(/monster/i)) {
            target = "their monster";
        }
        stat_conds.push({
            s: {
                game_event: GameEvent.ALL,
                // td, in immunity, is the source of the effect I'm immune to,
                // and is resolved in Instance::can_do
                td: new TargetDesc(target), // This may be the opposite of what I want
                immune: true,
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });
        line = ""
    }


    // TODO: this probably could follow into the clause below
    if (line.match(/suspend(ing)? this tamer/i) || line.match(/suspend to attack/)) {
        thing.game_event = GameEvent.SUSPEND;
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc("self");
        line = ""; // do we lose anything?
    }



    line = line.trim();
    ////// Imperatives (sentence starts with verb)

    // see 14-12-1, adding information
    // (.*) is (also) treated as an? 3000 DP monster (and|that) can't evolve (?:and gains ...)
    // (.*) is treated as (also) having the colors of (...)
    m = line.match(/(.*) is also treated as an? (\d+) DP monster( (?:and|that) can.t evolve)?(\s*and gains\s*(＜.*＞))?/i);
    if (!m) {
        m = line.match(/treat (the Tamer played with this effect) as a (\d+) DP ()Monster(\s*with\s*(＜.*＞))?/i);
        if (m) m[1] = "it";
    }
    if (m) {
        logger.warn("need to make un-evolvable");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(m[1])
        stat_conds.push({
            s: {
                game_event: GameEvent.ADD_INFORMATION,
                n_mod: "Monster:true;DP:" + m[2],
                td: new TargetDesc(""),
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });
        if (m[4]) {
            let keywords: KeywordArray = {};
            let word = m[5];
            keywords[word] = word;
            stat_conds.push({
                s: {
                    cause: EventCause.EFFECT,
                    game_event: GameEvent.KEYWORD,
                    n: 58,
                    td: new TargetDesc(""),
                },
                solid: undefined,
                keywords: keywords,
                exp_description: expiration
            });
        }
        line = ""; // m[3];
    }
    // see 14-12-2, changing information
    // change the original DP of (.*) to (.*)
    // change (.*) into (a color monster with X DP and an original name of [XX])
    // change (.*) into (being white and having X DP and an original name of [XX])
    // change (.*) into (a color other than white)  // SKIPPING FOR INTERFACE ISSUES need to ask again
    if (m = line.match(/change the original DP of (.*) to (.*)/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(m[1])
        stat_conds.push({
            s: {
                game_event: GameEvent.CHANGE_INFORMATION,
                n_mod: "DP:" + m[2],
                td: new TargetDesc(""),
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });
        line = ""; // m[3];
    }
    if (m = line.match(/change (.*) into (?:being |a )?(red|blue|yellow|green|black|purple|white) (?:monster )?(?:with |and having )(\d+ )DP and an original name of \[(.*)\]/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(m[1])
        stat_conds.push({
            s: {
                game_event: GameEvent.CHANGE_INFORMATION,
                n_mod: `Color:${m[2]};DP:${m[3].trim()};Name:${m[4]}`,
                td: new TargetDesc(""),
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });
        line = ""; // m[3];
    }



    // only used by 1 test
    if (m = line.match(/give (.*?)\s+([-0-9+]* DP(.*))/i)) {
        console.error("legacy DP 1");
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(m[1])

        stat_conds.push({
            s: {
                game_event: GameEvent.DP_CHANGE,
                n: parseInt(m[2]),
                td: new TargetDesc(""),
                cause: EventCause.EFFECT
            },
            exp_description: expiration
        });
        line = ""; // m[3];
    }


    // what else could "it" mean here?
    if (m = line.match(/set (?:it|your memory|the memory) to (\d)( on .* opponent.s side)?/)) {
        //        thing.choose = parseInt(m[1]);
        thing.game_event = GameEvent.MEMORY_SET;
        thing.n = parseInt(m[1]);
        if (m[2]) thing.n *= -1;
        line = "";
    }

    if (m = line.match(/^Return (\d)(.*) from (your)?\s*trash.*hand/i)) {
        thing.choose = new DynamicNumber(parseInt(m[1]));
        thing.game_event = GameEvent.TRASH_TO_HAND;
        thing.td = new TargetDesc(m[2] + " in your trash");
        line = "";
    }

    // returning (1 [x] and 1 [y] from your trash) to the bottom of the deck

    //  return 1 of their suspended Monster to the bottom of the deck',
    //  returning 1 of each monster card with different levels from your opponent's trash to the top of the deck
    if (m = line.match(/^Return(ing)? (.*) to the (top|bottom|hand)(?: of .{1,14} deck)?/i)) {
        let dest = m[3];
        let mod_dest = (dest === "hand") ? "hand" : `${dest} deck`;
        let tgt = m[2].trim();
        // multitarget? 
        let multi: MultiTargetDesc;
        if (tgt.includes(" and ")) {
            multi = new MultiTargetDesc(m[2]);
            thing.choose = multi.count();
            logger.info("choose is " + thing.choose);
            thing.game_event = GameEvent.TARGETED_CARD_MOVE;
            thing.td = multi;
            thing.n_mod = mod_dest;
        } else {
            let n;
            thing.game_event = GameEvent.TO_BOTTOM_DECK; // not right
            // we should use TARGETED_CARD_MOVE for all of these things
            if (dest === "hand") thing.game_event = GameEvent.FIELD_TO_HAND;
            thing.n_mod = mod_dest;
            if (n = tgt.match(/(\d) of (.*)/)) {
                multi = new MultiTargetDesc(n[2]);
                thing.td = new TargetDesc(n[2]);
                thing.choose = new DynamicNumber(parseInt(n[1]));
            } else {
                multi = new MultiTargetDesc("");
                //  console.error("missing?", tgt);
                thing.td = new TargetDesc(tgt);
                thing.choose = new DynamicNumber(1);
                logger.warn("missing thing");
            }
            if (tgt.match(/each monster card with different levels/i)) {
                thing.choose = new DynamicNumber(99);
                thing.n_mod = "upto different level; top deck";
                tgt = "their monster from trash with a level";
                thing.game_event = GameEvent.TARGETED_CARD_MOVE;
                thing.td = new TargetDesc(tgt);
            }
            line = "";
        }
    }


    // this is should be obsolete, but isn't
    if (m = line.match(/^Return (\d) of(.*) to (its owner.s|the) hand/i)) {
        thing.choose = new DynamicNumber(parseInt(m[1]));
        // "reveal" is dumb, but does it work?
        thing.game_event = GameEvent.FIELD_TO_HAND;
        thing.td = new TargetDesc(m[2]);
        line = "";
    }

    // you may switch the target of attack to 1 of your opponent's unsuspen\


    if (m = line.match(/(change|switch) the (attack target|target of attack) to (.*)$/i)) {
        let tgt = m[3];
        //thing.choose = parseInt(m[3]);
        // "reveal" is dumb, but does it work?
        thing.game_event = GameEvent.ATTACK_TARGET_SWITCH;
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(tgt);
        line = "";
    }



    line = line.trim();

    if (m = line.match(/trash(ing)? the top (\d+ )?cards? of (your|their|both players.?) decks?(.*)/i)) {
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
        thing.td2 = new TargetDesc(player == "their" ? "their deck" : "your deck");
        thing.td = new TargetDesc("trash");
        if (player.startsWith("both")) {
            proper_thing = thing;
            atomic.subs.push(proper_thing);
            thing = {
                game_event: GameEvent.MOVE_CARD,
                // "n" is set but not really used. effectloop needs to
                // "target" everything we trash, so we can respond to
                // specific things being trashed
                td: new TargetDesc("trash"), choose: new DynamicNumber(count), n: count,
                td2: new TargetDesc("their deck"),
                immune: false,
                cause: EventCause.EFFECT,
                n_mod: "", n_max: 0
            }
        }
        line = m[4].trim();
    }



    // I need to make sure this also triggers CARD_REMOVE_FROM_HEALTH
    // your opponent adds the top card of their security stack to the hand
    // add your top security card to the hand
    if (m = line.match(/adds? .*(your top security|top.*their security).* to.{1,20} hand/i)) {
        thing.game_event = GameEvent.MOVE_CARD;
        // chosen_target should be a player
        thing.cause = EventCause.EFFECT,
            thing.td = new TargetDesc("hand");
        let which = m[1].includes("your top") ? "your top security" : "their top security";
        thing.td2 = new TargetDesc(m[1]); // must start with "your" and mention "Security"
        thing.n = 1;
        line = "";


    }


    // trashing both players' top security cards
    if (m = line.match(/trash(ing)? .*(both|your opponent|your|their).* security .*/i)) {
        thing.game_event = GameEvent.MOVE_CARD;
        // chosen_target should be a player
        thing.cause = EventCause.EFFECT;
        let target2 = m[2] == "your" ? "your security" : "their security";
        thing.td = new TargetDesc("trash");
        thing.n = 1;
        if (m[2] == "both") {
            proper_thing = { ...thing };
            proper_thing.td2 = new TargetDesc("your security");
            atomic.subs.push(proper_thing); // 
        }
        thing.td2 = new TargetDesc(target2);
        line = "";
    }

    // UNHANDLED Choose any number of your opponent's Monster and Tamers whose combined play costs
    // UNHANDLED choose any number of your opponent's Monster so that their play cost total is up to 6 
    // Choose any number of your opponent's Monster whose play costs add up to 15 or less and
    // Choose any number of your opponent's Monster whose total DP adds up to 10000 or less 
    // delete up to 8 play cost's total worth of your opponent's monsters
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
        thing.choose = new DynamicNumber(total);
        let what = m[2].match(/DP/i) ? "DP" : "play cost";
        thing.n_mod += `upto total ${what}; `;
        // only show things that fit in the cap
        thing.td = new TargetDesc(`${m[1]} with ${total} ${what} or less`);
        thing.cause = EventCause.EFFECT;
        line = "";
    }
    if (m = line.match(/(Delete) up to (\d+) play cost.s total worth of (.*)/i)) {
        let verb = m[1];
        let total = parseInt(m[2]);
        let target = m[3]
        if (verb.toLowerCase() == "delete") {
            thing.game_event = GameEvent.DELETE;
        } else {
            console.error(verb);
            let a: any = null; a.choose_sum();
        }
        thing.n = total;
        thing.choose = new DynamicNumber(total);
        let what = "playcost";
        thing.n_mod += "upto total play cost; ";
        // only show things that fit in the cap
        thing.td = new TargetDesc(`${target} with ${total} ${what} or less`);
        thing.cause = EventCause.EFFECT;
        line = "";
    }





    line = line.trim();
    // this handles VERB and VERB-ing
    line = line.replaceAll("deleting", "delete");
    // I want to use "PLAY" here but I think I handle it some place else??
    for (let key of ["DELETE", "SUSPEND", "UNSUSPEND", "HATCH"]) {
        // easy keywords

        // default imperative: DELETE a THING
        if (line.toUpperCase().startsWith(key)) {
            //            console.error(3049, line);

            logger.warn("found imperative " + key);
            if (parserdebug) logger.info("found simple verb: " + key);
            thing.game_event = strToEvent(key);

            // this will match everything, the else's don't matter
            if (m = line.match(/^(\w+) XXXXXX NO MATCH  YET   (.*?)$/i)) {
                // m[1] is the key, already
                let x = new MultiTargetDesc(m[2]);
                //console.error(x);
                thing.td = x;
                thing.choose = x.count();
                // delete 2 of X
                // suspend up to 3 Y.
            } else if (m = line.match(/^\w+( up to)? (\d|all)(?: of)? (.*?)$/i)) {
                // delete 2 of your opponent's monster
                if (m[1]) thing.n_mod = "upto";
                thing.choose = new DynamicNumber(parse_number(m[2]));
                thing.td = new TargetDesc(m[3]);
                /*
                if (m[3]) {
                    thing.n_mod = "foreach";
                    thing.n_target = new TargetDesc(m[4]);
                }*/
            } else {
                thing.choose = new DynamicNumber(1);
                let target = line.after(key);
                if (target.startsWith("ing")) target = target.after("ing").trim();
                logger.warn(`line is ${line} key is ${key} target is ${target}`);
                thing.td = new TargetDesc(target);
            }
            if (key == "HATCH") thing.choose = new DynamicNumber(0); // nothing to target
            line = "";
        }

        // default declarative: (this monster) (may) unsuspend"(.*)( may)\\s*" + key + "\\.", "i")
        // what if m[1] is "you"? 
        let regexp = new RegExp("^(.*?)( may)?\\s+" + key + "\\.", "i");
        if (m = line.match(regexp)) {
            logger.warn("found declarative " + key + " " + regexp + "::" + line);
            thing.game_event = strToEvent(key);
            thing.choose = new DynamicNumber(1); // the thing that can "verb"
            thing.td = new TargetDesc(m[1]);
            atomic.optional = !!m[2];
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

    // cost
    if (m = line.match(/paying (\d+) memory/i)) {
        thing.game_event = GameEvent.MEMORY_CHANGE;
        thing.n = 0 - parseInt(m[1]);
        line = "";
    }

    if (m = line.match(/(.*)(gain|lose) (\d+) memory(\s*for each)?/i)) {
        thing.game_event = GameEvent.MEMORY_CHANGE;
        thing.n = parseInt(m[3]);
        if (m[2].match(/lose/i)) thing.n = 0 - thing.n;
        // Check if we need per_unit at all now...
        //        if (m[4]) atomic.per_unit = true;
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
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc("this card");
        line = "";
    }


    // use ... without paying the cost
    // -: 'Play this card without paying the cost.', 
    // +: 'Play this card without paying its memory cost.', <-- obsolete? fandom gave it up
    //・You may play 1 [Terry]/[Looney] from your hand without paying the cost.

    if (m = line.match(/(play|use)\s*(.*?)\s*(without paying (the|its) (play |memory )?cost)/i)) {
        if (parserdebug) logger.debug("play match");
        thing.game_event = strToEvent(m[1]);
        thing.choose = new DynamicNumber(1);
        thing.td = new MultiTargetDesc(m[2]);
        line = "";
        thing.n_mod = "free";
    }
    //You may play 1 green Tamer card or 1 level 3 Monster card with
    //[Lopmon] in_its_name from your hand with the play cost reduced by 2.\n' +
    if (m = line.match(/play\s*(.*)\s*with the (play |use |memory )?cost reduced by (\d)/i)) {
        if (parserdebug) logger.debug("play match");
        thing.game_event = GameEvent.PLAY;
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc(m[1]);
        line = "";
        thing.n = parseInt(m[3]);
        thing.n_mod = "reduced";
    }

    if (m = line.match(/trash(ing)?\s*(up to\s*)?(\d+) card.? (in|from) your hand/i)) {
    }

    // this is both a "WHEN EVENT HAPPENS" and "DO A THING" ??
    //// TRASHING CARDS 
    if (m = line.match(/trash(ing)?\s*(up to\s*)?(\d+)\s*(.* card. (in|from) your hand)/i)) {
        thing.game_event = GameEvent.TRASH_FROM_HAND;
        thing.n = 0; // really??? parseInt(m[3]);
        thing.choose = new DynamicNumber(parseInt(m[3]));
        //thing.td = new TargetDesc("1 card in your hand");
        thing.td = new TargetDesc(m[4]);
        if (m[2]) thing.n_mod = "upto";
        line = ""; // maybe too aggressive to just assume we eat everything    
    }

    if (m = line.match(/trash(ing)? (\d) (.* (in|from) your hand)(.*)/i)) {
        thing.game_event = GameEvent.TRASH_FROM_HAND;
        thing.choose = new DynamicNumber(parseInt(m[2]));
        thing.td = new TargetDesc(m[3]);
        line = m[5]; // maybe too aggressive to just assume we eat everything    
    }


    //////// descriptives, subject-verb-object

    // XXX (gets +3000) and (gains <Keyword>)
    // or (gains <Keyword>)and (+2000 DP), the space before "and" often gets eated
    // figuring out how to break m[1] from m[2] is hard
    if (m = line.match(/(.*) (g.*)\s*and (.*?)\s*\.?\s*$/)) {
        let s1 = parse_give_status(m[2], card!);
        let s2 = parse_give_status(m[3], card!);
        if (s1 && s2) {
            if (!thing.choose.value()) thing.choose = new DynamicNumber(1); //?
            s1.exp_description = expiration;
            stat_conds.push(s1);
            s2.exp_description = expiration;
            stat_conds.push(s2);
            thing.td = new TargetDesc(m[1]);
            thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
            line = ""; // ignore m[4]!
        }
    }

    // How to handle "1 of your opponent's monster and all of their security monster"?
    if (m = line.match(/(.*)\s+(get|gain).?\s*([-0-9+]* DP(.*))/i)) {
        //        console.error(3072, m);
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        // if editing this check blocker-dp-boost
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        let x = parse_give_status(`${m[2]} ${m[3]}`, card!);
        if (x) {

            x.exp_description = expiration;
            stat_conds.push(x);
            //  line = ""; I re-parse "line" below
            //        if (and = text.match(/(1 .*) and ((1|all) .*)/i)) {
            let split;
            let target = blanket + m[1];
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

            if (false) {
                if (split = target.toLowerCase().match(/^(\d|all) (of )?(.*)/)) {
                    if (split[1] == "all") {
                        thing.choose = new DynamicNumber(0);
                        target = "blanket " + split[3];
                        // we aren't consuming the split[3] atm
                    } else {
                        thing.choose = new DynamicNumber(parse_number(split[1]));
                        target = split[3];
                    }
                }
            }


            // let this special case go first. Try to unfactor this.
            if (split = line.match(/((.*) and )?(all of (their|your opponent's) security monster)/i)) {

                let target1 = split[1] ? split[2] : "your monster with [XXX] in its name";
                let target2 = split[3]
                thing.td = new TargetDesc(target2);
                thing.choose = new DynamicNumber(0);
                // prep target2. If we have target 1, push target 2 and then make target 1
                proper_thing = thing;
                proper_thing.status_condition = [...stat_conds]; stat_conds.length = 0;

                // can't use array here, because different targets
                atomic.subs.push(proper_thing);

                stat_conds.push({
                    s: {
                        game_event: GameEvent.DP_CHANGE,
                        n: parseInt(m[3]),
                        td: new TargetDesc(target2),
                        cause: EventCause.EFFECT
                    },
                    exp_description: expiration
                })
                thing = {
                    game_event: GameEvent.GIVE_STATUS_CONDITION,
                    td: new TargetDesc(target1), choose: new DynamicNumber(1), n: 1,
                    immune: false,
                    cause: EventCause.EFFECT,
                    n_mod: "", n_max: 0
                }
                // since we have 2 subeffects, both need their n_count_tgt set
                thing.n_count_tgt = proper_thing.n_count_tgt;

            } else {
                thing.td = new TargetDesc(target);
            }
        }
        line = m[4]
    }

    if (false) {

        // this moved north by ~500 lines

        if (line.toLowerCase().startsWith("all of")) {
            thing.choose = new DynamicNumber(ALL_OF);
            line = line.after("all of").trim();
            blanket = "blanket ";
        }
    }


    // The second clause is working but it shouldn't be.
    if (m = line.match(/(.*?)(may attack|attacks|must attack)( a player|...?.? opponent.s .onster)?\s*(without suspending)?\.?(.*With this effect, .* can attack .* played)?/)) {
        // "1 of your Monsters attacks" -> you pick one, and we find a target (if any).  
        // This isn't working now; we will need a two step of "first, select a monster"
        // "You attack" -> find a target amongst all your Monsters.
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
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        thing.choose = new DynamicNumber(0);
        thing.td = new TargetDesc(blanket + m[1]),
            stat_conds.push({
                s: {
                    immune: true,
                    game_event: GameEvent.DELETE,
                    td: new TargetDesc("dummy"),
                    cause: EventCause.NORMAL_BATTLE || EventCause.SECURITY_BATTLE
                },
                exp_description: expiration
            });
        line = "";
    }


    if (m = line.match(/This monster is unblockable/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = new DynamicNumber(1);
        thing.td = new TargetDesc("self"),
            stat_conds.push({
                s: {
                    game_event: GameEvent.UNBLOCKABLE,
                    td: new TargetDesc("dummy"),
                    cause: EventCause.EFFECT,
                },
                exp_description: expiration
            });
        line = "";
    }




    if (m = line.match(/(.*) can.t attack( players)?/i)) {
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        thing.choose = new DynamicNumber(0);
        thing.td = new TargetDesc(m[1]);
        let safe = m[2] ? "player" : "";
        stat_conds.push({
            s: {
                game_event: GameEvent.ATTACK_DECLARE,
                td: new TargetDesc(safe),
                cause: EventCause.ALL, // really?
                immune: true,
            },
            exp_description: expiration
        });
        line = "";
    }

    // (.*) gets +3000 DP. OK
    // (.*) gain <Keyword> OK 
    // (.*) gets +3000 DP and gain <Keyword> needs a special case



    // gains <EFFECT>  until...
    //                  1      (2)            (3)       (4)
    if (m = line.match(/(.*)\s+(get|gain).?\s*(＜.*＞)\s*(.*)/i)) {
        if (parserdebug) logger.info(`effect gain: ${m[1]} gets ${m[3]}`);
        thing.game_event = GameEvent.GIVE_STATUS_CONDITION;
        if (!thing.choose.value()) thing.choose = new DynamicNumber(1);
        let x = parse_give_status(`${m[2]} ${m[3]}`, card!);
        if (x) {
            x.exp_description = expiration;
            stat_conds.push(x);
        }
        thing.td = new TargetDesc(m[1]);
        line = m[4];
    }

    //    console.error(3419, line);
    // default descriptive. Your thing unsuspends. 
    if (line) {
        for (let key of ["DELETE", "SUSPEND", "UNSUSPEND", "HATCH"]) {
            // easy keywords
            // 
            let regexp = new RegExp("(.*) " + key + "e?s?\.?$", "i");
            // default imperative: DELETE a THING
            if (m = line.match(regexp)) {
                logger.info("generic descriptive: " + key);
                thing.game_event = strToEvent(key);
                thing.td = new TargetDesc(m[1]);
                thing.choose = new DynamicNumber(1); // how did we lose the number?
                line = "";
            }
        }
    }

    proper_thing = thing;
    if (stat_conds.length > 0) {
        proper_thing.status_condition = stat_conds;
    }

    atomic.subs.push(proper_thing);
    if (line.match(/must block/)) {
        line = "";
    }
    return [atomic, line];
}

// doing keywords like this is no longer needed
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
        choose: new DynamicNumber(1),
        cause: EventCause.EFFECT | EventCause.ALLIANCE,
        label: "alliance", td: new TargetDesc("your unsuspended monster")
    };
    let cost = new AtomicEffect2();
    cost.raw_text = "suspending 1 of your other Monsters";
    cost.optional = true;
    cost.events = [suspend_other];
    cost.weirdo = suspend_other;
    cost.is_cost = 1;

    solid.effects = [cost];
    let t = new AtomicEffect2();
    t.raw_text = "Alliance Boost";

    // the first effect targets a monster
    // the second effect needs to get that monster's stats
    // effect loop needs to look up that first monster's stats somehow
    // It can certainly refer to the previous effect and what it targeted
    // 

    let alliance_dp: SubEffect = {
        game_event: GameEvent.GIVE_STATUS_CONDITION,
        td: new TargetDesc("self"),
        choose: new DynamicNumber(1),
        status_condition: [{
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
        }],
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
        choose: new DynamicNumber(1),
        status_condition: [{
            s: {
                cause: EventCause.EFFECT | EventCause.ALLIANCE,
                game_event: GameEvent.KEYWORD,
                n: 8888,
                td: new TargetDesc("")
            },
            keywords: keywords,
            exp_description: { END_OF_ATTACK: "" }
        }]
    };
    t.events.push(alliance_sa);
    t.raw_text = "add the suspended Monster's DP to this Monster and it gains ＜Security A. +1＞";
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
        let [card, solid, atomics] = new_parse_line(line, undefined, 'test', "main");

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
