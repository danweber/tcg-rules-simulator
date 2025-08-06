import { SolidEffect, AtomicEffect, SubEffect, atomic_ask_to_activate } from './effect';
import { EventCause, GameEvent, gerund, present } from './event';
import { Game } from './game';
import { Card, CardLocation } from './card';
import { Location } from './location';
import { Instance } from './instance';
import { GameStep, Phase, PhaseTrigger } from './phase';
import { ALL_OF, Conjunction, DynamicNumber, ForEachTarget, fSpecialPlayer, MultiTargetDesc, SpecialCard, SpecialInstance, SubTargetDesc, TargetDesc, TargetSource } from './target';
import { CombatLoop } from './combat';
import { Player } from './player';
import { v4 as uuidv4 } from 'uuid';

import _ from 'lodash';

// more labelling helps with seeing sources of effects, but also makes some UI elements stupidly verbose
// turn it on to see what i mean
const more_labelling = false;

function random_id() {
    //return 'abc';
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < 3; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result + " ";
}



import { createLogger } from "./logger";
import { EffectChooser } from './effectchooser';
import { for_each_count_target, get_mult } from './util';
const logger = createLogger('effectloop');



interface Query {
    get_desc(): string
}

interface Loop {
    step(): false | SubEffect[];
    dump(full: boolean): string;
    // dump is the old fashioned crude way of debugging the tree
    effect_tree(): string[];
    game: Game;
}

export class RootLoop {
    resloop?: Loop;
    combatloop?: Loop;
    game: Game;
    rand: string;
    mode: string = "auto";

    constructor(g: Game) { this.game = g; this.rand = random_id(); }
    get_effect_tree(): string[] {
        if (!this.resloop) return ["NOTHING"];
        return this.resloop.effect_tree();
    }
    add_res_loop(l: Loop) {
        if (this.resloop) {
            let b: any = null; b.resloop();
        }
        this.resloop = l;
        this.game = this.resloop.game;
    }
    add_combat_loop(cl: CombatLoop) {
        if (this.combatloop) {
            logger.info(this.rand + "loop exists");
            logger.info(this.rand + "old loop " + this.combatloop.toString());
            logger.info(this.rand + "new loop " + cl.toString());
            let b: any = null; b.combatloopexists();
        }
        this.combatloop = cl;
        this.game = this.combatloop.game;
    }
    dump(full: boolean = false) {
        return `＜${this.resloop ? this.resloop.dump(full) : "--"},` +
            `${this.combatloop ? this.combatloop.dump(full) : "--"}＞`;
    }

    step(): false | SubEffect[] {
        if (!this.resloop) {
            if (!this.combatloop) {
                this.game!.gamestep = GameStep.NORMAL_PLAY;
                return []; // duh
            }
            let r = this.combatloop?.step();
            if (!r) {
                //                this.combatloop = undefined;
                return false;
            }
            if (r.length > 0) {
                logger.error("got events from the root combat loop");
                let x: any = null; x.die3();
            }
            logger.info(this.rand + "Done with combat loop?");

            // this probably should be in a better place
            let rules = this.game.rules_process();
            logger.info("rules is " + rules);
            if (rules) {
                logger.info("going back into res loop for rules");
                let dsel = new DirectedSubEffectLoop(this.game, rules, 1);
                this.add_res_loop(dsel);
                return false; // go back and try again
            }

            this.combatloop!.game.gamestep = GameStep.NORMAL_PLAY;
            this.combatloop = undefined;
            return false;
        }
        let r = this.resloop.step();
        if (r) {
            if (r.length > 0) {
                console.log("got events from the root res loop");
            }
            this.resloop = undefined;
            return r;
        }
        return false;
    }
}

enum RLStep {
    ASK_NEXT_TRIGGER = 1, // might jump automatically
    GET_NEXT_TRIGGER, // get answer if needed
    START_SOLID_EFFECT,
    PROCESSING_SOLID_EFFECT,
    RULES_PROCESSING_1,
    RULES_PROCESSING_2,
    RULES_PROCESSING_3,
    NESTED_RES_LOOP
};

// a dry-run for terminus_loop would be awesome
function can_pay(eff: AtomicEffect, game: Game, source: TargetSource, sel: SolidEffectLoop): boolean {
    if (3 < 2) return true; // when debugging, make this always true
    logger.info("can pay cost for " + eff.raw_text);
    logger.info("can we pay this cost?1");
    // just see if we can do the first weirdo
    logger.info("there are " + eff.events.length + " events");

    for (let i = 0; i < eff.events.length; i++) {
        logger.error("ge is " + GameEvent[eff.events[i].game_event]);
    }

    let p = source.get_n_player();
    if (!p) {
        let aa: any = null; aa.player_not_set();
    }

    for (let i = 0; i < eff.events.length; i++) {
        //logger.info("w number " + i);
        let w = eff.events[i];
        let ge = w.game_event;
        //logger.info("w.ge is " + GameEvent[ge]);
        //logger.info("target is " + w.td.raw_text);
        let needed_targets = Number(w.choose?.value());
        if (w.n_mod?.includes("upto")) needed_targets = 1;


        if (true || w.td.raw_text == "self" || w.td.raw_text == "this Monster") {
            let found_tgts: Instance[] = [];
            if (!source) {
                let a: any = null; a.crash_no_source();
            }

            let zone = Location.SECURITY;
            if (sel.effect.active_zone && sel.effect.active_zone & Location.EGGZONE) {
                zone |= Location.FIELD;
            }
            let tgts = game.find_target(w.td, w.game_event, source, sel, zone);
            // so we don't give the player the choice to pay things they can't
            if (eff.is_cost) tgts = tgts.filter(t => can_pay_material(t, w)[0]);

            // there must be some target for each event
            //logger.info(`there are ${tgts.length} targets for the event`);
            let legit_target_count = 0;
            // tgt: CardLocation | Instance;
            for (let tgt of tgts) {
                let [can, instance] = can_pay_material(tgt, w);
                if (instance) found_tgts.push(instance);
                legit_target_count += 1;
                if (legit_target_count >= needed_targets) break;
            }
            if (needed_targets != ALL_OF && legit_target_count < needed_targets) {
                logger.error("BREAKING, CAN'T PAY " + legit_target_count + " " + needed_targets);
                return false;
            } else {
                logger.error("found a legit target, this event passes");
            }
            let tgt: CardLocation | Instance = found_tgts[0];
            if (ge == GameEvent.DEVOLVE || ge == GameEvent.DEVOLVE_FORCE) {
                if (tgt.pile.length <= 1) return false;
            }
            if (ge == GameEvent.MOVE_CARD) {
                let p_n = w.td2?.raw_text.startsWith("your") ? p : 3 - p;
                let player = game.get_n_player(p_n);
                // how to avoid duping this logic?
                let from: string = w.td2?.raw_text || "";
                let pile;
                if (from.includes("deck")) {
                    pile = player.deck;
                } else if (from.includes("security")) {
                    pile = player.security;
                } else {
                    pile = player.nullzone;
                    logger.error("MOVE_CARD missing source: " + w.td2?.raw_text);
                }
                logger.info(`pile.length ${pile.length} w.n ${w.n}`);
                if (pile.length < w.n!) return false;
            }


        }

    }
    return true;
}

function can_pay_material(tgt: Instance | CardLocation, w: SubEffect): [boolean, Instance | undefined] {
    if ("can_do" in tgt) {
        let can = tgt.can_do(w);
        logger.error("can_do for tgt is " + can);
        if (can) {
            return [true, tgt];
        }
    } else {
        logger.error("cardloc, we can always do");
        // we have at least card, so that counts. Is there anything that ever says "you can't discard"?
        return [true, undefined]
    }
    return [false, undefined]
}



export class ResolutionLoop { // 1 of N
    game: Game;
    //   turn_player_fx: SolidEffect[];
    //  other_player_fx: SolidEffect[];
    // current_queue: SolidEffect[];
    current?: SolidEffect;
    // debug_queue: SolidEffect[];
    s: RLStep;
    parent: string;
    solidloop?: SolidEffectLoop;
    directedsubeffectloop?: DirectedSubEffectLoop;
    res_loop?: ResolutionLoop;
    reacted_to: SubEffect[];
    chooser: EffectChooser;
    collected_events: SubEffect[];
    original_count: number;
    rand: string;
    depth: number;

    // array of pending effects, and the current effect (in any)
    effect_tree(): string[] {
        let ret: string[] = [];
        //ret.push("RES DEPTH " + this.depth);
        //ret.push("RES EFFECTS " + this.chooser.effect_tree() );
        //ret.push("RES CURRENT " + (this.current ? this.current.label : " ERR "));

        let layer: string = `RES DEPTH ${this.depth} `;
        let fx: string[] = [];
        //        fx.push("chooser:");
        if (this.chooser)
            fx.push(... this.chooser.effects());
        //    fx.push("active " + RLStep[this.s] + " ");
        // this might not be "done"?
        if (this.current) {
            // The present tense may not be completely correct here
            if (this.s == RLStep.PROCESSING_SOLID_EFFECT) {
                fx.push(`PROCESSING:${this.current.label}`);
            } else {
                fx.push(`DONE:${this.current.label}`);
            }
        }
        ret.push(layer + fx.join(", "));
        if (this.solidloop) {
            // ret.push("RES SEL DESCEND");
            ret.push(... this.solidloop.effect_tree());
        } else {
            // ret.push("RES NO SOLID");
        }
        if (this.directedsubeffectloop) {
            // ret.push("RES DSEL DESCEND");
            ret.push(... this.directedsubeffectloop.effect_tree());
        } else {
            //ret.push("RES NO DESL");
        }
        if (this.res_loop) {
            // ret.push("RES RESL DESCEND");
            ret.push(... this.res_loop.effect_tree());
        } else {
            //  ret.push("RES NO RESL");
        }
        //ret.push("RES END: " + this.depth);
        return ret;

    }
    dump(full: boolean) {
        let x = this.s;
        let str = RLStep[x];
        let child = (this.solidloop) ? " [" + this.solidloop.dump(full) + "]" : "";
        return str + child;
        return "XXX"; // `${lens}\nstep ${x} and step ${str} and cur ${xxx}${child}`;
    }
    // "Reacted_to" was originally just for interrupters, but also useful for 
    // checking what responders saw
    constructor(g: Game,
        effects: SolidEffect[],
        depth: number,
        reacted_to: SubEffect[],  // -- if exists, mark as negated when hit
        parent: string = "") {


        logger.error("RES DEPTH IS " + depth);

        this.depth = depth;
        if (this.depth == 0)
            console.trace();
        this.rand = random_id();
        if (effects.length == 0) {
            logger.info(this.rand + "no effects!");
            console.trace();
        }

        this.original_count = effects.length;
        this.collected_events = [];
        this.chooser = new EffectChooser(g, effects, this.depth);
        //  this.turn_player_fx = [];
        //  this.other_player_fx = [];
        //  this.debug_queue = effects;
        this.reacted_to = reacted_to;

        this.game = g;
        this.parent = parent;
        this.s = RLStep.ASK_NEXT_TRIGGER;
    }
    step(): false | SubEffect[] {
        let g = this.game;
        let p = this.parent;
        if (this.s == RLStep.ASK_NEXT_TRIGGER) {
            // TODO: optimize when only 1

            if (this.chooser.length() == 0) {
                if (this.original_count > 1) {
                    g.announce(`Done with all ${this.original_count} triggers`);
                }
                return this.collected_events;
            }
            this.s = RLStep.GET_NEXT_TRIGGER;
            // fall though            
        }
        if (this.s == RLStep.GET_NEXT_TRIGGER) {
            // verify number is in range
            // TODO: make this a library
            logger.warn("path b");
            let x = this.chooser.get_next();
            if (x == false) { return false };
            if (x == true) {
                console.error("how did we get here?2");
                return this.collected_events;
            }
            if (!this.game.check_event(x, true)) {
                this.game.log("Immediate-type effect " + x.label + " has already interrupted once");
                this.current = undefined;
                return false;
            }
            this.current = x;
            logger.info("pushing " + x.label);
            this.game.fancy.update_effect(this.depth, this.current);

            logger.info(this.rand + "Resolution loop in CHOOSER");
            logger.info(this.current.toString());
            this.s = RLStep.START_SOLID_EFFECT;
            // fall through
        }
        if (this.s == RLStep.START_SOLID_EFFECT) {
            if (!this.current) console.trace();
            logger.info(this.rand + "set up solid effect loop");
            // If this ResolutionLoop is for interrupter, we must
            //  pass in the things being reacted to because
            // the reacted-to events need to be marked
            this.solidloop = new SolidEffectLoop(this.current!, this.game, this.reacted_to, this.parent, this.depth);
            this.s++;
            return false;
        }
        if (this.s == RLStep.PROCESSING_SOLID_EFFECT) {
            logger.info(this.rand + "processing solid effect loop");
            if (!this.solidloop) {
                console.error("NO SOLID LOOP");
                return this.collected_events;
            }
            let x = this.solidloop.step();
            if (!x) {
                return false;
            }
            this.solidloop = undefined;
            logger.info(this.rand + "DDD After SolidEffectLoop we did " + x.length + " effects");
            this.collected_events = this.collected_events.concat(x);
            logger.info(this.rand + "DDD our list is now " + this.collected_events.length + " long");
            let label = "rules effects";
            if ('label' in this.current!) label = this.current.label;
            this.game.log(p + "Done processing " + label);


            // Maybe I don't need this, if I'm doing it in effectchooser, but I 
            // need to make sure I always call effectchooser even if I have 0 responders.

            // FOR PRE-CRM 2.0, I'd do two separate loops
            this.game.clear_reveal();

            let rules = this.game.rules_process();
            if (!rules) {
                this.s = RLStep.RULES_PROCESSING_3; // back-to-top
                return false;
            }

            let dsel = new DirectedSubEffectLoop(this.game, rules, this.depth);
            this.directedsubeffectloop = dsel;
            this.s = RLStep.RULES_PROCESSING_2;
            // fall through
        }
        // oh, DSEL will automatically run sub-effects, DSEL never returns stuff
        if (this.s == RLStep.RULES_PROCESSING_2) {
            let x = this.directedsubeffectloop?.step();
            if (!x) {
                return false;
            }
            this.directedsubeffectloop = undefined;
            this.s = RLStep.RULES_PROCESSING_3;
            // fall through
        }


        if (this.s == RLStep.RULES_PROCESSING_3) {
            let we_are_in_interrupter_loop = false;
            if (!we_are_in_interrupter_loop) {
                logger.info(this.rand + "Trying REsponderLoop now");

                this.res_loop = get_responder_loop(this.game, this.collected_events, this.depth)
                this.collected_events = []; // let loop keep a copy so they can see what happened;
                if (this.res_loop) {
                    logger.info(this.rand + "res loop going into res loop");
                    this.s = RLStep.NESTED_RES_LOOP;
                    return false;
                }
                // no interrupts, fall through
            }

            // it feels hacky putting this in here. 
            // I guess here is where we do rules processing?


            // either no res loop or it is deferred
            this.s = RLStep.ASK_NEXT_TRIGGER; // back-to-top
            return false;
        }
        if (this.s == RLStep.NESTED_RES_LOOP) {
            //// do I collect the things I get from here???
            // I don't know right now.
            let x = this.res_loop?.step();
            if (!x) {
                return false;
            }
            // unset resloop, we don't need it any more
            this.res_loop = undefined;
            logger.info(this.rand + "DDDDDD NESTED RES LOOP RETURNED " + x.length + " EFFECTS AND NOW WHAT?");
            this.s = RLStep.ASK_NEXT_TRIGGER;
            return false;
        }
        console.error("UNKNOWN");
        return false;
    }
}

// does "ask_activate" belong at this level?
enum FakeStep {

    // I'm guessing that we first decide *if* we can, and
    // then if optional ask the user. It could be the 
    // other way around I s'pose.

    PRE_LOOP = 1,
    CHECK_IF_CAN,
    ASK_ACTIVATE_ACTUALLY, // assume exactly 1...
    GET_ACTIVATE,
    POST_ACTIVATE,

    ASK_RESPONDING_TO,
    GET_RESPONDING_TO,

    ASK_UPTO,
    GET_UPTO,

    // for reactors, they are 
    ASK_TARGET1, // set once-per-turn here  GO BACK HERE for subeffect loop
    GET_TARGET,


    ASK_TARGET2, // if we need it
    GET_TARGET2,

    ASSIGN_TARGET_SUBS,

    PRE_DO_EFFECT, // increment target_count,  loopback if needed,
    // and then increment weirdo_count, loop bacl if needed

    DO_EFFECT_GO, // and ask_cancel

    DO_EFFECT_LOOP,
    //    ASK_CANCEL,
    GET_CANCEL,
    FINISH_REPEAT_LOOP, // everything that goes to CHECK_IF_CAN should stop in here

    DONE, // shouldn't be in here

}

export class SolidEffectLoop {
    effect: SolidEffect;
    n_effect: number;
    game: Game;
    s: FakeStep;

    link_choices?: false | Array<[Instance | CardLocation, Instance, number, number?]>;
    evolve_choices?: false | Array<[CardLocation, CardLocation | Instance, CardLocation | Instance | undefined, 'evo' | 'fusion' | 'burst' | 'app', number?]>;
    attack_targets?: (Instance | Player)[];
    attack_target?: Instance | Player;

    potential_targets?: (Instance | CardLocation)[]; //  | Player;
    potential_targets2?: (Instance | CardLocation)[]; //  | Player;
    chosen_targets?: (Instance | CardLocation)[];   // it should be Instance[] | CardLocation[];

    parent: string;
    reacted_to: SubEffect[];
    cancellable?: SubEffect[]; // which 
    cancel_target?: SubEffect;
    collected_events: SubEffect[]; // what we actually did
    events_to_do: SubEffect[]; // these will go into terminus
    interrupter_loop?: InterrupterLoop;
    n_effects_tried?: number;
    n_repeat: number = 1;
    rand: string;
    weirdo_count: number;
    target_count: number = 0;
    depth: number;
    attacker?: Instance;
    extra_subeffects: SubEffect[] = [];

    // We might have *three* nested iterators.
    // First, n_effect. We go through each AtomicEffect one by one.
    // Second, weirdo_count. We go through each SubEffect of an AtomicEffect.
    // Third, target_count. We are hard-coded to only 2 but in theory could have an array.

    constructor(se: SolidEffect, g: Game,
        reacted_to: SubEffect[],
        parent: string, // recheck this
        depth: number) {
        logger.error("RES DEPTH IS " + depth);
        // degenerate case to get things up and running
        this.rand = random_id();
        this.effect = se;
        this.depth = depth;
        this.n_effect = -1;
        this.game = g;
        this.s = FakeStep.PRE_LOOP;
        this.reacted_to = reacted_to;
        this.parent = parent;
        this.collected_events = [];
        this.events_to_do = [];
        this.weirdo_count = 0;
        logger.info(this.rand + "eff len is " + se.effects.length);
        if (se.effects.length == 0) {
            console.dir(se, { depth: 2 });
        }
        if (reacted_to.length > 0) {
            logger.info(this.rand + "**REACTED TO IS " + reacted_to.length);
            logger.info(this.rand + "** things we might interrupt: **" + reacted_to.map(x => GameEvent[x.game_event]).join("-"));
            logger.info(this.rand + "this.effect_ is " + (this.effect ? "fx " + this.effect : "nul"));
        }
        if (!this.effect) console.trace();
        // i use "se" for both "solideffect" and "Subeffect"

    }
    effect_tree(): string[] {
        let ret: string[] = [];
        //ret.push("SEL DEPTH " + this.depth);
        //ret.push("SEL DEPTH " + this.effect.label);
        //ret.push("SEL S " + FakeStep[FakeStep.DO_EFFECT_LOOP] );

        // This below line is accurate but duplicated by the level above us
        if (false)
            ret.push(`SEL DEPTH ${this.depth} ${this.effect.label}`);
        if (this.interrupter_loop) {
            //    ret.push("SEL CHILD");
            ret.push(...this.interrupter_loop.effect_tree());
        } else {
            //  ret.push("SEL ERROR");
        }
        //ret.push("SEL END " + this.depth);
        return ret;
    }
    dump(full: boolean = false) {
        if (full) {
            return "SEL: step is " + this.s + " or " + FakeStep[this.s];
        } else {
            let str = FakeStep[this.s];
            if (this.s == FakeStep.DO_EFFECT_LOOP) {
                if (this.interrupter_loop) {
                    str += "SEL: (" + this.interrupter_loop.dump(full) + ")";
                } else {
                    str += " (ERROR) ";
                }
            }
            return str;
        }
    }
    step(): (false | SubEffect[]) {

        logger.info("in SEL, step is " + FakeStep[this.s] + " cancels is " + this.effect.cancels);
        if (this.s == FakeStep.PRE_LOOP) {

            // IS this source is an instance, make sure it's either still 
            // on field OR still in trash
            let source = this.effect.source;
            if (!source) { // what about RULES_DP deletions?
                let b: any = null; b.pre_loop_failure();
            }



            if (this.effect.rules) {
                // rules processing, just skip all this and get the deletion events
                logger.info("RULES EFFECT!");
                this.n_effect = 0;
                this.events_to_do = _.cloneDeep(this.effect.effects[0].events);
                this.interrupter_loop = new InterrupterLoop(this.game, this.events_to_do, this.depth, false); // +1 or no?
                this.s = FakeStep.DO_EFFECT_LOOP;
                return false; // do I need to return false? Can't I just fall through?

            }

            // clear out things from prior runs
            // where to do this is hard, because something we get
            // Atomics that are pre-populated for in-game effects,
            // so we only do it when we're selecting targets
            if (!this.effect.effects[0].events[0].td.empty() &&
                this.effect.effects[0].events[0].td.conjunction !== Conjunction.SOURCE

            ) {
                this.effect.effects.forEach(atomic => atomic.events.forEach(
                    w => {
                        w.chosen_target = undefined;
                        w.chosen_target2 = undefined;
                        w.chosen_target3 = undefined;
                    }));
            }
            if (source.is_instance()) {
                let instance: Instance = source.get_instance();

                let instance_fx = instance.all_effects();

                let still_have: boolean = instance_fx.some(x => x === this.effect);

                let resp = "nil";
                if (this.effect.respond_to) resp = this.effect.respond_to.map(x => GameEvent[x.ge]).join(",");

                if (!still_have) {
                    this.game.log("Effect has disappeared or already triggered, it fails: " + this.effect.label + " " + this.effect.raw_text);
                    this.s = FakeStep.DONE;
                    return false;
                }

                // we are processing now
                logger.info(this.rand + "INSTANCE SOURCE IS AT " + Location[source.location()]);
                logger.info(this.rand + " INSTANCE IS NAMED " + source.get_instance().get_name());
                logger.info(this.rand + " this.effect is " + this.effect);
                logger.info(this.rand + " this.effect.effects[0] is " + this.effect.effects[0]);
                logger.info(this.rand + " this.this.effects[0].weirdop is " + this.effect.effects[0].weirdo);
                logger.info(GameEvent[this.effect.effects[0].weirdo.game_event] + " respond to " + resp);

                logger.info(this.rand + " location of source is " + Location[source.get_instance().location]);
                logger.info(this.rand +
                    ` INSTANCE SOURCE current Location ${Location[source.location()]} original location is ${Location[this.effect.trigger_location!]} ` +
                    // I can't imagine how original ID and current ID could ever be different but maybe I'm dumb
                    ` original trigger id ${this.effect.trigger_instance_id} now id is ${source.id()} ` +
                    // when an instance gets sent to the trash, it lives there forever. 
                    // what we care about with [on deletion] is that the top card is stil there
                    // The instance has a reference to its top card, and we can check its current location, right?
                    // Even if it goes to deck or hand, we'll at least have it be undefined
                    // HOWEVER, an instance can vanish if it's Fusion Evolved or Sent To Health.
                    // 
                    ` original top card card_instance_id is ${this.effect.trigger_top_card_location_id} ` +
                    ` and current is ${source.get_instance()?.top()?.card_instance_id}` +
                    ` and location of old-top-card is now ${Location[source.get_instance()?.top()?.get_location()]} `
                );



                // if a card activated in the trash but the top card is no longer in the trash, it doesn't work
                // TODO: any effects that activate on field but are now gone, but I don't think ST15-16 had any
                // well, Piercing I guess, if I implemented it properly instead of cheating


                // INSTANCE SOURCE current Location TRASH original location is TRASH 
                //original trigger id 2 now id is 2
                // original top card card_instance_id is 32  and current is 32 
                //  and location of old-top-card is now FIELD

                if (!this.effect.rules) {
                    if (source.location() != this.effect.trigger_location
                        // someone check but I think this just checks if the top card has changed, which isn't the right test
                        // || this.effect.trigger_top_card_location_id != source.get_instance()?.top()?.card_instance_id
                    ) {

                        logger.info(`effect gone1: ${source.location()} trigger_location ${this.effect.trigger_location}...`);
                        logger.info(" or maybe second clause");

                        this.game.la("Card no longer in original location, effect fails");
                        this.s = FakeStep.DONE;
                        return false;
                    }
                }


                if (!this.effect.rules && this.effect.trigger_location != source.get_instance().top().get_location()) {
                    logger.info(`effect gone2: ${source.get_instance().top().get_location()} trigger_location ${this.effect.trigger_location}...`);
                    this.game.la("Card no longer in original location, effect fails");
                    this.s = FakeStep.DONE;
                    return false;

                }


                // ... I guess we should track where it was when it activated its effect? 
                // It must always be on field, with the exception of on-deletion effects, 
                // which must be in trash (or token trash) (and have not left trash in between).

                // Idea that a CardLocation should belong to 0 or 1 instances, and if it gets
                // moved around, it permanently loses connection to the old one. That way we
                // can make sure a card that activated in trash. Every connection between
                // a CardLocation and an Instance is numbered, and it must be the same at
                // activation. 

                // wow, there are a lot of cases here.
                // We need to make sure that the instance is still there and its evolution source.

                // For something that activates in trash, we've moved the whole instance there,
                // and it won't be changing. The one and only requirement is that the top card stay
                // there in the trash. 
            }





            // HERE CHECK FOR IMMUNITY?
            // If I'm trying to DELETE something that cannot,
            // or to SUSPEND something that cannot, now is a
            // great time to fail. 

            // What if it's a SUSPEND? I can fire an event
            // that says "SUSPEND Agumon" even if Agumon can't suspend.

            // Oh, we haven't activated yet. We're just "processing"? Right?
            // I think someone told me that it's not activated until you pay the cost.

            // Does "immunity" go here? I don't think so,

            // 


            if (this.effect.once_per_turn) {
                logger.debug(this.rand + "checking for once-per-turn");
                if (this.effect.n_last_used_turn == this.game.n_turn) {
                    // why is this deliberately crashing?
                    let a: any = null; a.once_oer_turn();
                    logger.debug(this.rand + "checking for once-per-turn");
                    this.s = FakeStep.DONE;
                    return false;
                }
            }


            // TODO: figure out whether 'can_activate' belongs on
            // solids or atomics
            let can_activate = this.effect.can_activate || this.effect.effects[0].can_activate;
            logger.info("checking for can_cativate");
            if (can_activate) {
                logger.info("we have aa can_activate function!");
                if (!can_activate(this.effect, this)) {
                    this.game.log("Cannot activate");
                    this.s = FakeStep.DONE;
                    return false;
                } else {
                    logger.info("we passed");
                }
            }


            this.s = FakeStep.CHECK_IF_CAN;
            // gall through
        }

        if (this.s == FakeStep.CHECK_IF_CAN) {
            // Does "immunity" go here? I don't think so,
            // I think that's part of the 5-step.
            // But "can't activate effects would" go here.
            // This would be where we check for Venusmon.

            // ... If we can't suspend, that's okay for here,
            // we will fail at a later step. 


            // this is hacky.
            // if we USE, then we insert an ACTIVATE as the next Atomic.
            // And ACTIVATE, if it finds no STA, will grab pending effects and run them
            // (This also requires the "if you did" logic to peek backwards one more iteration.)
            let current_atomic = this.effect.effects[this.n_effect + 1];
            if (current_atomic && current_atomic.events.find(e => e.game_event === GameEvent.USE)) {
                logger.info(`inserting ${this.n_effect} of ${this.effect.effects.length}`);
                let next_atomic = this.effect.effects[this.n_effect + 1];
                if (next_atomic && next_atomic.events[0].game_event === GameEvent.ACTIVATE) {
                    logger.info("already have an ACTVATE, no need to insert");
                } else {
                    let inserted: AtomicEffect = new AtomicEffect("", "", this.game);
                    inserted.events.push({
                        cause: EventCause.GAME_FLOW, //?
                        game_event: GameEvent.ACTIVATE,
                        label: "activate",
                        td: new TargetDesc(""),
                        choose: new DynamicNumber(0),
                        n_player: current_atomic.events[0].n_player,
                        play_label: "activate"
                    });
                    this.effect.effects.splice(this.n_effect + 2, 0, inserted);
                    logger.info(`inserted ${this.n_effect} of ${this.effect.effects.length}`);

                }
            }


            this.n_effect += 1;
            logger.info("this.effect n_effect  is " + this.n_effect);
            this.weirdo_count = 0;


            logger.info(this.rand + "SOLID EFFECT LOOP COUNT " + this.n_effect + " of " + this.effect.effects.length);


            if (this.n_effect >= this.effect.effects.length) {

                if (this.events_to_do.length > 0) {
                    this.n_effect -= 1; // so we can do one last loop
                    logger.info("EVENTS TO DO: " + this.events_to_do.length);
                    this.s = FakeStep.DO_EFFECT_GO;
                    return false;
                }
                this.s = FakeStep.DONE;
                return false;
            }
            let eff = this.effect.effects[this.n_effect];

            this.game.log("Sub effect: " + eff.raw_text);


            logger.info(this.rand + "ATOMIC LENGTH2 IS " + eff.events.length +
                eff.events.map(x => GameEvent[x.game_event]).join(","));
            logger.info(this.rand + "ATOMIC WEIRDO IS " + GameEvent[eff.weirdo.game_event]);

            logger.info(this.rand + "atomic effect is ");
            logger.info(eff.toString());

            // the dfferenve between the is_cost and optional test is that if we fail is_cost we 
            // terminate the entire effect
            if (eff.is_cost) {
                if (!can_pay(eff, this.game, this.effect.source, this)) {
                    this.game.log("Cost can't be paid; ending effect");
                    logger.info("can't pay; ending event");
                    this.s = FakeStep.DONE;
                    return false;
                }
            }

            if (eff.optional) {
                if (!can_pay(eff, this.game, this.effect.source, this)) {
                    this.game.log("Action can't be performed, not offering choice and moving to next");
                    logger.info("can't do action, moving to next");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    return false;
                }
                // look at future effects if rolled into this one as a unit
                for (let i = 1; i < eff.is_cost; i++) {
                    let future_eff = this.effect.effects[this.n_effect + i];
                    if (!can_pay(future_eff, this.game, this.effect.source, this)) {
                        this.game.log("Compound action can't be performed, not offering choice and moving to next");
                        logger.info("can't do compound action, moving to next");
                        this.s = FakeStep.FINISH_REPEAT_LOOP;
                        return false;
                    }

                }
            }
            // if we accepted the previous cost, we auto-commit to selecting this one
            let auto_commit = false;
            let auto_deny = false;
            if (eff.flags && eff.flags.previous_may) {
                let prev = this.effect.effects[this.n_effect - 1].cost_paid;
                logger.info("previous may!, prev is " + prev);
                if (prev == -1) {
                    auto_deny = true;
                    logger.info("we chose not to do previous test");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    eff.cost_paid = -1;
                    return false;
                }

            }

            if (this.n_effect > 0) {
                let prior = this.effect.effects[this.n_effect - 1];
                if (prior.is_cost) {
                    logger.info(this.rand + "prior atomic had a cost");
                    if (prior.cost_paid == 0) {
                        this.game.log(`Cost not paid, rest of effect ${this.effect.label} ends.`);
                        this.n_effect = 99;
                        eff.cost_paid = -1;
                        this.s = FakeStep.FINISH_REPEAT_LOOP;
                        return false;
                    }
                }
            }

            let test = eff.test_condition;
            if (test) { // && !test.empty()) {
                logger.info(this.rand + "TEST IS " + test.toString());
                this.game.log(`Checking for condition: ${test.raw_text()}`);
                // If we can find a target, we can continue

                // this checks for field conditions, but absolutely could
                // include checking for stuff in trash. 
                let t = test.test(this.game, this.effect.source, this.reacted_to, this);
                //                    this.game.get_n_player( this.effect.n_player ) );    
                //                    this.effect.n_player ); 
                if (t.length == 0) {
                    this.game.log("Condition fails, see if there's another atomic effect.");
                    if (eff.is_cost) {
                        this.s = FakeStep.DONE;
                        return false;
                    }
                    // we should still notice that we didn't pay the cost!
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    return false;
                }
                this.game.log("Condition passes.");
                logger.warn("no longer setting last this in test condition");
                //this.game.set_last_thing(t);
                // target for test might not be a single mon!
                //this.game.log(`Test success: ${t[0].get_name()}`);
            }
            let special_test = eff.can_activate;
            if (eff.flags && eff.flags.previous_if) {
                // we shouldn't be rechecking the if! we should cache the previous result
                special_test = (this.effect.effects[this.n_effect - 1].can_activate);
                let prev = this.effect.effects[this.n_effect - 1].cost_paid;
                logger.info("previous if!, prev is " + prev);
                if (prev == -1) {
                    logger.info("we fail");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    eff.cost_paid = -1;
                    return false;
                }
            } else if (special_test) {
                logger.info("SPECIAL TEST AT ATOMIC LEVEL");
                // TODO: get the raw_text for this test
                if (!special_test(this.effect, this)) {
                    this.game.log("Conditional test for effect fails.");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    eff.cost_paid = -1;
                    return false;
                }
            }

            /* DELETE ME after june 10
            // duped from previous_if above  
            if (eff.flags && eff.flags.previous_may) {
                let prev = this.effect.effects[this.n_effect - 1].cost_paid;
                logger.info("previous if!, prev is " + prev);
                if (prev == -1) {
                    logger.info("we fail");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    eff.cost_paid = -1;
                    return false;
                }
            }
*/
            this.s = FakeStep.ASK_ACTIVATE_ACTUALLY;
            // fall through
        }

        if (this.s == FakeStep.ASK_ACTIVATE_ACTUALLY) {
            let atomic_effect = this.effect.effects[this.n_effect];
            logger.info(this.rand + "this.effect_1 is " + this.effect);
            let w = this.effect.effects[this.n_effect].events[this.weirdo_count]; // events[this.weirdo_count];
            // optional
            // force it to be instances
            /*
                       if (!w) {
                           console.error("likely legacy effect, skipping");
                           this.game.announce("skiping legacy effect");
                           this.s = FakeStep.CHECK_IF_CAN1;
                           return false;
                       }
           */
            logger.info(this.rand + "WEOIRD LABEL");
            logger.info(this.effect.effects[this.n_effect].events[this.weirdo_count].toString());
            logger.info("Atomic effect optional is " + atomic_effect.optional);

            let force_yes = false;
            if (atomic_effect.flags && atomic_effect.flags.previous_may) {
                logger.info("previous may, do what we did last time");
                let prev_atomic = this.effect.effects[this.n_effect - 1];
                if (!prev_atomic.cost_paid) {
                    // we didn't say yes last time, end this effectr
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    atomic_effect.cost_paid = 0;
                    return false;
                }
                force_yes = true;
            }

            // don't ask if we already know the answer 
            if (!force_yes && atomic_ask_to_activate(atomic_effect)) {
                let backup = this.effect.source!.get_n_player();

                let cost_count = atomic_effect.is_cost;
                let p = atomic_effect.weirdo.n_player;
                if (p !== 1 && p !== 2) {
                    logger.debug(`p was ${p} using backup of ${backup}`);
                    p = backup;
                }
                if (atomic_effect.ask_other) p = 3 - p;
                let text = this.effect.label;
                if (w.label) {
                    text += ` for ${w.label}`;
                    logger.info(text);
                }
                let verb = w.game_event ? " " + gerund(w.game_event, w.status_condition) : "";
                this.game.log(`Asking player ${p} if they want to activate ${text}${verb}`);
                let fulltexts: string[] = [];

                for (let i = 0; i < cost_count; i++) {
                    let atom = this.effect.effects[this.n_effect + i];
                    console.info("atom  " + i + " is " + atom.raw_text);
                    console.info(atom);
                    fulltexts.push(atom.raw_text);
                }
                if (fulltexts.length === 0) {
                    // find the individual atomics
                    fulltexts.push(atomic_effect.raw_text);
                    console.error(atomic_effect);
                }
                let answers = [{
                    command: "1", text: `Activate ${text}${verb}`, ver: uuidv4(),
                    card: this.effect.card_label, instance_id: this.effect.source.id(),
                    fulltext: fulltexts.join(" and "),
                    alltext: this.effect.raw_text
                },
                {
                    command: "2", text: "Don't pay/activate", ver: uuidv4(),
                    card: this.effect.card_label, instance_id: this.effect.source.id(),
                    fulltext: "Do not " + present(w.game_event)
                }
                ];

                this.game.wait(p, answers);
                this.s = FakeStep.GET_ACTIVATE;
                // I think I can fall through here
            } else {
                this.s = FakeStep.POST_ACTIVATE;
                return false;
            }
            // to get_activate
        }
        if (this.s == FakeStep.GET_ACTIVATE) {
            let atomic = this.effect.effects[this.n_effect];
            // track target in w as well?
            logger.info(this.rand + "get activate");
            if (!this.game.has_answer()) {
                this.game.log("still waiting for answer");
                return false;
            }
            let answer: string = this.game.get_answer();
            //            this.game.announce("yes/no is " + answer);
            logger.info(this.rand + "yes/no answer is " + answer);
            //          this.game.wait_answer = undefined;
            if (answer == "2") {
                this.game.log("Player declined to activate " + atomic.raw_text);
                //               this.game.announce("declining to activate, this loop ends");
                this.s = FakeStep.FINISH_REPEAT_LOOP;
                atomic.cost_paid = 0;
                return false;
            }

            // this is doing the wrong thing. it's relying on the first part
            // of the <Delay> effect being optional. But <Delay> itself is a
            // step of "by trashing this card, do what follows"
            if (atomic.keywords.includes("＜Delay＞")) {
                let i: SpecialInstance = this.effect.source as SpecialInstance;
                let ii = i.get_instance();
                ii.do_trash("delay effect");
            }
            /*
            if (this.effect.effects[this.n_effect].keywords.includes("＜Delay＞")) {
                let i: SpecialInstance = this.effect.source as SpecialInstance;
                let ii = i.get_instance();
                ii.do_trash("delay effect");
            }*/

            // 

            this.s = FakeStep.POST_ACTIVATE;
            // fall through
        }
        // For now assume all cancelling interrupters have a two step.
        // First step is the cost.
        // second step is cancelling.
        // But they must choose what to cancel now.

        // assume second atomic effect is the canceler. which won't always be true.
        if (this.s == FakeStep.POST_ACTIVATE) {


            // we are definitely activating.


            if (this.effect.once_per_turn) {
                this.game.log("Marking once-per-turn effect as used.");
                logger.info(this.rand + `changing ${this.effect.n_last_used_turn} to ${this.game.n_turn}`)
            }
            // set the turn regardless
            this.effect.n_last_used_turn = this.game.n_turn;

            this.s = FakeStep.ASK_RESPONDING_TO;
            // fall through
        }
        if (this.s == FakeStep.ASK_RESPONDING_TO) {
            // set pronoun here
            let incidents = this.effect.trigger_incidents || [];
            if (incidents.length > 0) {
                let tgts: CardLocation[] | Instance[] = incidents.map(e => e.chosen_target);
                logger.info("set last thing in incidents");
                this.game.set_last_thing(tgts);
            }

            // Lock in now what we interrupted.
            // If we are an activated effect, 

            logger.error("9999");
            logger.error("this.effect is " + this.n_effect + " "
                + GameEvent[this.effect.effects[this.n_effect].events[0].game_event]
                + " and my sold_starter is " + !!this.effect.solid_starter);

            logger.info("my sold starter interrupt is " + !!this.effect.solid_starter?.interrupt);
            if (!this.effect.interrupt && !(this.effect.solid_starter?.interrupt)) {
                this.s = FakeStep.ASK_UPTO;
                return false;
            }


            // true only if and only if we're an interruptive effect.
            // For now, assume we're affecting some prior effect.

            // cheating by hard-coding in armorpurge. When I
            // get more, this should be part of the SubEffect class
            // and both this and instance.get_preflight() will 
            // call that.
            logger.info(this.rand + "REACTED_TO_LENGTH IS " + this.reacted_to.length);

            for (let rx of this.reacted_to) {
                logger.info(this.rand + "........");
                logger.info(GameEvent[rx.game_event]);
            }

            /*
            this code was disabled when interrupt turned into an array
 
            let trigger = this.effect.interrupt;
 
            // debug
 
            logger.info(this.rand + "WHAT TRIGGERED US?  " + GameEvent[trigger.ge]);
            for (let i = 0; i < this.reacted_to.length; i++) {
                logger.info(this.rand + `${i} reacted_to ${GameEvent[this.reacted_to[i].game_event]} `);
                logger.info(this.rand + "     trigger " + trigger.td.toString());
                logger.info(this.rand + "     source id " + this.effect.source.id());
                logger.info(this.rand + `     chosen ${this.reacted_to[i].chosen_target.id} `);
            }*/

            this.cancellable = incidents;
            /*
            this.reacted_to.filter((x) =>
                (x.game_event == trigger.ge) && // events line up
                (trigger.td.matches(x.chosen_target, this.effect.source, this.game)));
            */
            logger.info(this.rand + "LENGTH OF CANCELABLE IS " + this.cancellable.length);
            logger.info(this.rand + "CANCELABLE IS " + this.cancellable.map(x => GameEvent[x.game_event]).join(";"));
            logger.info(this.rand + "LENGTH OF INCIDENTS IS " + this.effect.trigger_incidents?.length);
            logger.info("this.effect.cancels1 " + !!this.effect.cancels);
            let nnn = this.n_effect;
            logger.info("this.effect " + nnn + " " +
                this.effect.effects[nnn].events.map(x => GameEvent[x.game_event]).join(";"));

            let cc = this.cancellable;
            cc = incidents;

            if (cc.length == 0) {
                logger.info("no interrupt target although we expect one");
                // if we have a parent, use their reacted-to effect
                this.cancel_target = this.effect.solid_starter?.chosen_cancel_target;
                if (!this.cancel_target) {
                    console.error("This is broken!");
                }
                this.s = FakeStep.ASK_UPTO;
                return false;
            } else if (cc.length == 1) {

                this.cancel_target = cc[0];
                this.effect.chosen_cancel_target = this.cancel_target;
                if (this.effect.cancels) {
                    this.game.la("Only one event to interrupt:" + GameEvent[cc[0].game_event] +
                        " " + cc[0].chosen_target.id);
                }
                this.s = FakeStep.ASK_UPTO;
                return false;
            }

            if (!this.effect.cancels) {
                // not a cancelling effect, so I think we can skip this
                // although if we could only choose one to move, wouldn't it be here?
                this.s = FakeStep.ASK_UPTO;
                return false;
            }

            this.game.la("Multiple possible effects to target");
            let answers = [];
            for (let i = 0; i < cc.length; i++) {
                let tgt: CardLocation | Instance = cc[i].chosen_target;
                let name = tgt ? tgt.get_field_name() : "?";
                answers.push({
                    command: (i + 1).toString(),
                    text: `Target effect ${cc[i].label} ${GameEvent[cc[i].game_event]} ${name} `,
                    ver: uuidv4()
                });
            }
            this.game.wait(this.effect.effects[0].weirdo.n_player!,
                answers, "Choose effect to respond to");
            this.s = FakeStep.GET_RESPONDING_TO;
            //fallthrough
        }

        if (this.s == FakeStep.GET_RESPONDING_TO) {
            if (this.game.waiting_answer()) {
                this.game.announce("still waiting for answer");
                // stay here
                return false;
            }
            // dupe code        
            let answer = parseInt(this.game.get_answer()) - 1;
            this.cancel_target = this.cancellable![answer];
            this.effect.chosen_cancel_target = this.cancel_target;
            this.game.la("Effect chosen: " + this.cancel_target.label);
            this.s = FakeStep.ASK_UPTO;
            // fall through        

        }
        // oh no, I have two identical ASK_TARGET here :( :( :(
        if (this.s == FakeStep.ASK_UPTO) {
            //            logger.info(this.effect.label);
            let w = this.effect.effects[this.n_effect].events[this.weirdo_count];
            logger.info(this.rand + "w_max" + w.n_max + "events width is " + this.effect.effects[this.n_effect].events.length + " @" + this.weirdo_count + " " + this.effect.label);
            //            let mon: Instance = this.effect.source.get_instance();
            //          let p = w.n_player!;
            let p = this.effect.source!.get_n_player();

            logger.debug("player is " + p);
            // this is just for devolve, afaict
            if (w.n_mod == "devolve" && w.n_max! > 1) {
                logger.info("n mod upto");
                let upto = [];
                for (let i = 0; i < w.n_max!; i++) {
                    upto.push({ command: (i + 1).toString(), text: `Do ${i + 1} time(s)` });
                }
                this.game.wait(p, upto, "Choose 'up to'", 1);
                this.s = FakeStep.GET_UPTO;
                return false;
            }
            this.s = FakeStep.ASK_TARGET1;
            return false;
        }

        if (this.s == FakeStep.GET_UPTO) {
            while (!this.game.has_answer()) return false;
            let w = this.effect.effects[this.n_effect].events[this.weirdo_count];
            w.n = parseInt(this.game.get_answer());

            this.s = FakeStep.ASK_TARGET1;
            // fall through
        }
        if (this.s == FakeStep.ASK_TARGET1) {
            let atomic = this.effect.effects[this.n_effect];
            let w = atomic.events[this.weirdo_count];
            let mon: Instance = this.effect.source.get_instance();
            logger.info("source instance is " + (mon ? mon.get_name() : "nothing"));
            let p = this.effect.source.get_n_player();
            let m;
            logger.info(`w.n_mod is ${w.n_mod}`);
            //        if (m = w.n_mod?.match(/counter,td2,(\d+),(\d+); /)) {
            if (m = w.n_mod?.match(/counter,(n_count_tgt|td2|test|unit),(\d+),([-0-9]+)/)) {
                logger.info("modifying n in target");
                logger.info(w.td.raw_text);
                logger.info(w.td.toString());
                logger.info(w.td2 ? w.td2.raw_text : "X");
                logger.info(w.td2 ? w.td2.toString() : "x");
                logger.info("=-=");
                //logger.info(w.td.targets[my_effect].toString());
                //logger.info(w.td2 ? w.td2.targets[my_effect].toString() : "x");

                let event = GameEvent.DELETE; // proxy for "instance"
                // this is one of those weird places we can search both cardlocs and instances
                // if "card" worked better as a target search, we could demand that.
                if (w.td2?.raw_text.includes("security")) event = GameEvent.STACK_ADD;
                // STACK_ADD because we can hit both instance and cardlocation
                let count;
                if (m[1] == "td2") {
                    logger.info("TD2 =====");
                    count = this.game.find_target(w.td2!,
                        event,
                        this.effect.source,
                        this,
                        Location.SECURITY
                    ).length;
                } else if (m[1] === "n_count_tgt") {
                    let nct: ForEachTarget = (w.td3 as any as ForEachTarget);
                    count = nct?.get_count(this.game, this.effect.source);
                    if (!count) count = 0;
                    logger.info("n count for max adjust is " + count);
                } else if (m[1] === "unit") {
                    let previous_atomic = this.effect.effects[this.n_effect - 1];
                    count = previous_atomic.cost_paid || 0;
                } else {
                    logger.info("TEST =====");
                    let s: string[] | undefined = w.n_test?.test(this.game, this.effect.source, undefined, this);
                    count = (s && s.length > 0) ? 1 : 0;
                }
                let per = parseInt(m[3]);
                let mod = count * per;
                logger.info(`count ${count} per ${per} mod ${mod} n is ${w.n} choose is ${w.choose}`);
                if (w.n) w.n += mod;
                // We set both "n" and "choose" for both "choose up to total of X value"
                console.warn("old style n mod");
                if (w.choose && w.choose.value() > 1) w.choose.n += mod;
                logger.info(`count ${count} per ${per} mod ${mod} n is ${w.n} choose is ${w.choose}`);
                if (w.game_event == GameEvent.GIVE_STATUS_CONDITION && w.status_condition && w.status_condition[0].s) {

                    // assume just 1
                    logger.info("status condition is " + GameEvent[w.status_condition[0].s.game_event]);
                    w.status_condition[0].s.n! += mod;
                    logger.info("status condition, n now " + w.status_condition[0].n);
                }
                let r = w.td.mod_max(mod);
                logger.info("max now is " + r);

                // stupid
                // let stgt = w.td.targets[1] as SubTargetDesc;
                //  stgt.n += mod;
                //  logger.info("now is " + stgt.n);

                // does this change it for future events, too? 
            }


            logger.info(this.rand + "is a cancelling solid effect is " + this.effect.cancels);
            logger.info(this.rand + "TARGETDESC FOR EFFECT IS " + (w.td ? w.td.toString() : 'nul'));
            if (w.td2) logger.info(this.rand + "TARGETDESC2 FOR EFFECT IS " + (w.td2 ? w.td2.toString() : 'nul'));
            if (w.td3) logger.info(this.rand + "TARGETDESC3 FOR EFFECT IS " + (w.td3 ? w.td3.toString() : 'nul'));
            if (true) {
                if (this.reacted_to.length > 0) {
                    // there are two tests now. What does this code block do?
                    logger.info(this.rand + "Targets must also match against reacted_to, length " + this.reacted_to.length);

                    for (let subby of this.reacted_to) {

                        // the solid effect
                        if (!subby.chosen_target) {
                            // this activated a lot more once we had multitargets like place 1 [x] and 1 [y]
                            logger.error("no chosen target");
                            continue;
                        }

                    }
                }
            }

            // trash 1 for each color: trash 3 simulteanously
            // for each card in your health, <draw 1>: 3 consecutive draw 1 event
            // draw 1 for each color
            let c1;
            if (c1 = w.n_count_tgt) {
                logger.info("n_count_tgt " + c1);
                // we modify one of our arguments, ad-hoc guessing right now
                let count = for_each_count_target(w, this.game, this.effect.source, p);
                logger.info("count is " + count);
                if (!count) {
                    logger.info("count is 0");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    return false;
                }
            }
            if (c1 = w.n_repeat) {
                // we repeat our action for each thing we find
                let i: number;
                logger.info(`looking repeat for each, target ${c1.toString()} ${c1.raw_text()}`);
                // i = this.game.find_target(w.n_repeat, GameEvent.STACK_ADD, this.effect.source, this, Location.SECURITY).length;
                i = w.n_repeat.test(this.game, this.effect.source, undefined, this).length //  this.effect.source, this, Location.SECURITY).length;

                logger.info("I IS " + i);
                if (i == 0) {
                    this.game.log("No for-each, skipping");
                    this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                    return false;
                }
                // I worry this is going to stay applied in future turns
                this.n_repeat = i;
            }
            if (c1 = atomic.per_unit) {
                logger.info("atomic per unit " + c1);
                let x = 0;
                let previous_atomic = this.effect.effects[this.n_effect - 1];

                // we repeat our action for each of the things we just did
                if (!atomic.per_unit_test) {
                    // easy case: how many times did we do thing?
                    let cp = previous_atomic.cost_paid;
                    if (cp) x = cp;
                } else {
                    let tgts = this.game.find_target(atomic.per_unit_test, previous_atomic.events[0].game_event, this.effect.source, this);
                    x = 0;
                    // harder case: how many times did we do thing to something matching X?
                    if (previous_atomic.events_to_do)
                        for (let se of previous_atomic.events_to_do) {
                            if (tgts.includes(se.chosen_target) && se.paid) x += 1;
                        }
                }
                this.n_repeat = x;
                logger.info("n repeat now " + this.n_repeat);
                if (x === 0) {
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                    return false;
                }
            }

            if (w.n_mod?.includes("previous sub")) {
                // re-use prior targets
                logger.info("using targets from previous weirdo " + this.weirdo_count);
                let w_prev = this.effect.effects[this.n_effect].events[this.weirdo_count - 1];
                this.chosen_targets = [];
                // Okay, so I would have N events to run from the previous weirdo.
                // I'm just gonna rerun those.
                for (let old_subby of this.events_to_do) {
                    this.chosen_targets.push(old_subby.chosen_target);
                }
                this.s = FakeStep.ASSIGN_TARGET_SUBS;
                return false;
            }


            let friendly_text = GameEvent[w.game_event].toLowerCase().replaceAll("_", " ");
            // special case for retaliation because we otherwise lose track... right?

            if (w.game_event == GameEvent.CANCEL) {
                logger.info("cancel, no target needed");
                w.choose = new DynamicNumber(0);
                this.cancel_target // um, did someone forget a verb here?
            } else if (w.td && w.td.conjunction == Conjunction.SOURCE) {
                logger.info(this.rand + "RETALIATION SPECIAL CASE");
                logger.info(w.toString());
                this.potential_targets = [w.chosen_target];
                logger.info(this.potential_targets.toString());
            } else {
                // TODO DONT CHECK IS w.td is DUMMY
                // I don't check for immunity here. 
                // If there's a "cannot be targeted" effect, it would
                // trigger here. We *can* target things that are immune to us.
                logger.info(this.rand + "Searching for targerts for " + GameEvent[w.game_event] + " in " + w.td.raw_text + " AKA " + w.td.toPlainText());



                // There is some dupe code here, but for this
                // special case I think it's opkay.

                let player = this.game.get_n_player(p);

                if (w.game_event == GameEvent.PLUG) {
                    let answers = [];
                    let available_links = player.get_all_links(this, this.effect.source, w.td, w.td2);
                    if (available_links) {
                        answers.push(...Player.link_options_into_questions(available_links));
                    }
                    if (answers.length == 1) {
                        this.s = FakeStep.DO_EFFECT_GO;
                        let blobs = answers[0].command.split("-");
                        if (available_links) {
                            let [source, recipient, cost, trash] = available_links[0]!;
                            this.chosen_targets = [source];
                            w.chosen_target2 = [recipient];
                            w.chosen_target3 = source; // cheat
                            w.n = cost;
                        }
                        this.s = FakeStep.ASSIGN_TARGET_SUBS;
                        return false;
                    }
                    if (answers.length == 0) {
                        this.game.log("No targets to link");
                        this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                        return false;
                    }
                    let msg = "Choose link";
                    this.game.wait(p, answers, msg, 1);
                    this.link_choices = available_links;
                    this.s = FakeStep.GET_TARGET;
                    return false;


                }
                if (w.game_event == GameEvent.EVOLVE) {

                    let answers = [];

                    let fusion: "only" | "no" = (w.cause & EventCause.DNA) ? "only" : "no";
                    let app: "only" | "no" = (w.cause & EventCause.APP_FUSE) ? "only" : "no";
                    let available_evos = player.get_all_evolves(false, fusion, app, this, this.effect.source, w.td2, w.td,
                        w.td3, w.n_mod);
                    logger.info(`There are ${available_evos && available_evos.length} evos..`);
                    if (available_evos) {
                        answers.push(...Player.evo_options_into_questions(available_evos));
                    }
                    /*
                    old evo code
                    */

                    // when we ask the user and there's only 1 choice, the UI gets stuck
                    if (answers.length == 1) {
                        // duped from ASK_TARGET1
                        this.s = FakeStep.DO_EFFECT_GO;
                        let blobs = answers[0].command.split("-");
                        //    2024-11-08 13:11:35 [info] - game - wait choice: 16-0-5-0-4 Evolve Lv.5 Antylamon onto xx (4) 5f55dc5a-4375-4239-9c20-f8519\
                        logger.warn("we shouldn't be using location any more");
                        if (available_evos) {
                            let [cl, left, right, type, cost] = available_evos[0]!;
                            this.chosen_targets = [cl];
                            w.chosen_target2 = [left];
                            w.chosen_target3 = right;
                            w.n = cost;
                        }
                        /*    let [_location, i, target, _, cost] = blobs;
                            let location: number = parseInt(_location);
                            w.chosen_target2 = this.game.get_instance(parseInt(target));
                            let cl = new CardLocation(this.game, p, location, parseInt(i));
                            this.chosen_targets = [cl];
                            console.error(55858585855);
                            console.error(this.chosen_targets);
                            //                weirdo.chosen_target = cl;    
                            w.n = parseInt(cost);*/
                        this.s = FakeStep.ASSIGN_TARGET_SUBS;
                        return false;
                    }

                    if (answers.length == 0) {
                        this.game.log("No targets to evolve");
                        this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                        return false;
                    }

                    // By only asking the user when there's a choice, I'm leaking info
                    let msg = "Choose evolve";
                    this.game.wait(p, answers, msg, 1);
                    logger.info("waiting for evo targets somehow?");
                    this.evolve_choices = available_evos;

                    this.s = FakeStep.GET_TARGET;
                    return false;



                }
                // there's parallel logic here for must_attack, but is it needed?
                if (w.game_event == GameEvent.MUST_ATTACK) {

                    if (this.game.root_loop.combatloop) {
                        this.game.la(`${mon && mon.name()} wants to start attack, but another attack already in progress.`);
                        this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                        return false;
                    }

                    let attackers: Instance[] | undefined = w.td2 && this.game.find_target(w.td2, w.game_event, this.effect.source!, this) as Instance[];
                    // we'll never have declaring an attack as a cost?
                    // assume just 1 attacker for Minimum Viable Product
                    if (!attackers || attackers.length == 0) {
                        this.game.la(`No attackers available.`);
                        this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                        return false;
                    }
                    // 
                    let player = attackers[0].me_player;
                    let [attack_array, _] = player.get_attacker_array(attackers, w.td, w.n_mod);
                    if (attack_array.length == 0) {
                        this.game.la(`No attacks possible.`);
                        this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                        return false;
                    };
                    // TODO: try deleting this
                    // instead of special checking for 1 target, have the targeting logic do it for us
                    if (attack_array.length == 1) {
                        this.game.log(`Only 1 choice for attack: ${attack_array[0].text} by effect`);
                        // dupe code as in GET_TARGET
                        let cmd: string = attack_array[0].command;
                        let [_, attacker, target] = cmd.split(" ");
                        this.attacker = this.game.get_instance(attacker);
                        this.attack_target = (target == "0") ? this.attacker.other_player : this.game.get_instance(target);
                        this.s = FakeStep.DO_EFFECT_GO;
                        return false;
                    }


                    let answers = [];
                    /*let names = [];
                    this.attack_targets = [];
                    for (let i = 0; i < attack_targets.length; i++) {
                        let num = attack_targets[i];
                        let tgt = num ? this.game.get_instance(num) : a.other_player;
                        let name = num ? this.game.get_instance(num).name() : "player";
                        names.push(name);
                        this.attack_targets.push(tgt);
                        answers.push({ command: (i + 1).toString(), text: `Attack ${name}` });
                    }*/
                    // command can't have spaces?
                    attack_array.forEach(c => c.command = c.command.replaceAll(" ", "-"));
                    answers.push(...attack_array);
                    answers.forEach(c => logger.info(`att ${c.command} ${c.text} ${c.ver} ${c.last_id}`));
                    this.game.log(`Attack choices are: ${answers.map(a => a.text).join()}`);
                    let msg = "Choose attack:";
                    this.game.wait(p, answers, msg, 1);
                    this.s = FakeStep.GET_TARGET;
                    return false;
              /*  } else if (atomic.search_multitarget && atomic.search_multitarget.targets.length > 1) {

                    console.error("OBSOLETE CODE");

                    logger.debug("LEFT TO STRING " + atomic.search_multitarget.targets[0].toString());
                    logger.debug("RIGHT TO STRING " + atomic.search_multitarget.targets[1].toString());

                    // find all the matches on the left, then all the 
                    let a = this.game.find_target(atomic.search_multitarget.targets[0], w.game_event, this.effect.source!, this);
                    let b = this.game.find_target(atomic.search_multitarget.targets[1], w.game_event, this.effect.source!, this);
                    let c = <CardLocation[]>a.concat(<CardLocation[]>b);
                    //console.log(a.map(x => ` A ${x.name}-${x.id}`).join(","))
                    this.potential_targets = c;
                    logger.info("potential targets is " + this.potential_targets.map(x => `${x.get_name()}-${x.id}`).join(","))
                    logger.info(this.rand + "done 3");

                    // this.potential_targets = a.concat(b);

             */   } else if (w.td.raw_text.includes("deck")) {
                    logger.info("no first target, using deck " + w.td.raw_text);
                    // no target selection needed
                    this.s = FakeStep.ASK_TARGET2;
                    return false;
                } else {
                    let zone = Location.SECURITY;
                    if (this.effect.active_zone && this.effect.active_zone & Location.EGGZONE) {
                        zone |= Location.FIELD;                    
                        console.error(1685, "XXX", this.effect.active_zone, "addl_loc updated", zone);
                    }
                    this.potential_targets = w.td && this.game.find_target(w.td, w.game_event, this.effect.source!, this, zone) as CardLocation[];
                    logger.info("is cost? " + atomic.is_cost);
                    if (atomic.is_cost) this.potential_targets = this.potential_targets.filter(t => can_pay_material(t, w)[0])
                    // if tokens, just pick them to play 
                    if (w.game_event == GameEvent.PLAY && w.td.raw_text.match(/token/i)) this.potential_targets.length = Math.min(w.choose!.value(), this.potential_targets.length);
                    logger.info("length is " + this.potential_targets.length);
                    logger.info("potential targets " + GameEvent[w.game_event] + " is " + this.potential_targets.map(x => `${x.get_name()}-${x.id}`).join(","))
                    logger.info(this.rand + "");
                }

            }

            // if w.choose == 0, there is no target. It's like "gain memory" or "draw"

            // if w.choose == 1, we pick exactly one -- even if it is explicitly just one specific target.
            // we need to distinguish "choose a target" from "suspend this thing" for UI simplicity

            // that's all we need for now. We will need "choose 2" or "up to 3" or "all"
            if (!w.choose || w.choose.value() == 0 || w.td.raw_text.includes("blanket")) {
                logger.info(this.rand + "choose is 0, no targets needed");

                let dupe2: SubEffect = Object.assign(w);
                this.events_to_do.push(dupe2);
                this.s = FakeStep.PRE_DO_EFFECT;
                return false;
            }

            // we will need targets now
            if (!this.potential_targets || this.potential_targets.length == 0) {
                this.game.log("There were no valid targets for " + atomic.raw_text);
                logger.info(this.rand + "no targets :< ");
                this.effect.effects[this.n_effect].cost_paid = 0;
                this.n_repeat = 0; // can't repeat... do other jumps to FINISH_REPEAT_LOOP need this?
                this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                return false;
            }; // 
            // logger.info(this.potential_targets);
            //logger.info(this.potential_targets[0]);

            // If the effect involves a player selecting a card from their hand

            let secret = false;
            // this is the same list from game::find_target(), it's anything that
            // might affect a card

            /*let msg = "To " + friendly_text + " the targets are " +
            this.potential_targets!.map(x => `${x.get_name()}`).join(", ");
            if (!secret) {
                    this.game.log(msg);
            } */

            //            logger.info(this.rand+"For effect " + w.label + " or " + GameEvent[w.game_event]);
            // I track this but I need to finish splitting up effects to
            // properly use it, for now just say if it's reactive it has a cost
            let is_cost = (this.reacted_to.length > 0);
            //            logger.info(this.rand+"is cost ois " + is_cost);
            if (is_cost != (this.effect.effects[this.n_effect].is_cost > 0)) {
                // warn that costs are different
            }

            let n_player = w.n_player;
            if (!n_player || n_player < 1 || n_player > 3) { // do I mean 3?
                // This occurs mostly during testing.
                logger.warn("can't figure out target player: " + n_player);
                n_player = 0;
            }
            this.s = FakeStep.ASK_TARGET1; // is this right?
            // fall through
        }
        // we have two blocks both called ASK_TARGET1, fire the guy who wrote this
        if (this.s == FakeStep.ASK_TARGET1) {

            let w = this.effect.effects[this.n_effect].events[this.weirdo_count];

            // Where do I assign the source of an effect? 
            let backup = this.effect.source!.get_n_player();

            //          this.game.announce("choose is " + w.choose);
            if (!this.potential_targets) return false; // should never happen
            // this used to say w.choose but with what we've got now you always choose.
            if (this.potential_targets.length == 0) {
                this.game.la("There are no targets.");
                // didn't we already check this above?
                this.s = FakeStep.FINISH_REPEAT_LOOP; // yeah, didn't we check this already?
                return false;
            }

            logger.info(`tgts ${this.potential_targets.length} ${w.choose?.value()} ${w.n_mod}`);
            if (this.potential_targets.length > 1 && !w.choose) {
                console.error(this.potential_targets.length, w.choose);
                console.error("ge: " + GameEvent[w.game_event]);
                // I'd like to assert that every thing with a single target
                // set w.choose but there are too many exceptions
                let a: any = null; a.choose_undefined();
            }

            if (w.choose?.value() == ALL_OF) { logger.warn("EEEW" + w.n_mod || "?"); }
            // need at least 1 choice to be in here
            if (this.potential_targets.length > 1 && (this.potential_targets.length > (w.choose ? w.choose.value() : 1) || w.n_mod?.includes("upto"))) {
                let answers = [];
                // I need a library for this

                for (let i = 0; i < this.potential_targets.length; i++) {
                    let t = this.potential_targets[i];
                    let txt = `Target ${t.get_name()} ${t.id}`;
                    // this is written here, read in game.ts; they should both reference 1 place
                    if (w.n_mod?.includes("upto total DP")) txt += ` ${t.dp()} DP`;
                    if (w.n_mod?.includes("upto total play cost")) txt += `   ${t.get_playcost()} Cost`;
                    if (w.n_mod?.match(/upto different level/)) txt += ` Lv.${t.get_level()}`;
                    if (w.n_mod?.match(/upto different number/)) txt += ` ${t.get_card_id()}`;
                    let target: any = { kind: t.kind, location: Location[t.location] };
                    if (t.kind === "Instance") {
                        target.id = t.id;
                    } else {
                        target.id = (t as CardLocation).index;
                    }
                    // what uses this comand path?
                    answers.push({ command: (i + 1).toString(), text: txt, target_id: target, name: t.get_name() });
                }


                let p = w.n_player;
                if (!p || p < 1 || p > 3) {
                    p = backup;
                }
                let secret = false;
                if ([GameEvent.TRASH_FROM_HAND,
                GameEvent.STACK_ADD,
                GameEvent.PLAY,
                    // why would trash_to_hand or reveal_to_hand be secret?
                    //    GameEvent.TRASH_TO_HAND,
                    //  GameEvent.REVEAL_TO_HAND
                ].includes(w.game_event)) {
                    secret = true;
                }
                if (w.td && (w.td.raw_text.includes("hand") || w.td.raw_text.includes("security"))) {
                    secret = true;
                }
                let msg1 = "Targets are: " + this.potential_targets.map(x => x.get_name()).join(",") +
                    "\n" + `Player ${p} to choose ${w.choose?.value()}`;

                if (!secret) {
                    this.game.la(msg1);
                } else {
                    // just to player
                    this.game.announce(msg1, p);
                }
                logger.info(w.td ? w.td.toString() : '');
                //console.dir(w.td, { depth: 6 });
                let mod = "";
                let upto = (w.n_mod && w.n_mod.includes("upto")); //  && w.choose != ALL_OF);
                if (upto) { mod = "upto"; }
                logger.info(this.rand + `PLAYEREFFECT: w.nplayer is ${w.n_player}, backup is ${backup}`);
                let msg = `Choose ${upto ? 'up to ' : ''}${w.choose?.value()} target${(w.choose!.value() > 1 ? 's' : '')}`;
                msg += " for " + gerund(w.game_event, w.status_condition) + ":";
                if (w.n_mod?.match(/upto total/)) {
                    msg = `Choose any number that add up to ${w.n} DP:`;
                    mod = "upto total"; // where do I store DP?
                }
                let m;
                if (m = w.n_mod?.match(/upto different (level|name|number)/)) {
                    let count = "any number";
                    if (w.choose && w.choose.value() >= 1 && w.choose.value() != 99) count = `up to ${w.choose.value()}`;
                    let d = m[1];
                    msg = `Choose ${count} with different ${d}s:`;
                    mod = `upto different ${d}`;
                }
                this.game.wait(p, answers, msg, w.choose?.value(), mod);
                this.s = FakeStep.GET_TARGET;
                return false;
            } else { // choose all that are here
                // I should distinguish cards where you are forced to
                // target one thing no matter what from those where
                // you have one target

                //                console.error(" first target of " + this.potential_targets!.length);

                logger.info(this.rand + "potential length is " + this.potential_targets.length + " and first is " + !!(this.potential_targets[0]));
                this.chosen_targets = this.potential_targets;
                if (this.chosen_targets.length == 0) {
                    // we don't hit this in normal running
                    this.game.la("Target missing!");
                    console.error("Target missing!");
                    this.s = FakeStep.FINISH_REPEAT_LOOP;
                }

                this.game.log("Auto-selecting " + this.chosen_targets.map(x => x.get_name()).join(", "));
                // jump to them all being selected
                this.s = FakeStep.ASK_TARGET2;
                //      let w = this.effect.effects[this.n_effect].events[this.weirdo_count];
                //   return false;
            }
        }
        if (this.s == FakeStep.GET_TARGET) {
            logger.info(this.rand + "in get target");
            if (this.game.waiting_answer()) {
                this.game.announce("still waiting for answer");
                // stay here
                return false;
            }
            // dupe code? No, it's worse, it got duped and then forked
            let w = this.effect.effects[this.n_effect].events[0];
            let answers = this.game.get_multi_answer();
            logger.info(this.rand + " answers " + answers);
            logger.info(` evolve ${this.evolve_choices && this.evolve_choices.length} xxx`);

            if (this.link_choices && this.link_choices.length > 0) {
                let mon: Instance = this.effect.source.get_instance();
                let p = mon ? mon.n_me_player : -1;
                if (p == -1) {
                    let cl: CardLocation = this.effect.source.get_card_location();
                    p = cl.n_me_player;
                }
                // assume LINK is always a solo effect -- which is a lie   
                let atomic = this.effect.effects[this.n_effect];
                //                this.effect.effects[this.
                let weirdo = atomic.events[0];
                let blob = answers![0];
                logger.info("for link choice is " + blob);
                let blobs = blob.split("-");
                // all pairs of (card left right) and (location-instance), plus cost
                let [s_l, s_id, s_i, r_l, , r_i, cost, totrash] = blobs;
                //   16-    0-    0-  4-  0  1      2    0
                let match = false;
                logger.info("link choices:");
                logger.info(this.link_choices.map(e => `${e[0].id} -> ${e[1].id}`).join(","));
                for (let x of this.link_choices) { }
                this.chosen_targets = [this.game.find_by_key(p, parseInt(s_l), parseInt(s_i), parseInt(s_id))];
                weirdo.chosen_target2 = [this.game.find_by_key(p, parseInt(r_l), parseInt(r_i))];
                weirdo.chosen_target3 = this.chosen_targets[0]; // cheat
                logger.info(`source is ${this.chosen_targets[0].get_field_name()}`);
                logger.info(`recipient is ${weirdo.chosen_target2}`); // ?.map((x: any) => x.get_field_name().join(","))}`);
                if (totrash) { // "0" won't hit thyis
                    let cl_to_trash = new CardLocation(this.game, p, Location.BATTLE, parseInt(totrash), parseInt(r_i), "plug");
                    this.extra_subeffects.push({
                        cause: EventCause.GAME_FLOW,
                        game_event: GameEvent.TRASH_LINK,
                        label: "plug_replace",
                        chosen_target: cl_to_trash,
                        td: new TargetDesc(""),
                        n_player: p,
                    });
                }
                this.s = FakeStep.ASSIGN_TARGET_SUBS; // no ask_target2 for EVO
                this.link_choices = undefined; // later atomics shouldn't see this
                weirdo.n = parseInt(cost);



                return false;
            }

            if (this.evolve_choices && this.evolve_choices.length > 0) {
                let mon: Instance = this.effect.source.get_instance();
                let p = mon ? mon.n_me_player : -1;
                if (p == -1) {
                    let cl: CardLocation = this.effect.source.get_card_location();
                    p = cl.n_me_player;
                }
                // assume EVOLVE is always a solo effect -- which is a lie
                let atomic = this.effect.effects[this.n_effect];
                //                this.effect.effects[this.
                let weirdo = atomic.events[0];
                let blob = answers![0];
                logger.info("for evolve choice is " + blob);
                let blobs = blob.split("-");
                // all pairs of (card left right) and (location-instance), plus cost
                let [c_l, , c_i, l_l, , l_i, r_l, , r_i, cost] = blobs;
                let match = false;
                logger.info("evo choices:");
                logger.info(this.evolve_choices.map(e => `${e[0].id} -> ${e[1].id}`).join(","));
                for (let x of this.evolve_choices) {
                    //
                }
                // this has better be a cardlocation!
                this.chosen_targets = [this.game.find_by_key(p, parseInt(c_l), parseInt(c_i))];
                weirdo.chosen_target2 = [this.game.find_by_key(p, parseInt(l_l), parseInt(l_i))];
                weirdo.chosen_target3 = this.game.find_by_key(p, parseInt(r_l), parseInt(r_i));

                logger.info(`into is ${this.chosen_targets[0].get_field_name()}`);
                logger.info(`left is ${weirdo.chosen_target2?.[0].get_field_name()}`);
                logger.info(`right is ${weirdo.chosen_target3?.get_field_name()}`);

                //                weirdo.chosen_target = cl;    
                this.s = FakeStep.ASSIGN_TARGET_SUBS; // no ask_target2 for EVO
                this.evolve_choices = undefined; // later atomics shouldn't see this
                weirdo.n = parseInt(cost);

                return false;
            }

            // Forced attack
            if (w.game_event == GameEvent.MUST_ATTACK) {

                let cmd: string = answers![0] // just 1 attack answer
                let [_, attacker, target] = cmd.split("-"); // we changed spaces to "_"
                // TODO: refactor with Player::attack
                this.attacker = this.game.get_instance(attacker);
                this.attack_target = (target == "0") ? this.attacker.other_player : this.game.get_instance(target);
                logger.info(this.rand + "the target is " + this.attack_target.get_name());
                this.attack_targets = undefined; // in case we loop back through?? 
                this.s = FakeStep.DO_EFFECT_GO;
                return false;
            }
            //            this.chosen_targets = this.potential_targets;[answer];

            // craziness of having a number type that can't be zero and then changing it to a string type
            this.chosen_targets = this.potential_targets?.filter((x, y) => answers?.includes(((y) + 1).toString()));

            //. push first effect naturally... we can't push complex objects with functions inside _.clonedeep, right?
            // that's why the gifted <Alliance> was failing, right?
            this.s = FakeStep.ASK_TARGET2;
            // fallthrough
        }
        if (this.s == FakeStep.ASK_TARGET2) {
            logger.info("ASK TARGET2");
            let atomic = this.effect.effects[this.n_effect];
            let w = atomic.events[0];
            let p = w.n_player;
            let backup = this.effect.source!.get_n_player();
            if (!p || p < 1 || p > 3) {
                p = backup;
            }
            let mon: Instance = this.effect.source.get_instance();

            // only some events need to ask about the second target
            if (!w.td2 ||
                !([GameEvent.EVOSOURCE_MOVE,
                GameEvent.TUCK,
                GameEvent.EVOSOURCE_DOUBLE_REMOVE,  // 
                GameEvent.TARGETED_CARD_MOVE].includes(w.game_event))) {
                this.s = FakeStep.ASSIGN_TARGET_SUBS;
                return false;
            }

            // if our second target is a generic thing like "hand" or "Security" we don't need to 
            // target it

            if (w.td2.raw_text.includes("security") || w.td2.raw_text.includes("hand")) {
                // no need to find a target if we're targeting card move to security
                this.s = FakeStep.ASSIGN_TARGET_SUBS;
                return false;
            }

            let game_event2 = w.game_event;
            if (game_event2 === GameEvent.TARGETED_CARD_MOVE) {
                game_event2 = GameEvent.DELETE; // 2nd target is an instance?
            }
            if (game_event2 === GameEvent.EVOSOURCE_DOUBLE_REMOVE) {
                game_event2 = GameEvent.EVOSOURCE_REMOVE; // 2nd target is cards?
            }
            // target2 is really simple, we took care of all the complex cases,
            // this is just when a specific generic effect needs a second target
            // can we re-use potential targets??? may-be...
            logger.warn("assuming prior target was an instance for 'another' logic");
            let prior: Instance = this.chosen_targets![0] as Instance;
            let special_previous = new SpecialInstance(prior);
            logger.info(`special_previous is ${!!special_previous}`);
            //console.error(2022, w.td2);
            let zone = Location.SECURITY;
            if (this.effect.active_zone && this.effect.active_zone & Location.EGGZONE) {
                zone |= Location.FIELD;
            }
            let potential_targets = this.game.find_target(w.td2, game_event2, this.effect.source, this, zone, special_previous);
            logger.info(this.rand + "Searched for targerts2 for " + GameEvent[w.game_event] + " in " + w.td2.raw_text + " AKA " + w.td2.toPlainText());
            let choose2 = 1;
            try {
                //console.info(1978, "w w w", w.td2);
                //console.dir(w.td2, { depth: 9 });
                let mtd = (w.td2 as any as MultiTargetDesc);
                choose2 = mtd.count().value(this.game, this.effect.source);
                logger.info("Choose 2 is " + choose2);
                this.game.log("For second target, can choose " + choose2 + " things.");
                if (choose2 == 0) {
                    this.effect.effects[this.n_effect].cost_paid = 0;
                    this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                    return false;
                }
            } catch { }
            logger.info("target 2 length is " + potential_targets.length + ", pick " + choose2);
            if (potential_targets.length == 0) {
                // target required,
                this.game.log("No valid secondary target");
                this.effect.effects[this.n_effect].cost_paid = 0;
                this.s = FakeStep.FINISH_REPEAT_LOOP; // back to top
                return false;
            }; // 
            if (potential_targets.length > choose2) {
                // I'd like to assert that every thing with a single target
                // set w.choose but there are too many exceptions
                let answers = [];
                this.potential_targets2 = potential_targets;
                for (let i = 0; i < potential_targets.length; i++) {
                    let t = potential_targets[i];
                    let txt = `Target ${t.get_name()} ${t.id}`;
                    let target: any = { kind: t.kind, location: Location[t.location] };
                    if (t.kind === "Instance") {
                        target.id = t.id;
                    } else {
                        target.id = (t as CardLocation).index;
                    }
                    // what uses this comand path?
                    answers.push({ command: (i + 1).toString(), text: txt, target_id: target, name: t.get_name() });
                }
                let msg = `Choose ${choose2} for 2nd part of ${gerund(w.game_event, w.status_condition)}`;
                this.game.wait(p, answers, msg, choose2);
                this.s = FakeStep.GET_TARGET2;

            } else {
                w.chosen_target2 = potential_targets;
                this.game.log("auto-selecting 2nd target " + potential_targets.map(x => x.get_name()).join(","));
                this.s = FakeStep.ASSIGN_TARGET_SUBS;
                // fall through
            }

        }
        if (this.s == FakeStep.GET_TARGET2) {
            /////// sort of duped, but doesn't have clauses for evo or attack    
            logger.info("GET_TARGET2");
            if (this.game.waiting_answer()) {
                this.game.announce("still waiting for answer");
                // stay here
                return false;
            }
            let atomic = this.effect.effects[this.n_effect];
            let w = atomic.events[0];
            let answers = this.game.get_multi_answer();
            logger.info("chosen td2 answers is " + answers?.join(","));
            w.chosen_target2 = this.potential_targets2?.filter((x, y) => answers?.includes(((y) + 1).toString()));

            this.s = FakeStep.ASSIGN_TARGET_SUBS;
        }
        if (this.s == FakeStep.ASSIGN_TARGET_SUBS) {

            // HANDLE TD2
            // We will some day need a loop for selecting secondary target
            // For now, auto-choose the first secondary target

            let names = this.chosen_targets?.map(x => x.get_name()).join(",");
            this.game.log("Target chosen: " + names);
            let atomic = this.effect.effects[this.n_effect];
            let d = atomic.events[this.weirdo_count];
            d.chosen_target = this.chosen_targets![0];
            if (!d.chosen_target2 && d.td2 && !d.td2.raw_text.includes("security")) {
                logger.info("auto assign td2! " + d.td2.raw_text + "," + d.td2.text); // assume an instance
                let tgts = this.game.find_target(d.td2, GameEvent.DELETE, this.effect.source, this, Location.SECURITY);
                // having "find_target" in this file 10 times sucks
                if (atomic.is_cost) logger.error("not filtering costs on td2");
                if (tgts && tgts.length > 0 && !!tgts[0]) d.chosen_target2 = tgts; // all tgts?
                //                console.error(1636, tgts[0]);
                //               logger.info("auto assign td2 to " + d.chosen_target2.get_name());
            }
            // could set d.label here, in theory
            this.events_to_do.push(d);

            for (let i = 1; i < this.chosen_targets!.length; i++) {
                logger.info(`chosen target ${i} targets[i] is ${this.chosen_targets![i].id} ${this.chosen_targets![i].get_name()} `);
                // oh, we *should* have each weirdo make 1 or more (or zero?) subeffects and they get put 
                // into a big array and *that* array gets run
                // I've made the data structure already

                //   let dupe1: SubEffect = Object.assign(atomic.weirdo);
                // dupe1.chosen_target = this.chosen_targets![i];
                // atomic.events[i] = dupe1;


                // THIS WAS UTTERFLY FAILING! WE WERE GETTING THE SAME OBJECT EACH TIME THROUGH
                // let dupe2: SubEffect = Object.assign(atomic.events[this.weirdo_count]);
                let dupe2: SubEffect = _.cloneDeep(atomic.events[this.weirdo_count]);;

                dupe2.chosen_target = this.chosen_targets![i];
                this.events_to_do.push(dupe2);
                logger.info(`chosen target ${i} targets[i] is ${dupe2.chosen_target.id} ${dupe2.chosen_target.get_name()} `);

                //if (i == 0) atomic.weirdo = dupe;
            }
            // if we ever have to both repeat *AND* do chosen targets, I dunno what happens
            /*
            for (let i = 1; i < this.n_repeat; i++) {
                let dupe2: SubEffect = _.cloneDeep(atomic.events[this.weirdo_count]);;
         
                dupe2.chosen_target = this.chosen_targets![0];
                this.events_to_do.push(dupe2);
                logger.info(`n_repeat chosen target ${i} targets[i] is ${dupe2.chosen_target.id} ${dupe2.chosen_target.get_name()} `);
            }*/
            this.events_to_do.push(...this.extra_subeffects);

            for (let etd of this.events_to_do) {
                logger.info(` etd is ${GameEvent[etd.game_event]} ...`);
                logger.info(` etd     target is ${etd.chosen_target?.id}`);
            }

            //       this.effect.effects[this.n_effect].weirdo.chosen_target = this.chosen_targets![0];
            //            let name = this.chosen_targets && this.chosen_targets[0] ? this.chosen_targets![0].get_name() : "(ERROR?)";
            this.game.log(`targeting ${names} for ${atomic.raw_text}`);
            this.s = FakeStep.PRE_DO_EFFECT;
            // fall through?
        }

        if (this.s == FakeStep.PRE_DO_EFFECT) {

            let atomic = this.effect.effects[this.n_effect];

            logger.info(this.rand + `ATOMIC ${this.n_effect} AND SUB ${this.weirdo_count} TODO LEN IS ${this.events_to_do.length} TARGETCOUNT IS ${this.target_count}`);
            //     this.effect.effects[this.n_effect].events[0] = this.effect.effects[this.n_effect].weirdo; //? unneeded
            this.target_count += 1;

            this.weirdo_count += 1;
            logger.info(this.rand + `weirdo count is ${this.weirdo_count} and length is ${atomic.events.length}`);
            if (this.weirdo_count < this.effect.effects[this.n_effect].events.length) {
                logger.info(this.rand + "LOOPING");
                this.s = FakeStep.ASK_TARGET1;
                return false;
            }
            this.s = FakeStep.DO_EFFECT_GO;
        }
        if (this.s == FakeStep.DO_EFFECT_GO) {

            logger.info("REPEAT IS " + this.n_repeat);
            let atomic = this.effect.effects[this.n_effect];

            logger.debug("n mod game event" + GameEvent[atomic.weirdo.game_event]);
            if (atomic.weirdo.n_mod == "upto") {
                logger.info("n mod hit");
                let a: any = null; a.upto();
            }

            if (this.attack_target) {
                let e: SubEffect[] = [];
                let attacker = this.attacker;
                // duped from player code
                let w = atomic.events[this.weirdo_count];
                logger.debug("Checking for suspend " + w.n_mod);
                // "without suspending", to not be OP, has to be by effect
                if (!w.n_mod?.match(/without suspending/i)) {
                    e.push({
                        cause: EventCause.NORMAL_BATTLE,
                        game_event: GameEvent.SUSPEND,
                        chosen_target: attacker, td: new TargetDesc(""),
                        label: "suspend to attack",
                        // could I declare an attack on opponent's turn????
                        n_player: this.game.turn_player,
                        spec_source: attacker // not-so-special source
                    });
                }
                e.push({
                    game_event: GameEvent.ATTACK_DECLARE,
                    chosen_target: this.attack_target, td: new TargetDesc(""),
                    label: "declare attack",
                    spec_source: attacker, // not-so-special source
                    n_player: this.game.turn_player,
                    cause: EventCause.NORMAL_BATTLE // "normal" ?
                });

                this.n_effects_tried = e.length // 1 for now
                logger.info("in alternate branch, is_cost likely never set");
                this.interrupter_loop = new InterrupterLoop(this.game, e, this.depth, !!atomic.is_cost); // +1 or no?
                this.events_to_do = []; // old array hangs around for loop, this is a new one
                this.attack_target = undefined;
                this.s = FakeStep.DO_EFFECT_LOOP;
                return false;

            }


            logger.info(this.rand + "DO EFFECT");
            // TODO: collect side effects
            // just one subeffect for now, but later could be several
            let x = atomic.weirdo;
            //            if (x != this.effect.effects[this.n_effect].w
            x.n_player = this.effect.source!.get_n_player();
            // this label helps with queen-protect
            if (more_labelling) x.label ||= this.effect.label;

            // I repeat the effect here N times for ech cost paid.
            // I only repet the first one, I don't know what
            // to do if I've got M things to repeat N times.

            for (let i = 0; i < this.effect.effects.length; i++) {
                logger.info(this.rand + `for atomic ${i} of ${this.effect.effects.length}`);
                let at = this.effect.effects[i];
                logger.info(this.rand + `there are ${at.events.length} width events: ${at.events.map(x => GameEvent[x.game_event]).join(",")}`);
            }

            // for things like <Alliance> which need to reference prior effects
            if (atomic.events[0].status_condition &&
                atomic.events[0].status_condition[0] &&
                atomic.events[0].status_condition[0].s.n_function) {
                atomic.events[0].status_condition[0].s.n =
                    atomic.events[0].status_condition[0].s.n_function(this.effect);

            }

            // for things like 'for each card discarded, get 1 memory'. 
            // This is one action of N things
            if (atomic.per_unit && false) {
                // start at 1 because we've already got one
                logger.debug("this.n_effect is " + this.n_effect);
                let prior_paid = this.effect.effects[this.n_effect - 1].cost_paid;
                for (let i = 1; i < prior_paid!; i++) {
                    logger.info(this.rand + `paying ${i} of ${prior_paid} weirdo_count ${this.weirdo_count}`);
                    logger.info(this.rand + `subby is `);

                    // What other bug am I doing that means I must use [0] here?
                    // I haven't set weirdo...?...(although I'm trying to get rid of weirdo.)

                    let dupe: SubEffect = Object.assign(atomic.events[0]);
                    // making this use weirdo count causes a crash
                    //                    let dupe: SubEffect = Object.assign(atomic.weirdo);


                    // atomic.events.push(dupe);
                    // logger.info(this.rand+"DUPING PER UNIT");

                    //let dupe2: SubEffect = Object.assign(w);                
                    //dupe2.chosen_target = this.chosen_targets[0];
                    logger.info('pushing 846');
                    this.events_to_do.push(dupe);
                    logger.info(this.rand + `length now ${this.events_to_do.length}`);
                }
                // ... 
            }

            logger.info(this.rand + `length of atomic.events is ${atomic.events.length} and eventstodo is ${this.events_to_do.length}, make them equal`);
            logger.info(this.rand + "atomic " + atomic.events.map(x => GameEvent[x.game_event]).join("-"));
            logger.info(this.rand + "todo is " + this.events_to_do.map(x => GameEvent[x.game_event]).join("-"));
            logger.info(this.rand + "atomic tgt " + atomic.events.map(x => x.chosen_target?.get_name()).join("-"));
            logger.info(this.rand + "todo is tgt " + this.events_to_do.map(x => x.chosen_target?.get_name()).join("-"));
            let subfx = atomic.events;

            //             0                           2
            while (this.events_to_do.length < atomic.events.length) {
                let dupe: SubEffect = Object.assign(atomic.events[this.events_to_do.length]);
                this.events_to_do.push(dupe);
            }


            atomic.events_to_do = this.events_to_do; // save for later so we can check how many got paid
            subfx = this.events_to_do;


            if (atomic.events.length == this.events_to_do.length) {
                //    subfx = this.events_to_do;
            }

            //console.dir(subfx, { depth: 1 });
            for (let i = 0; i < subfx.length; i++) {
                // this.effect.source! is a TargetSource
                // spec_source is an Instance
                //logger.info(this.rand+"source is " + this.effect.source.card_id());
                if (this.effect.source.is_instance()) {
                    subfx[i].spec_source = this.effect.source.get_instance();
                } else if (this.effect.source.is_card()) {
                    subfx[i].spec_source = this.effect.source.get_card_location();
                }
                subfx[i].n_player = this.effect.source!.get_n_player();
                if (more_labelling) subfx[i].label ||= this.effect.label;
            }

            this.n_effects_tried = subfx.length // 1 for now
            this.interrupter_loop = new InterrupterLoop(this.game, subfx, this.depth, !!atomic.is_cost, atomic.sta, this.effect); // +1 or no?
            this.events_to_do = []; // old array hangs around for loop, this is a new one
            this.s = FakeStep.DO_EFFECT_LOOP;

            return false;
        }
        if (this.s == FakeStep.DO_EFFECT_LOOP) {
            logger.info(this.rand + "stepa");
            let x = this.interrupter_loop?.step();
            if (!x) return false;
            this.collected_events = this.collected_events.concat(x);
            logger.info(this.rand + "stepb " + this.collected_events.length + " " + x.length);

            // verify that we did the thing that needewd to pay
            // for the cost.

            let atomic = this.effect.effects[this.n_effect];
            if (true || atomic.is_cost) { // always track, we can't predict what will be a cost
                logger.info(this.rand + "attempting poor proxy to see if cost was paid");
                logger.info(this.rand + "we wanted to do " + this.n_effects_tried + " effects and " + x.length + "happened");
                if (x.length == this.n_effects_tried) {
                    atomic.cost_paid = x.length;
                } else {
                    atomic.cost_paid = 0;
                }
            }

            logger.info(this.rand + "COLLECTED EVENTS::: " + x.length + " ARE " +
                x.map(x => GameEvent[x.game_event]).join("--"));

            // can I tell if I successfully paid the cost by looking 
            // at that list??
            logger.info(this.rand + "going into reacted_to " + this.reacted_to.length);

            if (this.reacted_to.length == 0) {
                logger.info("going into check_if_can");
                this.s = FakeStep.FINISH_REPEAT_LOOP;
                return false;
            }
            let successfully_paid = true;

            for (let y of x) {
                logger.info(`does ${GameEvent[y.game_event]} equal ${GameEvent[this.effect.effects[0].events[0].game_event]}`);
            }

            // this used to say "weirdo" instead of "game_events". I don't know why but it stopped barrier from working
            if (!x.find(y => y.game_event == this.effect.effects[0].events[0].game_event)) {
                //this.game.la("Cost not paid, attempt to cancel fails");
                successfully_paid = false;
            }
            logger.info(this.rand + "between pay clauses, paid is " + successfully_paid);

            if (!successfully_paid && this.effect.cancels) {

                // this comment below is a lie. We're in this branch when we do cancel
                //   this.game.log("Cost wasn't successfully paid by interrupter, " +
                //     this.cancel_target!.label + " will continue.");
                this.s = FakeStep.FINISH_REPEAT_LOOP;
                return false;
            }
            // right now I only have one choice of what to cancel, but
            // there might be multiple and I might only be able to cancel
            // some of them

            if (atomic.events[0].game_event == GameEvent.MODIFY_COST) {
                // "cancel_target" isn't a good name, it's archaic from when interruptive events only cancelled
                if (!this.cancel_target!.cost_change)
                    this.cancel_target!.cost_change = [];
                this.cancel_target!.cost_change.push(atomic.events[0]);
            }

            if (!this.effect.cancels) {
                logger.info(this.rand + "not a cancelling effect");
                this.s = FakeStep.FINISH_REPEAT_LOOP;
                return false;
            }



            logger.info(this.rand + "going into get_cancel");
            // OOPS I should have declared what to cancel when activating
            this.s = FakeStep.GET_CANCEL;

            // fall through
        }


        // Cancels are handled in the effect loop, after running a cost
        // and seeing if we can cancel something.
        // It really should move into its own Terminus event.
        // An issue there is that the target of what we cancel is selected
        // immediately at interrupt timing. So maybe it does belong like this.

        if (this.s == FakeStep.GET_CANCEL) {

            logger.info(this.rand + "LENGTH OF CANCELABLE IS " + this.cancellable?.length);
            logger.info(this.rand + "CANCELABLE IS " + this.cancellable?.map(x => GameEvent[x.game_event]).join(";"));
            logger.info(this.rand + "LENGTH OF INCIDENTS IS " + this.effect.trigger_incidents?.length);
            logger.info("this.effect.cancels2 " + !!this.effect.cancels);
            let nnn = this.n_effect;
            logger.info("this.effect " + nnn + " " +
                this.effect.effects[nnn].events.map(x => GameEvent[x.game_event]).join(";"));

            if (this.cancel_target) {

                logger.info(this.rand + "a1 " + nnn + " " + this.effect.effects[nnn].events.map(x => GameEvent[x.game_event]).join(","));
                logger.info(this.rand + "a1 " + (nnn + 1) + " " + this.effect.effects[nnn + 1]?.events?.map(x => GameEvent[x.game_event]).join(","));

                //&& this.effect.effects[this.n_effect].events[1]?.game_event === GameEvent.CANCEL) {
                logger.info(this.rand + "Negating " + this.cancel_target.label);
                this.game.log("Will be negated: " + this.cancel_target.label);
                this.cancel_target.negated = true;
            } else {
                logger.error("Expected a cancel target.");
            }
            this.s = FakeStep.FINISH_REPEAT_LOOP;

            // fall through
        }
        if (this.s == FakeStep.FINISH_REPEAT_LOOP) {
            logger.info("repeat check " + this.n_repeat);
            if (this.n_repeat > 1) {
                this.n_repeat--;
                logger.info("repeating, " + this.n_repeat);

                this.s = FakeStep.DO_EFFECT_GO;
                return false;
            }
            this.s = FakeStep.CHECK_IF_CAN;
            // if our prior action revealed 
            if (this.n_effect > 0) {
                let prior_atomic: AtomicEffect = this.effect.effects[this.n_effect - 1];
                if (prior_atomic?.see_security) {
                    this.game.Player1.search = undefined;
                    this.game.Player2.search = undefined;
                }
            }
            return false;
        }

        // we just here way from CHECK_IF_CAN;
        if (this.s == FakeStep.DONE) {

            let atomic = this.effect.effects[0]; // cleaning up searcher, it's always the first atomic 

            // is it really turn player??? I don't think so
            let p = this.game.get_turn_player();

            logger.info(this.rand + " DONE DONE DONE length is " + p.reveal.length);
            logger.info(this.rand + ` n_effect is ${this.n_effect} and length is ${this.effect.effects.length}`);
            // delete this next line
            logger.info(this.rand + " reveal length is " + p.reveal.length);


            logger.info(this.rand + "solideffectloop returning " + this.collected_events.length + " events " + this.collected_events.map(e => GameEvent[e.game_event]).join("/"));
            logger.info("1996, set last thing in collected_events");
            this.game.set_last_thing(this.collected_events.map(e => e.chosen_target));
            return this.collected_events;
        }
        console.error("SHOULD NOT BE HERE FO)R SOLID EFFECT");
        return false; // loop
    }
}

// the only reason to export this is because instance.run_constant_effects() needs to apply


// Fancy Log. Inside here is the place I see if we were cancelled.
// Inside here I can see if we fail for some other reason.
// Outisde herem we can see failure. 

export class XX {

    // the "target" here is redundant, it's pulled out of weirdo
    // TODO: verify this 
    static do_terminus_effect(depth: number, weirdo: SubEffect, target: any, game: Game,
        solid_starter?: SolidEffect): boolean {
        // let target = weirdo.chosen_target;

        let name = target ? target.get_name() : "";

        let p = weirdo.n_player!;
        let o_p = 3 - p;
        if (!p) {
            let aa: any = null; aa.player_not_set();
        }
        // chosen_target is an array, so why isn't this line crashing all the time?
        let s_target1 = (weirdo.chosen_target ? weirdo.chosen_target.get_name() : "nul");
        // ... oooohhh, I think I should've made multiple terminus effects instead of this array
        let s_target2 = (weirdo.chosen_target2?.[0]?.get_name() || "nul");
        logger.info("Terminus effect " + GameEvent[weirdo.game_event]);
        //console.dir(weirdo, { depth: 0 });
        logger.info("Target td is " + (weirdo.td ? weirdo.td.toString() : "nul") + " for '" + weirdo.td.raw_text + "'");
        logger.info("chosen target   is " + s_target1);
        logger.info("chosen target 2 is " + s_target2);
        logger.info("event is " + GameEvent[weirdo.game_event]);
        logger.info(`n is ${weirdo.n} and n_mod is ${weirdo.n_mod}`);
        /*
                logger.info(this.rand+"**TARGET 1**");
                logger.info(target);
                logger.info(this.rand+"**TARGET 2**");
        */
        /*       
                let target_i = target.get_instance && target.get_instance();
                if (!target_i && target.kind == "Instance") {
                    target_i = target;
                }
        
        */
        logger.info("DDDDDDDD " + GameEvent[weirdo.game_event] + " " + (target ? target.id : "missingtarget"));
        if (weirdo.negated) {
            logger.info("negated");
            //            game.fancy.add_string(depth, `P${weirdo.n_player} ${gerund(weirdo.game_event)} ${s_target1}, but negated`);
            game.log("Action of " + GameEvent[weirdo.game_event] + " " + name + " negated.");
            return false;
        }
        if (weirdo.game_event != GameEvent.NIL) {
            // game.fancy.add_string(depth, `P${weirdo.n_player} ${gerund(weirdo.game_event)} ${s_target1}`);
        }

        if (weirdo.game_event == GameEvent.DELETE) {
            game.log("Deleting " + name);
            // should do it in game, not player this.game.do_delete(this.chosen_target);

            // why do I say "effect" here???
            target.do_delete("effect"); // pass in my structure!
            // let player = target.me_player;
            //player.do_delete(this.chosen_target);if (weirdo.game_event == GameEvent.DELETE) {
        } else if (weirdo.game_event == GameEvent.FIELD_TO_HAND) {
            game.log("Returning " + name + " to hand");
            // should do it in game, not player this.game.do_delete(this.chosen_target);
            // why do I say "effect" here???
            target.do_bounce("effect"); // pass in my structure!
            // let player = target.me_player;
            //player.do_delete(this.chosen_target);
        } else if (weirdo.game_event == GameEvent.CREATE_PENDING_EFFECT) {
            game.log("Making pending effect");
            logger.info("pending for " + p);
            let player = game.get_n_player(p);
            let ts: TargetSource;
            if (false && "suspended" in weirdo.spec_source!) {
                ts = new SpecialInstance(weirdo.spec_source as Instance);
            } else {
                ts = new SpecialCard(weirdo.spec_source as CardLocation);
            }
            if (weirdo.delayed_phase_trigger) {
                const [n, ph] = game.get_expiration(weirdo.delayed_phase_trigger, player.player_num);
                // we need solid_source so we can look backwards for pronouns
                player.set_pending_effect(weirdo.delayed_effect!, n, ph, game, ts, false, solid_starter);
            } else {
                if (weirdo.delayed_interrupt) {
                    player.set_pending_effect(weirdo.delayed_effect!, game.n_turn, Phase.NUL,
                        game, ts, weirdo.delayed_interrupt, solid_starter);
                } else {
                    console.error("missing delayed interrupt");
                }
            }
            // we need to activate this as fast as possible; this is one 
            // case in which our tree structure falls short
            return true;
        } else if (weirdo.game_event == GameEvent.GIVE_STATUS_CONDITION) {
            logger.info("giving status condition?");
            if (weirdo.status_condition) {
                logger.info("we have a status condition");
                for (let s of weirdo.status_condition) {
                    if (s.exp_description) {
                        logger.info("we have an expiration");
                        // effect with built-in timeout
                        let fx = GameEvent[weirdo.status_condition[0].s.game_event];
                        if (weirdo.status_condition[0].s.game_event === GameEvent.DP_CHANGE) {
                            fx += ` (${get_mult(weirdo.status_condition[0].s)}?)`;
                        }
                        game.log(`Giving ${fx} to ${name}`);
                        // I think I need to calculate expiry here, because the
                        // condition time out is relative to the effect-doer.
                        [s.n, s.p] = game.get_expiration(s.exp_description, p!);
                    } else {
                        // constant effect (may be a timeout but not here)
                    }
                    logger.info("adding status condition: immune is " + s.exp_description);

                }

                // if we have a target, apply it, but it might be a blanket effect
                if (target && weirdo.td.conjunction != Conjunction.PLAYER) {
                    target.add_status_cond(weirdo); // .status_condition);
                } else {
                    // apply the status to the player, who then has responsibility
                    // for re-applying it where it's needed.
                    logger.info("PLAYER NOW " + Conjunction[weirdo.td.conjunction]);
                    logger.info(`op is ${o_p}`);
                    // giving a status condition to "all of" monsters 
                    if (weirdo.td.conjunction == Conjunction.PLAYER) {
                        if (true || weirdo.td.text?.match(/security/i)) {
                            // their monsters, or your monsters
                            let pid = weirdo.td.text?.match(/your/) ? p : o_p;
                            let player = game.get_n_player(pid);
                            game.get_n_player(pid).add_status_cond(weirdo);
                            // player.add_status_cond(weirdo);
                            logger.info(`PLAYER NOW HAS ${player.expiring_status_effects.length} effects`);
                        } else {
                            console.trace();
                            console.error("no player match");
                        }

                    }
                }

            } else {
                console.log("no status condition");
                console.error("MISSING STATUS!");
                console.dir(weirdo, { depth: 2 });
            }
        } else if (weirdo.game_event == GameEvent.SEARCH) {
            let pl = game.get_n_player(p);
            let s = pl.search;
            if (weirdo.n_mod === "your security") {
                pl.search = pl.security;
            }
            return true;
        } else if (weirdo.game_event == GameEvent.SHUFFLE) {
            let pl = game.get_n_player(p);
            pl.shuffle("security");
            return true;
        } else if (weirdo.game_event == GameEvent.DEVOLVE_FORCE) {
            game.log("Removing top card from " + name);
            return target.deevolve(1, { force: true });
        } else if (weirdo.game_event == GameEvent.REVEAL) {
            game.log(`Player ${weirdo.n_player} revealing ${weirdo.n}`);
            let ret = game.get_n_player(weirdo.n_player!).reveal_cards(weirdo.n!);
            return !!ret;
        } else if (weirdo.game_event == GameEvent.REVEAL_CLEAR) {
            let location = Location[weirdo.n!];
            game.log(`Player ${weirdo.n_player} sending reveal to ${location}`);
            let ret = game.get_n_player(weirdo.n_player!).put_reveal(weirdo.n!);
            return true; // how could this fail?
        } else if (weirdo.game_event == GameEvent.DRAW) {
            game.log(`Player ${weirdo.n_player} drawing ${weirdo.n}`);
            let ret = game.get_n_player(weirdo.n_player!).draw(weirdo.n);
            logger.info(`ret ${ret} for draw ${weirdo.n}`);
            return ret;
        } else if (weirdo.game_event == GameEvent.DEVOLVE) {
            game.log("Devolving " + name + " by " + weirdo.n);
            target.deevolve(weirdo.n!);
        } else if (weirdo.game_event == GameEvent.TRASH_FROM_FIELD) { // just 
            game.log("Trashing " + name);
            target.do_trash("...");
        } else if (weirdo.game_event == GameEvent.SUSPEND) {
            game.log("Suspending " + name);
            let ret = !target.suspended;
            target._suspend("effect"); // by event? are we sure?
            return ret; // did we pay
        } else if (weirdo.game_event == GameEvent.UNSUSPEND) {
            game.log("Unsuspending " + name);
            let ret = target.suspended;
            logger.info("ret will be " + ret);
            target.unsuspend("effect");
            return ret;
        } else if (weirdo.game_event == GameEvent.TRASH_FROM_HAND) {
            let cl: CardLocation = target;
            if (!("index" in cl)) {
                console.error("no crd location for trash from hand");
                return false;
            }
            // I'm making players responsible for trashing? Okay...
            game.log("Trashing " + cl.name + " from hand");
            let p = game.get_n_player(weirdo.n_player!);
            p.trash_card(cl);
        } else if (weirdo.game_event == GameEvent.TRASH_TO_HAND) {
            let cl: CardLocation = target;
            if (!("index" in cl)) {
                console.error("no crd location for trash to hand");
                return false;
            }
            // I'm making players responsible for untrashing? Okay...
            game.log("Returning  " + cl.name + " from trash to hand");
            let p = game.get_n_player(weirdo.n_player!);
            p.untrash_card(cl);
        } else if (weirdo.game_event == GameEvent.REVEAL_TO_HAND) {
            let cl: CardLocation = target;
            game.log("Putting  " + cl.name + " from reveal to hand");
            let p = game.get_n_player(weirdo.n_player!);
            p.untrash_card(cl);
        } else if (weirdo.game_event == GameEvent.TO_BOTTOM_DECK) {
            game.log("Bottom decking " + target.get_name());
            target.do_bottom_deck("effect"); // pass in my structure!
        } else if (weirdo.game_event == GameEvent.FIELD_TO_SECURITY) {
            game.log("Putting " + target.get_name() + " to security");
            target.do_move_to_security("effect"); // pass in my structure!
        } else if (weirdo.game_event == GameEvent.MUST_ATTACK) {
            // log handled elsewhere
        } else if (weirdo.game_event == GameEvent.MEMORY_SET) {
            // log handled elsewhere
            game.set_memory(weirdo.n!);
        } else if (weirdo.game_event == GameEvent.MEMORY_CHANGE) {
            logger.info("MEMORY CHANGE123");
            // log handled elsewhere
            if (game.turn_player == weirdo.n_player)
                game.change_memory(weirdo.n!);
            else
                game.change_memory(0 - weirdo.n!);


            // for  evolve, the target is the card, the source is the instance
            //... I change the target in here.
            // ... interruptive effects need to figure all this out
        } else if (weirdo.game_event == GameEvent.EVOLVE) {
            let player = game.get_n_player(p);
            let o_player = game.get_n_player(3 - p);
            //if (!("top" in weirdo.spec_source!)) return false; // make sure we're an instance
            let instance: Instance | CardLocation = weirdo.chosen_target2![0];
            logger.info("evolving, trying " + instance.get_field_name(Location.END));
            // are we evolving before checking cost! :( :(
            if (weirdo.chosen_target3) {
                logger.info("fusion");
                // didn't we set this by cause above?
                weirdo.cause = weirdo.cause | EventCause.DNA;
                let instance2: Instance | CardLocation = weirdo.chosen_target3;
                let c: Card = ("card" in target) ? target.card : target;
                logger.info("c is " + c.get_name());
                let fusioned = Instance.fusion(c, game, player, o_player);
                weirdo.chosen_target = fusioned;
                fusioned.set_label(undefined);
                player.field.push(fusioned);

                let bottom;
                for (let item of [instance, instance2]) {
                    if ("me_player" in item) { // instance
                        while (bottom = item.pile[item.pile.length - 1])
                            bottom.extract().move_to(Location.BATTLE, fusioned, "BOTTOM");
                        game._remove_instance(item.id);
                        item.do_removal("nul", "fusioned");
                    } else { // cardlocation
                        item.extract().move_to(Location.BATTLE, fusioned, "BOTTOM");
                    }
                }

            } else {
                // for normal evo, instance *must* be instance
                if (!("me_player" in instance)) return false;
                //console.error("legacy evolve cost?????");
                // I think this is the legacy play-from-hand
                // obsolete when can-evo-from-trash or stack
                // HAndle both a 'card' and 'cardlocation'
                // AFter a good night's sleep I need to figure out if I still need cardlocation
                let c: Card = ("card" in target) ? target.card : target;
                //let c: Card = target.card; // extract();
                instance.do_evolve(c);
                //                let played = Instance.play(c, game, player, o_player);
                //              player.field.push(played);
                weirdo.chosen_target = instance; // change target! we lose the card reference here
            }
            // something else sets the cost here... PLAY should operate the same way but doesn't
            let origcost: number = 0 + weirdo.n!;
            let [cost, msg] = get_modified_cost(origcost, weirdo, game, "evo");
            // TODO: check for memory failure; need a test case, though
            game.pay_memory(cost);
            game.log(`Evolve into ${instance.get_name()} ${msg}`); // no need to announce, we did that at start
            // todo: show the old name, including for fusion
            game.fancy.add_string(depth, `Evo into ${instance.get_name()}`);

            game.log("Draw for Evolve");
            player.draw();
            return true;

        } else if (weirdo.game_event == GameEvent.PLAY) {
            if (!p) {
                console.error("NO PLAYER FOR PLAY CARD");
                return false;
            }
            let player = game.get_n_player(p);
            let o_player = game.get_n_player(3 - p);
            logger.info("PPPP player " + player.player_num + " " + o_player.player_num);
            let c: Card;
            let played;
            //            console.error(target);
            if ("cardloc" in target) {
                //console.error("playing cardloc " + target.name);
                logger.info("playing from cardlocation");
                let cl: CardLocation = target;
                c = target.card;
                c.save_prior_location(cl);
                //c = cl.extract(); // we will extract within Instance.play()
                played = Instance.play(c, game, player, o_player);
                played.set_label(weirdo.play_label)
                player.field.push(played);
                weirdo.chosen_target = played; // this will be important for later
            } else if ("p_cost" in target) {
                //console.error("playing card    " + target.name);
                logger.info("playing from card");
                // is this the legacy play-from-hand? should be rolled into the above
                c = target;
                played = Instance.play(c, game, player, o_player);
                played.set_label(weirdo.play_label); // not implemented
                player.field.push(played);
                weirdo.chosen_target = played; // this will be important for later
            } else {
                logger.error("not a card!");
                return false;
            }
            let stack = player.stack;
            let top;
            // only if stack summoning, put all cards in stack under monster. this cheat will stop working if we ever play from reveal a stack summoner 
            while (top = stack[0]) {
                top.extract().move_to(Location.BATTLE, played, "BOTTOM");
                if (weirdo.n_mod != "free") {
                    weirdo.n_mod = "reduced";
                    weirdo.n ||= 0;
                    weirdo.n! += c.stack_summon_n;
                };
                logger.info(`nmod is ${weirdo.n_mod} and n is ${weirdo.n} per is ${c.stack_summon_n}`);
            }
            // if no play cost, can't play -- unless it's a token
            if (c.p_cost == undefined && !c.is_token()) { return false; }
            let origcost = Number(c.p_cost);

            let [cost, cost_msg] = get_modified_cost(origcost, weirdo, game, "play"); // modify_cost(origcost, weirdo);


            if (!game.can_pay_memory(cost)) {
                logger.warn("couldn't pay cost of " + cost);
                game.la("Cannot pay for summon! Card goes back to original location.");
                c.return_card();
                game._remove_instance(played.id);
                played.do_removal("bounce", "failed summon");
                return false;
            } else {
                game.la(`Play ${played.name()} ${cost_msg}`);
                game.fancy.add_string(depth, `Play ${played.name()}`);
                game.pay_memory(cost);
                return true;
            }
        } else if (weirdo.game_event == GameEvent.USE) {
            // we make an immediately pending effect, but don't start it yet,
            // because we need to finish our current thing. 
            let player = game.get_n_player(p);
            let o_player = game.get_n_player(3 - p);
            logger.info("USE in effectloop");

            // going back to player to get the effect
            let card: Card = target;
            // ugh, if I use by effect, it never made it into the OPTZONE.
            // what's the right solution here?
            let cl: CardLocation = target;
            if ("card" in card) {
                // done by effect
                card = cl.card; // extract???
            } else {
                cl = new CardLocation(game, p, Location.OPTZONE, 0);
            }

            let fx = player.get_option_effect(card, "MAIN");
            let origcost = Number(card.u_cost);
            fx.source = new SpecialCard(cl);

            let [cost, cost_msg] = get_modified_cost(origcost, weirdo, game, "use"); // modify_cost(origcost, weirdo);

            if (!game.can_pay_memory(cost)) {
                logger.warn("couldn't pay cost of " + cost);
                game.la("Cannot pay for use! Card goes back to where it started.");
                card.return_card();
                return false;
            } else {
                game.la(`Use ${card.name} ${cost_msg}`);
                game.fancy.add_string(depth, `Use ${card.name}`);
                player.set_pending_effect(fx, game.n_turn, Phase.ASAP, game, fx.source, false, solid_starter);
                game.pay_memory(cost);
                return true;
            }

        } else if (weirdo.game_event == GameEvent.STACK_ADD) {
            // Slide them into location.stack, and PLAY will grab them from there.
            // There's no instance yet.
            // This won't work when playing multiple things at once

            let cl: CardLocation = target;
            if ("kind" in target && target.kind == "Instance") {
                let i: Instance = target;
                let c = i.top();
                c.extract().move_to(Location.TEMPSTACK);
                //                while (c = i.top()) {
                //                  c.extract().move_to(Location.TRASH);
                //            }
                game._remove_instance(i.id);
                // like with fusioned, where does this "instance" go?
                i.do_removal("trash", "stacksummon");
                // theory: rename the GAME_EVENT here
            } else {
                cl.extract().move_to(Location.TEMPSTACK);
            }
            return true; // assume success
        } else if (weirdo.game_event == GameEvent.PLUG) {
            // move an instance under something, counts for removal
            let recipient: Instance = weirdo.chosen_target2![0];
            if (target.kind == "Instance") {
                let i: Instance = target;
                let c = i.top();
                if (!c) return false;
                c.extract().move_to(Location.BATTLE, recipient, "PLUG-BOTTOM");

                let top;
                while (top = i.pile[0])
                    top.extract().move_to(Location.TRASH);

                // like with .EVOLVE, we need the target to be the 
                // new monster
                weirdo.chosen_target = i;

                game._remove_instance(i.id);
                i.do_removal("nul", "plugged");

            } else {
                let c: CardLocation = target;
                c.extract().move_to(Location.BATTLE, recipient, "PLUG-BOTTOM");
            }
            let origcost: number = 0 + weirdo.n!;
            let [cost, msg] = get_modified_cost(origcost, weirdo, game, "link");
            game.pay_memory(cost);
            game.log(`Link ${target.get_name()} to ${recipient.get_name()} ${msg}`); // no need to announce, we did that at start
            return true;
        } else if (weirdo.game_event == GameEvent.TUCK) {
            // move an instance under something, counts for removal
            console.error("this is removal");
            // check ordering
            let recipient: Instance = weirdo.chosen_target2![0];
            let i: Instance = target;
            let c = i.top();



            if (!c) return false;
            c.extract().move_to(Location.BATTLE, recipient, "bottom");

            let top;
            while (top = i.pile[0])
                top.extract().move_to(Location.TRASH);

            game._remove_instance(i.id);
            i.do_removal("nul", "tucked");
            return true;


        } else if (weirdo.game_event == GameEvent.EVOSOURCE_ADD) {
            //            let p = weirdo.n_player!;
            let player = game.get_n_player(p!);
            //          let o_player = game.get_n_player(3 - p);
            //            if ("cardloc" in weirdo.

            if ("cardloc" in weirdo.spec_source!) {

                let cl: CardLocation = weirdo.spec_source!;
                let c: Card = cl.extract();
                let inst = target;
                game.la(`Moving ${c.get_name()} underneath ${inst.get_name()}`);
                c.move_to(Location.BATTLE, inst, "BOTTOM");
                return true;
            } else if ("pile" in weirdo.spec_source!) {
                // we are placing a card; assume this can't work with an instance on the field
                let c: Card = (weirdo.spec_source! as Instance).top().extract();
                // I thought I needed a cardlocation to do an extract()
                let inst = target;
                c.move_to(Location.BATTLE, inst, "BOTTOM");
            } else {
                console.error("FAILED TO PLACE");
                return false;
            }

            // nothing

        } else if (weirdo.game_event == GameEvent.PLACE_IN_FIELD) {
            //let p = weirdo.n_player!;
            let player = game.get_n_player(p!);
            let o_player = game.get_n_player(3 - p);
            let c: Card;
            if ("cardloc" in target) {
                let cl: CardLocation = target;
                c = cl.extract();
                game.log(`Placing ${c.get_name()} in battle area`);

                let placed = Instance.place(c, game, player, o_player);
                player.field.push(placed);
                weirdo.chosen_target = placed; // this will be important for later
            } else {
                console.error("FAILED TO PLACE");
            }

            // nothing
        } else if (weirdo.game_event == GameEvent.ATTACK_TARGET_SWITCH) {
            // this should do nothing if it got set by effect or something
            // (or maybe <block> should actually do the target switch here.... yeah, that, probably)
            if (!game.root_loop.combatloop) {
                game.log("Can't switch target, not in combat");
            } else if (!target) {
                // we didn't actually switch, something else set this 
            } else {
                let l: Loop = game.root_loop.combatloop;
                let cl: CombatLoop = (l as CombatLoop);
                if (target.id == Instance.PLAYER_ID) {
                    cl.original_n_target = 0;// "original" can change. What a country!
                    cl.defender_i = game.get_instance(0);
                } else {
                    cl.defender_i = target;
                }
            }
            // nothing
        } else if (weirdo.game_event == GameEvent.MODIFY_COST) {
            // nothing, we did this inside the interrupter loop 
        } else if (weirdo.game_event == GameEvent.EVOSOURCE_REMOVE) {
            // couldn't this be multiple?
            let cl: CardLocation = target;
            let c: Card = cl.extract();
            let to: Location = Location.TRASH;
            if (weirdo.td2?.raw_text?.includes("hand")) to = Location.HAND;
            if (weirdo.td2?.raw_text?.includes("security")) to = Location.SECURITY;
            game.log("moving source card " + c.name + " to " + Location[to]);
            c.move_to(to);
            return true;
        } else if (weirdo.game_event == GameEvent.EVOSOURCE_REMOVE_FROM) {
            let i: Instance = target;
            let count: number = Number(weirdo.n);
            for (count; count >= 0; count--) {
                //                i.strip_source(weirdo.n_mod);
            }
            return true; // always succeed??
        } else if (weirdo.game_event == GameEvent.EVOSOURCE_DOUBLE_REMOVE) {
            if (weirdo.chosen_target2)
                for (let cl of weirdo.chosen_target2) {
                    let c: Card = cl.extract();
                    let to: Location = Location.TRASH;
                    // we're already using td2 here for something else!
                    if (weirdo.td2?.raw_text?.includes("hand")) to = Location.HAND;
                    if (weirdo.td2?.raw_text?.includes("security")) to = Location.SECURITY;
                    game.log("moving source card " + c.name + " to " + Location[to]);
                    c.move_to(to);
                }
            return true;
        } else if (weirdo.game_event == GameEvent.TRASH_LINK) {
            let cl: CardLocation = target;
            let c: Card = cl.extract();
            let to: Location = Location.TRASH;
            if (weirdo.td2?.raw_text?.includes("hand")) to = Location.HAND;
            if (weirdo.td2?.raw_text?.includes("security")) to = Location.SECURITY;

            c.move_to(to);
            return true;
            // nothing, we did this inside the interrupter loop 
        } else if (weirdo.game_event == GameEvent.EVOSOURCE_MOVE) {
            // move from one instnace to another
            let cl: CardLocation = target;
            let c: Card = cl.extract();
            let to: Instance = weirdo.chosen_target2![0];
            console.error(2612, s_target1);
            console.error(2613, s_target2);
            c.move_to(Location.BATTLE, to, "bottom");
            return true;
            // nothing, we did this inside the interrupter loop 
        } else if (weirdo.game_event == GameEvent.HATCH) {
            // nothing, we did this inside the interrupter loop 
            let player = game.get_n_player(p!);
            if (player.can_hatch())
                return player.hatch(depth);
            game.log("cannot hatch");
            return false;

            // we might need different actions if the targeted_card_move is
            // an instnce, because that will trigger removal
        } else if (weirdo.game_event == GameEvent.TARGETED_CARD_MOVE) {
            // "target" is what we move -- and i think it can be either an instance or a cardloc, sometimes an OtherTarget
            // "target2" is where we move
            // TODO merge this in with MOVE_CARD below
            let target2: Instance = weirdo.chosen_target2 && weirdo.chosen_target2[0];
            let target_instance = undefined;
            let location = Location.SECURITY;
            logger.debug("adding?");
            if (target2 && target2.kind == "Instance") {
                location = target2.location; // not necessarily BATTLE
                target_instance = target2;
            }
            let mover: Card | undefined = undefined;
            let fup: boolean = false;
            let fdown: boolean = false;
            let order: string = "";
            order = weirdo.n_mod?.match(/bottom/i) ? "BOTTOM" : "TOP";
            fup = !! weirdo.n_mod?.match(/face.up/i);//? "UP" : "DOWN";
            fdown = !! weirdo.n_mod?.match(/face.down/i);//? "UP" : "DOWN";
            if (weirdo.td.raw_text.includes("deck")) {
                // what hell is this?

                let player = game.get_n_player(p);
                mover = player.deck.pop();
                if (!mover) {
                    game.log("No recovery, deck is empty.");
                    return false;
                }
                console.info(3130, mover);
            } else {
                if (weirdo.n_mod?.match(/deck/)) location = Location.DECK;
                if (weirdo.td2?.raw_text.match(/hand/i)) location = Location.HAND;

                // handle instance
                logger.info(`order ${order} n_mod ${weirdo.n_mod} face ${fup} ${fdown} target ${target.kind} ${target.get_name()}`);
                //console.error(3115, weirdo.td2?.raw_text, location);
                if (target.kind == "Instance") {
                    let i: Instance = target;
                    let c = i.top();
                    // we need something more generic to tell that our target isn't there any more
                    if (!c) return false;
                    let top;
                    while (top = i.pile[0])
                        top.extract().move_to(Location.TRASH);
                    game._remove_instance(i.id);
                    i.do_removal("nul", "removed");
                    mover = c.extract();

                } else {
                    let cl: CardLocation = target;
                    //console.error(2596, "moving cl to " + location, target_instance?.id, order);
                    mover = cl.extract();
                }
            }
            logger.info(`prepping to move ${mover.get_name()}`);
            mover.move_to(location, target_instance, order);
            if (fup) mover.face_up = true; // 
            if (fdown) mover.face_up = false; // 

            return true; // i guess it always works?
        } else if (weirdo.game_event == GameEvent.MOVE_CARD) {
            // success if *any* cards were moved, which will trigger our "when a card is X" effect
            // This logic is incorrect if there's ever a "move N cards. If you did (all N), X."
            let p_n = weirdo.td2?.raw_text.startsWith("your") ? p : 3 - p;
            logger.info(`p_n is ${p_n} and p is ${p}`);
            let player = game.get_n_player(p_n);
            let pile, dest = Location.NULLZONE;
            //            let from = "null";
            let n: number = weirdo.n!;
            let from: string = weirdo.td2?.raw_text || "";
            let to: string = weirdo.td.raw_text;
            logger.warn(`MOVE CARD ${n} FROM ${from} TO ${to} FOR PLAYER ${p_n}`);
            if (!n) {
                // this is special case for combat that shouldn't be a special case
                // also, nothing interrupts revealing a card from security
                return true;
            }
            if (from.includes("deck")) {
                pile = player.deck;
            } else if (from.includes("security")) {
                pile = player.security;
            } else {
                pile = player.nullzone;
                logger.error("MOVE_CARD missing source: " + weirdo.td2?.raw_text);
            }

            if (to.includes("trash")) {
                dest = Location.TRASH;
            } else if (to.includes("hand")) {
                dest = Location.HAND;
            } else if (to.includes("security")) {
                dest = Location.SECURITY;
            } else {
                dest = Location.SHADOWREALM;
                logger.error("MOVE_CARD missing dest: " + weirdo.td.raw_text);
            }
            let ret = false;
            logger.info(`source size ${pile.length} dest ${Location[dest]}`);
            for (let i = 0; i < n; i++) {
                game.log(`${i} of ${weirdo.n!}`);
                let c = (from.includes("bottom")) ? pile?.shift() : pile?.pop();
                if (!c) {
                    game.log("Couldn't get card from " + from);
                    return ret;
                }
                ret = true;
                c.move_to(dest);
                game.log(`Player ${p_n} moved ${c.name} from ${from} to ${to}`);
            }
            return ret;

        } else if (weirdo.game_event == GameEvent.CARD_REMOVE_FROM_HEALTH_OBSOLETE) {
            // "Remove from health" is assumed to be "sent from health to trash" but that's not really true
            // nothing if done by game rules, we did that in combat.ts
            // maybe it *should* be driven here, but nothing can interrupt card removal right now
            if (weirdo.cause == EventCause.GAME_FLOW) return true;


            let oppo = 3 - p!;
            let player = game.get_n_player(p);
            if (weirdo.td.raw_text == "opponent") {
                player = game.get_n_player(oppo);
            }
            let c = player.security.pop();
            if (c) {
                game.la(`Card trashed from player ${oppo}'s health: ${c.get_name()}`);
                c.move_to(Location.TRASH);
                return true;
            }
            game.la(`No card in player ${oppo}'s deck to trash`);
            return false;
        } else if (weirdo.game_event == GameEvent.ATTACK_DECLARE) {

            logger.info("target is " + target.name() + " " + target.id);
            logger.info("spec_source is " + weirdo.spec_source?.id);
            if (!("top" in weirdo.spec_source!)) return false; // make sure we're an instance
            let x = new CombatLoop(game, weirdo.spec_source!.id, target.id, game.get_n_player(p!));
            game.root_loop.add_combat_loop(x);
            logger.info("adding combat loop, it will run after effects are run");
            logger.info("gamestep is " + GameStep[game.gamestep]);
        } else if (weirdo.game_event == GameEvent.NIL) {
            logger.info("got nil");
            //console.dir(weirdo, { depth: 2 });
        } else if (weirdo.game_event == GameEvent.CANCEL) {
            // handled elsewhere
        } else if (weirdo.game_event == GameEvent.ACTIVATE) {
            // handled inside interrupter loop
        } else {
            console.error("UNIMPLEMENTED EFFECT " + GameEvent[weirdo.game_event]);;
        }
        return true;
    }
}


enum InterruptStep {
    LOOK_FOR_IMMUNE,
    PICK_EFFECT, // effect?
    DO_INTERRUPTER,
    SEL_LOOP,
    INTERRUPT_LOOP_END,
    DO_EFFECT_AT_LAST,
    END_LOOP, // useless
    FINISHED,

};

// Called from the ThingyLoop
// Also called from SolidEffectLoop,

// Handles immunity and interrupters, and most game events happen inside here.

// Calls ResolutionLoop (which will call SolidEffectLoop)

// Takes in list of (simultanous?) SubEffects.

// Returns list of things that happened.

export class SolidsToActivate {
    solids: SolidEffect[] = [];
    count: number = 0;
}

// (Most game events get done in here.)
export class InterrupterLoop {
    // The InterrupterLoop is used both 
    // 1. when we're going to fire an event, to let things interrupt and then do it
    // 2. for "active an effect" effects. 
    // For 1, this loop will find the interrupters themselves
    // For 2, we nee


    // these comments are obsolete

    /*    Interrupt Loop, takes list of [subeffects]
    0. ret = [subeffects-that-happened]
    1. See if any targets are immune.
    2. For anything left, do preflight.
    3. Interrupters trigger.
       players choose triggers in normal order.
       validate conditions, optional
       if a go, mark once-per-turn as done.
       pick targets.
       prepare [effect], possibly more than one (but probably not)
         ... now do this batch subroutine again, collecting any effects that happened..  ret.concat() the value.
       if [effect] wasn't cancelled by a child, do it, and cancel the parent. ret.concat(this effect)
    4. do the effects. (I hope nothing has gained immunity in here.) ret.concat everything.
    5. return ret;*/
    pre_effects_to_process: SubEffect[];
    effects_to_process: SubEffect[]
    collected_events: SubEffect[];
    interrupters?: SolidEffect[];
    game: Game;
    resolution_loop?: ResolutionLoop;
    s: InterruptStep;
    chooser?: EffectChooser;
    current?: SolidEffect;
    sel?: SolidEffectLoop;
    rand: string;
    depth: number;
    is_cost: boolean;
    sta?: SolidsToActivate; // for Activate
    solid_starter?: SolidEffect; // which solid started us
    // is_cost is there because we don't set pronouns for costs
    constructor(game: Game, effects: SubEffect[], depth: number,
        is_cost: boolean, sta?: SolidsToActivate, solid_starter?: SolidEffect) {
        this.collected_events = [];
        this.pre_effects_to_process = effects;
        this.game = game;
        this.effects_to_process = [];
        this.rand = random_id();
        this.depth = depth;
        this.is_cost = is_cost;
        this.sta = sta;
        this.solid_starter = solid_starter;
        logger.error("IL DEPTH IS " + depth);


        //TODO: check for immunity

        // here, see if any targets are immune

        for (let i = 0; i < effects.length; i++) {
            if (!effects[i].n_player
                //              || !effects[i].spec_source
            ) {
                logger.info(this.rand + "BOB");
                logger.info(effects[i].toString());
                let fred: any = null; fred.bob();

            }
        }
        logger.info(this.rand + "interrupter effects");
        // console.dir(effects, { depth: 1 }); // maybe 1 is too small, 2 shows card raw text
        logger.info(this.rand + "EEEEE doing interrupter loop with " + this.pre_effects_to_process.length + " effects " + this.pre_effects_to_process.map(x => GameEvent[x.game_event]).join());
        // do prelight for anything left
        this.s = InterruptStep.LOOK_FOR_IMMUNE;
    }
    effect_tree(): string[] {
        let ret: string[] = [];
        let fx: string[] = [];
        if (this.chooser)
            fx.push(...this.chooser.effects());
        if (this.current)
            fx.push(this.current.label);
        if (fx.length > 0)
            ret.push(`INT DEPTH ${this.depth} ${fx.join(", ")}`);
        //ret.push(`INT DEPTH ${this.depth} ${this.chooser?.effects().join("-")} and ${this.current?.label}`);
        //ret.push(`INT STEP ${InterruptStep[this.s]}` );
        if (this.resolution_loop) {
            //ret.push(`INT DESCEEND ${this.depth}`);
            ret.push(... this.resolution_loop.effect_tree());
        } else {
            //ret.push("INT no loop");
        }
        if (this.sel) {
            //ret.push(`INT DESCEEND ${this.depth}`);
            ret.push(... this.sel.effect_tree());
        } else {
            //ret.push("INT no loop");
        }
        return ret;
    }
    dump(full: boolean = true) {
        let ret = `RES: ${this.s} ${InterruptStep[this.s]}`;
        if (this.s == InterruptStep.SEL_LOOP) {
            ret += ` { ${this.resolution_loop?.dump(full)} } `;
        }
        return ret;
    }
    step(): false | SubEffect[] {

        if (this.s == InterruptStep.LOOK_FOR_IMMUNE) {

            for (let sub of this.pre_effects_to_process) {
                let txt = "tgt?";
                if (sub.chosen_target) {
                    logger.info(this.rand + "we have garget");
                    txt = "chosen_target exists. ";
                    if (sub.chosen_target.get_name) {
                        txt = sub.chosen_target.get_name() + " " + sub.chosen_target.id;
                        logger.info(txt);
                    }
                }
                let effect = GameEvent[sub.game_event];
                logger.info(effect + " " + txt);
                logger.info(sub.game_event.toString());
                // Because of old design decisions, the TARGET of a evolve
                // is the card, and the SPEC_SOURCE is the INSTANCE. Flip it here.
                let immune_test = (sub.game_event == GameEvent.EVOLVE) ? sub.spec_source : sub.chosen_target;


                // floodgate; our architecture doesn't let us check "except by tamers" easily
                // especially for things that can be multiple types
                //let floodgated = check_mem_floodgate();

                let cant_do = false;
                if (sub.game_event == GameEvent.MEMORY_CHANGE &&
                    sub.n! > 0 &&
                    !sub.spec_source?.is_tamer()) {
                    let o_p = 3 - sub.n_player!;
                    cant_do = this.game.get_n_player(o_p).has_mem_floodgate();
                }
                if (immune_test &&
                    immune_test.can_do) {
                    logger.info("testing immune for " + effect);
                    let x = (immune_test.can_do(sub));
                    cant_do = !x;
                }
                if (cant_do) {
                    this.game.fancy.add_string(this.depth, `P${sub.n_player} ${gerund(sub.game_event, sub.status_condition)} ${txt} but can't`);
                    this.game.log(txt + " tried but can't " + effect.toLowerCase());
                } else {
                    this.effects_to_process.push(sub);
                }
            }

            // set last thing here?
            let targets = this.effects_to_process.map(e => e.chosen_target).filter(e => !!e);
            // simultaneous effects always have the same source

            logger.info("setting last thing maybe with targets?");
            if (!this.is_cost && targets.length > 0) this.game.set_last_thing(targets);

            logger.debug(this.rand + "EEEEEE there are " + this.effects_to_process.length + " effects to find interrupters for");

            let interrupters = this.game.preflight_actions(this.effects_to_process);
            let first_effect = this.effects_to_process[0];
            if (first_effect && first_effect.game_event === GameEvent.ACTIVATE) {
                // console.log(this.sta);
                if (this.sta) {
                    logger.info('interrupting sta ' + this.sta.count);
                    // does this need to be a copy?
                    logger.info("this.sta.[0].cancels is " + this.sta.solids[0].cancels);
                    interrupters = [...this.sta?.solids]; // copy references, so when we delete then, they stay in sta.solids
                    interrupters.forEach(i => {
                        i.source = new SpecialCard(first_effect.spec_source as CardLocation);
                        i.interrupt_count = 0;
                        i.solid_starter = this.solid_starter;
                    });
                } else {
                    let a = this.game.Player1.get_pending_effect(Phase.ASAP, this.game.n_turn, false);
                    let b = this.game.Player2.get_pending_effect(Phase.ASAP, this.game.n_turn, false);
                    if (a.length + b.length > 0) {
                        logger.info("ASAP effects " + a.length + " " + b.length);
                        interrupters = [...a, ...b];
                        interrupters.forEach(i => {
                            i.source = new SpecialCard(first_effect.spec_source as CardLocation);
                        });

                    }
                }


            }


            logger.debug(this.rand + "EEEEEE we found " + interrupters.length + " effects wanting to interrupt");
            for (let i = interrupters.length - 1; i >= 0; i--) {
                if (!this.game.check_event(interrupters[i], false)) {
                    this.game.log("Immediate-type effect " + interrupters[i].label + " has already interrupted once");
                    interrupters.splice(i, 1);
                }
            }

            //this.game.announce("we have " + interrupters.length + " interrupters");

            if (interrupters.length == 0) {
                this.s = InterruptStep.DO_EFFECT_AT_LAST;
                return false;
            }
            this.game.log(`INT DEPTH ${this.depth}: There are ${interrupters.length} immediate-type effects that trigger: ${interrupters.map(x => x.label).join(", ")}`);
            this.chooser = new EffectChooser(this.game, interrupters, this.depth, "interrupter", this.sta && this.sta.count);

            this.s = InterruptStep.PICK_EFFECT;
            return false;
        }
        if (this.s == InterruptStep.PICK_EFFECT) {
            // this is being called, maybe for interruptive effects
            logger.warn("path a");
            let x = this.chooser!.get_next();
            if (x == false) { return false };
            if (x === true) {
                logger.info(this.rand + "CHOOSER done with all effects, I guess");
                this.s = InterruptStep.DO_EFFECT_AT_LAST;
                //                logger.info(this.rand + "return path a, collected_events length is " + this.collected_events.length);
                //return this.collected_events;
                return false;
            }
            this.current = x;
            // we shouldn't let them even get here. We shouldn't let the chooser even offer it any more
            if (!this.game.check_event(x, true)) {
                this.game.log("Immediate-type effect " + x.label + " has already interrupted once");
                this.current = undefined;
                return false;
            }

            this.game.fancy.update_effect(this.depth, this.current);
            logger.info(this.rand + "CHOOSER gave us an effect: " + x.toString());
            this.s = InterruptStep.DO_INTERRUPTER;
            // fall through
        }
        if (this.s == InterruptStep.DO_INTERRUPTER) {

            // validate conditions here
            // ask if optional (all interrupters are?)
            this.sel = new SolidEffectLoop(this.current!, this.game,
                this.effects_to_process!, "p", this.depth + 1);
            this.s = InterruptStep.SEL_LOOP;
            // fall through
        }
        if (this.s == InterruptStep.SEL_LOOP) {
            let x = this.sel?.step();
            if (!x) return false;
            this.collected_events.push(...x);
            this.s = InterruptStep.INTERRUPT_LOOP_END;
            // fall through
        }
        if (this.s == InterruptStep.INTERRUPT_LOOP_END) {
            if (this.chooser) {
                this.s = InterruptStep.PICK_EFFECT;
                return false;
            }
            this.s = InterruptStep.DO_EFFECT_AT_LAST;
            // fall through
        }
        if (this.s == InterruptStep.DO_EFFECT_AT_LAST) {

            logger.info(this.rand + "EEEEEE we have " + this.effects_to_process.length + " effects, were any canceled? " + this.effects_to_process.map(x => GameEvent[x.game_event]).join());

            // There are multiple CardLocations, as soon as we get rid of one, 
            // the references to the others will be lost.

            // A CardLocation shouldn't have an index. It should be "ST15-16 in my trash"
            // because there's no distinction there. ... No, it should, because cards in trash *are* distinguishable, one might have an [on delete]

            for (let se of this.effects_to_process!) {

                let target = se.chosen_target;
                logger.info(this.rand + "finally trying effect " + GameEvent[se.game_event]);;

                //          console.dir(se , { depth: 2});
                //               /             logger.info(111111);
                //                          logger.info(this);
                if (target) {
                    logger.info(this.rand + "this.target.id is " + target.id);
                    logger.info(this.rand + "this.target.get_name() is " + target.get_name());
                } else {
                    logger.info(this.rand + "unknown target, maybe player");
                }
                // we should have checked for immunity long ago, but 
                // it wouldn't hurt to test again here? Maybe?

                // there will eventually be targets that don't need to be on field, but
                // right now they all are.

                if (target && target.on_field && !target.on_field()) {
                    //console.dir(se);
                    // should this even be reported?
                    // Is this needed, don't we handle this in another place more generally now?
                    logger.info(this.rand + " not on field, well sometimes these things happen");
                    this.game.announce(`Target ${target.get_name()} no longer on field for effect ${GameEvent[se.game_event]}`);
                    // we aren't quitting this loop, though?
                }

                //                logger.info(this.rand+"hand is ");
                //              se.n
                let s_target = (target?.get_name()) || "";
                let paid = XX.do_terminus_effect(this.depth, se, target, this.game, this.solid_starter);
                if (se.game_event != GameEvent.NIL) {
                    this.game.fancy.add_string(this.depth, `P${se.n_player} ${paid ? "" : "NOT "}${gerund(se.game_event, se.status_condition)} ${s_target}`);
                } else {
                    logger.warn("nil game event");
                }


                // if we suspend/delete/whatever 3 things, only the 3rd is the last_thing
                if (paid) {
                    se.paid = true;
                    // marking last thing here means we can never group things
                    // also, we need to get the location after the effect
                    //                  this.game.set_last_thing([target]);
                }
                logger.info(`PAID IS ${paid} for ${GameEvent[se.game_event]}`);
                this.game.refresh_constant_effects(); // in how many places do I need to do this?
                this.game.ui_card_move();

                if (paid == false) {
                    this.game.la(GameEvent[se.game_event] + " didn't happen");
                } else {
                    this.collected_events.push(se);
                }
            }
            logger.info(this.rand + "IIII  I guess we're done?");
            this.s = InterruptStep.END_LOOP;
            // fall through
        }
        if (this.s == InterruptStep.END_LOOP) {
            // this is a useless step
            this.s = InterruptStep.FINISHED;
            // fall through 
        }

        if (this.s == InterruptStep.FINISHED) {
            logger.info(this.rand + "IIII why are you still here?");
            logger.info(this.rand + "return path b, collected_events length is " + this.collected_events.length);
            return this.collected_events;
        }
        console.error("missing case " + InterruptStep[this.s]);
        return false; // to get stuck

    }
}


// The DSEL was an early special case, but it should be removed entirely and the standard
// loop behaviors used.

// Entry point for stuff that happens from game play.
// Like combat deaths, change-of-target, unsuspending
// Will always be root?

// This technically returns subeffects for compatability
// reasons. They were unused until, maybe, rules checks.
export class DirectedSubEffectLoop {
    // TODO: rename thiese
    interrupter_loop: InterrupterLoop;
    resolution_loop?: ResolutionLoop;
    game: Game;
    rand: string;
    given_events: SubEffect[];
    what_happened: SubEffect[];
    depth: number;

    //    responder_loop: ResponderLoop;
    // I'm pretty sure the DESL depth is *always* zero
    constructor(g: Game, e: SubEffect[], depth: number) {
        this.interrupter_loop = new InterrupterLoop(g, e, depth, false); // depth, or depth+1??
        this.resolution_loop = undefined;
        this.given_events = e;
        this.game = g;
        this.rand = random_id();
        this.what_happened = [];
        this.depth = depth;

        logger.error("DSEL DEPTH IS " + depth);


        // assert each effect has a player
        for (let i = 0; i < e.length; i++) {
            let fred: any = null;
            if (!e[i].n_player) fred.no_player();
            if (!e[i].label) fred.label();
        }

        logger.info(this.rand + "DDDDDDDDDD e length " + e.length + " events: " + e.map(x => GameEvent[x.game_event]).join(", "));
    }
    effect_tree(): string[] {
        // show my effects, and those under me

        let missing_events = this.given_events.filter(x => !this.what_happened.includes(x));
        let ret: string[] = [];
        {
            let arr: string[] = [];
            arr.push(...missing_events.map(e => `PROCESSING:${e.label}`));
            arr.push(... this.what_happened.map(e => `DONE:${e.label}`));
            ret.push(`DSE DEPTH ${this.depth} ${arr.join(", ")}`);
        }
        //${this.interrupter_loop.effect_tree()} and ${this.resolution_loop.effect_tree()}`);
        if (this.resolution_loop) {
            ret.push(... this.resolution_loop.effect_tree())
        } else {
            //ret.push("DSEL RES ERROR " + this.depth);
        }
        //ret.push(`DSEL MID: ${this.depth} `);
        if (this.interrupter_loop) {
            ret.push(... this.interrupter_loop.effect_tree());
        } else {
            ret.push("DSEL INT ERROR " + this.depth);
        }
        //ret.push(`DSEL END: ${this.depth} `);

        return ret;
    }
    dump(): string {
        return this.resolution_loop ? " DSE:(2 " + this.resolution_loop.dump(false) + " )" :
            " DSE:(1 " + this.interrupter_loop.dump() + " )";
    }
    step(): false | SubEffect[] {

        if (!this.resolution_loop) {
            logger.info(this.rand + "DDDDDD  in interrupt loop");
            let x = this.interrupter_loop?.step();
            if (!x) {
                return false; // still doing
            }

            logger.info(this.rand + "temp x length is " + x.length);
            // do not react to stuff in egg zone
            for (let i = x.length - 1; i >= 0; i--) {
                if (x[i].chosen_target &&
                    x[i].chosen_target.in_eggzone &&
                    x[i].chosen_target.in_eggzone()) {
                    x.splice(i, 1);
                }
            }
            logger.info(this.rand + "DDDDDD in interrupt loop done, we got " + x.length + " events: " +
                x.map(x => GameEvent[x.game_event]).join(", "));
            // even if empty, fall through, maybe rule check happens, and we want 
            // to clear out interrupgtives
            this.what_happened = this.what_happened.concat(x);
            // 
            let rules = this.game.rules_process();
            logger.info("rules is " + rules);
            if (rules) {
                // If we have rule checks, we can just start this loop over
                // Because rules checks are simuleantous with previous event 
                this.interrupter_loop = new InterrupterLoop(this.game, rules, this.depth, false);
                this.resolution_loop = undefined;

                return false; // go back and try again
            }

            // take everything that just happened, and start a loop for everything that responds
            let res_loop = get_responder_loop(this.game, this.what_happened, this.depth);
            if (!res_loop) {
                logger.info(this.rand + "DDDD no responder loop");
                this.game.clear_reveal();
                return [];
            }
            this.resolution_loop = res_loop;
            // logger.info(this.rand+"DDDD in respond loop");
            // fall through
        }
        //   logger.info(this.rand+"DDDDD in respond loop");
        if (this.resolution_loop!.step()) {
            logger.info(this.rand + "DDDD done with respond loop");
            this.game.clear_reveal();
            return [];
        }
        return false;
    }

}



// returns another ResolutionLoop with 1 or more SolidEffects, or null.
export function get_responder_loop(g: Game, happened: SubEffect[], depth: number): ResolutionLoop | undefined {

    let _pea = g.posteffect_actions(happened);

    let pending1 = g.Player1.get_pending_effect(Phase.ASAP, g.n_turn, false);
    let pending2 = g.Player2.get_pending_effect(Phase.ASAP, g.n_turn, false);

    logger.info(`There are ${_pea.length} responders and ${pending1.length},${pending2.length} to ${happened.length} effects`);

    let pea = _pea.concat(pending1).concat(pending2);

    if (pea.length == 0) {
        return undefined;
    }
    let newdepth = depth + 1;
    g.log(`RES DEPTH ${newdepth}: There are ${pea.length} effects that trigger: ${pea.map(x => x.label).join(",")}`);
    g.fancy.update_triggers(newdepth, pea);
    let combat_resolution_loop = new
        ResolutionLoop(g, pea, newdepth, happened);
    // why is this called a "combat_resolution_loop"?
    return combat_resolution_loop;
}



function get_modified_cost(origcost: number, weirdo: SubEffect, game: Game, type: "play" | "evo" | "use" | "link"): [number, string] {
    let delta = 0;
    logger.info(`origcost ${origcost}`);
    let for_free = weirdo.n_mod?.includes("free");
    let floodgated = false;
    let me = game.get_n_player(weirdo.n_player!);

    if (for_free) {
        // set by original effect. Can interrupters set the cost to free?
        // If not, we could return right here.
        origcost = 0;
    }
    if (weirdo.n_mod == "reduced") {
        floodgated = check_reduction_floodgate(type, me);
        delta -= weirdo.n!;
        logger.info("delta now " + delta);
    }
    if (weirdo.cost_change) {
        for (let submod of weirdo.cost_change) {
            logger.info("submod: " + submod.n_mod + " " + submod.n);
            if (submod.n_mod == "reduced")
                floodgated = check_reduction_floodgate(type, me);
            delta -= submod.n;
        }
    }
    logger.info(`origcost ${origcost} xxx`);
    let newcost: number = origcost;
    let msg: string;
    if (!for_free) {
        if (!floodgated) newcost += delta;
        if (newcost < 0) newcost = 0;
        msg = `for cost ${newcost}`;
        if (delta) {
            if (floodgated)
                msg += ` [modification of ${delta} prevented]`;
            else
                msg += ` [modified from ${origcost} by ${delta}]`;
        }
    } else {
        msg = `for no cost`;
        if (delta != 0) msg += ` [modification of ${delta} ignored]`;
    }
    logger.info(`newcost is ${newcost} delta ${delta}`);
    return [newcost, msg];
}

function check_reduction_floodgate(type: "play" | "evo" | "use" | "link", me: Player): boolean {
    if (me.other_player.has_reduction_floodgate(type, false)) return true;
    if (me.has_reduction_floodgate(type, true)) return true;
    return false;
}