

import { Player } from './player';
import { AtomicEffect, Solid_is_triggered, SolidEffect } from './effect';
import { GameTest, SpecialCard, SubTargetDesc, TargetDesc, TargetSource } from './target';
import { Location } from './location';
import { Game } from './game';
import { new_parse_line } from './newparser';
import { Instance } from './instance';

import _ from 'lodash';

let normal_circles = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
let inverse_circles = ["⓿", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾", "❿", "⓫", "⓬", "⓭", "⓮", "⓯", "⓰", "⓱", "⓲", "⓳", "⓴"];


let carddebug = 1;
import { Translator } from './translate';
import { GameEvent } from './event';

import { createLogger } from "./logger";
import { parseString } from './parse-with';
import { parseStringEvoCond } from './parse-evocond';
import { find_in_tree, verify_special_evo } from './util';
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

export function parse_color(text: string): Color[] {

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

export interface LinkCondition {
    cost: number;
    trait?: string;
    // below here might be plemented
    color?: Color;
    grade?: string; // not used for links
    level?: number;
    tamer?: boolean;
    text?: string; // only used for errors, but maybe can be used normally
    two_color?: boolean; // this should be "color_count"
    name_is?: string; // TODO: make array
    name_contains?: string; // TODO: make array

}

export interface EvolveCondition {
    color?: Color;
    level?: number;
    tamer?: boolean;
    grade?: string;
    cost: number;
    text?: string; // only used for errors, but maybe can be used normally
    two_color?: boolean; // this should be "color_count"
    trait?: string;
    //targ3et?: null;

    name_is?: string; // TODO: make array
    name_contains?: string; // TODO: make array
}

export interface FusionEvolveCondition {
    left: EvolveCondition; // ignore the cost in the left and right
    right: EvolveCondition;
    cost: number;
}

export interface BurstEvolveCondition {
    monster: EvolveCondition; // ignore the cost
    tamer: EvolveCondition;
    cost: number;
}

export interface AppEvolveCondition {
    monsters: EvolveCondition[]; // ignore the cost
    cost: number;
    text?: string;
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
    fandom_input: string;
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
    readonly app_evolve_conditions: AppEvolveCondition[] = [];
    readonly p_cost?: number;
    readonly u_cost?: number;
    readonly e_cost: number;
    readonly e_color?: number; // make obsolete
    readonly e_level?: number; // make obsolete
    readonly text: string;
    readonly mon_form: string[] = [];
    readonly mon_type: string[] = [];
    readonly mon_attribute: string = "x";
    summary: string;
    readonly main_text: string;
    readonly inherited_text: string;
    readonly link_text: string;
    readonly stack_summon?: string;
    readonly link_dp?: number;
    readonly link_effect?: string;
    readonly link_requirements: LinkCondition[] = [];

    security_text: string;
    //    readonly main_good_effects: 
    //  readonly n_me_player: number;
    overflow: number;

    card_keywords: KeywordArray; // todo, make all these readonly
    card_inherited_keywords: KeywordArray; // todo, make all these readonly
    card_linked_keywords: KeywordArray; // todo, make all these readonly
    UNUSEDevolve: string[];
    dnaevolve: string;
    name_rule?: string;
    trait_rule?: string;
    stack_summon_n: number = 0;
    stack_summon_list: string[] = [];
    stack_summon_limit: number = 0;
    allow?: GameTest;
    color_allow?: Color[]; // an alternate set of colors to match to allow Use
    play_interrupt?: SolidEffect;

    // Cards are mostly static data, except the functions and
    // the location data below. I tried to split them into
    // separate structures and ran into lots of problems, I
    // need to try again at some point.

    private location: Location;
    private prior_location?: CardLocation; // if in reveal, where does it need to return on failure?
    card_instance_id: number = -4; // debug
    private mon_instance: number;
    new_effects: SolidEffect[];
    new_inherited_effects: SolidEffect[];
    new_security_effects: SolidEffect[];
    new_link_effects: SolidEffect[];
    game?: Game;
    player?: Player;
    n_player: number = -99;
    face_up: boolean = false; // not sure this belongs here, maybe in stack or cardlocatiomn
    evo_text: string = "";

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

    save_prior_location(cl: CardLocation) {
        this.prior_location = cl;
    }
    retrieve_prior_location() { return this.prior_location; }

    parse_link_requirement(line: string, evo: any) {

        let m = line.match(/^(.*): cost (\d+)/i);
        if (!m) return;

        let condition = m[1].replaceAll(" ", " ").replaceAll("_", " ").trim();
        let cost = m[2];
        let parsed_condition = parseStringEvoCond(condition, "EvoCondition");
        const tree = parsed_condition;
        if (!tree) { console.error("no tree for " + line); return; }
        evo = tree;
        evo.cost = parseInt(cost);
        this.link_requirements.push(evo);
        return tree;
    }

    parse_app_evolve(line: string, evo: any) {
        //  [mon1] + [mon2] : Cost 0",
        // [DNA_Evolve] blue Lv.4 + green Lv.4 : Cost 0
        let m = line.match(/(.*)\s*:\s*Cost (\d)+/)
        if (!m) {
            return;
        }
        let apps = m[1].split("&");
        let condition: AppEvolveCondition = { monsters: [], cost: parseInt(m[2]) };
        for (let app of apps) {
            let l = this._parse_special_evolve(app.trim() + " : Cost 0", {}, true);
            condition.monsters.push(l);
        }

        this.app_evolve_conditions.push(condition);
    }


    parse_fusion_evolve(line: string, evo: any) {
        //  [mon1] + [mon2] : Cost 0",
        // [DNA_Evolve] blue Lv.4 + green Lv.4 : Cost 0
        let m = line.match(/(.*)\+(.*)\s*:\s*Cost (\d)+/)
        if (!m) {
            return;
        }
        let left = m[1].trim() + " : Cost 0"
        let right = m[2].trim() + " : Cost 0"
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
            [, cost, monster, tamer] = m;
        } else {
            m = line.match(/\[(.*?)\] by returning 1 \[(.*?)\] to hand: Cost (\d)/i);
            if (m) {
                [, monster, tamer, cost] = m;
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

        let m;
        m = line.match(/(.*): Cost (\d+)/i);
        if (m) {
            let condition = m[1].replaceAll(" ", " ").replaceAll("_", " ").trim();

            let cost = m[2];
            let parsed_condition = parseStringEvoCond(condition, "EvoCondition");
            //            console.dir(parsed_condition, { depth: 6 });
            //     let tree = find_in_tree(parsed_condition, "EvoCondition");
            const tree = parsed_condition;
            if (!tree) { console.error("no tree for " + line); return; }
            evo = tree;
            evo.cost = parseInt(cost);

            if (!no_push) this.evolve_conditions.push(evo);

            //console.log(evo);

            return tree;



        }
        console.error("no m for " + line);
        // remnants removed 11 mar 
    }

    constructor(blob: any, text: string = "") {
        this.card_instance_id = -1;
        this.location = Location.UNKNOWN;
        this.mon_instance = -1;
        this.class = "Card";

        this.card_keywords = {};
        this.card_inherited_keywords = {};
        this.card_linked_keywords = {};
        this.UNUSEDevolve = [];
        this.dnaevolve = "";

        this.overflow = 0;
        this.new_effects = [];
        this.new_security_effects = [];
        this.new_inherited_effects = [];
        this.new_link_effects = [];
        this.security_text = "";
        this.name = "err";

        this.e_cost = -1;

        text = Translator.text(text);

        let regexp = new RegExp(/^\*\*\*\*\* (.*)\((.*)\) \*\*\*\*\*$/);
        this.fandom_input = "";
        if (text !== "" && text !== "no") {

            this.evo_text = "";
            this.fandom_input = text;
            let lines: string[] = text.split("\n");
            let m;
            let i = 0;
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
                            this.mon_form = m[1].trim().split("/")
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
                        if (line.startsWith("Form")) this.mon_form = line.after("Form").split("/");
                        if (line.startsWith("Attribute")) this.mon_attribute = line.after("Attribute");
                        if (line.startsWith("Type")) this.mon_type = line.after("Type").split("/");

                    }
                    // we go through and build up evo sets
                    if (line == "Evolution Requirements" || line == "Alt. Evolution Requirements") {
                        if (evo && "cost" in evo)
                            this.evolve_conditions.push(evo);
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
                        if (line.startsWith("[App Fusion]")) {
                            line = line.substring("[App Fusion]".length).trim();
                            this.parse_app_evolve(line, evo)
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
                if (evo && "cost" in evo) {
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
            this.link_text ||= "err"; //string;

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
            let linkdp = blob.linkDP?.match(/\d+/)
            this.link_dp = parseInt(linkdp);
            this.name = blob.name.english;
            this.level = parseInt(blob.cardLv[3]);
            if (this.is_option())
                this.u_cost = parseInt(blob.playCost);
            else
                this.p_cost = parseInt(blob.playCost);
            this.mon_type = blob.type.split("/");
            this.mon_attribute = blob.attribute;
            this.mon_form = blob.form.split("/");
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


        let maineffects, sourceeffects, securityeffects, linkeffects;
        if (app_format) {
            for (let cond of blob.evolveCondition) {
                let evo_cond: any;

                if (cond.level == "Tamer") {
                    evo_cond = {
                        cost: parseInt(cond.cost),
                        tamer: true,
                        color: word_to_color(cond.color)
                    }
                } else if (parseInt(cond.level)) {
                    evo_cond = {
                        cost: parseInt(cond.cost),
                        level: parseInt(cond.level),
                        color: word_to_color(cond.color)
                    }
                } else { // assume grade
                    evo_cond = {
                        cost: parseInt(cond.cost),
                        grade: cond.level,
                        color: word_to_color(cond.color)
                    }
                }
                this.e_cost = parseInt(cond.cost); // "default" evolution cost

                this.evolve_conditions.push(evo_cond);
            }
            let spec = blob.specialEvolve;
            let fusion = blob.dnaEvolve || blob.fusionEvolve;
            let burst = blob.burstEvolve;
            let link = blob.linkRequirement;
            // the source mixes these all up
            this.evo_text = spec + fusion + burst + link;
            let m;
            for (let _evo of [spec, fusion, burst, link]) {
                if (_evo)
                    for (let evo of _evo.split("\n")) {
                        if (evo === "-") continue;
                        if (m = evo.match(/^.Evolve.(.*)/)) {
                            this.parse_special_evolve(m[1].trim(), {})
                        } else if (m = evo.match(/.DNA.Evolve.(.*)/)) {
                            this.parse_fusion_evolve(m[1].trim(), {})
                        } else if (m = evo.match(/.Burst.Evolve.(.*)/)) {
                            this.parse_burst_evolve(m[1].trim(), {})
                        } else if (m = evo.match(/.Link.(.*)/)) {
                            this.parse_link_requirement(m[1].trim(), {})
                        } else if (m = evo.match(/.App Fusion.(.*)/)) {
                            this.parse_app_evolve(m[1].trim(), {})
                        } else {
                            console.error("unknown evo", evo);
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
                let [_a, stack_effect, atomics, _d] = new_parse_line(effect, this, "stack", "main");
                stack_effect.effects = atomics;
                this.play_interrupt = stack_effect;
            }

            this.security_text = blob.secufityEffect;
            maineffects = this.string_array(eff).reverse();
            if (blob.rule && blob.rule != "-") {
                // parse "rule"s just like effects, due to historical reasons
                maineffects.push(blob.rule);
            }
            sourceeffects = this.string_array(blob.evolveEffect).reverse();
            securityeffects = this.string_array(blob.securityEffect).reverse();
            linkeffects = this.string_array(blob.linkEffect).reverse();


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
            linkeffects = this.string_array(blob.linkeffect); // what's the format here?

        }




        // one per line 
        logger.debug("Test");
        //        throw(4);

        let new_form_used = false;


        function new_parse_effects(effects: string[], thus: Card, mode: "main" | "inherited" | "security" | "link" = "main") {
            let new_effects: SolidEffect[] = (mode == "main") ? thus.new_effects :
                ((mode == "inherited") ? thus.new_inherited_effects :
                    ((mode == "link") ? thus.new_link_effects : thus.new_security_effects));
            for (let i = effects.length - 1; i >= 0; i--) {

                let l = effects[i];
                if (l.length < 3) {
                    logger.debug("line too short, skipping {" + l + "}");
                    let _ = effects.splice(i, 1)[0]; //remove
                    continue;
                }
                logger.debug("TRTYING LINE " + l);
                let [c, s, a, r] = new_parse_line(l, thus, thus.name, mode);
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
                        logger.debug("this keywords " + thus.name + " are " +
                            Object.values(thus.card_keywords).join(",") + " and " +
                            Object.values(thus.card_inherited_keywords) + " or " + Object.values(thus.card_linked_keywords));
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

        if (this.input && text !== "no") {

            new_parse_effects(maineffects, this, "main");
            new_parse_effects(sourceeffects, this, "inherited");
            new_parse_effects(linkeffects, this, "link");

            if (Object.keys(this.card_keywords).length > 0) logger.debug(`5543 have ${this.card_keywords.length} keywords + ${Object.values(this.card_keywords).join(",")}`);

            // if any effects are [security] refile them now
            // deleted code to move [security] effects that showed up in main, since it's handled above
            logger.debug("securityeffectslength is " + securityeffects.length + " " + this.name);
            logger.debug("newsecurityeffectslength is " + this.new_security_effects.length + " " + this.name);
            new_parse_effects(securityeffects, this, "security");
            logger.debug("newsecurityeffectslength is " + this.new_security_effects.length + " " + this.name);
        }
        logger.debug("MAINING REMAINING " + maineffects.length + " " + securityeffects.length);
        //        this.main_text ||= 'err2';    
        //         this.inherited_text ||= 'err2';


        this.main_text ||= maineffects.join("\r\n");
        this.inherited_text ||= sourceeffects[0]; // can be multiple!
        this.link_text ||= linkeffects.join("\r\n");

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

    // return CS-Fred is "Fred" if a unique prefix match for "Fred"
    // return CS-03-Fred otherwise
    // TODO: should allow for "CS-Fred" even if "CS-FredFlintstoneMode" exists as long as CS-Fred matches exactly
    testname(testmode: number): string {
        if (testmode == 1) return this.id;
        let [set, _] = this.id.split("-");
        let outname = this.name.replace(/[^＜＞a-zA-Z0-9]/g, '');
        outname = outname.charAt(0).toUpperCase() + outname.slice(1).toLowerCase();

        // on the field, we prefix FACEDOWN if a card is face-down
        // in security, we suffix FACEUP if the card is face-up
        let prefix = "";
        let suffix = "";
        if (this.face_up && this.location & Location.SECURITY) suffix = ",FACEUP";
        if (!this.face_up && this.location & Location.FIELD) prefix = "FACEDOWN,";
        if (this.location & Location.SECURITY) {
            prefix = "";
        } else if (this.location & Location.FIELD) {
            suffix = "";
        }
        let ret = `${set}-${outname}`;
        if (!this.game?.get_card(ret)) {
            // no hit, we need to fall back to it 
            return prefix + this.id + "-" + outname  + suffix;
        }
        return prefix + ret + suffix;
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
            console.error(`${this.name} ${this.card_id} ${this.card_instance_id}, ${i} at ${Location[this.location]} is supposed to be in ${Location[l]}`);
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

    static hidden: Location[] = [Location.NEW, Location.DECK, Location.EGGDECK, Location.HAND];
    static visible: Location[] = [Location.BATTLE, Location.EGGZONE, Location.TRASH, Location.REVEAL, Location.TOKENDECK, Location.TOKENTRASH, Location.NULLZONE, Location.OPTZONE, Location.TEMPSTACK];
    static maybe: Location[] = [Location.SECURITY];

    // finds the card in the place it was at, in case we need it
    // return self (is this necessary)
    // TODO: how much of a dupe between this and CardLocation.extract?
    extract(): Card {
        let pile = this.player!.get_pile(this.location, this.mon_instance);
        // not all trash cards with the same ID are the same!
        let i = pile.findIndex(x => x == this);
        let ret = pile.splice(i, 1)[0];
        return ret;

    }

    // put it back where it was, 
    return_card() {
        let old_cl = this.retrieve_prior_location();
        this.extract();
        if (old_cl) {
            let old_i = old_cl.instance ? this.game?.get_instance(old_cl.instance) : undefined;
            this.move_to(old_cl.location, old_i); // we should have an index, too, if we need to returnm to a stack
        } else {
            this.move_to(Location.HAND);
        }
        this.prior_location = undefined;
    }

    flip_face_up(up: boolean) {
        this.face_up = up;
        if (!up) {
            this.card_instance_id == -1;
            return;
        }
        if (up && this.card_instance_id == -1) { // newly face-up, need id
            this.card_instance_id = this.game!.next_card_id();
        }
        return;

    }

    assign_id(l: Location, instance?: Instance, order?: string): void {

        if (Card.maybe.includes(this.location)) {
            if (!this.face_up) {
                this.card_instance_id == -1;
                return;
            }
            if (this.face_up && this.card_instance_id == -1) { // newly face-up, need id
                this.card_instance_id = this.game!.next_card_id();
            }
            return;
        }

        let from = "";
        // TODO: face-up in security is public...
        if (Card.hidden.includes(this.location)) from = "hidden";
        if (Card.visible.includes(this.location)) from = "public";
        let to = "";
        if (Card.hidden.includes(l)) to = "hidden";
        if (Card.visible.includes(l)) to = "public";
        if (Card.maybe.includes(l)) {
            to = this.face_up ? "public" : "hidden";
        }
        // hey, when we shuffle face-up cards, do we keep the ID?

        if (from == "" || to == "") {
            logger.error(`from is ${from} and to is ${to}`);
            logger.error(`from ${Location[this.location]} to ${Location[l]}`);
            let a: any = null; a.bad_card_1(this.location);
        }


        if (from == "public" && to == "hidden") {
            this.card_instance_id = -1;
        } else if (from == "hidden" && to == "public") {
            this.card_instance_id = this.game!.next_card_id();
        } else if (from == to) {
            // nothing
        } else {
            let a: any = null; a.bad_move_2(this.location);
        }

    }
    // oooh, maybe *this* should do the re-constructor! That way it's
    // all in one place!
    move_to(l: Location, instance?: Instance, order?: string): void {
        // console.trace();
        // make a new card_instance_id when moving from
        // [NEW,DECK,EGGDECK,SECURITY,HAND,NEW] to [FIELD,EGGZONE,TRASH,REVEAL]
        // delete card_instance when doing the reverse

        // should a card in the hand even *have* an ID? It has to be 
        // very private if I store it. Card hands can't be distinguished.

        // this also resets once-per-turn... does it check that we're moving 
        // into a new instance?

        // we will get ERROR! if we'll be the first card in the instance
        let s_new_inst = instance ? `${instance.id} ${instance.get_name()}` : "nul";
        logger.warn(`CARD: Want to move ${this.id} ${this.name} ${this.card_instance_id} ` +
            `from ${Location[this.location]} and from instancve ${this.mon_instance} ` +
            `to Location is ${Location[l]} and to instance ${s_new_inst} order ${order}`);

        if (l == this.location && instance?.id == this.mon_instance) {
            logger.error("moving in place??");
        } else {
            for (const effect_list of [this.new_effects, this.new_security_effects, this.new_inherited_effects, this.new_link_effects]) {
                effect_list.forEach(e => e.n_last_used_turn = 0);
            }
        }

        if (this.is_token()) {
            // token can only be on field... it shouldn't be moved ever.
            if (l != Location.BATTLE && l != Location.TOKENDECK) {
                l = Location.TOKENTRASH;
            }
        }

        this.assign_id(l, instance, order);
        // we need to know the instance and index, too

        this.location = l;
        this.face_up = !!(this.location & (Location.FIELD | Location.ALLTRASH)); // mark as face down if any place but field or trash

        if (instance && this.location !== Location.HAND) {
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
        if (order?.match(/BOTTOM/))
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

    static normalize(str: string | undefined): string {
        if (!str) return "";
        return str.toUpperCase().replace(/[^＜＞a-zA-Z0-9]/g, '');
    }
    public name_is(str: string): boolean {
        str = Card.normalize(str);
        //        logger.info("LOOKING FOR " + str);
        if (this.name_rule) {
            //logger.info("NAME RULE: " + this.name_rule);
            let m;

            if (m = this.name_rule.match(/treated as \[(.*)\]/i)) {
                //     logger.info("NAME COULD BE: " + m[1]);
                if (Card.normalize(m[1]) === str) return true;
            }
        }
        return Card.normalize(this.name) == str;
    }
    public name_contains(str: string): boolean {
        let my_names: string[] = [this.name];
        if (this.name_rule) {
            let m;
            if (m = this.name_rule.match(/treated as(?: having)? \[(.*)\]/i)) {
                my_names.push(...m[1].split("]/["));
            }
        }
        let match_to = Card.normalize(str.toUpperCase());
        return my_names.some(n => Card.normalize(n).includes(match_to));
    }
    public text_contains(str: string): boolean {
        str = Card.normalize(str);
        return Card.normalize(this.name).includes(str) ||
            Card.normalize(this.name_rule).includes(str) ||
            Card.normalize(this.trait_rule).includes(str) ||
            Card.normalize(this.main_text).includes(str) ||
            Card.normalize(this.inherited_text).includes(str) ||
            Card.normalize(this.security_text).includes(str) ||
            Card.normalize(this.evo_text).includes(str) ||
            Card.normalize(this.fandom_input).includes(str)
    }

    // right now nothing distinguishes type, attribute, or form
    public trait_contains(str: string): boolean {
        str = str.toUpperCase();
        let my_traits = [this.mon_attribute, ...this.mon_form, ...this.mon_type];
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
        let my_traits = [this.mon_attribute, ...this.mon_form, ...this.mon_type];
        if (this.trait_rule) {
            let m;
            if (m = this.trait_rule.match(/has( the)? \[(.*)\]/i)) {
                my_traits.push(...m[2].split("]/["));
            }
        }
        return my_traits.some(x => x.toUpperCase() == str);
    }
    public has_stack_add(): boolean { return this.stack_summon_list.length > 0; }
    // deprecated function
    public is_two_color(): boolean { return this.colors.length == 2; }
    public color_count(): number { return this.colors.length; }
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
    is_type(type: string): boolean {
        switch (type.toLowerCase()) {
            case "monster": return this.is_monster();
            case "option": return this.is_option();
            case "tamer": return this.is_tamer();
            case "egg": return this.is_egg();
            case "token": return this.is_token() || this.is_monster(); // TODO:
            // is "token" appropriate at this level?   
            // technically a token also matches true for "is_monster"         

            default: return false;
        }
    }
    is_egg(): boolean { return this.n_type == 1; }
    is_monster(): boolean { return this.n_type == 2; }
    is_tamer(): boolean { return this.n_type == 3; }
    is_option(): boolean { return this.n_type == 4; }
    get_level(): number { return this.level!; }
    get_name(): string { return this.name; }
    get_playcost(): number | undefined { return this.p_cost; }
    get_usecost(): number | undefined { return this.u_cost; }

    public all_keywords(kind: string = "main"): KeywordArray {
        if (kind == "inherited") {
            return this.card_inherited_keywords;
        }
        if (kind == "linked") {
            return this.card_linked_keywords;
        }
        if (kind != "main") console.error("unknown keyword filter " + kind);
        return this.card_keywords;
    }

    // TODO: get rid of object[] return if we can... unless it's how we get <draw>???
    public has_keyword(keyword: string, kind: "main" | "linked" | "inherited"): (string | false) {
        //        logger.debug("lookinf ro card keyword" + keyword);
        // case-sensitive?
        let regexp = new RegExp(keyword.replaceAll(/[ _]/ig, "."), "i");
        // logger.debug("regexp is " + regexp + " and keywords be " + Object.keys(this.card_keywords).join(","));
        let keywordlist;
        if (kind === "main")
            keywordlist = this.card_keywords;
        else if (kind === "linked")
            keywordlist = this.card_linked_keywords;
        else {
            keywordlist = this.card_inherited_keywords;
            if (kind !== "inherited") logger.error("unrecognized type " + kind);
        }
        //logger.warn("keys" + JSON.stringify(keywordlist));
        // I'd like to just look this up directly without case matching

        let key = Object.keys(keywordlist).find(key => regexp.test(key));
        if (key) return keywordlist[key]
        return false;

    }


    // same logic for link and
    static can_evolve_into(base: Instance | CardLocation, conditions: (LinkCondition | EvolveCondition)[]) {
        let ret = [];

        /*
        console.error("ZZZZ", conditions);
        console.dir(conditions, { depth: 8 });
*/
        for (let evo_cond of conditions) {
            if ("raw_text" in evo_cond) {
                if (verify_special_evo(base, evo_cond)) {
                    ret.push(evo_cond.cost);
                }
                continue;
            }

            logger.debug("LEGACY EVO: " + JSON.stringify(evo_cond));

            if (evo_cond.text) logger.error("unknown evo condition: " + evo_cond.text);

            // we have to match all things that exist

            // OBSOLETE? these are all grammared now
            if (evo_cond.tamer && !base.is_tamer()) continue;
            if (evo_cond.color && !base.has_color(evo_cond.color)) continue;
            if (evo_cond.level && evo_cond.level != base.get_level()) continue;
            if (evo_cond.grade && !base.has_trait(evo_cond.grade)) continue;


            if (evo_cond.name_is && !base.name_is(evo_cond.name_is)) continue;
            if (evo_cond.name_contains && !base.name_contains(evo_cond.name_contains)) continue;
            if (evo_cond.trait && !base.has_trait(evo_cond.trait)) continue;
            ret.push(evo_cond.cost);
        }
        return ret;
    }


    public can_app_evolve(mon: Instance): false | number[] {
        if (!mon.is_monster()) return false;
        if (mon.plugged.length == 0) return false; // technically only need this test
        let conds: AppEvolveCondition[] = this.app_evolve_conditions;
        let ret = [];
        for (let cond of conds) {
            // we might someday have more than 1 plug that's useable
            let monster_matches = cond.monsters;
            for (const top of monster_matches) { // iterate over the name of the mon
                let topmatch = verify_special_evo(mon, top);
                if (!topmatch) continue;
                for (let plug of monster_matches) {
                    if (top == plug) continue;
                    let cl = new CardLocation(this.game!, this.n_player, Location.BATTLE, 0, mon.id, "plug");
                    // assume just 1 plug for now
                    if (!verify_special_evo(cl, plug)) continue; // plug isn't right
                    ret.push(cond.cost);
                }
            }
        }
        if (ret.length > 0) {
            return ret;
        }
        return false;
    }

    public can_merge_evolve(left: Instance | CardLocation, right: Instance | CardLocation, type: 'fusion' | 'burst'): false | number[] {
        // check if the left can evo
        logger.debug(`can merge2? ${this.name} onto ${left.get_name()} and ${right.get_name()}`);
        let l = left.can_evolve(this, 99, 1, type);
        logger.debug(`l is ${l} ${!!l}`);
        if (!l) return false;

        let r = right.can_evolve(this, 99, 2, type);
        logger.debug(`r is ${r} ${!!r}`);
        if (!r) return false;
        logger.debug(`YES WE CAN MERGE  ${this.get_name()} onto ${left.get_field_name(1)} and ${right.get_field_name(1)}`);
        // all merge evolves are for 0 cost, for now
        return [0];
    }


    // TODO: you cannot "play" option cards, but you can "use" them. For now, who cares?
    public can_play(player: Player, memory: number): boolean {
        if (this.n_type == 1) {
            logger.error("NEVER PLAY AN EGG");
            return false;
        }
        if (this.n_type == 4) {
            if (this.allow) {
                // dummy source, we just need the player, we can't reference anything
                let cl: CardLocation = new CardLocation(this.game!, this.n_player, Location.HAND, 0);
                let t = this.allow.test(this.game!, new SpecialCard(cl));
                if (t.length > 0) return true;
            }
            let matchset: Color[][] = [this.colors];
            if (this.color_allow) matchset.push(this.color_allow);
            for (let match of matchset) {
                // any 1 matchset must match all colors
                if (match.every(c => player.has_color(c))) return true;
            }
            return false;
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
    private pile: Card[]; // this function modifies the pile; it violates good data segretation patterns
    location: Location;
    cardloc: Location;
    mode: "plug" | undefined;
    constructor(g: Game, n_player: number, location: Location,
        i: number | string, instance_id: number = -1,
        mode: "plug" | undefined = undefined) {
        this.game = g;
        this.n_me_player = n_player;
        this.mode = mode;
        if (instance_id != -1) { this.instance = instance_id; }
        if (location == Location.HAND) {
            this.pile = g.get_n_player(n_player).hand;
        } else if (location == Location.TRASH) {
            this.pile = g.get_n_player(n_player).trash;
        } else if (location == Location.REVEAL) {
            this.pile = g.get_n_player(n_player).reveal;
        } else if (location == Location.BATTLE || location == Location.EGGZONE) {
            if (mode === "plug")
                this.pile = g.get_instance(instance_id).plugged;
            else
                this.pile = g.get_instance(instance_id).pile;
            if (g.get_instance(instance_id).location !== location) this.pile = [];
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

    colors(): Color[] { return this.card.colors; }

    // extract should mark this struct as invalid somehow
    extract(): Card {
        let i = this.index;
        // not right index?
        // if we trash 2 cards at once, the index might break between the first and second
        if (!this.pile[i] || this.pile[i].id !== this.card_id) {
            // try to recover an id if ours is broken; what if we find nothing
            i = this.pile.findIndex(x => x.id == this.card_id);
        }
        //        logger.debug(`COMPARE ${i} and ${this.index}`);
        let cl = new CardLocation(this.game!, this.card.n_player, this.location, i, this.instance, this.mode);

        let c = this.pile.splice(i, 1)[0];
        //        c.set_prior_location(cl);
        return c;
    }
    // number-number pair, first is location, second is index (for pile) or id (for field)
    get_key(): string {
        let ret = `${this.location}-${this.instance || 0}-${this.index}`;
        logger.info("get key: " + ret);  
        return ret;
    }
    // return "NAME" or "NAME in HAND" if not on field
    // DUPE!
    get_field_name(l: Location = Location.FIELD): string {
        let ret = /* this.get_set() + "-" + */ this.get_name();
        if ((this.location & l) === 0) {
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
    text_contains(s: string) { return this.card.text_contains(s); }
    trait_contains(s: string) {
        logger.silly(`does ${this.name} traits contain %${s}?`);
        let ret = this.card.trait_contains(s);
        logger.silly(ret);
        return ret;
    }
    has_trait(s: string) {
        return this.card.has_trait(s);
    }
    
    get_link_requirements(): LinkCondition[] { return this.card.link_requirements };
    has_stack_add(): boolean { return !!this.card.has_stack_add(); }
    color_count(): number { return this.card.colors.length; }
    is_token(): boolean { return this.card.is_token(); }
    is_ready(): boolean { return false; } // cards are never suspended
    is_type(t: string): boolean { return this.card.is_type(t); }
    is_monster() { return this.card.is_monster(); }
    is_tamer() { return this.card.is_tamer(); }
    is_option() { return this.card.is_option(); }
    get_level() { return this.card.get_level(); }
    get_playcost() { return this.card.get_playcost(); }
    get_usecost() { return this.card.get_usecost(); }
    has_color(c: Color) { return this.card.has_color(c); }
    source_match(td: TargetDesc | undefined, s: TargetSource) { return false; } // card location never has sources
    get_sources(): CardLocation[] { return []; } // this shouldn't be checked
    get_source_count(): number { return 0; } // this shouldn't be checked
    new_inherited_effects(): SolidEffect[] { return this.card.new_inherited_effects; }
    face_up(): boolean { return this.card.face_up; }
    dp() { return this.card.dp; }
    has_keyword(word: string): boolean { return !!this.card.has_keyword(word, "main"); }
    get_instance(): Instance | undefined {
        if (!this.instance) return undefined;
        let i = this.game.get_instance(this.instance!);
        return i;
    }
    is_evo_card(): boolean {
        if (!this.instance) return false;
        let i = this.game.get_instance(this.instance!);
        return this.location === Location.BATTLE
            && i.is_monster()
            && this.mode !== "plug"
            && this.index < this.pile.length - 1; // not top card, we 
        // could have done this check in Game::get_targets()
    };
    is_plugged_card(): boolean {
        if (!this.instance) return false;
        let i = this.game.get_instance(this.instance!);
        return this.location === Location.BATTLE
            && i.is_monster()
            && this.mode === "plug"; // not top card, we 
        // could have done this check in Game::get_targets()
    };

}



//export = Card;
