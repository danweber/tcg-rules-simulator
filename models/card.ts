

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
const logger = createLogger('card');

enum types { EGG = 1, DIGIMON, TAMER, OPTION };
function word_to_type(word: string): types {
    switch (word.toUpperCase()) {
        case "DIGI-EGG":
        case "EGG": return types.EGG;
        case "DIGIMON": return types.DIGIMON;
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
        case "RAINBOW": return Color.NONE; // really?
        default:
            logger.error("bad color" + word);
            let c: any = null; return c.no_color(word);
    }
}

function parse_color(text: string): Color[] {
    let ret: Color[] = [];
    let words = text.split(/ \/ |_/);
    logger.debug("parse color");
    logger.silly(text);
    logger.silly(words.toString());
    for (let word of words) {
        ret.push(word_to_color(word));
    }
    return ret;
}

export interface DigivolveCondition {
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


interface DNADigivolveCondition {
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
    readonly n_color: number;
    readonly colors: Color[];
    readonly color: string;
    readonly id: string;
    readonly name: string;
    readonly dp: number;
    readonly level: number;
    readonly evolve_conditions: DigivolveCondition[] = [];
    readonly dna_evolve_conditions: DNADigivolveCondition[] = [];
    readonly p_cost: number;
    readonly e_cost: number;
    readonly e_color: number; // need to move on from this being a number
    readonly e_level: number;
    readonly text: string;
    readonly trait: string = "fff";
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
    digixros?: string;
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

    get_location(): Location { return this.location; }

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
        this.p_cost = -1;

        let regexp = new RegExp(/^\*\*\*\*\* (.*)\((.*)\) \*\*\*\*\*$/);
        if (text != "") {

            this.fandom_input = text;
            //            logger.info("Text len is " + text.length);
            let lines: string[] = text.split("\n");
            let m;
            let i = 0;
            //            logger.info(text);
            //    logger.info(lines.length);

            let mode: "pre2" | "body" | "evolve" | "main" | "inherited" = "pre2";
            let digi: any = null;

            for (let line of lines) {
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
                    if (line.startsWith("Use Cost")) this.p_cost = parseInt(line.after("Use Cost"));
                    if (line.startsWith("Card Type")) { this.n_type = word_to_type(line.after("Card Type")); this.type = types[this.n_type]; }
                    if (line.startsWith("Attribute")) this.trait = line.after("Attribute");

                }
                if (line == "Digivolution Requirements" || line == "Alt. Digivolution Requirements") {
                    //logger.error("old digi:")
                    //logger.error(digi);
                    if (digi) this.evolve_conditions.push(digi);
                    digi = {};
                    digi.name = this.name;
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
                    if (line.startsWith("Colour")) digi.color = word_to_color(line.after("Colour"));
                    if (line.startsWith("Level")) {
                        digi.level = parseInt(line.after("Level"));
                        this.e_level = digi.level;
                        continue;
                    }
                    if (line.startsWith("Digivolve Cost")) {
                        digi.cost = parseInt(line.after("Digivolve Cost"));
                        this.e_cost = digi.cost;
                        continue;
                    }
                    //[Digivolve] 2-color w/[Magnamon] in_its_name: Cost 5
                    //[Digivolve] If name contains [Dracomon]: Cost 2
                    //[Digivolve] Koromon: Cost 0
                    //[Digivolve] Lv. 4 2-color green card: Cost 3
                    //[Digivolve] Lv. 5 2-color green card: Cost 3
                    //[Digivolve] Lv.2 w/[Light_Fang]/[Night_Claw] trait: Cost 0
                    //[Digivolve] Lv.3 w/[SoC] trait: Cost 2
                    //[Digivolve] Lv.3 w/[Terriermon] in its name: Cost 3
                    //[Digivolve] Lv.4 w/[Dorugamon] in_its_name or [SoC] trait: Cost 3
                    //[Digivolve] [DemiVeemon]: Cost 0
                    //[Digivolve] [Dinobeemon] or Lv.5 w/[Insectoid] trait: Cost 3
                    //[Digivolve] red, black, or purple Lv.4 w/＜Save＞ in_its_text: Cost 4
                    //[Digivolve] w/[Rapidmon] in its name: Cost 5
                    // [Digivolve] w/[Rapidmon] in_its_name: Cost 5
                    // [Digivolve] [Veemon]: Cost 3
                    // [Digivolve] Lv.4 w/[Gargomon]/[Rapidmon] in_its_name: Cost 3
                    //[Digivolve] Lv.3 w/[Lopmon]/[Terriermon] in_its_name: Cost 2
                    //[Digivolve] Lv.3 w/[Terriermon]/[Lopmon] in its name: Cost 2

                    if (line.startsWith("[Digivolve]")) {
                        line = line.substring(12);
                        let m;
                        // [monname]: cost 4
                        if (m = line.match(/^\s*\[?(\w*)\]?: Cost (\d)$/i)) {
                            digi.name_is = m[1];
                            digi.cost = parseInt(m[2]);
                            // [monone/montwo] in.its.name
                        } else if (m = line.match(/^\s*\[(\w*)\]\[(\w*)\]: Cost (\d)$/i)) {
                            digi.name_is = m[1];
                            digi.cost = parseInt(m[3]);
                            this.evolve_conditions.push(digi);
                            digi = {};
                            digi.name = this.name;
                            digi.name_is = m[2];
                            digi.cost = parseInt(m[3]);
                            // (level 3) w/[OneWord] in.its.name
                        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[?(\w*)\]?.in.its.name: Cost (\d)$/)) {
                            if (m[2]) digi.level = parseInt(m[2]);
                            digi.name_contains = m[3];
                            digi.cost = parseInt(m[4]);
                            // (level 3) w/[OneWord][TwoWord] in.its.name
                            // 'Lv.3 w/[Terriermon]/[Lopmon] in_its_name: Cost 2'

                        } else if (m = line.match(/^\s*(Lv. ?(\d))? 2-color ((.*) card)?\s*(w\/\[?(\w*)\]?.in.its.name)?: Cost (\d)$/)) {
                            if (m[1]) digi.level = parseInt(m[2]);
                            if (m[3]) digi.color = word_to_color(m[4]);
                            if (m[5]) digi.name_contains = m[6];
                            digi.cost = parseInt(m[7]);
                            digi.two_color = true;
                            // (level 3) w/[OneWord][TwoWord] in.its.name
                            // 'Lv.3 w/[Terriermon]/[Lopmon] in_its_name: Cost 2'

                        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[(\w*)\].trait: Cost (\d)$/)) {
                            if (m[2]) digi.level = parseInt(m[2]);
                            digi.trait = m[3]
                            digi.cost = parseInt(m[4]);
                            this.evolve_conditions.push(digi);
                        } else if (m = line.match(/^\s*(Lv.(\d))? ?w\/\[(\w*)\]\/\[(\w*)\].in.its.name: Cost (\d)$/)) {
                            if (m[2]) digi.level = parseInt(m[2]);
                            digi.name_contains = m[3];
                            digi.cost = parseInt(m[5]);
                            this.evolve_conditions.push(digi);
                            digi = {};
                            if (m[2]) digi.level = m[2];
                            digi.name = this.name;
                            digi.name_contains = m[4];
                            digi.cost = parseInt(m[5]);
                        } else {
                            digi.level = 42;
                            digi.text = line;
                        }
                    }

                }
                if (mode == "main" || mode == "inherited") {
                    logger.debug("==> " + line);
                    let fx = (mode == "main") ? this.new_effects : this.new_inherited_effects;
                    //function new_parse_effects(effects: string[], thus: Card, new_effects: SolidEffect[], mode: "main" | "inherited" | "security" = "main") {
                    new_parse_effects([line], this, mode);
                    /*
                                        let [c, s, a, r] = new_parse_line(line, this, this.name, mode == "inherited");
                                        if (r == "") {
                                            let x: SolidEffect = s;
                                            if (x.keywords.includes("[Security]")) {
                                                logger.debug("putting that into security");
                                                this.new_security_effects.push(x);
                                                this.security_text = line;
                                            } else {
                                                // thus.new_effects.push(x);
                                                this.new_effects.push(x);
                                            }
                                        }*/


                }
                if (mode != "body") {
                    // new_parse_line(line);
                }
                if (mode == "body") {
                    // new_parse_line(line);
                }
            }
            if (digi) {
                // logger.error("last digi:")
                //logger.error(digi);

                this.evolve_conditions.push(digi);
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
        //     logger.debug("in typescript card ctor");
        //     logger.debug(inverse_circles ? "yes" : "no");
        //    this.n_me_player = -1; // a 
        // const bflob , Unsafe = in_blob;
        this.type = types[blob.cardtype];
        this.n_type = blob.cardtype;
        this.color = colors[blob.color];
        this.n_color = blob.color;
        this.colors = [Color.NONE];
        if (this.color in Color) {
            this.colors[0] = Color[this.color as keyof typeof Color];
        }
        this.id = blob.cardid;
        this.name = blob.name;
        this.dp = parseInt(blob.dp);
        this.level = blob.level;
        this.p_cost = blob.cost; // play cost, not use cost

        this.e_cost = parseInt(blob.ecost);
        this.e_color = parseInt(blob.ecostcolor);
        this.e_level = parseInt(blob.elvfrom);

        if (this.e_level) {
            logger.debug(this.e_color);
            logger.debug(this.e_level);
            logger.debug(colors[this.e_color]);

            let digicond: any = {
                cost: this.e_cost,
                // TODO: if this is multiple color, accept any
                level: this.e_level, color: parse_color(colors[this.e_color])
            };
            logger.debug(digicond);
            this.evolve_conditions.push(digicond);
        }

        let maineffects = this.string_array(blob.maineffect);
        let sourceeffects = this.string_array(blob.sourceeffect);

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
                        s.effects.push(x);

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
                            thus.new_security_effects.push(x);
                            thus.security_text = l;
                        } else {
                            if (x.keywords.length > 0 || a.length > 0) {
                                new_effects.push(x);
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
        let securityeffects = this.string_array(blob.securityeffect);
        // deleted code to move [security] effects that showed up in main, since it's handled above
        logger.debug("securityeffectslength is " + securityeffects.length + " " + this.name);
        logger.debug("newsecurityeffectslength is " + this.new_security_effects.length + " " + this.name);
        new_parse_effects(securityeffects, this, "security");
        logger.debug("newsecurityeffectslength is " + this.new_security_effects.length + " " + this.name);

        logger.debug("MAINING REMAINING " + maineffects.length + " " + securityeffects.length);
        this.main_text = maineffects.join("\r\n");
        this.inherited_text = sourceeffects[0]; // can be multiple!


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
            logger.error("COULD1 NOT MAKE CARD <" + card_id + ">");
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
    static visible: Location[] = [Location.FIELD, Location.EGGZONE, Location.TRASH, Location.REVEAL, Location.TOKENTRASH, Location.NULLZONE];


    // finds the card in the place it was at, in case we need it
    // return self (is this necessary)
    // TODO: how much of a dupe between this and CardLocation.extract?
    extract(): Card {
        let pile;
        if (this.location == Location.HAND) {
            pile = this.player!.hand;
        } else {
            let a: any = null; a.bad_Extract();
            return this;
        }
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
        if (str == null) { return []; }
        return (str.split("\r\n"));
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
    public has_trait(s: string) { return this.trait == s; }
    public is_two_color(): boolean { return this.colors.length == 2; }
    public name_set(): string {
        let set = this.id.split("-")[0];
        return `${set}-${this.name}`;
    }
    is_egg(): boolean { return this.n_type == 1; }
    is_digimon(): boolean { return this.n_type == 2; }
    is_monster(): boolean { return this.n_type == 2; }
    is_tamer(): boolean { return this.n_type == 3; }
    is_option(): boolean { return this.n_type == 4; }
    get_level(): number { return this.level!; }
    get_name(): string { return this.name; }
    get_playcost(): number { return this.p_cost; }

    // TODO: make Effect its own class
    public effezcddt_has_keyword(effect: any, keyword: string): (Event | false) {
        //        logger.dir("chjecing for effect:");
        //      logger.dir(effect);



        if (!effect) {
            logger.error("called with bad event");
            //logger.dir(effect);
        }
        if (effect[keyword]) {
            return effect;
        } else {
            return false;
        }
    }

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

    // TODO: you cannot "play" option cards, but you can "use" them
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
        if (this.p_cost > memory) return false;
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
    is_digimon() { return this.card.is_digimon(); }
    is_tamer() { return this.card.is_tamer(); }
    is_option() { return this.card.is_option(); }
    get_level() { return this.card.get_level(); }
    get_playcost() { return this.card.get_playcost(); }
    has_color(c: Color) { return this.card.has_color(c); }


}

// why do I need CardLocation anymore?

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
        } else {
            logger.error("MISSING LOCATION!" + location);
            let a: any = null; a.diet();
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
    is_two_color() { return this.card.is_two_color(); }
    is_digimon() { return this.card.is_digimon(); }
    is_monster() { return this.card.is_monster(); }
    is_tamer() { return this.card.is_tamer(); }
    is_option() { return this.card.is_option(); }
    get_level() { return this.card.get_level(); }
    get_playcost() { return this.card.get_playcost(); }
    has_color(c: Color) { return this.card.has_color(c); }
    dp() { return this.card.dp; }

}



//export = Card;
