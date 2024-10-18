

import { Player } from './player';
import { AtomicEffect, SolidEffect } from './effect';
import { TargetDesc } from './target';
import { Location } from './location';
import { Game } from './game';
import { new_parse_line } from './newparser';
import { Instance } from './instance';

let normal_circles = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
let inverse_circles = ["⓿", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾", "❿", "⓫", "⓬", "⓭", "⓮", "⓯", "⓰", "⓱", "⓲", "⓳", "⓴"];


let carddebug = 1;

import { createLogger } from "./logger";
import { Translator } from './translate';
const logger = createLogger('card');

enum types { EGG = 1, MONSTER, TAMER, OPTION };
function word_to_type(word: string): types {
    switch (word.toUpperCase()) {
        case "": // incomplete card
        case "DIGI-EGG":
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
        default:
            logger.error("bad color" + word);
            let c: any = null; return c.no_color(word);
    }
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
    cost: number;
    text?: string; // only used for errors, but maybe can be used normally
    two_color?: boolean; // this should be "color_count"
    trait?: string;
    //targ3et?: null;

    name_is: string; // TODO: make array
    name_contains?: string; // TODO: make array
}


interface DNAEvolveCondition {
    left?: string;
    right?: string;
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
    readonly name: string;
    readonly dp: number;
    readonly level: number;
    readonly evolve_conditions: EvolveCondition[] = [];
    readonly dna_evolve_conditions: DNAEvolveCondition[] = [];
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
    playxros?: string;
    allow?: string;

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


    parse_special_evolve(line: string, evo: any) {
        //[Evolve] 2-color w/[xxx] in_its_name: Cost 5
        //[Evolve] If name contains [yyy]: Cost 2
        //[Evolve] Attackamonster: Cost 0
        //[Evolve] Lv. 4 2-color green card: Cost 3
        //[Evolve] Lv. 5 2-color green card: Cost 3
        //[Evolve] Lv.2 w/[Trait_One]/[Trait_Two] trait: Cost 0
        //[Evolve] Lv.3 w/[xxx] trait: Cost 2
        //[Evolve] Lv.3 w/[yyy] in its name: Cost 3
        //[Evolve] Lv.4 w/[Leroy] in_its_name or [Sword] trait: Cost 3
        //[Evolve] [DemiVeemon]: Cost 0
        //[Evolve] [Dinobeemon] or Lv.5 w/[Insectoid] trait: Cost 3
        //[Evolve] red, black, or purple Lv.4 w/＜Save＞ in_its_text: Cost 4
        //[Evolve] w/[Rapidster] in its name: Cost 5
        // [Evolve] [Chillet]: Cost 3
        // [Evolve] Lv.4 w/[Gargler]/[Rapidster] in_its_name: Cost 3

        //     console.error(line);
        let m;
        // [monname]: cost 4
        if (m = line.match(/^\s*\[?(\w*)\]?: Cost (\d)$/i)) {
            evo.name_is = m[1];
            evo.cost = parseInt(m[2]);
            // [monone/montwo] in.its.name
        } else if (m = line.match(/^\s*\[(\w*)\]\[(\w*)\]: Cost (\d)$/i)) {
            evo.name_is = m[1];
            evo.cost = parseInt(m[3]);
            this.evolve_conditions.push(evo);
            evo = {};
            evo.name = this.name;
            evo.name_is = m[2];
            evo.cost = parseInt(m[3]);
            // (level 3)? w/[OneWord] in.its.name
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[?(\w*)\]?.in.its.name: Cost (\d)$/)) {
            //console.error(m);
            if (m[2]) evo.level = parseInt(m[2]);
            evo.name_contains = m[3];
            evo.cost = parseInt(m[4]);
            // (level 3) w/[OneWord][TwoWord] in.its.name
            // 'Lv.3 w/[Fred]/[George] in_its_name: Cost 2'
            // Lv.4 2-color w/purple OR Lv.4 2-color purple card
            //                         1     2              34         5   6            7       8                           9
        } else if (m = line.match(/^\s*(Lv. ?(\d))? 2-color ((w\/)?\s*(.*?)( card)?)?\s*(w\/\[?(\w*)\]?.in.its.name)?: Cost (\d)$/)) {
            //  console.error(m);
            if (m[1]) evo.level = parseInt(m[2]);
            // need either "w/COLOR" or "COLOR card" 
            if (m[3] && (m[4] || m[6])) evo.color = word_to_color(m[5]);
            if (m[7]) evo.name_contains = m[8];
            evo.cost = parseInt(m[9]);
            evo.two_color = true;
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[(\w*)\].trait: Cost (\d)$/)) {
            if (m[2]) evo.level = parseInt(m[2]);
            evo.trait = m[3]
            evo.cost = parseInt(m[4]);
            this.evolve_conditions.push(evo);
        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[(\w*)\]\/\[(\w*)\].in.its.name: Cost (\d)$/)) {
            if (m[2]) evo.level = parseInt(m[2]);
            evo.name_contains = m[3];
            evo.cost = parseInt(m[5]);
            this.evolve_conditions.push(evo);
            evo = {};
            if (m[2]) evo.level = m[2];
            evo.name = this.name;
            evo.name_contains = m[4];
            evo.cost = parseInt(m[5]);
        } else {
            evo.level = 42;
            evo.text = line;
        }
        this.evolve_conditions.push(evo);

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
            this.name ||= "err";
            this.n_type ||= 0; //number;
            this.type ||= "err"; //string;
            this.n_color ||= 0; //"; //number;
            this.colors ||= []; "err"; //Color[];
            this.color ||= "err"; // "err"; //string;
            this.id ||= "err"; //string;
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
                let evo_cond: any = {
                    cost: parseInt(cond.cost),
                    level: parseInt(cond.level),
                    color: word_to_color(cond.color)
                }
                this.e_cost = parseInt(cond.cost); // "default" evolution cost
                this.evolve_conditions.push(evo_cond);
            }
            let spec = blob.specialEvolve;
            if (spec != "-") {
                if (spec.startsWith("[Evolve]")) {
                    spec = spec.substring("[Evolve]".length).trim();
                    this.parse_special_evolve(spec, {});
                }
            }
            // parse evolve conditions here
            ////// uugh, we parse them both here and in 
            let eff = blob.effect;
            if (blob.aceEffect != "-") eff += "\n" + blob.aceEffect;
            this.main_text = eff;
            this.inherited_text = blob.evolveEffect;
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
                    for (let j = 0; j < a.length; j++) {
                        logger.error("fixing mismatch, this shouldn't happen any mnore");
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
                        if (x.keywords.includes("[Security]")) {
                            //      logger.debug("putting that into security");
                            thus.new_security_effects.unshift(x);
                            thus.security_text ||= l;
                        } else {
                            if (x.keywords.length > 0 || a.length > 0) {
                                new_effects.unshift(x); // we iterated backwards, so reverse order here
                            } else {
                                //   logger.debug("NO ATOMIC, NO EFFECT");
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



    testname(testmode: number): string {
        if (testmode == 1) return this.id;
        let [set, _] = this.id.split("-");
        let outname = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
        let ret = `${set}-${outname}`;
        if (!this.game?.get_card(ret)) {
            // no hit, we need to fall back to it
            return this.id;
        }
        return ret;
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
            logger.error(`${this.name} at ${Location[this.location]} is supposed to be in ${Location[l]}`);
            //logger.trace();
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
    static visible: Location[] = [Location.FIELD, Location.EGGZONE, Location.TRASH, Location.REVEAL, Location.TOKENDECK, Location.TOKENTRASH, Location.NULLZONE];

    

    // finds the card in the place it was at, in case we need it
    // return self (is this necessary)
    // TODO: how much of a dupe between this and CardLocation.extract?
    extract(): Card {
        let pile = this.player!.get_pile(this.location);
        // not all trash cards with the same ID are the same!
        let i = pile.findIndex(x => x.id == this.id && x.card_instance_id == this.card_instance_id);
        return pile.splice(i, 1)[0];

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

        if (l == this.location) {
            logger.error("moving in place??");
        }
        let from = "";
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
        let pile = p.get_pile(l);
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
        return this.name.toUpperCase().includes(str.toUpperCase());
    }
    public trait_contains(str: string): boolean {
        str = str.toUpperCase();
        // trait could be an array, right?
        // hoping we don't need case-insensitive comparison
        return this.mon_type.some(x => x.toUpperCase().includes(str)) ||
            this.mon_attribute.toUpperCase().includes(str.toUpperCase()) ||
            this.mon_form.toUpperCase().includes(str.toUpperCase());
    }
    // must be match
    public has_trait(str: string): boolean {
        str = str.toUpperCase();
        return this.mon_type.some(x => x.toUpperCase() == str) ||
            this.mon_attribute == str ||
            this.mon_form == str;
    }
    
    public is_two_color(): boolean { return this.colors.length == 2; }
    public name_set(): string {
        let set = this.id.split("-")[0];
        return `${set}-${this.name}`;
    }
    colors_s(): string {
        return this.colors.map(x => Color[x]).join(",");
    }

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
        //   logger.debug("looking for keyword " + keyword + " in " + Object.keys(keywordlist).join());

        // I'd like to just look this up directly without case matching

        let key = Object.keys(keywordlist).find(key => regexp.test(key));
        if (key) return keywordlist[key]
        return false;

        // this below is obsolete, right, now that keywords are explicit?
        // If I'm looking for "retaliation" as an effect I should look up the effects
        // on the instance

        for (let solid of this.new_effects) {
            logger.error("obsolete? or not?");
            //      if (solid.keywords.some(x => x.match(regexp))) return [{ keyword }];
        }

    }

    // TODO: you cannot "play" option cards, but you can "use" them. For now, who cares?
    public can_play(player: Player, memory: number) {
        if (this.n_type == 1) {
            logger.error("NEVER PLAY AN EGG");
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
        if (cost! > memory) return false;
        return true;
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
            this.pile = g.get_n_player(n_player).reveal;
        } else if (location == Location.NULLZONE) {
            this.pile = g.get_n_player(n_player).nullzone;
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
    // extract should mark this struct as invalid somehow
    extract(): Card {

        let i = this.pile.findIndex(x => x.id == this.card_id);
        //        logger.debug(`COMPARE ${i} and ${this.index}`);
        let c = this.pile.splice(i, 1)[0];
        return c;
    }
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
    is_two_color(): boolean { return this.card.is_two_color(); }
    is_token(): boolean { return this.card.is_token(); }  
    is_monster() { return this.card.is_monster(); }
    is_tamer() { return this.card.is_tamer(); }
    is_option() { return this.card.is_option(); }
    get_level() { return this.card.get_level(); }
    get_playcost() { return this.card.get_playcost(); }
    has_color(c: Color) { return this.card.has_color(c); }
    get_source_count(): number { return 0; } // this shouldn't be checked

    dp() { return this.card.dp; }

}



//export = Card;
