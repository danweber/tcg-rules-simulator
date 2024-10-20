import { SolidEffect, AtomicEffect, SubEffect } from './effect';
import { EventCause, GameEvent } from './event';
import { Game } from './game';
import { Card, CardLocation } from './card';
import { Location } from './location';
import { Instance } from './instance';
import { GameStep } from './phase';
import { ALL_OF, Conjunction, SpecialCard, SpecialInstance, SubTargetDesc, TargetDesc, TargetSource } from './target';
import { CombatLoop } from './combat';
import { Player } from './player';
import { v4 as uuidv4 } from 'uuid';

import _, { lte } from 'lodash';

function random_id() {
    return 'abc';
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

function can_pay(eff: AtomicEffect, game: Game, source: TargetSource): boolean {
    logger.error("can pay cost for " + eff.raw_text);
    logger.info("can we pay this cost?");
    // just see if we can do the first weirdo
    logger.error("there are " + eff.events.length + " events");

    for (let i = 0; i < eff.events.length; i++) {
        logger.error("ge is " + GameEvent[eff.events[i].game_event]);
    }

    for (let i = 0; i < 1 /*eff.events.length*/; i++) {
        // easiest case: suspend this instance
        let w = eff.events[i];
        logger.info("w.ge is " + GameEvent[w.game_event]);
        logger.info("target is " + w.td.raw_text);
        if (true || w.td.raw_text == "self" || w.td.raw_text == "this Monster") {
            if (!source) {
                let a: any = null; a.crash_no_source();
            }
            let tgts = game.find_target(w.td, w.game_event, source);
            // there must be some target for each event
            logger.error(`there are ${tgts.length} targets for the event`);
            let legit_target = false;
            // tgt: CardLocation | Instance;
            for (let tgt of tgts) {
                if ("can_do" in tgt) {
                    let can = tgt.can_do(w);
                    logger.error("can_do for tgt is " + can);
                    if (can) {
                        legit_target = true;
                        break;
                    }
                } else {
                    logger.error("cardloc, we can always do");
                    // we have at least card, so that counts. Is there anything that ever says "you can't discard"?
                    legit_target = true;
                    break;
                }
            }
            if (!legit_target) {
                logger.error("BREAKING, CAN'T PAY");
                return false;
            } else {
                logger.error("found a legit target, this event passes");
            }
        }
    }
    return true;
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
    // if "reacted_to' is set, it's because 'effects' are interrupters,
    constructor(g: Game,
        effects: SolidEffect[],
        depth: number,
        reacted_to: SubEffect[] = [],  // -- if exists, mark as negated when hit
        parent: string = "") {

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
            let x = this.chooser.get_next();
            if (x == false) { return false };
            if (x == true) {
                console.error("how did we get here?2");
                return this.collected_events;
            }
            this.current = x;
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
            this.game.announce(p + "Done processing " + label);


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
                this.collected_events.length = 0;
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
    CHECK_IF_CAN1,
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
    ASSIGN_TARGET_SUBS,

    PRE_DO_EFFECT, // increment target_count,  loopback if needed,
    // and then increment weirdo_count, loop bacl if needed

    DO_EFFECT_GO, // and ask_cancel

    DO_EFFECT_LOOP,
    //    ASK_CANCEL,
    GET_CANCEL,
    DONE, // shouldn't be in here

}

export class SolidEffectLoop {
    effect: SolidEffect;
    n_effect: number;
    game: Game;
    s: FakeStep;

    evolve_choices: any;
    attack_targets?: (Instance | Player)[];
    attack_target?: Instance | Player;

    potential_targets?: Instance[] | CardLocation[]; //  | Player;
    chosen_targets?: (Instance | CardLocation)[];   // it should be Instance[] | CardLocation[];

    parent: string;
    reacted_to: SubEffect[];
    cancellable?: SubEffect[]; // which 
    cancel_target?: SubEffect;
    collected_events: SubEffect[]; // what we actually did
    events_to_do: SubEffect[]; // these will go into terminus
    interrupter_loop?: InterrupterLoop;
    n_effects_tried?: number;
    rand: string;
    weirdo_count: number;
    target_count: number = 0;
    depth: number;
    attacker?: Instance;

    // We might have *three* nested iterators.
    // First, n_effect. We go through each AtomicEffect one by one.
    // Second, weirdo_count. We go through each SubEffect of an AtomicEffect.
    // Third, target_count. We are hard-coded to only 2 but in theory could have an array.

    constructor(se: SolidEffect, g: Game,
        reacted_to: SubEffect[],
        parent: string, // recheck this
        depth: number) {
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
                this.interrupter_loop = new InterrupterLoop(this.game, this.events_to_do, this.depth); // +1 or no?
                this.s = FakeStep.DO_EFFECT_LOOP;
                return false; // do I need to return false? Can't I just fall through?

            }
            if (source.is_instance()) {



                let resp = "nil";
                if (this.effect.respond_to) resp = this.effect.respond_to.map(x => GameEvent[x.ge]).join(",");

                // we are processing now
                logger.info(this.rand + "INSTANCE SOURCE IS AT " + Location[source.location()]);
                logger.info(this.rand + " INSTANCE IS NAMED " + source.get_instance().get_name());
                logger.info(this.rand + " this.effect is " + this.effect);
                logger.info(this.rand + " this.effect.effects[0] is " + this.effect.effects[0]);
                logger.info(this.rand + " this.this.effects[0].weirdop is " + this.effect.effects[0].weirdo);
                logger.info(GameEvent[this.effect.effects[0].weirdo.game_event] + " respond to " + resp);

                logger.info(this.rand +
                    ` INSTANCE SOURCE current Location ${Location[source.location()]} original location is ${Location[this.effect.trigger_location!]} ` +
                    // I can't imagine how original ID and current ID could ever be different but maybe I'm dumb
                    ` original trigger id ${this.effect.trigger_instance_id} now id is ${source.id()} ` +
                    // when an instance gets sent to the trash, it lives there forever. 
                    // what we care about with [on deletion] is that the top card is stil there
                    // The instance has a reference to its top card, and we can check its current location, right?
                    // Even if it goes to deck or hand, we'll at least have it be undefined
                    ` original top card card_instance_id is ${this.effect.trigger_top_card_location_id} ` +
                    ` and current is ${source.get_instance().top().card_instance_id}` +
                    ` and location of old-top-card is now ${Location[source.get_instance().top().get_location()]} `
                );

                // if a card activated in the trash but the top card is no longer in the trash, it doesn't work
                // TODO: any effects that activate on field but are now gone, but I don't think ST15-16 had any
                // well, Piercing I guess, if I implemented it properly instead of cheating


                // INSTANCE SOURCE current Location TRASH original location is TRASH 
                //original trigger id 2 now id is 2
                // original top card card_instance_id is 32  and current is 32 
                //  and location of old-top-card is now FIELD

                if (!this.effect.rules && this.effect.trigger_location != source.get_instance().top().get_location()) {
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
                if (!can_activate(this.effect)) {
                    this.game.log("Cannot activate");
                    this.s = FakeStep.DONE;
                    return false;
                } else {
                    logger.info("we passed");
                }
            }


            this.s = FakeStep.CHECK_IF_CAN1;
            // gall through
        }


        if (this.s == FakeStep.CHECK_IF_CAN1) {
            // Does "immunity" go here? I don't think so,
            // I think that's part of the 5-step.
            // But "can't activate effects would" go here.
            // This would be where we check for Venusmon.

            // ... If we can't suspend, that's okay for here,
            // we will fail at a later step. 


            this.n_effect += 1;
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




            logger.info(this.rand + "ATOMIC LENGTH2 IS " + eff.events.length +
                eff.events.map(x => GameEvent[x.game_event]).join(","));
            logger.info(this.rand + "ATOMIC WEIRDO IS " + GameEvent[eff.weirdo.game_event]);

            logger.info(this.rand + "atomic effect is ");
            logger.info(eff.toString());

            if (eff.is_cost) {
                if (!can_pay(eff, this.game, this.effect.source)) {
                    logger.info("ending event");
                    this.s = FakeStep.DONE;
                    return false;
                }
            }

            if (this.n_effect > 0) {
                let prior = this.effect.effects[this.n_effect - 1];
                if (prior.is_cost) {
                    logger.info(this.rand + "prior atomic had a cost");
                    if (prior.cost_paid == 0) {
                        this.game.log(`Cost not paid, rest of effect ${this.effect.label} ends.`);
                        this.s = FakeStep.CHECK_IF_CAN1;
                        console.error("go to DONE??");
                        return false;
                    }
                }
            }

            let test = eff.test_condition;

            if (test && !test.empty()) {
                logger.info(this.rand + "TEST IS " + test.toString());
                this.game.log(`Checking for condition: ${test.raw_text}`);
                // If we can find a target, we can continue

                // this checks for field conditions, but absolutely could
                // include checking for stuff in trash. 
                let t = test.test(this.game, this.effect.source!);
                //                    this.game.get_n_player( this.effect.n_player ) );    
                //                    this.effect.n_player ); 
                if (t.length == 0) {
                    this.game.log("Condition fails, see if there's another atomic effect.");
                    this.s = FakeStep.CHECK_IF_CAN1;
                    return false;
                }
                console.error("setting last this in test condition");
                this.game.set_last_thing(t);
                // target for test might not be a single mon!
                this.game.log(`Test success: ${t[0].get_name()}`);
            }
            let special_test = eff.can_activate;
            if (special_test) {
                logger.info("SPECIAL TEST AT ATOMIC LEVEL");
                // TODO: get the raw_text for this test
                if (!special_test(this.effect)) {
                    this.game.log("Conditional test for effect fails.");
                    this.s = FakeStep.CHECK_IF_CAN1;
                    return false;
                }
            }

            this.s = FakeStep.ASK_ACTIVATE_ACTUALLY;
            // fall through
        }

        if (this.s == FakeStep.ASK_ACTIVATE_ACTUALLY) {
            let atomic_effect = this.effect.effects[this.n_effect];
            let p = this.parent;
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
            if (atomic_effect.optional || atomic_effect.is_cost) {

                let backup = this.effect.source!.get_n_player();

                let p = atomic_effect.weirdo.n_player;
                if (p !== 1 && p !== 2) {
                    console.log(`p was ${p} using backup of ${backup}`);
                    p = backup;
                }
                let text = this.effect.label;
                if (w.label) {
                    text += ` for ${w.label}`;
                    logger.info(text);
                }
                this.game.log(`Asking player ${p} if they want to activate ${text}`);
                this.game.announce(`Do you wish to activate ${text}? `, p);
                let answers = [{ command: "1", text: `Activate ${text}`, ver: uuidv4() },
                { command: "2", text: "Don't pay/activate", ver: uuidv4() }
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
                this.game.la("Player declined to activate");
                //               this.game.announce("declining to activate, this loop ends");
                this.s = FakeStep.CHECK_IF_CAN1;
                this.effect.effects[this.n_effect].cost_paid = 0;
                return false;
            }

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
                this.effect.n_last_used_turn = this.game.n_turn;
            }


            // special case for searchers. I bet ultimately this should be 
            // a string of atomic effects but see if this works
            let atomic = this.effect.effects[this.n_effect];
            if (atomic.search_n) {

                let backup = this.effect.source!.get_n_player();
                this.game.la(`Revealing ${atomic.search_n} cards`);
                this.game.get_n_player(backup).reveal_cards(atomic.search_n);

            }



            this.s = FakeStep.ASK_RESPONDING_TO;
            // fall through
        }
        if (this.s == FakeStep.ASK_RESPONDING_TO) {
            if (!this.effect.interrupt) {
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
                logger.info(rx.toString());
            }
            let trigger = this.effect.interrupt;

            // debug

            logger.info(this.rand + "WHAT TRIGGERED US?  " + GameEvent[trigger.ge]);
            for (let i = 0; i < this.reacted_to.length; i++) {
                logger.info(this.rand + `${i} reacted_to ${GameEvent[this.reacted_to[i].game_event]} `);
                logger.info(this.rand + "     trigger " + trigger.td.toString());
                logger.info(this.rand + "     source id " + this.effect.source.id());
                logger.info(this.rand + `     chosen ${this.reacted_to[i].chosen_target.id} `);
            }

            this.cancellable = this.reacted_to.filter((x) =>
                (x.game_event == trigger.ge) && // events line up
                (trigger.td.matches(x.chosen_target, this.effect.source)));
            logger.info(this.rand + "LENGTH OF CANCELABLE IS " + this.cancellable.length);

            if (this.cancellable.length == 0) {
                console.error("This is broken!");
                this.s = FakeStep.ASK_UPTO;
                return false;
            } else if (this.cancellable.length == 1) {
                this.cancel_target = this.cancellable[0];
                if (this.effect.cancels) {
                    this.game.la("Only one event to interrupt:" + GameEvent[this.cancellable[0].game_event] +
                        " " + this.cancellable[0].chosen_target.id);
                }
                this.s = FakeStep.ASK_UPTO;
                return false;
            }
            this.game.la("Multiple possible effects to target");
            let answers = [];
            for (let i = 0; i < this.cancellable.length; i++) {
                answers.push({ command: (i + 1).toString(), text: "Target effect " + this.cancellable[i].label + " " + this.cancellable[i].game_event, ver: uuidv4() });
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
            if (w.n_mod == "upto" && w.n_max! > 1) {
                console.log("n mod upto");
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

            let p = mon ? mon.n_me_player : -1;
            let m;
            if (m = w.n_mod?.match(/counter,td2,(\d+)/)) {
                logger.info("modifying n in target");
                logger.info(w.td.targets[0].toString());
                logger.info(w.td.targets[1].toString());
                // game_event isn't really right
                let count = this.game.find_target(w.td2!, w.game_event, this.effect.source).length;
                let per = parseInt(m[1]);
                let mod = count * per;
                logger.info(`count ${count} per ${per} mod ${mod}`);
                let stgt = w.td.targets[1] as SubTargetDesc;
                stgt.n += mod;
                logger.info("now is " + stgt.n);
                // does this change it for future events, too? 
            }

            logger.info(this.rand + "TARGETDESC FOR EFFECT IS " + (w.td ? w.td.toString() : 'nul'));
            logger.info(this.rand + "is a cancelling solid effect is " + this.effect.cancels);
            if (true) {
                if (this.reacted_to.length > 0) {
                    // there are two tests now.
                    logger.info(this.rand + "Targets must also match against reacted_to, length " + this.reacted_to.length);

                    for (let subby of this.reacted_to) {

                        // the solid effect
                        if (!subby.chosen_target) {
                            console.error("no chosen target");
                            continue;
                        }

                    }
                }
            }

            if (w.n_mod == "previous sub") {
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
            if (w.td && w.td.conjunction == Conjunction.SOURCE) {
                logger.info(this.rand + "RETALIATION SPECIAL CASE");
                logger.info(w.toString());
                this.potential_targets = [w.chosen_target];
                logger.info(this.potential_targets.toString());
            } else {
                // TODO DONT CHECK IS w.td is DUMMY
                // I don't check for immunity here. 
                // If there's a "cannot be targeted" effect, it would
                // trigger here. We *can* target things that are immune to us.
                logger.info(this.rand + "Searching for targerts for " + GameEvent[w.game_event] + " in " + w.td.raw_text);


                // There is some dupe code here, but for this
                // special case I think it's opkay.

                if (w.game_event == GameEvent.EVOLVE) {
                    // get targets tfor EVOLVE BY EFFECT
                    // the target is the card
                    // TODO: use "w.td2" to narrow the thing that evolves

                    //                HAND/SECURITY card-in-place index, instance, cost
                    let evo_targets: [Location, number, number, number][] = [];

                    let player = this.game.get_n_player(p);
                    // just let anything in their hand evolve
                    // I iterate over my cards in hand and see what they can evo into
                    // This is kind of backwards for the <Alliance> evo bonus.

                    let answers = [];
                    //                    let cards: CardLocation[] = player.hand;
                    let cards: CardLocation[] = <CardLocation[]>this.game.find_target(w.td, w.game_event, this.effect.source!, Location.HAND);
                    // I use "DELETE" so I get back instances... that's hacky
                    let instances: Instance[] = <Instance[]>this.game.find_target(w.td2!, GameEvent.DELETE, this.effect.source!, Location.FIELD);
                    let inst_ids = instances.map(x => x.id);
                    //                   let cards = this.game.find_all(

                    // cl 
                    for (let cl of cards) {
                        //  logger.info(`length is ${i} of ${cards.length}`);
                        logger.info("cl is " + cl.card_id);
                        logger.info("card is " + cl.card.id);
                        let _evo: [number, number][] | false;
                        let cost = cl.card.e_cost;
                        if (w.n_mod?.includes("ignore requirements")) {
                            // we could move the "ignore" into can_evolve()...
                            _evo = player.field.map(i => [i.id, cost!]);
                        } else {
                            _evo = player.can_evolve(cl.card);
                        }
                        if (_evo)
                            // we have an array of [hand-index, cost] pairs 
                            // filter here, TODO filter above in can_evolve? maybe?
                            for (let [target, cost] of _evo) {
                                if (!inst_ids.includes(target)) continue;
                                // this us suped from player.get_x_plays()
                                let l: Location = cl.location;
                                let ls: string = Location[l];
                                evo_targets.push([l, cl.index, target, cost]);
                                let str = `Lv.${cl.card.get_level()} ${cl.card.get_name()}`;
                                if (l != Location.HAND)
                                    str += ` from ${Location[l]}`;
                                let v = `Evolve ${str} onto ${player.get_instance(target).get_name()} (${cost})`;
                                answers.push({
                                    command: `${l}-${cl.index}-${target}-${cost}`,
                                    text: v,
                                    ver: uuidv4()
                                });
                            }
                    }

                    // when we ask the user and there's only 1 choice, the UI gets stuck
                    if (answers.length == 1) {
                        // duped from ASK_TARGET1
                        this.s = FakeStep.DO_EFFECT_GO;
                        let blobs = answers[0].command.split("-");
                        let [_location, i, target, cost] = blobs;
                        let location: number = parseInt(_location);
                        w.chosen_target2 = this.game.get_instance(parseInt(target));
                        let cl = new CardLocation(this.game, p, location, parseInt(i));
                        this.chosen_targets = [cl];
                        //                weirdo.chosen_target = cl;    
                        w.n = parseInt(cost);
                        this.s = FakeStep.ASSIGN_TARGET_SUBS;
                        return false;
                    }


                    // By only asking the user when there's a choice, I'm leaking info
                    let msg = "Choose evolve";
                    this.game.wait(p, answers, msg, 1);
                    logger.info("waiting for evo targets somehow?");
                    this.evolve_choices = evo_targets;

                    this.s = FakeStep.GET_TARGET;
                    return false;



                }


                // there's parallel logic here for must_attack, but is it needed?

                if (w.game_event == GameEvent.MUST_ATTACK) {

                    if (this.game.root_loop.combatloop) {
                        this.game.la(`${mon.name()} wants to start attack, but another attack already in progress.`);
                        this.s = FakeStep.CHECK_IF_CAN1; // back to top
                        return false;
                    }

                    let attackers: Instance[] | undefined = w.td2 && this.game.find_target(w.td2, w.game_event, this.effect.source!) as Instance[];
                    // assume just 1 attacker for Minimum Viable Product
                    if (!attackers || attackers.length == 0) {
                        this.game.log(`No attackers available.`);
                        this.s = FakeStep.CHECK_IF_CAN1; // back to top
                        return false;
                    }
                    // 
                    let player = attackers[0].me_player;
                    let [attack_array, _] = player.get_attacker_array(attackers, w.td, w.n_mod);
                    if (attack_array.length == 0) {
                        this.game.la(`No attacks possible.`);
                        this.s = FakeStep.CHECK_IF_CAN1; // back to top
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
                    answers.push(...attack_array);
                    this.game.log(`Attack choices are: ${answers.map(a => a.text).join()}`);
                    let msg = "Choose attack:";
                    this.game.wait(p, answers, msg, 1);
                    this.s = FakeStep.GET_TARGET;
                    return false;
                } else if (atomic.search_multitarget && atomic.search_multitarget.targets.length > 1) {

                    logger.debug("LEFT TO STRING " + atomic.search_multitarget.targets[0].toString());
                    logger.debug("RIGHT TO STRING " + atomic.search_multitarget.targets[1].toString());

                    // find all the matches on the left, then all the 
                    let a = this.game.find_target(atomic.search_multitarget.targets[0], w.game_event, this.effect.source!);
                    let b = this.game.find_target(atomic.search_multitarget.targets[1], w.game_event, this.effect.source!);
                    let c = <CardLocation[]>a.concat(<CardLocation[]>b);
                    //console.log(a.map(x => ` A ${x.name}-${x.id}`).join(","))
                    this.potential_targets = c;
                    logger.info("potential targets is " + this.potential_targets.map(x => `${x.get_name()}-${x.id}`).join(","))
                    logger.info(this.rand + "done 3");

                    // this.potential_targets = a.concat(b);

                } else {
                    this.potential_targets = w.td && this.game.find_target(w.td, w.game_event, this.effect.source!);
                    if (w.game_event == GameEvent.PLAY && w.td.raw_text.match(/token/i)) this.potential_targets.length = w.choose!;
                    logger.info("length is " + this.potential_targets.length);
                    logger.info("potential targets " + GameEvent[w.game_event] + " is " + this.potential_targets.map(x => `${x.get_name()}-${x.id}`).join(","))
                    logger.info(this.rand + "done 2");
                }

            }

            // if w.choose == 0, there is no target. It's like "gain memory" or "draw"

            // if w.choose == 1, we pick exactly one -- even if it is explicitly just one specific target.
            // we need to distinguish "choose a target" from "suspend this thing" for UI simplicity

            // that's all we need for now. We will need "choose 2" or "up to 3" or "all"

            if (w.choose == 0) {
                logger.info(this.rand + "choose is 0, no targets needed");

                let dupe2: SubEffect = Object.assign(w);
                this.events_to_do.push(dupe2);

                this.s = FakeStep.PRE_DO_EFFECT;

                return false;
            }

            // we will need targets now
            if (!this.potential_targets || this.potential_targets.length == 0) {
                this.game.la("There were no valid targets.");
                logger.info(this.rand + "no targets :< ");
                this.effect.effects[this.n_effect].cost_paid = 0;
                this.s = FakeStep.CHECK_IF_CAN1; // back to top
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
            if (is_cost != this.effect.effects[this.n_effect].is_cost) {
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
        if (this.s == FakeStep.ASK_TARGET1) {

            let w = this.effect.effects[this.n_effect].events[this.weirdo_count];

            //            let w = this.effect.effects[this.n_effect].events[this.weirdo_count];
            //            let w = this.effect.effects[this.n_effect].weirdo;


            // Where do I assign the source of an effect? 
            let backup = this.effect.source!.get_n_player();

            //          this.game.announce("choose is " + w.choose);
            if (!this.potential_targets) return false; // should never happen
            // this used to say w.choose but with what we've got now you always choose.
            if (this.potential_targets.length == 0) {
                this.game.la("There are no targets.");
                // didn't we already check this above?
                this.s = FakeStep.CHECK_IF_CAN1; // yeah, didn't we check this already?
                return false;
            }
            logger.debug(`tgts ${this.potential_targets.length} ${w.choose} ${w.n_mod}`);
            if (this.potential_targets.length > 1 && !w.choose) {
                // I'd like to assert that every thing with a single target
                // set w.choose but there are too many exceptions
                console.error(w.choose);
                console.error(this.potential_targets.length);
                console.error(this.potential_targets);
                let a: any = null; a.choose_undefined();
            }
            if (w.choose == ALL_OF) { w.n_mod = ""; }
            // need at least 1 choice to be in here
            if (this.potential_targets.length > 1 && (this.potential_targets.length > (w.choose ? w.choose : 1) || w.n_mod?.includes("upto"))) {
                let answers = [];
                // I need a library for this

                for (let i = 0; i < this.potential_targets.length; i++) {
                    let t = this.potential_targets[i];
                    let txt = `Target ${t.get_name()} ${t.id}`;
                    if (w.n_mod == "upto total") txt += ` ${t.dp()} DP`;
                    // what uses this comand path?
                    answers.push({ command: (i + 1).toString(), text: txt });
                }


                let p = w.n_player;
                if (!p || p < 1 || p > 3) {
                    p = backup;
                }
                let secret = false;
                if ([GameEvent.TRASH_FROM_HAND,
                GameEvent.PLAY,
                    // why would trash_to_hand or reveal_to_hand be secret?
                    //    GameEvent.TRASH_TO_HAND,
                    //  GameEvent.REVEAL_TO_HAND
                ].includes(w.game_event)) {
                    secret = true;
                }
                let msg1 = "Targets are: " + this.potential_targets.map(x => x.get_name()).join(",") +
                    "\n" + `Player ${p} to choose ${w.choose}`;

                if (!secret) {
                    this.game.la(msg1);
                } else {
                    // just to player
                    this.game.announce(msg1, p);
                }
                logger.info(w.td ? w.td.toString() : '');
                //console.dir(w.td, { depth: 6 });
                let mod = "";
                let upto = (w.n_mod && w.n_mod == "upto"); //  && w.choose != ALL_OF);
                if (upto) { mod = "upto"; }
                logger.info(this.rand + `PLAYEREFFECT: w.nplayer is ${w.n_player}, backup is ${backup}`);
                let msg = `Choose ${upto ? 'up to ' : ''}${w.choose} target${(w.choose! > 1 ? 's:' : ':')}`;
                if (w.n_mod == "upto total") {
                    msg = `Choose any number that adds up to ${w.n} DP:`;
                    mod = w.n_mod;
                }
                this.game.wait(p, answers, msg, w.choose, mod);
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
                    this.s = FakeStep.CHECK_IF_CAN1;
                }

                this.game.log("Auto-selecting " + this.chosen_targets.map(x => x.get_name()).join(", "));
                // jump to them all being selected
                this.s = FakeStep.ASSIGN_TARGET_SUBS;
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

            if (this.evolve_choices && this.evolve_choices.length > 0) {
                let mon: Instance = this.effect.source.get_instance();
                let p = mon ? mon.n_me_player : -1;

                // assume EVOLVE is always a solo effect -- which is a lie
                let atomic = this.effect.effects[this.n_effect];
                //                this.effect.effects[this.
                let weirdo = atomic.events[0];
                let blob = answers![0];
                logger.info("for evolve choice is " + blob);
                let blobs = blob.split("-");
                //  i is Card, target is instance
                let [_location, i, target, cost] = blobs;
                let location: number = parseInt(_location);
                let match = false;
                logger.debug(this.evolve_choices);
                for (let x of this.evolve_choices) {
                    // TODO: verify that the evolve choice we get is a legit one
                }
                weirdo.chosen_target2 = this.game.get_instance(parseInt(target));
                let cl = new CardLocation(this.game, p, location, parseInt(i));
                this.chosen_targets = [cl];
                //                weirdo.chosen_target = cl;    
                this.s = FakeStep.ASSIGN_TARGET_SUBS;
                weirdo.n = parseInt(cost);

                return false;
            }

            // Forced attack
            if (w.game_event == GameEvent.MUST_ATTACK) {

                let cmd: string = answers![0] // just 1 attack answer
                let [_, attacker, target] = cmd.split(" ");
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
            this.s = FakeStep.ASSIGN_TARGET_SUBS;
            // fallthrough
        }
        if (this.s == FakeStep.ASSIGN_TARGET_SUBS) {

            let names = this.chosen_targets?.map(x => x.get_name()).join(",");
            this.game.log("Target chosen: " + names);
            let atomic = this.effect.effects[this.n_effect];

            let d = atomic.events[this.weirdo_count];
            d.chosen_target = this.chosen_targets![0];
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

            for (let etd of this.events_to_do) {
                logger.info(` etd is ${GameEvent[etd.game_event]} ...`);
                logger.info(` etd     target is ${etd.chosen_target?.id}`);
            }

            //       this.effect.effects[this.n_effect].weirdo.chosen_target = this.chosen_targets![0];
            //            let name = this.chosen_targets && this.chosen_targets[0] ? this.chosen_targets![0].get_name() : "(ERROR?)";
            this.game.announce(`targeting ${names}`);
            this.s = FakeStep.PRE_DO_EFFECT;
            // fall through?
        }

        if (this.s == FakeStep.PRE_DO_EFFECT) {

            let atomic = this.effect.effects[this.n_effect];

            logger.info(this.rand + `ATOMIC ${this.n_effect} AND SUB ${this.weirdo_count} TODO LEN IS ${this.events_to_do.length} TARGETCOUNT IS ${this.target_count}`);
            //     this.effect.effects[this.n_effect].events[0] = this.effect.effects[this.n_effect].weirdo; //? unneeded
            this.target_count += 1;

            if (false)
                if (this.target_count < 2 && atomic.events[this.weirdo_count].td2) { // we have another target to pick!
                    this.s = FakeStep.ASK_TARGET1;
                    return false;
                }

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

            console.log("n mod game event" + GameEvent[this.effect.effects[this.n_effect].weirdo.game_event]);
            if (this.effect.effects[this.n_effect].weirdo.n_mod == "upto") {
                console.log("n mod hit");
                let a: any = null; a.upto();
            }

            if (this.attack_target) {
                let e: SubEffect[] = [];
                let attacker = this.attacker;
                // duped from player code
                let eff = this.effect.effects[this.n_effect];
                let w = eff.events[this.weirdo_count];
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
                this.interrupter_loop = new InterrupterLoop(this.game, e, this.depth); // +1 or no?
                this.events_to_do = []; // old array hangs around for loop, this is a new one
                this.attack_target = undefined;
                this.s = FakeStep.DO_EFFECT_LOOP;
                return false;

            }


            let atomic = this.effect.effects[this.n_effect];
            logger.info(this.rand + "DO EFFECT");
            // TODO: collect side effects
            // just one subeffect for now, but later could be sdeveral
            let x = atomic.weirdo;
            //            if (x != this.effect.effects[this.n_effect].w
            x.n_player = this.effect.source!.get_n_player();
            //            let subfx = [x];

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
                atomic.events[0].status_condition.s.n_function) {
                atomic.events[0].status_condition.s.n =
                    atomic.events[0].status_condition.s.n_function(this.effect);

            }


            // for things like 'for each card discarded, get 1 memory'
            if (atomic.per_unit) {
                // start at 1 because we've already got one
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
            subfx = this.events_to_do;


            if (atomic.events.length == this.events_to_do.length) {
                //    subfx = this.events_to_do;
            }

            console.dir(subfx, { depth: 1 });
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
            }
            this.n_effects_tried = subfx.length // 1 for now
            this.interrupter_loop = new InterrupterLoop(this.game, subfx, this.depth); // +1 or no?
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
                this.s = FakeStep.CHECK_IF_CAN1;
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
                this.game.log("Cost wasn't successfully paid by interrupter, " +
                    this.cancel_target!.label + " will continue.");
                this.s = FakeStep.CHECK_IF_CAN1;
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
                this.s = FakeStep.CHECK_IF_CAN1;
                return false;
            }

            logger.info(this.rand + "going into get_cancel");
            // OOPS I should have declared what to cancel when activating
            this.s = FakeStep.GET_CANCEL;
            // fall through
        }
        if (this.s == FakeStep.GET_CANCEL) {
            logger.info(this.rand + "Negating " + this.cancel_target!.label);
            this.game.log("Will be negated: " + this.cancel_target!.label);
            this.cancel_target!.negated = true;
            this.s = FakeStep.CHECK_IF_CAN1;
            return false;
        }
        if (this.s == FakeStep.DONE) {

            let atomic = this.effect.effects[0]; // cleaning up searcher, it's always the first atomic 

            // is it really turn player??? I don't think so
            let p = this.game.get_turn_player();
            logger.info(this.rand + " DONE DONE DONE length is " + p.reveal.length);
            logger.info(this.rand + ` n_effect is ${this.n_effect} and length is ${this.effect.effects.length}`);
            // delete this next line
            logger.info(this.rand + " reveal length is " + p.reveal.length);

            if (p.reveal.length > 0) {
                if (atomic && atomic.search_final) {
                    this.game.la(`${p.reveal.length} cards still left for player ${p.player_num}`);
                    logger.info(this.rand + `n_effet is ${this.n_effect} of ${this.effect.effects.length} and atomic is ${atomic}`);
                    logger.info(this.rand + "cleaning up reveal to " + Location[atomic.search_final]);
                    p.put_reveal(atomic.search_final);
                }
            }


            logger.info(this.rand + "solideffectloop returning " + this.collected_events.length + " events");
            return this.collected_events;
        }
        console.error("SHOULD NOT BE HERE FO)R SOLID EFFECT");
        return false; // loop
    }
}

// the only reason to export this is because instance.run_constant_effects() needs to apply

export class XX {

    // the "target" here is redundant, it's pulled out of weirdo
    // TODO: verify this 
    static do_terminus_effect(weirdo: SubEffect, target: any, game: Game): boolean {
        // let target = weirdo.chosen_target;
        let name = target ? target.get_name() : "";

        let p = weirdo.n_player!;
        let o_p = 3 - p;
        if (!p) {
            let aa: any = null; aa.player_not_set();
        }
        let s_target1 = (weirdo.chosen_target  ? weirdo.chosen_target.get_name()  : "nul");
        let s_target2 = (weirdo.chosen_target2 ? weirdo.chosen_target2.get_name() : "nul");
        logger.debug("Terminus effect");
        //console.dir(weirdo, { depth: 0 });
        logger.debug("Target td is " + (weirdo.td ? weirdo.td.toString() : "nul") + " for '" + weirdo.td.raw_text + "'");
        logger.debug("chosen target 2 is " + (weirdo.chosen_target2 ? weirdo.chosen_target2.get_name() : "nul"));
        logger.debug("event is " + GameEvent[weirdo.game_event]);
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
            game.log("Action of " + GameEvent[weirdo.game_event] + " " + name + " negated.");
            return false;
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
        } else if (weirdo.game_event == GameEvent.GIVE_STATUS_CONDITION) {
            logger.info("giving status condition?");
            if (weirdo.status_condition) {
                logger.info("we have a status condition");
                let s = weirdo.status_condition;
                if (s.exp_description) {
                    logger.info("we have an expiration");
                    // effect with built-in timeout
                    game.log(`Giving ${GameEvent[weirdo.status_condition.s.game_event]} to ${name}`);
                    // I think I need to calculate expiry here, because the
                    // condition time out is relative to the effect-doer.
                    [s.n, s.p] = game.get_expiration(s.exp_description, p!);
                } else {
                    // constant effect (may be a timeout but not here)
                }
                logger.info("adding status condition: immune is " + s.exp_description);

                // if we have a target, apply it, but it might be a blanket effect
                if (target && weirdo.td.conjunction != Conjunction.PLAYER) {
                    target.add_status_cond(weirdo); // .status_condition);
                } else {
                    console.log("PLAYER NOW " + Conjunction[weirdo.td.conjunction]);
                    console.log(`op is ${o_p}`);
                    // giving a status condition to "all of" monsters 
                    if (weirdo.td.conjunction == Conjunction.PLAYER) {
                        console.log(`PLAYER NOW text is ${weirdo.td}`);
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
            }
        } else if (weirdo.game_event == GameEvent.DEVOLVE_FORCE) {
            game.log("Removing top card from " + name);
            return target.deevolve(1, { force: true });
        } else if (weirdo.game_event == GameEvent.DRAW) {
            game.log(`Player ${weirdo.n_player} drawing ${weirdo.n}`);
            game.get_n_player(weirdo.n_player!).draw(weirdo.n);
        } else if (weirdo.game_event == GameEvent.DEVOLVE) {
            game.log("Devolving " + name + " by " + weirdo.n);
            target.deevolve(weirdo.n!);
        } else if (weirdo.game_event == GameEvent.SUSPEND) {
            game.log("Suspending " + name);
            let ret = !target.suspended;
            target._suspend("effect"); // by event? are we sure?
            return ret; // did we pay
        } else if (weirdo.game_event == GameEvent.UNSUSPEND) {
            game.log("Unsuspending " + name);
            target.unsuspend("effect");

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
            if (!("top" in weirdo.spec_source!)) return false; // make sure we're an instance
            let instance: Instance = weirdo.chosen_target2;

            let original_name = instance.get_name();
            // are we evolving before checking cost! :( :(
            if (true) {
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
            let [cost, msg] = get_modified_cost(origcost, weirdo);
            game.pay_memory(cost);
            game.log(`Evolve into ${instance.get_name()} ${msg}`); // no need to announce, we did that at start
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
            if ("cardloc" in target) {
                let cl: CardLocation = target;
                c = cl.extract();
                played = Instance.play(c, game, player, o_player);
                played.set_label(weirdo.play_label)
                player.field.push(played);
                weirdo.chosen_target = played; // this will be important for later
            } else if ("p_cost" in target) {
                logger.warn("legacy play cost");
                // I think this is the legacy play-from-hand, still used, should be rolled into the above
                c = target;
                played = Instance.play(c, game, player, o_player);
                played.set_label(weirdo.play_label); // not implemented
                player.field.push(played);
                weirdo.chosen_target = played; // this will be important for later
            } else {
                console.error("not a card!");
                return false;
            }
            if (c.p_cost == undefined) { return false; }
            let origcost = Number(c.p_cost);

            let [cost, cost_msg] = get_modified_cost(origcost, weirdo); // modify_cost(origcost, weirdo);

            game.la(`Play ${played.name()} ${cost_msg}`);
            game.pay_memory(cost);
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
                c.move_to(Location.FIELD, inst, "BOTTOM");
                return true;
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
        } else if (weirdo.game_event == GameEvent.HATCH) {
            // nothing, we did this inside the interrupter loop 
            let player = game.get_n_player(p!);
            if (player.can_hatch())
                return player.hatch();
            game.log("cannot hatch");
            return false;
        } else if (weirdo.game_event == GameEvent.CARD_ADD_TO_HEALTH) {
            // TODO merge this in with MOVE_CARD below
            logger.error("assuming card add to health is always from deck");
            let player = game.get_n_player(p);
            let c = player.deck.pop();
            if (!c) {
                game.log("No recovery, deck is empty.");
                return false;
            }
            game.la(`Card moved from deck to health`);
            c.move_to(Location.SECURITY);
            return true;
        } else if (weirdo.game_event == GameEvent.MOVE_CARD) {
            // success if *any* cards were trashed, which will trigger our "when a card is X" effect
            // This logic is incorrect if there's ever a "move N cards. If you did, X."
            let p_n = weirdo.td2?.raw_text.startsWith("our") ? p : 3 - p;
            let player = game.get_n_player(p_n);
            let pile, dest = Location.NULLZONE;
            let from = "null";
            let to = weirdo.td.raw_text;
            if (weirdo.td2?.raw_text.includes("deck")) {
                pile = player.deck;
                from = "deck";
            } else {
                logger.error("MOVE_CARD missing source: " + weirdo.td2?.raw_text);
            }
            if (to == "trash") {
                dest = Location.TRASH;
            } else {
                logger.error("MOVE_CARD missing dest: " + weirdo.td.raw_text);
            }
            let ret = false;
            for (let i = 0; i < weirdo.n!; i++) {
                game.log(`${i} of ${weirdo.n!}`);
                let c = pile?.pop();
                if (!c) {
                    game.log("Couldn't get card from " + from);
                    return ret;
                }
                ret = true;
                c.move_to(dest);
                game.log(`Player ${p_n} moved ${c.name} from ${from} to ${to}`);
            }
            return ret;

        } else if (weirdo.game_event == GameEvent.CARD_REMOVE_FROM_HEALTH) {
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
            console.dir(weirdo, { depth: 2 });
        } else if (weirdo.game_event == GameEvent.CANCEL) {
            // handled elsewhere
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

// (Most game events get done in here.)
export class InterrupterLoop {

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

    constructor(game: Game, effects: SubEffect[], depth: number) {
        this.collected_events = [];
        this.pre_effects_to_process = effects;
        this.game = game;
        this.effects_to_process = [];
        this.rand = random_id();
        this.depth = depth;


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

                if (immune_test &&
                    immune_test.can_do) {
                    logger.info("testing immune for " + effect);
                    let x = (immune_test.can_do(sub));
                    logger.info(x);
                    if (x) {
                        this.effects_to_process.push(sub);
                        // logger.info(this.rand+"8888888VULN");
                    } else {
                        
                        this.game.fancy.add_string(this.depth, `P${sub.n_player} doing ${GameEvent[sub.game_event]} against ${txt} but can't`);
                        this.game.log(txt + " is immune to " + effect.toLowerCase());
                    }
                } else {
                    // we couldn't check immunity, so into the fire they go
                    this.effects_to_process.push(sub);
                }
            }

            logger.debug(this.rand + "EEEEEE there are " + this.effects_to_process.length + " effects to find interrupters for");
            let interrupters = this.game.preflight_actions(this.effects_to_process);
            logger.debug(this.rand + "EEEEEE we found " + interrupters.length + " effects wanting to interrupt");

            //this.game.announce("we have " + interrupters.length + " interrupters");

            if (interrupters.length == 0) {
                this.s = InterruptStep.DO_EFFECT_AT_LAST;
                return false;
            }
            this.game.log(`INT DEPTH ${this.depth}: There are ${interrupters.length} immediate-type effects that trigger: ${interrupters.map(x => x.label).join(", ")}`);
            this.chooser = new EffectChooser(this.game, interrupters, this.depth, "interrupter");

            this.s = InterruptStep.PICK_EFFECT;
            return false;
        }
        if (this.s == InterruptStep.PICK_EFFECT) {
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
            logger.info(this.rand + "CHOOSER gave us an effect: " + x.toString());
            this.s = InterruptStep.DO_INTERRUPTER;
            // fall through
        }
        if (this.s == InterruptStep.DO_INTERRUPTER) {

            // validate conditions here
            // ask if optional (all interrupters are?)
            this.sel = new SolidEffectLoop(this.current!, this.game,
                this.effects_to_process!, "p", this.depth);
            this.s = InterruptStep.SEL_LOOP;
            // fall through
        }
        if (this.s == InterruptStep.SEL_LOOP) {
            if (!this.sel?.step()) return false;
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
            // because there's no distinction there.


            for (let se of this.effects_to_process!) {
                let target = se.chosen_target;
                logger.info(this.rand + "finally trying effect " + GameEvent[se.game_event]);;

                //          console.dir(se , { depth: 2});
                //               /             logger.info(111111);
                //                          logger.info(this);
                //                        logger.info(222222);*/
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
                    console.dir(se);
                    // should this even be reported?
                    // Is this needed, don't we handle this in another place more generally now?
                    logger.info(this.rand + " not on field, well sometimes these things happen");
                    this.game.announce(`Target ${target.get_name()} no longer on field for effect ${GameEvent[se.game_event]}`);


                }

                //                logger.info(this.rand+"hand is ");
                //              se.n

                let s_target = (target?.get_name()) || "";
                let against = s_target ? `against ${s_target}` : "";
                if (se.game_event != GameEvent.NIL) {
                    this.game.fancy.add_string(this.depth, `P${se.n_player} doing ${GameEvent[se.game_event]} ${against}`);
                } else {
                    logger.warn("have a NIL effect");
                }
                let paid = XX.do_terminus_effect(se, target, this.game);
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
        this.interrupter_loop = new InterrupterLoop(g, e, depth); // depth, or depth+1??
        this.resolution_loop = undefined;
        this.given_events = e;
        this.game = g;
        this.rand = random_id();
        this.what_happened = [];
        this.depth = depth;

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
            ret.push("DSEL RES ERROR " + this.depth);
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
            if (x.length == 0) {
                this.game.clear_reveal();
                return [];
            }

            this.what_happened = this.what_happened.concat(x);

            // 
            let rules = this.game.rules_process();
            logger.info("rules is " + rules);
            if (rules) {
                // If we have rule checks, we can just start this loop over
                // Because rules checks are simuleantous with previous event 
                this.interrupter_loop = new InterrupterLoop(this.game, rules, this.depth);
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

    let pea = g.posteffect_actions(happened);
    logger.info("There are " + pea.length + " responders to " + happened.length + " effects");
    if (pea.length == 0) {
        return undefined;
    }
    let newdepth = depth + 1;
    g.log(`RES DEPTH ${newdepth}: There are ${pea.length} effects that trigger: ${pea.map(x => x.label).join(",")}`);
    g.fancy.update_triggers(newdepth, pea);
    let combat_resolution_loop = new
        ResolutionLoop(g, pea, newdepth);
    // why is this called a "combat_resolution_loop"?
    return combat_resolution_loop;
}



function get_modified_cost(origcost: number, weirdo: SubEffect): [number, string] {
    let delta = 0;
    logger.info(`origcost ${origcost}`);
    let for_free = weirdo.n_mod?.includes("free");
    if (for_free) {
        // set by original effect. Can interrupters set the cost to free?
        // If not, we could return right here.
        origcost = 0;
    }
    if (weirdo.n_mod == "reduced") {
        check_floodgate();
        delta -= weirdo.n!;
    }
    if (weirdo.cost_change) {
        for (let submod of weirdo.cost_change) {
            if (submod.n_mod == "reduced")
                delta -= submod.n;
        }
    }
    logger.info(`origcost ${origcost} xxx`);
    let newcost: number = origcost;
    let msg: string;
    if (!for_free) {
        newcost += delta;
        if (newcost < 0) newcost = 0;
        msg = `for cost ${newcost}`;
        if (delta) msg += ` [modified from ${origcost} by ${delta}]`;
    } else {
        msg = `for no cost`;
    }
    logger.info(`newcost is ${newcost} delta ${delta}`);
    return [newcost, msg];
}

function check_floodgate() {
    // memory floodgate placeholder
    logger.info("memory floodgate");
}