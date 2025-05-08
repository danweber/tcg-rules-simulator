

import { all_colors, CardLocation, word_to_color } from './card';
import { StatusCondition, SubEffect } from './effect';
import { SolidEffectLoop } from './effectloop';
import { GameEvent } from './event';
import { Game } from './game';
import { Instance } from './instance';
import { Location, string_to_location } from './location';

interface Comparable {
    equals(other: Comparable): boolean;
}


export class EffectAndTarget {
    s: SubEffect;
    t: CardLocation | Instance | undefined;
    constructor(s: SubEffect, t: CardLocation | Instance | undefined) {
        this.s = s; this.t = t;
    }
    equals(other: EffectAndTarget): boolean {
        return other.s == this.s && other.t == this.t;
    }
}

import { createLogger } from "./logger";
import { ForEachTarget, SubTargetDesc, TargetDesc, TargetSource } from './target';
const logger = createLogger('util');


// for each multiplier
export function get_mult(s: SubEffect): number {
    let mult = s.n_mult;
    if (mult === undefined) mult = 1;
    return s.n! * mult;
}

export function color_count(objects: (Instance|CardLocation)[]): number {
     let count = all_colors.filter(c => 
        objects.some( object => object.has_color(c) ));
    return count.length;
}

// w n_count_tgt
export function for_each_count_target(w: SubEffect, game: Game, ts: TargetSource, p: number): boolean {
    if (2<1) return false;
    let c1: ForEachTarget | undefined = w.n_count_tgt;
    if (!c1) return false; // shouldn't have ever gotten in here in the first place
    let i;
    logger.info(`looking foreach, target ${c1.toString()} ${c1.target.raw_text}`);
    if (false && c1?.target.raw_text.match(/color of your opponent's Monster (and|or)f Tamer/i)) {
        let op = game.get_n_player(3 - p);
        i = op.my_colors(false).length;
        console.error(49, i);
    } else {
        i = c1.get_count(game, ts);
    }
    logger.info("targets for " + c1.target.raw_text + " is " + i);

    // are we changing N or changing CHOOSE?
    // for now, we can tell by which is non-zero
    logger.info(`CHANGING n from ${w.n} to ${i} ?`);
    logger.info(`CHANGING choose from ${w.choose} to ${i} ?`);
    if (w.game_event === GameEvent.GIVE_STATUS_CONDITION && w.status_condition
         && w.status_condition[0] && w.status_condition[0].s) {
        logger.info(`CHANGING s.n from ${w.status_condition[0].s.n} by ${i} ?`);
        logger.info("BEFORE " + w.status_condition[0].s.n_mult);
        w.status_condition[0].s.n_mult = i;
        logger.info("AFTER  " + w.status_condition[0].s.n_mult);
        return true;
        // don't alter N or choose if we have a DP... it could easily be the reverse
    }
    if (w.n) w.n = w.n * i;
    if (w.choose) {
        w.choose = w.choose * i;
        if (i == 0) {
            // can't choose any, just fail the effect now
            //   sel.game.log(`No for-each, skipping`);
            return false;
        }
    }
    return true;
}

// does multitarget match?

function appendArrays(array1: any[],
    array2: any[],
    array3?: any[],
    array4?: any[],
): any[] {
    let result: any[] = [];
    if (array1) {
        result = result.concat(array1);
    }
    if (array2) {
        result = result.concat(array2);
    }
    if (array3) {
        result = result.concat(array3);
    }
    if (array4) {
        result = result.concat(array4);
    }
    return result;
}

export function verify_special_evo(base: Instance | CardLocation, evo_cond: any, s?: TargetSource,
    sel?: SolidEffectLoop): boolean {
    let ret = _verify_special_evo(base, evo_cond, s, sel);
    logger.info(" verify _special_evo " + ret + "  for " + base.get_name() + " " + evo_cond.raw_text); //  JSON.stringify(evo_cond) + " = " + ret);
    return ret;
}
function _verify_special_evo(base: Instance | CardLocation, evo_cond: any, s?: TargetSource,
    sel?: SolidEffectLoop): boolean {
    //console.error("looking for match for " + base.get_name() + " " + JSON.stringify(evo_cond));
    //console.error(evo_cond); 

    if (Array.isArray(evo_cond)) {
        evo_cond = evo_cond[0]; // we shouldn't need this
    }
    if (!evo_cond.raw_text) {
        console.error("no raw text ", evo_cond);
        return false;
    }
    let array: any[];

    let def = false; // default
    if (evo_cond.not) def = true;
    let ret;

    // what cards am I under?
    // .under can refer to either links or sources
    if (evo_cond.under) {
        let i = base.get_instance();
        if (!i) return def;
        ret = verify_special_evo(i, evo_cond.under, s, sel);
        logger.debug("we are under " + evo_cond.under.raw_text + "  verified " + ret);
        if (!ret) return def;
    }


    // what cards do I have in my sources?
    // assume in_evocards never has co-conditions, since it can return immediately
    if (evo_cond.in_evocards) {
        let actual_sources = base.get_sources();
        if (actual_sources.length == 0) {
            return def;
        }
        let t = evo_cond.in_evocards;
    //    console.log("COND");
    //     console.dir(t, { depth: 4 }); 

        if (!t.targets) {
            console.error("no t targets????");
            // if any source matches, say we succeed. will fail on A & B
            ret = actual_sources.some(c => verify_special_evo(c, t, s, sel));
            if (!ret) return def;

            return true;
            return !def;
        } else {
            let match_conds = t.targets;
            let any = t.need === "any";


            let all_matching_cards: Set<CardLocation> = new Set(); // is uniqueness forced on CardLocations?
            for (let t of match_conds) {
                logger.debug("can we match " + t.raw_text);
                // finding if I *can* hit both is an easy case
                // 1. find things that match A. find things that match B. 
                // 2. make sure each has at least 1
                // 3. make sure we have at least 2 total
                let count = 0;
                actual_sources.forEach(function (c) {
                    let m = verify_special_evo(c, t, s, sel);
                //    console.error("any", any, " return ", m, " for " + c.get_name() + " " + t.raw_text);
                    if (m) {
                        // if we just needed one match, this was it
                        count += 1;
                        // 
                        all_matching_cards.add(c);
                    }
                })
                if (any && count > 0) {
                    logger.info("any match, returning " + !def + " for " + evo_cond.raw_text);   
                    return !def;
                }

                if (count === 0) return def;
                // TODO: short-circuit for common case of just find 1
            }
            let totalsize = all_matching_cards.size;
            if (totalsize >= match_conds.length) {
                return !def;
            }
        }
        console.error(178, "default return of " + def);
        return def;
        // this isn't as clean as I want

    }



    array = appendArrays(evo_cond.and, evo_cond.entity_match, evo_cond.with, evo_cond.from);

   // console.log(evo_cond.entity_match);
   // console.dir(array, { depth: 44 });

    // empty AND is false, this is incorrect from a boolean logic sense
    if (array.length > 0) {
        //  if (evo_cond.with) array = array.concat(evo_cond.with);
        if (Array.isArray(array)) {
            let ret = array.every((x: any) => verify_special_evo(base, x, s, sel));
            //console.error("return of all is " + ret);
            return ret;
        }
        return verify_special_evo(base, array, s, sel);
    }
    /*
    what if OR + WITH?
    if (array = evo_cond.with) {
        if (Array.isArray(array)) {
            let ret = array.every((x: any) => verify_special_evo(base, x));
            console.error("return of w/all is " + ret);
            return ret;
        }
        return verify_special_evo(base, array);
    }*/


    if (array = evo_cond.or) {
        let ret = array.some((x: any) => verify_special_evo(base, x, s, sel));
        return ret;
        //         if (!ret) return def;

    }

    if ("it" in evo_cond) {
        if (!sel) {
            console.error("no sel found in target source for evo_cond.it");
            console.trace();
            return def;
        }
        let last_thing = Game.get_last_thing_from_sel(sel, s!);
        ret = last_thing.includes(base);

//        ret = (TargetDesc.match_last_thing(base, s!, g));
        if (!ret) return def;
    }

    if ("self" in evo_cond) {
        ret = (TargetDesc.match_self(base, s!) === evo_cond.self)
        if (!ret) return def;
    }

    //    let ret;
    if (evo_cond.keyword) {
        // could this be a multiple?
        let ret = base.has_keyword(evo_cond.keyword);
        if (!ret) return def;

    }

    if (evo_cond.entity) {
        if (evo_cond.entity === "card") ret = (base.constructor.name == "CardLocation");
        if (evo_cond.entity === "entity") ret = (base.constructor.name == "Instance");
        if (!ret) return def;
    }

    if ("suspended" in evo_cond) {
        ret = evo_cond.suspended === (!base.is_ready());
        if (!ret) return def;
    }
    if ("with_inherited" in evo_cond) {
        ret = evo_cond.with_inherited === (base.new_inherited_effects().length > 0);
        if (!ret) return def;
    }


    if (evo_cond.entity_type) {
        ret = base.is_type(evo_cond.entity_type);
        if (!ret) return def;
    }


    if (evo_cond.tamer && !base.is_tamer()) return def;
    if (evo_cond.colors) {

        // match any color
        //  if (Array.isArray(evo_cond.colors)) {
        ret = evo_cond.colors.some((c: string) => base.has_color(word_to_color(c)));
        if (!ret) return def;
        //      }   
    }
    if (evo_cond.is_evo_card) {
        ret = base.is_evo_card();
        if (!ret) return def;
    }
    if (evo_cond.is_link_card) {
        ret = base.is_plugged_card();
        if (!ret) return def;
    }
    if (evo_cond.face) {
        if (evo_cond.face === "up") {
            ret = ("face_up" in base) && base.face_up() == true;
        } else {
            ret = ("face_up" in base) && base.face_up() == false;
        }
        if (!ret) return def;            
    }
    if (evo_cond.location) {
        // only handles 1 location
        const loc: Location = string_to_location(evo_cond.location);
        let ret = base.location & loc;
        if (!ret) return def;
    }
    if (evo_cond.player) {
        // doesn't handle NOT
        let me = evo_cond.player === "self";
        let player_num = base.n_me_player;
        let target_num = s?.get_n_player();
        if (me) return player_num === target_num;
        return player_num !== target_num;
    }
    // TODO: use "compare"
    if ("compare" in evo_cond) {
        let mine = -1;
        switch (evo_cond.type) {
            case "Level": mine = base.get_level(); break;
            case "ColorCount": mine = base.color_count(); break;
            case "DP": mine = base.dp(); break;
            case "PlayCost": mine = base.get_playcost()!; break;
            case "UseCost": mine = base.get_usecost()!; break;
            case "EvoSources": mine = base.get_source_count(); break;
            default:
                console.error("unknown number type " + evo_cond.type);
        }
        ret = num_compare(mine, strToCompare(evo_cond.compare), evo_cond.number, s, evo_cond.relative);
        if (!ret) return def;
    }
    //        if (evo_cond.name_is && !base.name_is(evo_cond.name_is)) return false;
    if (evo_cond.name_is &&
        !evo_cond.name_is.some((c: string) => base.name_is(c))) return def;
    if (evo_cond.text_contains &&
        !evo_cond.text_contains.some((c: string) => base.text_contains(c))) return def;
    if (evo_cond.name_contains &&
        !evo_cond.name_contains.some((c: string) => base.name_contains(c))) return def;
    if (evo_cond.traits &&
        !evo_cond.traits.some((c: string) => base.has_trait(c))) return def;
    if (evo_cond.traits_contain &&
        !evo_cond.traits_contain.some((c: string) => base.trait_contains(c))) return def;
    return true;

}

export function num_compare(a: number, b: number, c: number, s?: TargetSource, relative: string = "") {
    if (s && relative) {
        logger.info("checking relative " + relative);
        // we can only check the value of the targetsource for now
        const [source, value] = relative.split("-");
        if (source == "targetsource") {
            let i: Instance;
            // Effects that exist on cards need to reference the instance they're part of
            if (s.kind() === "card") {
                let cl = s.get_card_location();
                i = cl.get_instance()!;
            } else {
                i = s.get_instance();
            }
            // TODO: this should be a common library
            switch (value) {
                case "dp": c = i.dp(); break;
                case "evosources": c = i.get_source_count(); break;
                case "level": c = i.get_level(); break;
                case "colorcount": c = i.color_count(); break;
                default: c = 0; console.error("NO VALUE " + value);
            }
            logger.info("relative set c to " + c);
        }
    }
    logger.debug(`a ${a} b ${COMPARE[b]} c ${c}`);

    if (a === undefined || a === null || c == undefined || c == null) return false;
    if (b == COMPARE.IS) return a == c;
    if (b == COMPARE.IS_AT_LEAST) return a >= c;
    if (b == COMPARE.IS_AT_MOST) return a <= c;
    logger.error("unimplemented comparison " + b); return true;
}


export enum COMPARE { NIL, IS, IS_AT_LEAST, IS_AT_MOST, IS_LOWEST, IS_HIGHEST };
function isGameCompare(compareStr: string): compareStr is keyof typeof COMPARE {
    const compareNames = Object.keys(COMPARE) as (keyof typeof COMPARE)[];
    return compareNames.some(name => name === compareStr);
}

export function strToCompare(str: string): COMPARE {
    str = str.toUpperCase();
    if (isGameCompare(str)) {
        return COMPARE[str];
    } else {
        return COMPARE.NIL;
    }
}


export function find_in_tree(tree: any, needle: string): any {
    if (!tree) return tree;
    if (Array.isArray(tree)) {
        for (let child of tree) {
            let ret = find_in_tree(child, needle);
            if (ret) return ret;
        }

    }
    if (tree.type === needle) return tree;
    if (tree.children) {
        console.error("i don't think anything goes in here");
        for (let child of tree.children) {
            let ret = find_in_tree(child, needle);
            if (ret) return ret;
        }
    }
}