

import { CardLocation } from './card';
import { StatusCondition, SubEffect } from './effect';
import { SolidEffectLoop } from './effectloop';
import { GameEvent } from './event';
import { Game } from './game';
import { Instance } from './instance';
import { Location } from './location';

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
import { TargetDesc, TargetSource } from './target';
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
