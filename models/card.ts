

import { Player } from './player';
import { AtomicEffect, Solid_is_triggered, SolidEffect } from './effect';
import { TargetDesc } from './target';
import { Location } from './location';
import { Game } from './game';
import { new_parse_line } from './newparser';
import { Instance } from './instance';

let normal_circles = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
let inverse_circles = ["⓿", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾", "❿", "⓫", "⓬", "⓭", "⓮", "⓯", "⓰", "⓱", "⓲", "⓳", "⓴"];


let carddebug = 1;
import { Translator } from './translate';
import { GameEvent } from './event';

import { createLogger } from "./logger";
const logger = createLogger('card');

enum types { EGG = 1, MONSTER, TAMER, OPTION };
function word_to_type(word: string): types {
    switch (word.toUpperCase()) {
        case "": // incomplete card
        case "EGG": return types.EGG;
        case "MONSTER": return types.MONSTER;
        case "TAMER": return types.TAMER;
        case "OPTION": return types.OPTION;
        default:
            let c: any = null; return c.no_type(word);
    }
}

export enum Color {
    NONE,
    RED,
    BLUE,
    YELLOW,
    GREEN,
    BLACK,
    PURPLE,
    WHITE,
    MAX
};

export const all_colors: Color[] = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN,
Color.BLACK, Color.PURPLE, Color.WHITE];

export function word_to_color(word: string): Color {
    switch (word.toUpperCase()) {
        case "RED": return Color.RED;
        case "BLUE": return Color.BLUE;
        case "YELLOW": return Color.YELLOW;
        case "GREEN": return Color.GREEN;
        case "BLACK": return Color.BLACK;
        case "PURPLE": return Color.PURPLE;
        case "WHITE": return Color.WHITE;
        case "UNDEFINED": return Color.WHITE; // dev errors
        case "ALL":
        case "RAINBOW": return Color.NONE; // really?
        case "-":
        case "": console.error("undefined color field");
            return Color.NONE; // handle missing field
        default:
            console.error("bad color" + word);
            let c: any = null; return c.no_color(word);
    }
}

// [Red] [Blu.] [Yel.] [Gre.] [Bla.] [Pur.] [Whi.] [Rai.]
function abbr_parse_color(text: string): Color[] {
    let ret: Color[] = [];
    // gets colors in wrong order, sorry
    for (let c of all_colors) {
        let abbr = Color[c].substring(0, 3);
        if (text.includes(abbr)) {
            ret.push(c);
        }
    }
    return ret;
}

function parse_color(text: string): Color[] {

    let ret: Color[] = [];
    if (text == "[[]]") return ret; // incomplete card

    // split on " / " or "_" or "/"
    let words = text.split(/\s*\/\s*|_/);
    logger.debug("parse color");
    logger.silly(text);
    logger.silly(words.toString());
    for (let word of words) {
        ret.push(word_to_color(word));
    }
    return ret;
}

export interface EvolveCondition {
    color?: Color;
    level?: number;
    tamer?: boolean;
    cost: number;
    text?: string; // only used for errors, but maybe can be used normally
    two_color?: boolean; // this should be "color_count"
    trait?: string;
    //targ3et?: null;

    name_is: string; // TODO: make array
    name_contains?: string; // TODO: make array
}

export interface FusionEvolveCondition {
    left: EvolveCondition; // ignore the cost in the left and right
    right: EvolveCondition;
    cost: number;
}

export interface BurstEvolveCondition {
    monster: EvolveCondition; // ignore the cost in the left and right
    tamer: EvolveCondition;
    cost: number;
}



// for parsing dev
export enum colors {
    ERR = 0, RED, ERROR, BLUE, YELLOW,
    BLACK, GREEN, PURPLE, WHITE,
    UNDEFINED, // error
    RAINBOW,
    BLUE_YELLOW = 21,
    YELLOW_BLUE_BLACK = 43,
};


function clean(str: string): string {
    if (!str) return "";
    return str ? str.replaceAll("\r\n", "") : "";
}

export class CardInst {

}


export interface KeywordArray {
    [key: string]: string
}

// maybe this should be called "card data" ...?
export class Card {
    readonly input: any;
    fandom_input?: string;
    readonly class: string;
    //    raw: string;
    readonly n_type: number;
    readonly type: string;
    readonly n_color?: number;  // make obsolete
    readonly colors: Color[];
    readonly color?: string; // make obsolete
    readonly id: string;
    readonly card_id: string; // dupe for compatability
    readonly name: string;
    readonly dp: number;
    readonly level: number;
    readonly evolve_conditions: EvolveCondition[] = [];
    readonly fusion_evolve_conditions: FusionEvolveCondition[] = [];
    readonly burst_evolve_conditions: BurstEvolveCondition[] = [];
    readonly p_cost?: number;
    readonly u_cost?: number;
    readonly e_cost: number;
    readonly e_color?: number; // make obsolete
    readonly e_level?: number; // make obsolete
    readonly text: string;
    readonly mon_form: string = "x";
    readonly mon_type: string[] = [];
    readonly mon_attribute: string = "x";
    summary: string;
    readonly main_text: string;
    readonly inherited_text: string;
    readonly stack_summon?: string;
    security_text: string;
    //    readonly main_good_effects: 
    //  readonly n_me_player: number;
    overflow: number;

    alternate_allow?: TargetDesc;

    card_keywords: KeywordArray; // todo, make all these readonly
    card_inherited_keywords: KeywordArray; // todo, make all these readonly
    evolve: string[];
    dnaevolve: string;
    name_rule?: string;
    trait_rule?: string;
    stack_summon_n: number = 0;
    stack_summon_list: string[] = [];
    stack_summon_limit: number = 0;
    allow?: string;
    play_interrupt?: SolidEffect;

    // Cards are mostly static data, except the functions and
    // the location data below. I tried to split them into
    // separate structures and ran into lots of problems, I
    // need to try again at some point.

    private location: Location;
    card_instance_id: number = -4; // debug
    private mon_instance: number;
    new_effects: SolidEffect[];
    new_inherited_effects: SolidEffect[];
    new_security_effects: SolidEffect[];
    game?: Game;
    player?: Player;
    n_player: number = -99;
    face_up: boolean = false; // not sure this belongs here, maybe in stack or cardlocatiomn

    //  main_effects: any; // for now
    //    readonly inherited_effects: any;
    //    readonly security_effects: any; // for now

    JSON_data(): any {
        return {
            name: this.name,
            level: this.level,
            colors: this.colors_s(),
            dp: this.dp,
            type: this.type,
            effect: this.main_text,
            ess: this.inherited_text,
            sec: this.security_text,
            cost: this.p_cost || this.u_cost,
            evo_cost: this.e_cost
        }
    }

    get_location(): Location { return this.location; }



    parse_fusion_evolve(line: string, evo: any) {
        //  [mon1] + [mon2] : Cost 0",
        // [DNA_Evolve] blue Lv.4 + green Lv.4 : Cost 0
        let [left, right] = line.split("+");
        left = left.trim() + " : Cost 0";
        let l = this._parse_special_evolve(left, {}, true);
        let r = this._parse_special_evolve(right, {}, true);
        let cost = r.cost;
        let merge = { left: l, right: r, cost: cost };
        logger.debug(JSON.stringify(merge));
        this.fusion_evolve_conditions.push(merge);
    }

    parse_burst_evolve(line: string, evo: any) {

        let cost, monster, tamer;
        let m = line.match(/(\d) from \[(.*?)\] by returning 1 \[(.*?)\] to hand/i);
        if (m) {
            [,cost, monster, tamer] = m;
        } else {
            m = line.match(/\[(.*?)\] by returning 1 \[(.*?)\] to hand: Cost (\d)/i);
            if (m) {
                [,monster, tamer, cost] = m;
            }
        }
        if (monster && tamer) {
            let burst = {
                monster: { name_is: monster, cost: -1 },
                tamer: { name_is: tamer, cost: -1 },
                cost: parseInt(cost!)
            }
            logger.debug(JSON.stringify(burst));
            this.burst_evolve_conditions.push(burst);
        } else {
            console.error("failed burst evolve " + line);
        }
    }
    // (as side-effect, updates our evo list, unless no_push is set)
    // This started out small, but the bigger it gets the more it looks
    // like TargetDesc should be used instead. Stack Summoning has been
    // using TargetDesc instead and that format is close to this one
    // so we're getting close to not needing this.
    parse_special_evolve(line: string, evo: any, no_push: boolean = false) {
        let set = line.split("[Evolve]");
        for (let s of set) {
            this._parse_special_evolve(s, evo);
            evo = {}
        }
    }

    _parse_special_evolve(line: string, evo: any, no_push: boolean = false): any {
        line = line.trim();
        //[Evolve] 2-color w/[xxx] in_its_name: Cost 5
        //[Evolve] If name contains [yyy]: Cost 2
        //[Evolve] Attackamonster: Cost 0
        //[Evolve] Lv. 4 2-color green card: Cost 3
        //[Evolve] Lv. 5 2-color green card: Cost 3
        //[Evolve] Lv.2 w/[Trait_One]/[Trait_Two] trait: Cost 0
        //[Evolve] Lv.3 w/[xxx] trait: Cost 2
        //[Evolve] Lv.3 w/[yyy] in its name: Cost 3
        //[Evolve] Lv.4 w/[Leroy] in_its_name or [Sword] trait: Cost 3
        // [tamer]: Cost 2
        //[Evolve] [NAME]: Cost 0
        //[Evolve] [Dinobeemon] or Lv.5 w/[Insectoid] trait: Cost 3
        //[Evolve] red, black, or purple Lv.4 w/＜Save＞ in_its_text: Cost 4
        //[Evolve] w/[Rapidster] in its name: Cost 5
        // [Evolve] [Chillet]: Cost 3
        // [Evolve] Lv.4 w/[Gargler]/[Rapidster] in_its_name: Cost 3
        // Lv.6 w/[xxx]\u00a0in its name w/o [yyy]\u00a0trait: Cost 1
        //     console.error(line);
        let m;

        // red level 4: only used for fusions
        if (m = line.match(/^(red|blue|yellow|green|black|purple|white) Lv.(\d)\s+: Cost (\d+)$/i)) {
            // It's not too late to make colors a bitmap. Then we just 
            // need to match any bit
            evo.color = word_to_color(m[1]);
            evo.level = parseInt(m[2]);
            evo.cost = parseInt(m[3]);
        } else if (m = line.match(/^Lv.(\d)\s*: Cost (\d)$/i)) {
            evo.level = parseInt(m[1]);
            evo.cost = parseInt(m[2]);
        } else if (m = line.match(/^\s*\[?([\w ]*)\]?\s*: Cost (\d)$/i)) {
            evo.name_is = m[1];
            evo.cost = parseInt(m[2]);
            // [monone/montwo] in.its.name
        } else if (m = line.match(/^\s*\[(\w*)\]\[(\w*)\]\s*: Cost (\d)$/i)) {
            evo.name_is = m[1];
            evo.cost = parseInt(m[3]);
            if (!no_push) this.evolve_conditions.push(evo);
            evo = {};
            evo.name = this.name;
            evo.name_is = m[2];
            evo.cost = parseInt(m[3]);
            // (level 3)? w/[OneWord] in.its.name
            // Lv.6 w/[xxx]\u00a0in its name w/o [yyy]\u00a0trait: Cost 1
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[?(\w*)\]?.in.its.name(\s*w.o \[(.*?)\].trait)?\s*: Cost (\d)$/)) {
            //console.error(m);
            if (m[2]) evo.level = parseInt(m[2]);
            evo.name_contains = m[3];
            evo.cost = parseInt(m[4]);
            if (m[5]) evo.no_trait = m[5]; // not implemented
            evo.cost = parseInt(m[6]);
            // (level 3) w/[OneWord][TwoWord] in.its.name
            // 'Lv.3 w/[Fred]/[George] in_its_name: Cost 2'
            // Lv.4 2-color w/purple OR Lv.4 2-color purple card
            //                         1     2              34         5   6            7       8                           9
        } else if (m = line.match(/^\s*(Lv. ?(\d))? 2-color ((w\/)?\s*(.*?)( card)?)?\s*(w\/\[?(\w*)\]?.in.its.name)?\s*: Cost (\d)$/)) {
            //  console.error(m);
            if (m[1]) evo.level = parseInt(m[2]);
            // need either "w/COLOR" or "COLOR card" 
            if (m[3] && (m[4] || m[6])) evo.color = word_to_color(m[5]);
            if (m[7]) evo.name_contains = m[8];
            evo.cost = parseInt(m[9]);
            evo.two_color = true;
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[([^\]]*)\].trait\s*: Cost (\d)$/)) {
            if (m[2]) evo.level = parseInt(m[2]);
            evo.trait = m[3]
            evo.cost = parseInt(m[4]);
            if (!no_push) this.evolve_conditions.push(evo); // why push here?       

            // Lv.3 w/[XXX] in its name & w/[YYY] trait: Cost 2
            // this is too specific!!
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[([^\]]*)\].in.its.name (?:&|and) w\/\[(.*)\].trait\s*: Cost (\d)$/)) {
            if (m[2]) evo.level = parseInt(m[2]);
            evo.trait = m[4]
            evo.name_contains = m[3];
            evo.cost = parseInt(m[5]);
            if (!no_push) this.evolve_conditions.push(evo); // why push here?       
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[(\w*)\]\/\[(\w*)\].in.its.name\s*: Cost (\d)$/)) {
            if (m[2]) evo.level = parseInt(m[2]);
            evo.name_contains = m[3];
            evo.cost = parseInt(m[5]);
            if (!no_push) this.evolve_conditions.push(evo);
            evo = {};
            if (m[2]) evo.level = parseInt(m[2]);
            evo.name = this.name;  // try deleting this
            evo.name_contains = m[4];
            evo.cost = parseInt(m[5]);
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[(.*?)\]\/\[(.*?)\].trait\s*: Cost (\d)$/)) {
            if (m[2]) evo.level = parseInt(m[2]);
            evo.trait = m[3];
            evo.cost = parseInt(m[5]);
            if (!no_push) this.evolve_conditions.push(evo);
            evo = {};
            if (m[2]) evo.level = parseInt(m[2]);
            evo.trait = m[4];
            evo.cost = parseInt(m[5]);
        } else {
            evo.level = 42;
            evo.text = line;
            //  console.error(evo);
        }
        if (!no_push) this.evolve_conditions.push(evo);
        logger.debug(JSON.stringify(evo));
        return evo;

    }

    constructor(blob: any, text: string = "") {

        this.card_instance_id = -1;
        this.location = Location.UNKNOWN;
        this.mon_instance = -1;
        this.class = "Card";

        this.card_keywords = {};
        this.card_inherited_keywords = {};
        this.evolve = [];
        this.dnaevolve = "";
        //        this.evolve_conditions = [];
        //      this.dna_evolve_conditions = [];

        this.overflow = 0;
        this.new_effects = [];
        this.new_security_effects = [];
        this.new_inherited_effects = [];
        this.security_text = "";
        this.name = "err";

        this.e_cost = -1;

        text = Translator.text(text);

        let regexp = new RegExp(/^\*\*\*\*\* (.*)\((.*)\) \*\*\*\*\*$/);
        if (text != "") {

            this.fandom_input = text;
            let lines: string[] = text.split("\n");
            let m;
            let i = 0;
            //logger.info(text);
            while (lines.length > 0 && lines[0].length < 3) lines.splice(0, 1);

            let style = "fd";
            if (lines[0].includes("—") || lines[0].includes("ʟᴠ")) {
                style = "custom-hazard";
            }
            if (style == "custom-hazard") {
                // this is minimal and misses many features
                let mode: "main" | "inherited" = "main";
                for (let line of lines) {
                    if (line.length < 2) continue;
                    // [ʟᴠ] [ᴛᴀᴍᴇʀ] [ᴏᴘᴛɪᴏɴ]
                    //      ʟᴠ.4 — Armored Cat — CS1-18
                    if (m = line.match(/ʟᴠ.(\d+) [-—] (.*) [-—] (.*)-(\d+)/)) {
                        this.name = m[2];
                        this.type = "Monster"; // assumed
                        this.n_type = word_to_type(this.type);
                        this.id = m[3] + "-" + m[4];
                        this.card_id = this.id;
                        this.level = parseInt(m[1]);
                    } else
                        // [Champion | Data | Shield] [Yel.]
                        if (m = line.match(/\[(.*?)\|(.*?)\|(.*?)\] \[(.*)\]/)) {
                            this.mon_form = m[1].trim();
                            this.mon_attribute = m[2].trim();
                            this.mon_type = m[3].trim().split("/");
                            this.colors = abbr_parse_color(m[4]);
                        } else
                            // Play cost: (6) | Evolution: (3) from Lv.(3) [Yel.]
                            if (m = line.match(/Play cost: (\d+)\s*\|Evolution: (\d+) from Lv.(\d+) \[(.*)\]/)) {
                                this.p_cost = parseInt(m[1]);
                                let evo: any = {}
                                evo.name = this.name;
                                evo.level = parseInt(m[3]);
                                this.e_level = evo.level;
                                evo.cost = parseInt(m[2]);
                                this.e_cost = evo.cost;
                                evo.color = abbr_parse_color(m[4])
                            } else
                                //      6000 DP
                                if (m = line.match(/^\s*(\d+) DP/)) {
                                    this.dp = parseInt(m[1]);
                                } else
                                    // mode 
                                    if (m = line.match(/Inherited Effect/)) {
                                        mode = "inherited";
                                    } else
                                    // effect
                                    {
                                        new_parse_effects([line], this, mode);
                                    }
                }

            } else {

                let mode: "pre2" | "body" | "evolve" | "main" | "inherited" = "pre2";
                let evo: any = null;

                for (let line of lines) {
                    //                console.log(123);
                    //                console.log(line);
                    if (mode == "pre2") {
                        if (!line.match(regexp)) {
                            continue;
                        } else {
                            mode = "body";
                        }
                    }

                    if (line == "Ace") continue;
                    if (line == "Security Effect") continue;

                    // dupe rege
                    //                logger.info(`MODE: ${mode}\tLINE:${line}`);
                    if (m = line.match(regexp)) {
                        this.name = m[1].trim();
                        this.id = m[2];
                        this.card_id = this.id;
                        continue;
                    }
                    //let [key, value] = [line.substring(0, 14).trim(), line.substring(14).trim()];
                    // logger.info(key, ":", value);
                    if (mode == "body") {
                        if (line.startsWith("Name")) {
                            this.name = line.after("Name").replaceAll(/_/ig, " ").trim();
                            continue;
                        } // for ace, this overwrites, and that's good
                        if (line.startsWith("Colour")) this.colors = parse_color(line.after("Colour"));
                        if (line.startsWith("Level")) this.level = parseInt(line.after("Level"));
                        if (line.startsWith("DP")) this.dp = parseInt(line.after("DP"));
                        if (line.startsWith("Play Cost")) this.p_cost = parseInt(line.after("Play Cost"));
                        if (line.startsWith("Use Cost")) this.u_cost = parseInt(line.after("Use Cost"));
                        if (line.startsWith("Card Type")) { this.n_type = word_to_type(line.after("Card Type")); this.type = types[this.n_type]; }
                        if (line.startsWith("Form")) this.mon_form = line.after("Form");
                        if (line.startsWith("Attribute")) this.mon_attribute = line.after("Attribute");
                        if (line.startsWith("Type")) this.mon_type = line.after("Type").split("/");

                    }
                    // we go through and build up evo sets
                    if (line == "Evolution Requirements" || line == "Alt. Evolution Requirements") {
                        if (evo) this.evolve_conditions.push(evo);
                        evo = {};
                        evo.name = this.name;
                        mode = "evolve";
                    }
                    if (line == "Card Effect(s)") {
                        mode = "main";
                        continue;
                    }
                    if (line.startsWith("Inherited Effect")) {
                        mode = "inherited";
                        continue;
                    }


                    if (line == "Card Restriction") {
                        break;
                    }


                    if (mode == "evolve") {
                        if (line.startsWith("Colour")) evo.color = word_to_color(line.after("Colour"));
                        if (line.startsWith("Level")) {
                            evo.level = parseInt(line.after("Level"));
                            this.e_level = evo.level;
                            continue;
                        }
                        if (line.startsWith("Evolve Cost")) {
                            evo.cost = parseInt(line.after("Evolve Cost"));
                            this.e_cost = evo.cost;
                            continue;
                        }
                        if (line.startsWith("[Evolve]")) {
                            line = line.substring("[Evolve]".length).trim();
                            this.parse_special_evolve(line, evo)
                        }
                        if (line.match(/^.DNA.Evolve./)) {
                            line = line.substring("[DNA_Evolve]".length).trim();
                            this.parse_fusion_evolve(line, evo)
                        }


                    }
                    if (mode == "main" || mode == "inherited") {
                        logger.debug("==> " + line);
                        let fx = (mode == "main") ? this.new_effects : this.new_inherited_effects;
                        //function new_parse_effects(effects: string[], thus: Card, new_effects: SolidEffect[], mode: "main" | "inherited" | "security" = "main") {
                        new_parse_effects([line], this, mode);
                    }

                }
                if (evo) {
                    this.evolve_conditions.push(evo);
                }
            }
            this.name ||= "err";
            this.n_type ||= 0; //number;
            this.type ||= "err"; //string;
            this.n_color ||= 0; //"; //number;
            this.colors ||= []; "err"; //Color[];
            this.color ||= "err"; // "err"; //string;
            this.id ||= "err"; //string;
            this.card_id = this.id;
            this.dp ||= parseInt("");
            this.level ||= parseInt("");
            this.name ||= "err"; //string;
            this.e_color ||= -1; "err"; //number; // need to move on from this being a number
            this.e_level ||= -1; "err"; //number;
            this.text ||= "err"; //string;
            this.summary ||= "err"; //string;
            this.main_text ||= "err"; //string;
            this.inherited_text ||= "err"; //string;

            this.make_summary();
            return;
        }

        this.input = blob;
        logger.silly("====");
        logger.silly(blob);
        let app_format: boolean = "aceEffect" in blob;


        // app format
        if (app_format) {
            let overflow: string = blob.aceEffect.match(/\d/);
            if (overflow) {
                this.overflow = parseInt(overflow);
                this.card_keywords["ACE"] = "ACE";
                this.card_keywords["Overflow"] = overflow;
            }
            this.type = blob.cardType;
            this.n_type = word_to_type(this.type);
            this.colors = parse_color(blob.color);
        } else {

            // dev format
            this.type = types[blob.cardtype];
            this.n_type = blob.cardtype;
            // dev format only handles a single color
            this.color = colors[blob.color];
            this.n_color = blob.color;
            this.colors = [Color.NONE];
            if (this.color in Color) {
                // word_to_color should work here?
                this.colors[0] = Color[this.color as keyof typeof Color];
            }
        }

        if (app_format) {
            this.id = blob.id; // or cardNumber, it's repeated
            this.card_id = this.id;

            this.name = blob.name.english;
            this.level = parseInt(blob.cardLv[3]);
            if (this.is_option())
                this.u_cost = parseInt(blob.playCost);
            else
                this.p_cost = parseInt(blob.playCost);
            this.mon_type = blob.type.split("/");
            this.mon_attribute = blob.attribute;
            this.mon_form = blob.form;
        } else {
            this.id = blob.cardid;
            this.card_id = this.id;

            this.name = blob.name;
            this.level = blob.level;
            if (this.is_option())
                this.u_cost = parseInt(blob.playCost);
            else
                this.p_cost = parseInt(blob.playCost);
            this.p_cost = blob.cost; // play cost, not use cost
            this.mon_type = blob.dtype.split("/");

        }
        this.dp = parseInt(blob.dp);

        let maineffects, sourceeffects, securityeffects;
        if (app_format) {
            for (let cond of blob.evolveCondition) {
                let evo_cond: any;
                if (cond.level == "Tamer") {
                    evo_cond = {
                        cost: parseInt(cond.cost),
                        tamer: true,
                        color: word_to_color(cond.color)
                    }
                } else {
                    evo_cond = {
                        cost: parseInt(cond.cost),
                        level: parseInt(cond.level),
                        color: word_to_color(cond.color)
                    }
                }
                this.e_cost = parseInt(cond.cost); // "default" evolution cost
                this.evolve_conditions.push(evo_cond);
            }
            let spec = blob.specialEvolve;
            let fusion = blob.dnaEvolve || blob.fusionEvolve;
            let burst = blob.burstEvolve;
            // the source mixes these all up
            let m;
            for (let _evo of [spec, fusion, burst]) {
                for (let evo of _evo.split("\n")) {
                    if (evo === "-") continue;
                    if (m = evo.match(/^.Evolve.(.*)/)) {
                        this.parse_special_evolve(m[1].trim(), {}) 
                    } else if (m = evo.match(/.DNA.Evolve.(.*)/)) {
                        this.parse_fusion_evolve(m[1].trim(), {})
                    } else if (m = evo.match(/.Burst.Evolve.(.*)/)) {
                         this.parse_burst_evolve(m[1].trim(), {})
                    } else {
                        console.error(701, evo);
                    }
                }
            }
            // parse evolve conditions here
            ////// uugh, we parse them both here and in 
            let eff = blob.effect;
            if (blob.aceEffect != "-") eff += "\n" + blob.aceEffect;
            this.main_text = eff;
            this.inherited_text = blob.evolveEffect;
            if (blob.digiXros && blob.digiXros != "-") {
                [this.stack_summon_n, this.stack_summon_limit, this.stack_summon_list] = Card.parse_stack_summon(blob.digiXros);
                logger.info(JSON.stringify(this.stack_summon_list));
                let tgts = this.stack_summon_list;
                let cards = tgts.length > 1 ? tgts.map(x => `1 your ${x}`).join(" and ").trim() : "your " + tgts;
                let n = this.stack_summon_n;
                let upto = this.stack_summon_limit ? ` up to ${this.stack_summon_limit}` : '';
                let effect = `When you would play this card, you may place${upto} ${cards} from your hand or battle area under it. For each card placed, reduce the play cost by ${n}.`;
                let [_a, stack_effect, atomics, _d] = new_parse_line(effect, this, "stack", false);
                stack_effect.effects = atomics;
                this.play_interrupt = stack_effect;
            }




            this.security_text = blob.secufityEffect;
            maineffects = this.string_array(eff).reverse();
            sourceeffects = this.string_array(blob.evolveEffect).reverse();
            securityeffects = this.string_array(blob.securityEffect).reverse();



        } else {
            this.e_cost = parseInt(blob.ecost);
            this.e_color = parseInt(blob.ecostcolor);
            this.e_level = parseInt(blob.elvfrom);

            if (this.e_level) {
                logger.debug(this.e_color);
                logger.debug(this.e_level);
                logger.debug(colors[this.e_color]);

                let evo_cond: any = {
                    cost: this.e_cost,
                    // TODO: if this is multiple color, accept any
                    level: this.e_level, color: parse_color(colors[this.e_color])[0]
                };
                logger.debug(evo_cond);
                this.evolve_conditions.push(evo_cond);
            }

            maineffects = this.string_array(blob.maineffect);
            sourceeffects = this.string_array(blob.sourceeffect);
            securityeffects = this.string_array(blob.securityeffect);

        }




        // one per line 
        logger.debug("Test");
        //        throw(4);

        let new_form_used = false;


        function new_parse_effects(effects: string[], thus: Card, mode: "main" | "inherited" | "security" = "main") {
            let new_effects: SolidEffect[] = (mode == "main") ? thus.new_effects :
                ((mode == "inherited") ? thus.new_inherited_effects : thus.new_security_effects);
            for (let i = effects.length - 1; i >= 0; i--) {

                let l = effects[i];
                if (l.length < 3) {
                    logger.debug("line too short, skipping {" + l + "}");
                    let _ = effects.splice(i, 1)[0]; //remove
                    continue;
                }
                logger.debug("TRTYING LINE " + l);
                let [c, s, a, r] = new_parse_line(l, thus, thus.name, mode == "inherited");
                for (let j = 0; j < a.length; j++) {
                    logger.debug(a[j].toString());
                }
                for (let j = 0; j < s.effects.length; j++) {
                    logger.debug(s.effects.toString());
                }
                // If the number coming in differs, fix it here.
                // I really should fix it in the parser, though. :( :(
                // TODO: do that fix in newparser   

                if (a.length != s.effects.length) {
                    logger.error(`fixing mismatch, this shouldn't happen any mnore ${a.length} ${s.effects.length} ${thus && thus.id}`);
                    for (let j = 0; j < a.length; j++) {
                        //       logger.debug(a[j].toString());
                        //                a[j].weirdo = a[j].events[0];
                        let x: AtomicEffect = a[j];
                        s.effects.unshift(x); // backwards order?

                    }
                }

                // even if not completely parsed, give it a shot!
                if (true || r == "") {
                    logger.debug("NO REMNANT, COMPLETELY PARSED: " + s.toString());

                    if (true) {
                        logger.debug("this keywords " + thus.name + " are " + Object.values(thus.card_keywords).join(",") + " and " + Object.values(thus.card_inherited_keywords));
                        logger.debug("GEN 3 CARD PARSING");
                        let _ = effects.splice(i, 1)[0]; //remove
                        let x: SolidEffect = s;

                        let is_sec_effect: boolean = x.keywords.includes("[Security]");
                        if (is_sec_effect) {
                            // [security] no longer means security-effect :(
                            // Because of input problems, we need to deduce what's a constant effect
                            let sub = x.effects[0]?.events[0];
                            if (sub) {
                                // passive effects will give a status condition w/no expiration
                                if (sub.game_event == GameEvent.GIVE_STATUS_CONDITION &&
                                    (!sub.status_condition || !sub.status_condition[0].exp_description)) {
                                    is_sec_effect = false;
                                }
                            }
                        }
                        if (is_sec_effect) {
                            //      logger.debug("putting that into security");
                            thus.new_security_effects.unshift(x);
                            thus.security_text ||= l;
                        } else {
                            if (x.keywords.length > 0 || a.length > 0) {
                                new_effects.unshift(x); // we iterated backwards, so reverse order here
                            } else {
                                logger.debug("NO ATOMIC, NO EFFECT");
                            }
                        }
                        //                        logger.debug("GEN 3 CARD " + thus.name + " NEW LEN IS " + thus.new_effects.length);
                        for (let i = 0; i < thus.new_effects.length; i++) {
                            let x = thus.new_effects[i];
                            //logger.debug(x);
                            //logger.debug(x.toString());
                        }
                    } else {
                        logger.debug("REPRIEVE TO: " + thus.name + " " + l);
                    }

                } else {
                    logger.debug("REMNANT " + r);
                }
            }
        }

        new_parse_effects(maineffects, this, "main");
        new_parse_effects(sourceeffects, this, "inherited");
        if (Object.keys(this.card_keywords).length > 0) logger.debug(`5543 have ${this.card_keywords.length} keywords + ${Object.values(this.card_keywords).join(",")}`);

        // if any effects are [security] refile them now
        // deleted code to move [security] effects that showed up in main, since it's handled above
        logger.debug("securityeffectslength is " + securityeffects.length + " " + this.name);
        logger.debug("newsecurityeffectslength is " + this.new_security_effects.length + " " + this.name);
        new_parse_effects(securityeffects, this, "security");
        logger.debug("newsecurityeffectslength is " + this.new_security_effects.length + " " + this.name);

        logger.debug("MAINING REMAINING " + maineffects.length + " " + securityeffects.length);
        //        this.main_text ||= 'err2';    
        //         this.inherited_text ||= 'err2';


        this.main_text ||= maineffects.join("\r\n");
        this.inherited_text ||= sourceeffects[0]; // can be multiple!


        // I want to wipe this whole block out       

        let m;

        logger.debug("===" + this.name + "===");
        if (this.name == "Baldy Blow") {
            //            this.new_effect = new SolidEffect(this.main_text, this.main_effects);
        }

        if (this.name == "Card to debug") {
            logger.debug("##############3");
            logger.debug("====>1");
            logger.debug(this.name);
            //            logger.debug(this.main_text);
            //    if (!this.main_effects) this.main_effects = "";
            //            logger.debug(`===>LENS ${this.main_text.split("\r\n").length} ${this.inherited_text.split("\r\n").length}`);            
            logger.debug(`===>LENS ${this.new_effects.length} ${this.new_inherited_effects.length}`);
            logger.debug("=====>SECURITY TEXT");
            logger.debug(this.security_text);
            logger.debug("======>SECURITY PARSED");
            logger.debug("=======>NEW SECURITY EFFECTS");
            logger.debug("=======>MAIN TEXT");
            logger.debug("=========>MAIN PARSED");
            //      logger.dir(this.main_effects, { depth: null });
            //        logger.debug("=========>MAIN PARSED");
            //    logger.dir(this.new_effects, { depth: null });
            //    logger.dir(this.inherited_effects, { depth: null });
            //      logger.debug("##############4");

            //        logger.debug("=======5");
            //         logger.dir(this.new_inherited_effects, { depth: null });
            //          logger.debug("=======5");
            //          logger.dir(this.inherited_effects, { depth: null });
            logger.debug("=======5");
        }
        //        logger.debug(`name ${this.name}, ess ${this.inherited_text} ess ${this.inherited_text ? 'y' : 'n'} `);
        this.text = clean(this.main_text + " ") +
            (this.inherited_text ? "ESS (" + clean(this.inherited_text) + ")" : "") +
            clean(this.security_text);
        //      logger.debug(this.text);
        this.summary = "";
        this.make_summary();
    }

    // stack_summon materials can be more complicated than this
    static parse_stack_summon(line: string): [number, number, string[]] {
        let m;
        let limit = 0;
        if (line) {
            if (m = line.match(/.DigiXros.-(\d+).\s*(.*)/)) {
                let n;
                line = m[2];
                if (n = line.match(/^(\d+|∞)\s*(.*)/)) {
                    limit = parseInt(n[1]);
                    line = n[2];
                }
                let cost = Number(m[1]);
                let names = line.split(" x ");

                return [cost, limit, names];
            }
        }
        return [0, 0, []];
    }

    testname(testmode: number): string {
        if (testmode == 1) return this.id;
        let [set, _] = this.id.split("-");
        let outname = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
        let ret = `${set}-${outname}`;
        let up = this.face_up ? ",FACEUP" : "";
        if (!this.game?.get_card(ret)) {
            // no hit, we need to fall back to it
            return this.id + up;
        }
        return ret + up;
    }
    make_summary() {

        //        logger.debug("before summary " + this.summary);
        if (this.n_type < 3) {
            this.summary += "Lv" + (this.level ? this.level : "-") + " ";
        }
        this.summary +=
            (this.p_cost ?
                inverse_circles[this.p_cost]
                : "ⓔ"); //                : "e");
        this.summary += " " + this.name.padEnd(13, " ");

        if (!!this.dp) {
            this.summary += ("" + (this.dp / 1000) + "K ").padStart(5, " ");
        }
        if (this.e_cost) {
            this.summary += normal_circles[this.e_cost];
        }
        this.summary += " " + this.encode(this.text);
        //     logger.debug("after summary " + this.summary);
    };


    // since we have the data in two places, we need to make sure they agree
    verify(l: Location, i?: number) {
        if (l != this.location ||
            (i && i != this.mon_instance)) {
            if (carddebug) logger.debug(`checking ${i}`);
            console.error(`${this.name} ${i} at ${Location[this.location]} is supposed to be in ${Location[l]}`);
            let a: any = null; a.locator_fail();
        }
    }


    // I should make the Card constructor private I guess?
    static create(_card_id: string, g: Game, player: Player): Card | undefined {
        let [a1, a2, ...a3] = _card_id.split("-")
        let card_id = a1 + "-" + a2;

        let _c = g.master.get_card(card_id);


        if (!_c) {
            //logger.error("COULD1 NOT MAKE CARD <" + card_id + ">");
            console.error("COULD1 NOT MAKE CARD <" + card_id + ">");
            // I need a generic dummy card
            return undefined;
        }
        let c: Card = new Card(_c.input, _c.fandom_input); //  Object.create(_c);
        c.location = Location.NEW;
        c.game = g;
        c.player = player;
        c.n_player = player.player_num;
        return c;
    }

    static hidden: Location[] = [Location.NEW, Location.DECK, Location.EGGDECK, Location.SECURITY, Location.HAND];
    static visible: Location[] = [Location.FIELD, Location.EGGZONE, Location.TRASH, Location.REVEAL, Location.TOKENDECK, Location.TOKENTRASH, Location.NULLZONE, Location.OPTZONE];


    // finds the card in the place it was at, in case we need it
    // return self (is this necessary)
    // TODO: how much of a dupe between this and CardLocation.extract?
    extract(): Card {
        let pile = this.player!.get_pile(this.location, this.mon_instance);
        // not all trash cards with the same ID are the same!

        let i = pile.findIndex(x => x == this);
        //        let i = pile.findIndex(x => x.id == this.id && x.card_instance_id == this.card_instance_id);


        let ret = pile.splice(i, 1)[0];
        return ret;

    }


    // oooh, maybe *this* should do the re-constructor! That way it's
    // all in one place!
    move_to(l: Location, instance?: Instance, order?: string): void {

        // make a new card_instance_id when moving from
        // [NEW,DECK,EGGDECK,SECURITY,HAND,NEW] to [FIELD,EGGZONE,TRASH,REVEAL]
        // delete card_instance when doing the reverse

        // should a card in the hand even *have* an ID? It has to be 
        // very private if I store it. Card hands can't be distinguished.

        // we will get ERROR! if we'll be the first card in the instance
        let s_new_inst = instance ? `${instance.id} ${instance.get_name()}` : "nul";
        logger.debug(`CARD: Want to move ${this.id} ${this.name} ${this.card_instance_id} ` +
            `from ${Location[this.location]} and from instancve ${this.mon_instance} ` +
            `to Location is ${Location[l]} and to instance ${s_new_inst} `);

        if (l == this.location && instance?.id == this.mon_instance) {
            logger.error("moving in place??");
        }

        if (this.is_token()) {
            // token can only be on field... it shouldn't be moved ever.
            if (l != Location.FIELD && l != Location.TOKENDECK) {
                l = Location.TOKENTRASH;
            }
        }
        let from = "";
        // TODO: face-up in security is public...
        if (Card.hidden.includes(this.location)) from = "hidden";
        if (Card.visible.includes(this.location)) from = "public";
        let to = "";
        if (Card.hidden.includes(l)) to = "hidden";
        if (Card.visible.includes(l)) to = "public";

        if (from == "" || to == "") {
            logger.error(`from is ${from} and to is ${to}`);
            logger.error(`from ${Location[this.location]} to ${Location[l]}`);
            let a: any = null; a.bad_card(this.location);
        }

        if (from == "public" && to == "hidden") {
            this.card_instance_id = -1;
        } else if (from == "hidden" && to == "public") {
            this.card_instance_id = this.game!.next_card_id();
        } else if (from == to) {
            // nothing
        } else {
            let a: any = null; a.bad_move(this.location);
        }

        logger.debug(`RESETTING FACE ${this.get_name()} WAS ${this.face_up}...`);
        this.face_up = false; // reset whenever it moves
        this.location = l;
        if (instance) {
            // we will need to specify *where* in the instance eventually
            instance._add_card(this, order);
            this.mon_instance = instance.id;
            return;
        }
        // we will need to distinguish top-deck from bottom-deck
        let p: Player = this.player!;
        logger.debug("player is " + this.n_player);
        logger.debug(`player is ${!!p}`);
        let pile = p.get_pile(l, 0);
        if (order == "BOTTOM")
            pile.unshift(this);
        else
            pile.push(this);





        // TODO: OVERFLOW SHOULD ALL BE IN HERE!
        return;
    }

    // handles null
    string_array(str: string): string[] {
        if (str == null || str == "-") { return []; }
        str = str.replace(/(\r?\n)・/g, "・");


        let ret = str.split(/\r?\n/);
        //        console.log("fx is");        console.log(ret);
        return ret;
    }

    encode(str: string): string {
        return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    }

    public has_color(color: Color): boolean {
        return this.colors.includes(color);
        //        return n_color == this.n_color;
    }
    // has any level at all
    public has_level(): boolean {
        return !!this.level;
    }


    public has_dp(): boolean {
        return !!this.dp;
    }

    public name_is(str: string): boolean {
        str = str.toUpperCase();
        //        logger.info("LOOKING FOR " + str);
        if (this.name_rule) {
            //logger.info("NAME RULE: " + this.name_rule);
            let m;
            if (m = this.name_rule.match(/treated as \[(.*)\]/i)) {
                //     logger.info("NAME COULD BE: " + m[1]);
                if (m[1].toUpperCase() == str) return true;
            }
        }
        return this.name.toUpperCase() == str;
    }
    public name_contains(str: string): boolean {
        let my_names: string[] = [this.name];
        if (this.name_rule) {
            let m;
            if (m = this.name_rule.match(/treated as \[(.*)\]/i)) {
                my_names.push(...m[1].split("]/["));
            }
        }
        let match_to = str.toUpperCase();
        return my_names.some(n => n.toUpperCase().includes(match_to));
    }
    // right now nothing distinguishes type, attribute, or form
    public trait_contains(str: string): boolean {
        str = str.toUpperCase();
        let my_traits = [this.mon_attribute, this.mon_form, ...this.mon_type];
        if (this.trait_rule) {
            let m;
            if (m = this.trait_rule.match(/has( the)? \[(.*)\]/i)) {
                my_traits.push(...m[2].split("]/["));
            }
        }
        return my_traits.some(x => x.toUpperCase().includes(str));
    }
    public has_trait(str: string): boolean {
        str = str.toUpperCase();
        let my_traits = [this.mon_attribute, this.mon_form, ...this.mon_type];
        if (this.trait_rule) {
            let m;
            if (m = this.trait_rule.match(/has( the)? \[(.*)\]/i)) {
                my_traits.push(...m[2].split("]/["));
            }
        }
        return my_traits.some(x => x.toUpperCase() == str);
    }
    public has_stack_add(): boolean { return this.stack_summon_list.length > 0; }
    public is_two_color(): boolean { return this.colors.length == 2; }
    public name_set(): string {
        let set = this.id.split("-")[0];
        return `${set}-${this.name}`;
    }
    colors_s(): string {
        return this.colors.map(x => Color[x]).join(",");
    }

    can_blast(): boolean {

        let ret = this.new_effects.some(s => s.raw_text.match(/Blast.evolve/i));
        logger.info("abcdef " + ret + " " + this.name + " " + this.new_effects.map(s => s.raw_text).join("///"));
        return ret;


    }
    can_fusion_blast(): boolean { return this.new_effects.some(s => s.raw_text.match(/Blast.DNA.evolve/i)) }
    is_token(): boolean { return this.id.startsWith("TKN"); }
    is_egg(): boolean { return this.n_type == 1; }
    is_monster(): boolean { return this.n_type == 2; }
    is_tamer(): boolean { return this.n_type == 3; }
    is_option(): boolean { return this.n_type == 4; }
    get_level(): number { return this.level!; }
    get_name(): string { return this.name; }
    get_playcost(): number | undefined { return this.p_cost; }
    get_usecost(): number | undefined { return this.u_cost; }

    // TODO: get rid of object[] return if we can... unless it's how we get <draw>???
    public has_keyword(keyword: string, inherited: boolean = false): (string | false) {
        //        logger.debug("lookinf ro card keyword" + keyword);
        // case-sensitive?
        let regexp = new RegExp(keyword.replaceAll(/[ _]/ig, "."), "i");
        // logger.debug("regexp is " + regexp + " and keywords be " + Object.keys(this.card_keywords).join(","));
        let keywordlist = inherited ? this.card_inherited_keywords : this.card_keywords;
        //logger.warn("keys" + JSON.stringify(keywordlist));
        // I'd like to just look this up directly without case matching

        let key = Object.keys(keywordlist).find(key => regexp.test(key));
        if (key) return keywordlist[key]
        return false;

    }

    static can_evolve_into(base: Instance | CardLocation, conditions: EvolveCondition[]) {
        let ret = [];
        for (let evo_cond of conditions) {
            if (evo_cond.text) logger.error("unknown evo condition: " + evo_cond.text);
            logger.debug(`looking up evo condition ${Color[evo_cond.color!]} level ${evo_cond.level} cost ${evo_cond.cost}`);
            // we have to match all things that exist
            if (evo_cond.tamer && !base.is_tamer()) continue;
            if (evo_cond.color && !base.has_color(evo_cond.color)) continue;
            if (evo_cond.level && evo_cond.level != base.get_level()) continue;
            if (evo_cond.name_is && !base.name_is(evo_cond.name_is)) continue;
            if (evo_cond.name_contains && !base.name_contains(evo_cond.name_contains)) continue;
            if (evo_cond.trait && !base.has_trait(evo_cond.trait)) continue;
            ret.push(evo_cond.cost);
        }
        return ret;
    }



    public can_merge_evolve(left: Instance | CardLocation, right: Instance | CardLocation, type: 'fusion' | 'burst'): false | number[] {
        // check if the left can evo
        logger.info(`can merge? ${this.name} onto ${left.get_name()} and ${right.get_name()}`);
        let l = left.can_evolve(this, 99, 1, type);
        logger.info(`l is ${l} ${!!l}`);
        if (!l) return false;

        let r = right.can_evolve(this, 99, 2, type);
        logger.info(`r is ${r} ${!!r}`);
        if (!r) return false;
        logger.info(`YES WE CAN MERGE  ${this.get_name()} onto ${left.get_field_name(1)} and ${right.get_field_name(1)}`);
        return [0];
    }


    // TODO: you cannot "play" option cards, but you can "use" them. For now, who cares?
    public can_play(player: Player, memory: number): boolean {
        if (this.n_type == 1) {
            logger.error("NEVER PLAY AN EGG");
            return false;
        }
        // my starter decks have alt conditions but they don't matter
        if (this.n_type == 4) {
            //    logger.debug("can we play this option?");

            for (let color of this.colors) {
                if (!player.has_color(color)) return false;
            }
            //if (!player.has_color(this.colors)) {
            //    return false;
            //}
            //        logger.debug("and it matches color, too");
        }
        //       logger.debug("for card " + this.name + ": still okay");
        // TODO: handle alt can_play effects
        let cost = this.p_cost || this.u_cost;
        // We don't allow for interruptives to reduce the cost

        // true if we have memory, *or* if something interrupts play cost
        // in theory, something on field could interrupt play cost, too. See CS1-06.
        // That's not handled yet; in theory we could let people try to play *ANYTHING*
        // but there's no judge to rule on bad plays.
        return (cost! <= memory || !!this.play_interrupt);
    }

};

// card instance has fresh copies of effects; we don't need 
// them copies until they become a CardInstance.

// A player's security stack, egg stack, and deck are all Cards.
// Their hand, trash, and everything on field is CardInstances.

// A CardInstance is self-aware of its location; this may
// involves some double-entry bookkeeping.
export class UnusedCardInstance {
    game: Game;
    card: Card;
    n_me_player: number = -66;
    instance_id: number;
    location: Location;

    constructor(g: Game, c: Card, n_player: number, location: Location) {
        this.game = g;
        this.card = c; // do I need to make a copy of effects at all?
        this.n_me_player = n_player;
        this.location = location;
        this.instance_id = g.next_card_id();
    }

    get_name(): string { return this.card.name; }
    name_is(s: string) { return this.card.name_is(s); }
    name_contains(s: string) { return this.card.name_contains(s); }
    is_two_color() { return this.card.is_two_color(); }
    is_tamer() { return this.card.is_tamer(); }
    is_option() { return this.card.is_option(); }
    get_level() { return this.card.get_level(); }
    get_playcost() { return this.card.get_playcost(); }
    has_color(c: Color) { return this.card.has_color(c); }


}


// When "i" is a number, a specific array entry
// When "i" is a string, just a card with matching ID in location
// "index' is canonical, until someone sorts us :(
export class CardLocation {
    kind: string = "CardLocation";
    // player's hand
    game: Game;
    index: number;
    n_me_player: number = -42;
    name: string;
    card: Card;
    id: string;
    instance?: number;
    card_id: string;
    private pile: Card[];
    location: Location;
    cardloc: Location;
    constructor(g: Game, n_player: number, location: Location,
        i: number | string, instance_id: number = -1) {

        this.game = g;
        this.n_me_player = n_player;
        if (instance_id != -1) { this.instance = instance_id; }
        if (location == Location.HAND) {
            this.pile = g.get_n_player(n_player).hand;
        } else if (location == Location.TRASH) {
            this.pile = g.get_n_player(n_player).trash;
        } else if (location == Location.REVEAL) {
            this.pile = g.get_n_player(n_player).reveal;
        } else if (location == Location.FIELD) {
      //      this.pile = g.get_n_player(n_player).reveal;
           this.pile = g.get_instance(instance_id).pile;
        } else if (location == Location.NULLZONE) {
            this.pile = g.get_n_player(n_player).nullzone;
        } else if (location == Location.OPTZONE) {
            this.pile = g.get_n_player(n_player).optzone;
        } else if (location == Location.SECURITY) {
            this.pile = g.get_n_player(n_player).security;
        } else if (location == Location.TOKENDECK) {
            this.pile = g.get_n_player(n_player).tokendeck;
        } else {
            logger.error("MISSING LOCATION!" + location);
            let assert: any = null; assert.unknown_location();
            this.pile = g.get_n_player(n_player).reveal;
        }
        this.cardloc = location;

        if (typeof i === "number") {
            this.index = i;
            this.card = this.pile[i];
            this.card_id = this.card.id;
        } else if (typeof i === "string") {
            this.card_id = i;
            let index = this.pile.findIndex(x => x.id == this.card_id);
            this.card = this.pile[index];
            this.index = index;
        } else {
            this.index = -1;
            this.card = this.pile[this.index];
            this.card_id = "ERROR";
        }
        //        if (this.instance) this.card = this.game.get_instance(this.instance).pile[
        // logger.debug("pile length is " + this.pile.length);
        //   logger.debug(this.card);
        if (!this.card) {
            logger.error(`CARD MISSING FROM CARD LOCATION ${typeof i} ${i}, ${location}`);
            let a: any = null; a.dieb();
        }
        this.name = this.card.get_name();
        this.id = `${Location[location]}-${this.card.id}`;
        this.location = location;
        logger.debug(`card loc ${n_player}, ${Location[location]}, ${i} ${this.name}`);

    }

    can_evolve(card: Card, available_memory: number, fusion_evo_pos: number = 0): number[] | false {
        let conditions;
        switch (fusion_evo_pos) {
            case 1: conditions = [...card.fusion_evolve_conditions.map(e => e.left)]; break;
            case 2: conditions = [...card.fusion_evolve_conditions.map(e => e.right)]; break;
            default: conditions = [...card.evolve_conditions];
        }
        let e = Card.can_evolve_into(this, conditions);

        if (e.length > 0) return e;
        return false;
    }

    // extract should mark this struct as invalid somehow
    extract(): Card {

        let i = this.pile.findIndex(x => x.id == this.card_id);
        //        logger.debug(`COMPARE ${i} and ${this.index}`);
        let c = this.pile.splice(i, 1)[0];
        return c;
    }
    // number-number pair, first is location, second is index (for pile) or id (for field)
    get_key(): string {
        return `${this.location}-${this.index}`;
    }
    // return "NAME" or "NAME in HAND" if not on field
    get_field_name(l: Location = Location.FIELD): string {
        let ret = /* this.get_set() + "-" + */ this.get_name();
        if (this.location != l) {
            ret += ` in ${Location[this.location]}`;
        }
        return ret;
    };
    get_set(): string {
        return this.card_id.split("-")[0];
    }
    get_card_id(): string { return this.card_id; }
    get_name(): string { return this.name; }
    name_is(s: string) { return this.card.name_is(s); }
    name_contains(s: string) { return this.card.name_contains(s); }
    trait_contains(s: string) {
        logger.silly(`does ${this.name} traits contain %${s}?`);
        let ret = this.card.trait_contains(s);
        logger.silly(ret);
        return ret;
    }
    has_trait(s: string) {
        return this.card.has_trait(s);
    }
    has_stack_add(): boolean { return !!this.card.has_stack_add(); }
    is_two_color(): boolean { return this.card.is_two_color(); }
    is_token(): boolean { return this.card.is_token(); }
    is_monster() { return this.card.is_monster(); }
    is_tamer() { return this.card.is_tamer(); }
    is_option() { return this.card.is_option(); }
    get_level() { return this.card.get_level(); }
    get_playcost() { return this.card.get_playcost(); }
    has_color(c: Color) { return this.card.has_color(c); }
    get_source_count(): number { return 0; } // this shouldn't be checked
    new_inherited_effects(): SolidEffect[] { return this.card.new_inherited_effects; }
    face_up(): boolean { return this.card.face_up; }
    dp() { return this.card.dp; }
    has_keyword(word: string): boolean { return !!this.card.has_keyword(word); }
    is_evo_card(): boolean { return this.location === Location.FIELD 
        && this.index < this.pile.length - 1; // not top card, we 
        // could have done this check in Game::get_targets()
     };

}



//export = Card;