

import { CardLocation, word_to_color } from './card';
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
import { SubTargetDesc, TargetDesc, TargetSource } from './target';
const logger = createLogger('util');


// for each multiplier
export function get_mult(s: SubEffect): number {
    let mult = s.n_mult;
    if (mult === undefined) mult = 1;
    return s.n! * mult;
}

// w n_count_tgt
export function for_each_count_target(w: SubEffect, game: Game, ts: TargetSource, p: number): boolean {
    let c1: TargetDesc | undefined = w.n_count_tgt;
    if (!c1) return false; // shouldn't have ever gotten in here in the first place
    let i;
    logger.info(`looking foreach, target ${c1.toString()} ${c1.raw_text}`);
    if (c1.raw_text.match(/color of your opponent's Monster and Tamer/i)) {
        let op = game.get_n_player(3 - p);
        i = op.my_colors(false).length;
    } else {
        i = game.find_target(c1, GameEvent.STACK_ADD, ts, false, Location.SECURITY).length;
    }
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
export function verify_special_evo(base: Instance | CardLocation, evo_cond: any, s?: TargetSource): boolean {
    //console.error("looking for match for " + base.get_name() + " " + JSON.stringify(evo_cond));
    //console.error(evo_cond);

    if (Array.isArray(evo_cond)) {
        evo_cond = evo_cond[0]; // we shouldn't need this
    }
    if (!evo_cond.raw_text) return false;
    let array: any[];

    array = appendArrays(evo_cond.and, evo_cond.entity_match, evo_cond.with, evo_cond.from);

    //console.dir(array, { depth: 44 });

    // empty AND is false, this is incorrect from a boolean logic sense
    if (array.length > 0) {
        //  if (evo_cond.with) array = array.concat(evo_cond.with);
        if (Array.isArray(array)) {
            let ret = array.every((x: any) => verify_special_evo(base, x, s));
            //console.error("return of all is " + ret);
            return ret;
        }
        return verify_special_evo(base, array, s);
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
        let ret = array.some((x: any) => verify_special_evo(base, x, s));
        return ret;
    }

    let def = false; // default
    if (evo_cond.not) def = true;
    let ret;

    if (evo_cond.entity) {
        if (evo_cond.entity === "card") ret = (base.constructor.name == "CardLocation");
        if (evo_cond.entity === "entity") ret = (base.constructor.name == "Instance");
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
    if (evo_cond.number) {
        switch (evo_cond.type) {
            case "Level":
                ret = num_compare(base.get_level(), strToCompare(evo_cond.compare), evo_cond.number);
                if (!ret) return def;
                break;
            case "ColorCount":
                ret = num_compare(base.color_count(), strToCompare(evo_cond.compare), evo_cond.number);
                if (!ret) return def;
                break;
            case "DP":
                ret = num_compare(base.dp(), strToCompare(evo_cond.compare), evo_cond.number);
                if (!ret) return def;
                break;
            default:
                console.error("unknown number type " + evo_cond.type);

        }
    }
    //        if (evo_cond.name_is && !base.name_is(evo_cond.name_is)) return false;
    if (evo_cond.name_is &&
        !evo_cond.name_is.some((c: string) => base.name_is(c))) return def;
    if (evo_cond.name_contains &&
        !evo_cond.name_contains.some((c: string) => base.name_contains(c))) return def;
    if (evo_cond.traits &&
        !evo_cond.traits.some((c: string) => base.has_trait(c))) return def;
    if (evo_cond.traits_contain &&
        !evo_cond.traits_contain.some((c: string) => base.trait_contains(c))) return def;
    return true;

}

export function num_compare(a: number, b: number, c: number, s?: TargetSource, relative: string = "") {
    if (relative == "targetsource-dp" && s) {
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