

import { all_colors, Card, CardLocation, word_to_color } from './card';
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
import { ForEachTarget, MultiTargetDesc, SubTargetDesc, TargetDesc, TargetSource } from './target';
const logger = createLogger('util');


// for each multiplier
export function get_mult(s: SubEffect): number {
    let mult = s.n_mult;
    if (mult === undefined) mult = 1;
    return s.n! * mult;
}

export function color_count(objects: (Instance | CardLocation)[]): number {
    let count = all_colors.filter(c =>
        objects.some(object => object.has_color(c)));
    return count.length;
}


// w n_count_tgt
// returns true if it did something

export function for_each_count_target(w: SubEffect,
    game: Game,
    ts: TargetSource,
    p: number,
    sel: SolidEffectLoop): boolean {
    if (2 < 1) return false;
    let c1: ForEachTarget | undefined = w.n_count_tgt;
    if (!c1) return false; // shouldn't have ever gotten in here in the first place
    let i;
    logger.info(`looking foreach, target ${c1.target.raw_text}`);
    if (false && c1?.target.raw_text.match(/color of your opponent's Monster (and|or)f Tamer/i)) {
        let op = game.get_n_player(3 - p);
        i = op.my_colors(false).length;
        console.error(49, i);
    } else {
        i = c1.get_count(game, ts, sel);
    }
    logger.info("targets for " + c1.target.raw_text + " is " + i);

    // are we changing N or changing CHOOSE?
    // for now, we can tell by which is non-zero
    logger.info(`CHANGING n from ${w.n} to ${i} ?`);

    // if we have "to 1 X, trash 2 things for each Y" then "for each" applies to the 2, not the 1
    let choose = w.choose;
    let mtd = (w.td2 as any as MultiTargetDesc);
    if (mtd?.choose?.n) {
        choose = mtd.choose;
    }

    logger.info(`CHANGING choose from ${choose?.n} to ${i} ?`);

    // if it's a "give 3000 DP" then assume it's 3000*i
    if (w.game_event === GameEvent.GIVE_STATUS_CONDITION && w.status_condition
        && w.status_condition[0] && w.status_condition[0].s
        && w.status_condition[0].s.n) {
        logger.info(`CHANGING s.n from ${w.status_condition[0].s.n} by ${i} ?`);
        logger.info("BEFORE " + w.status_condition[0].s.n_mult);
        w.status_condition[0].s.n_mult = i;
        logger.info("AFTER  " + w.status_condition[0].s.n_mult);
        return true;
        // don't alter N or choose if we have a DP... it could easily be the reverse
    }
    if (w.n) w.n = w.n * i;
    logger.info(`choose ${choose?.n} i ${i}`);
    if (choose) {
        logger.warn("old style multiple mod");
        choose.n = choose.n * i;
        if (i == 0) {
            // can't choose any, just fail the effect now
            //   sel.game.log(`No for-each, skipping`);
            return false;
        }
    }
    return true;
}

// does multitarget match?

function appendArrays(array1: any | any[],
    array2: any[],
    array3?: any[],
    array4?: any[],
): any[] {
    let result: any[] = [];
    if (array1) {
        if (!Array.isArray(array1)) {
            array1 = [array1];
        }
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

export function verify_special_evo(base: Instance | CardLocation, evo_cond: any, s: TargetSource,
    sel: SolidEffectLoop): boolean {
    let ret = _verify_special_evo(base, evo_cond, s, sel);
    logger.info(" verify _special_evo " + ret + "  for " + base.get_name() + " " + evo_cond.raw_text
        + " " + !!sel
    //   + " " + JSON.stringify(evo_cond)); //  JSON.stringify(evo_cond) + " = " + ret);
    );
    return ret;
}
function _verify_special_evo(base: Instance | CardLocation, evo_cond: any, s: TargetSource,
    sel: SolidEffectLoop): boolean {
    //console.error("looking for match for " + base.get_name() + " " + JSON.stringify(evo_cond));
    //console.error(evo_cond); 

    if (Array.isArray(evo_cond)) {
        evo_cond = evo_cond[0]; // we shouldn't need this
    }
    if (!("raw_text" in evo_cond)) {
        console.error("no raw text ", evo_cond);
        return false;
    }
    let array: any[];

    let def = false; // default
    if (evo_cond.not) def = true;
    let ret;

    if (evo_cond.targetnumber) {
        let t = Game.get_target_number(sel, 999);
        if (!t) return def;
        if (t !== base) return def;
    }

    // what cards am I under?
    // .under can refer to either links or sources
    if (evo_cond.under) {
        let cl: CardLocation = base as CardLocation;
        let index = cl.index;
        let i = base.get_instance();
        if (!i) return def;
        // if we have 3 cards, length is 3, index of top is 2, make sure we're not top
        if (i.pile.length - 1 === index && cl.mode !== "plug") {
            // text for "under a Tamer" isn't "evolution card" which separately checks for "not top card"
            return def;
        }
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

    // it handled in target::find_it()
    if ("it" in evo_cond) {
        if (!sel) {
            console.error("no sel found in target source for evo_cond.it");
            console.trace();
            return def;
        }
        // we don't look up the last "it" and see if it matches; we keep looking 
        // back through "it"s until we find one that matches
        let last_thing = Game.get_last_thing_from_sel(sel, s!); // , evo_cond.and);
        if (!last_thing) return def;
        // If a card moves, it's cardlocatiomn will *necessarily* not match.
        // check the underlying card for equality.
        if ("cardloc" in base && "cardloc" in last_thing[0]) {
            let last_cards = (last_thing as CardLocation[]).map(x => x.card);
            let base_card = base.card;
            ret = last_cards.includes(base_card);
        } else {
        ret = last_thing.includes(base);
        }
        if (!ret) return def;
    }

    //   console.log(222, evo_cond.and);
    array = appendArrays(
        evo_cond.and,
        evo_cond.entity_match,
        evo_cond.with,
        evo_cond.from);
  
    // console.log(evo_cond.entity_match);
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
        //    console.error("looking for OR " + JSON.stringify(array));
        //  console.dir(evo_cond.or, { depth: 4 });
        let ret = array.some((x: any) => verify_special_evo(base, x, s, sel));
        return ret;
        //         if (!ret) return def;

    }

    if (evo_cond.other) {
        let last_thing: any[] = [];
        if (sel)
            last_thing = Game.get_last_thing_from_sel(sel, s!);
        // "other" means
        // 1. if we have an "it", it means "not that"
        // 2. if we don't have an "it", it means "not me"
        // comapre to 2 clauses below
        if (last_thing.length > 0) {
            ret = !last_thing.includes(base);
            if (!ret) return def;
        } else {
            ret = (TargetDesc.match_self(base, s!) === false)
            if (!ret) return def;
        }
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
        if (evo_cond.entity === "card") ret = (
            base.constructor.name == "CardLocation" || base.location == Location.REVEAL);
        // cards in the progress of being played are instances at this point
        else if (evo_cond.entity === "entity") ret = (base.constructor.name == "Instance");
        else console.error("evo_cond unknown", evo_cond.entity);
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
        //   console.error(311, evo_cond.colors);
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

        let base_location = base.location;
        const loc: Location = string_to_location(evo_cond.location);

        // if we're looking in SEARCH we can't detect this setting
        // in the card itself. 

        // if we're deliberately searching reveal, then yes, search reveal
        if (loc & Location.REVEAL) {
            let ret = base_location & loc;
            if (!ret) return def;
        } else {
            // cards that are "revealed" are still in their original location... what code tests this?
           if ("prior_location" in base) {
                const c_loctn: CardLocation = base.prior_location as CardLocation;
                const loctn: Location = c_loctn.location;
                if (base.location === Location.REVEAL) {
                    // if we're currently in REVEAL, check our prior location, 
                    // so we can see if we were played or evo'd *from* some place
                    base_location = loctn;
                }
            }
            let ret = base_location & loc;
            if (!ret) return def;
        }
    }
    if (evo_cond.player) {
        // doesn't handle NOT
        let me = evo_cond.player === "self";
        let player_num = base.n_me_player;
        if ("n_player" in base) { // in case we have Card not CardLocation
            let c: Card = (base as unknown) as Card;
            let num_player: number = c.n_player;
            player_num = num_player;
        }
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
        ret = num_compare(mine, strToCompare(evo_cond.compare), evo_cond.number, s, evo_cond.relative, sel!);
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

export function num_compare(a: number, b: number, c: number, s: TargetSource | undefined,
    relative: string | undefined, sel: SolidEffectLoop): boolean {
    if (s && relative) {
        logger.info("checking relative " + relative);
        // we can only check the value of the targetsource for now
        const [source, value] = relative.split("-");
        logger.info("source " + source + " value " + value);
        let i: Instance | CardLocation | undefined = undefined;
        if (source == "targetsource") {
            // Fow now effects that exist on cards need to reference the instance they're part of,
            // but there will be a time when we want to compare cards to instances
            if (s.kind() === "card") {
                let cl = s.get_card_location();
                i = cl.get_instance()!;
            } else {
                i = s.get_instance();
            }
        }
        if (sel && source == "it") {
            const its = Game.get_last_thing_from_sel(sel, s);
            if (its.length > 1) console.error("too many its"); // we want to see if we match ANY of the "it"s
            if (its.length == 0) {
                return false;
            }
            i = its[0];
        }
        if (i)
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
    logger.debug(`a ${a} b ${COMPARE[b]} c ${c} relative ${relative}`);

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


// finds either the first thing with the 'type' of needle, or with an attribute of needle
export function find_in_tree(tree: any, needle: string): any {
    // function find_in_tree(tree, needle) {
    if (!tree) return tree;
    if (tree.type === needle) return tree;
    if (needle in tree) return tree;

    // periodically add or remove the .reverse() here
    // if we have multiple matches, it shouldn't matter which we use
    // we don't want to pass a test case just because our grammar gave two results and only the first one worked
    if (Array.isArray(tree)) {
        for (let child of tree) {
            let ret = find_in_tree(child, needle);
            if (ret) return ret;
        }
    }
    // search subclauses, really trying to find Superlative
    for (let kind of ["and", "with", "or"]) {
        if (kind in tree) {
            let ret = find_in_tree(tree[kind], needle);
            if (ret) return ret;
        }
    }

    if (tree.children) {
        console.error("i don't think anything goes in here");
        for (let child of tree.children) {
            let ret = find_in_tree(child, needle);
            if (ret) return ret;
        }
    }
}