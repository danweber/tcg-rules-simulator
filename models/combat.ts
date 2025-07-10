
import { Game } from './game';
import { Player } from './player';
import { Instance } from './instance';
import { InterruptCondition, SubEffect, status_cond_to_string, subeffect_to_string } from './effect';
import { DirectedSubEffectLoop, InterrupterLoop, ResolutionLoop, get_responder_loop } from './effectloop';
import { EventCause, GameEvent } from './event';
import { TargetDesc, SpecialCard, Conjunction } from './target';
import { Phase } from './phase'; // do we really need this?
import { Card, CardLocation } from './card';
import { Location } from './location';
import { v4 as uuidv4 } from 'uuid';



import { createLogger } from "./logger";
import { get_mult } from './util';
const logger = createLogger('combat');

// the step is what we're *about* to do, right?
enum CombatStep {
    // need to move basically everything from player.attack here
    COMBAT_SETUP = 1,
    SUSPEND_AND_TARGET,

    PROCESS_DECLARE_LOOP, // suspend, alliance, when attacking


    GET_RESPODNERS_WHEN_ATTACKED1, // when being attacked


    PRE_COUNTER2,
    GET_COUNTER_RESPONSES1,
    PROCESS_COUNTER_RESPONSES, // at most 1
    PROCESSING_COUNTER_RESPONSES, // why these two, am i drunk?

    ASK_BLOCKER_RESPONSES,
    GET_BLOCKER_RESPONSES1,
    START_BLOCK,
    DO_BLOCKER_LOOP,
    /*...*/
    BATTLE_START, // skip to below if direct attack
    CHECK_FIELD_COMBAT, // get list of deletions




    RESOLVE_COMBAT, // FOR NOW, just skip
    PREFLIGHT_COMBAT_RESULTS,

    IN_COMBAT_EVENT_LOOP,

    //    TRIGGER_COMBAT_INTERRUPTERS,
    DO_COMBAT_DELETIONS,
    TRIGGER_COMBAT_RESPONSES, // retaliation here, we need to pre-calc it
    // immune to deletion will happen in a subloop


    FINISH_FIELD_COMBAT, // basically exists to check for piercing, otherwise exit
    //if 
    CHECK_FOR_VICTORY, // as long as not piercing
    CONTINUE_TO_SECURITY_STACK, // verify we have at least 1 SA left
    //  REVEAL_CARD, // skip sec_battle if no dp

    SECURITY_EFFECT_LOOP,


    SECURITY_CARD_REMOVED_LOOP_FIRST, // anything that responds here
    SECURITY_CARD_REMOVED_LOOP_SECOND,

    SECURITY_BATTLE1, // jamming doesn't interrupt!
    SECURITY_BATTLE_LOOP, // try to delete attacker if they lost

    END_OF_BATTLE_START, // for 'at end of battle' effects
    END_OF_BATTLE_LOOP,

    FINISH_SEC_BATTLE_old, // move card to trash, back up to CONTINUE_TO_SECURITY_STACK

    DONE_WITH_SEC_CHECKS,

    END_OF_ATTACK_EFFECT_LOOP_1, // jump 
    END_OF_ATTACK_EFFECT_LOOP_2,

    ATTACK_ENDS, // expire events

    // 

};

// I think attack-and-suspend really did belong here in the first place.

// It's just that before we step() the combat loop, we first step() the effect loop.

export class CombatLoop {
    s: CombatStep;
    game: Game;
    original_n_attacker: number;
    original_n_target: number;
    attacker: Instance;
    //defender: Instance | Player;
    defender_i: Instance;
    defender_p: Player;
    defender_any: Instance | Player;
    defender_dp: number = 0;
    del_attacker: SubEffect; // avoid recalculating
    actual_deletions?: SubEffect[];
    combat_deletion_effects: SubEffect[];
    directed_subeffect_loop?: DirectedSubEffectLoop;

    // TODO: remove these two
    combat_resolution_loop?: ResolutionLoop;
    interrupter_loop?: InterrupterLoop;

    security_attacks_done: number;
    security_card?: Card; // current card being processed

    toString(): string {
        return `Instance ${this.original_n_attacker} going into ${this.original_n_target}, step is ${CombatStep[this.s]}`;
    }

    // we *could* show combat in progress...
    effect_tree(): string[] { return [] };
    dump(full: boolean = false) {
        let x = this.s;
        let str = CombatStep[x];
        if (full) {
            return `in step ${x} or ${str} turn is ${this.game.n_turn} mem is ${this.game.get_memory()}`;
        } else {
            let combat_loop = (this.combat_resolution_loop) ?
                this.combat_resolution_loop.dump(full) : "---";
            let int_loop = (this.interrupter_loop) ?
                this.interrupter_loop.dump(full) : "---";
            let dir_loop = (this.directed_subeffect_loop) ?
                this.directed_subeffect_loop.dump() : "---";

            return str += ` { ${combat_loop}  ${int_loop} ${dir_loop} }`;
        }
    }

    // i dunno if I really need "player" passed in here
    constructor(g: Game, source: number, target: number, p: Player) {
        this.s = CombatStep.COMBAT_SETUP;
        this.game = g;
        this.original_n_attacker = source;
        this.original_n_target = target;
        this.attacker = g.get_instance(source);
        this.defender_i = g.get_instance(target); // might be null :<
        this.defender_p = p.other_player;
        this.defender_any = this.defender_i;
        logger.info("source is " + source + " and target is " + target);

        this.combat_deletion_effects = [];
        this.security_attacks_done = 0;
        //logger.debug(this.defender_i && this.defender_i.name());
        let td = new TargetDesc("");
        // the delete attacker event, will be needed in different placs
        this.del_attacker = {
            game_event: GameEvent.DELETE,
            // what is n_player for combat?
            n_player: 1, chosen_target: this.attacker, td: td,
            label: "combat deletion",
            spec_source: this.defender_i,   // this could be null right now, it will need to be changed later
            cause: EventCause.NORMAL_BATTLE // maybe?
        };

        this.s = CombatStep.SUSPEND_AND_TARGET;

    }

    // returns empty subeffect list for compatability
    step(): false | SubEffect[] {
        if (this.s == CombatStep.COMBAT_SETUP) {
            logger.error("combat set up failed?");
            return [];
        }
        if (this.s == CombatStep.SUSPEND_AND_TARGET) {
            this.s = CombatStep.PROCESS_DECLARE_LOOP;
            // fall through
        }
        if (this.s == CombatStep.PROCESS_DECLARE_LOOP) {
            this.s = CombatStep.PRE_COUNTER2;
            // fall through
        }

        if (this.s == CombatStep.PRE_COUNTER2) {
            let name = this.original_n_target ? this.defender_i.name() : "PLAYER";
            logger.debug("x " + this.original_n_attacker);
            this.game.la(`Attacking ${this.attacker.get_name()} into ${name}`);
            if (!this.attacker.legal_combatant()) {
                this.game.la(`No longer able to attack!`);
                // fall through, we still get counter step
            }
            this.s = CombatStep.GET_COUNTER_RESPONSES1;
            //     this.game.announce("Events: " + e.join(","));
            // fall through
        }
        if (this.s == CombatStep.GET_COUNTER_RESPONSES1) {

            let can_blast = this.defender_p.can_counter_evo();
            logger.debug("can blast is " + can_blast);
            // TODO: offer dummy window to avoid leaking info

            if (!can_blast) {
                this.s = CombatStep.ASK_BLOCKER_RESPONSES;
                return false;
            }

            let blast_evos = this.defender_p.get_all_evolves(true, "yes", "no", false);
            let questions = Player.evo_options_into_questions(blast_evos || [], true);
            //let blast = this.defender_p.get_counter_evo_questions();
            this.game.wait(this.defender_p.player_num, questions);
            this.s = CombatStep.PROCESS_COUNTER_RESPONSES;
        }

        if (this.s == CombatStep.PROCESS_COUNTER_RESPONSES) {

            if (this.game.waiting_answer()) {
                return false;
            }
            // letting this stay as a number

            let answer = this.game.get_answer();


            logger.info("blast answer is " + answer);
            if (answer == "-1") {
                this.s = CombatStep.ASK_BLOCKER_RESPONSES;
                return false;
            }

            // this code has been de-duped but it's still in common between here and effectloop

            let blobs = answer.split("-");
            // all pairs of (card left right) and (location-instance), plus cost
            let [c_l, , c_i, l_l, , l_i, r_l, , r_i, cost] = blobs;
            let location: number = parseInt(c_l);
            let match = false;
            let p = this.defender_p.player_num;
            let cl = this.game.find_by_key(p, parseInt(c_l), parseInt(c_i));
            let inst = this.game.find_by_key(p, parseInt(l_l), parseInt(l_i));
            let tgt3 = this.game.find_by_key(p, parseInt(r_l), parseInt(r_i));

            let str = `PLAYER ${p} BLAST EVOLVES ${cl.get_field_name(Location.HAND).toUpperCase()}`;
            if (tgt3) str += " AND " + tgt3.get_field_name().toUpperCase();
            str += " ONTO " + inst.get_field_name().toUpperCase();
            this.game.la(str);
            // this needs to be a interrupable respondable event
            let td = new TargetDesc("");
            let e: SubEffect[] = [];
            e.push({
                cause: EventCause.EFFECT, // blast evo is an effect
                game_event: GameEvent.EVOLVE,
                label: 'blast evolve',
                chosen_target: cl, // always a card
                spec_source: inst, //?
                chosen_target2: [inst], // left, card or instance
                chosen_target3: tgt3, // right, instance or card
                td: td,
                n_player: 3 - this.game.turn_player, // speifically for counter
                n: 0 // for "free"
            });

            this.directed_subeffect_loop = new DirectedSubEffectLoop(this.game, e, 1);
            if (this.directed_subeffect_loop.step()) {
                this.s = CombatStep.ASK_BLOCKER_RESPONSES;
                return false;
            }

            this.s = CombatStep.PROCESSING_COUNTER_RESPONSES;
            // fall through
        }
        if (this.s == CombatStep.PROCESSING_COUNTER_RESPONSES) {// at most 1
            if (!this.directed_subeffect_loop?.step())
                return false;

            this.s = CombatStep.ASK_BLOCKER_RESPONSES;
            // fall through
        }
        if (this.s == CombatStep.ASK_BLOCKER_RESPONSES) {
            // does "you can re-target" belong here?

            logger.info("attacker is " + this.attacker.legal_combatant());
            // logger.info("defender name is " + this.defender_any.get_name());
            if (!this.attacker.legal_combatant()) {
                this.game.la("Attacker gone, blocking can't happen");
                this.s = CombatStep.END_OF_ATTACK_EFFECT_LOOP_1;
                return false;
            }

            let blockers = this.defender_p.get_blockers(this.defender_i);
            // this.game.announce("Defender has " + blockers.length + "blockers");
            if (blockers.length == 0) {
                this.s = CombatStep.BATTLE_START;
                return false;
            }
            if (this.attacker.is_unblockable()) {
                this.game.log("Attack is unblockable.");
                this.s = CombatStep.BATTLE_START;
                return false;
            }
            let must_block = this.attacker.has_must_block();
            if (must_block) this.game.la("Forced block");
            this.game.log("Defender has " + blockers.length + " blockers");
            let choices = [];
            if (!must_block) {
                choices.push({ command: "-1", text: "Do not block", ver: uuidv4() });
            }
            //            this.game.announce(`-1 Don't block at all`);
            for (let b of blockers) {
                choices.push({
                    command: b.id.toString(),
                    text: `Defend with ${b.name()} ${b.id}`,
                    attack_source: b.id,
                    ver: uuidv4()
                });
            }
            // the UI chokes on 1-choice questions
            if (choices.length == 1) {
                this.defender_i = blockers[0];
                this.s = CombatStep.START_BLOCK;
                return false;
            }
            this.game.wait(this.defender_p.player_num, choices);
            this.s = CombatStep.GET_BLOCKER_RESPONSES1;
            // fall through return false;
        }
        if (this.s == CombatStep.GET_BLOCKER_RESPONSES1) {
            if (this.game.waiting_answer()) {
                return false;
            }
            let b = this.game.get_answer();
            if (b == "-1") {
                this.game.log("Blocking declined");
                this.s = CombatStep.BATTLE_START;
                return false;
            }
            this.defender_i = this.game.instances[parseInt(b)];
            this.s = CombatStep.START_BLOCK;
        }

        if (this.s == CombatStep.START_BLOCK) {

            // Is there any chance we became suspended since checking?

            // TODO: verify that we really did suspend. DSEL can't handle that, but DSEL is bad anyway
            let _ = new TargetDesc("dummy");
            let block_suspend: SubEffect = {
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.SUSPEND,
                label: 'suspend to block',
                chosen_target: this.defender_i,
                td: _,
                n_player: 3 - this.game.turn_player
            };
            let target_switch: SubEffect = {
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.ATTACK_TARGET_SWITCH, td: _,
                label: 'attack target switch',
                n_player: 3 - this.game.turn_player
                // does it mat
            };

            this.directed_subeffect_loop = new DirectedSubEffectLoop(this.game, [block_suspend, target_switch], 1);
            logger.debug("BLOCKING WITH " + this.defender_i.get_name());
            this.game.log("Defender blocking: attack target changed to " + this.defender_i.get_name());

            // TODO: call interrupter loop

            // two simultaneous events: suspension and attack_target_changed
            // we *could* pass this to 
            this.s = CombatStep.DO_BLOCKER_LOOP;
        }
        if (this.s == CombatStep.DO_BLOCKER_LOOP) {
            logger.debug("stuck in here?");
            if (!this.directed_subeffect_loop?.step()) return false;
            this.s = CombatStep.BATTLE_START;
            // fall through
        }

        if (this.s == CombatStep.BATTLE_START) {
            // defender_i will be something *probably* iff
            // I attacked a mon or got blocked.

            // What if I declare into player, and am redirected, 
            // but the reaction to ATTACK_TARGET_CHANGED deletes
            // what I was going to attack? 

            if (!this.defender_i) {
                this.game.log("going into direct check");
                this.s = CombatStep.CHECK_FOR_VICTORY;
                return false;
            }
            //            logger.debug(this.defender_i.name);

            this.game.log(`going into field battle with ${this.defender_i.name()}`);
            this.s = CombatStep.CHECK_FIELD_COMBAT;
            return false;
        }
        if (this.s == CombatStep.CHECK_FIELD_COMBAT) {

            // we don't technically need retaliation here, it's entirely for flavor

            // DOUBLE CHECK THAT BOTH ARE STILL ON FIELD!!!!
            logger.info(`attacker ${!!this.attacker} defender_i ${!!this.defender_i} defender_p ${!!this.defender_p} defender_any ${!!this.defender_any}}`);
            logger.info(`attacker ${this.attacker.legal_combatant()} defender ${this.defender_i.get_field_name()} `);
            logger.info(`attacker ${this.attacker.legal_combatant()} defender ${this.defender_i.get_field_name()} = ${this.defender_i.legal_combatant()}`);
            if (!this.attacker.legal_combatant() ||
                !this.defender_i.legal_combatant()) {
                this.game.la("Battle can no longer happen: combatant removed");
                this.s = CombatStep.END_OF_ATTACK_EFFECT_LOOP_1;
                return false;
                // deal with this alter
            }

            let compare = "dp";
            if (this.attacker.has_keyword("Iceclad") || this.defender_i.has_keyword("Iceclad")) {
                compare = "source_count";
            }
            let attacker_value = compare === "dp" ? this.attacker.dp() : this.attacker.get_source_count();
            let defender_value = compare === "dp" ? this.defender_i.dp() : this.defender_i.get_source_count();


            let retaliate_a: boolean = this.attacker.has_retaliation();
            let retaliate_d: boolean = this.defender_i.has_retaliation();
            let m = `attacker is ${this.attacker.name()} ${attacker_value} ` +
                ` ${retaliate_a ? "with retaliation" : ""} defender is ` +
                `${this.defender_i.get_name()} ${defender_value} ${retaliate_d ? " with retaliate" : ""} `;
            this.game.la(m);

            // I'm skipping interruptive effects again

            //            let effects: any = [];
            let td = new TargetDesc("");
            //            let deletion_effects: SubEffect[] = [];
            let del_defender: SubEffect = {
                game_event: GameEvent.DELETE,
                // what is n_player for combat?
                label: 'combat deletion',
                n_player: 1, chosen_target: this.defender_i, td: td,
                spec_source: this.attacker,
                cause: EventCause.NORMAL_BATTLE
            };
            // recalculate who the attacker is fighting, so we don't crash when retaliating against a blocker

            this.del_attacker.spec_source = this.defender_i;

            logger.debug("SETTING SPEC SOURCE");
            logger.debug("" + this.del_attacker.label);
            logger.debug("" + del_defender);


            if (attacker_value == defender_value) {
                this.game.la("Both lose in battle");
                this.combat_deletion_effects.push(this.del_attacker);
                this.combat_deletion_effects.push(del_defender);
                // ignoring retaliation in here, although to be 
            } else if (attacker_value <= defender_value) {
                this.combat_deletion_effects.push(this.del_attacker);
                this.game.la("Attacker loses in battle");
            } else if (defender_value <= attacker_value) {
                this.combat_deletion_effects.push(del_defender);
                this.game.la("Defender loses in battle");
            } else {
                logger.error("wut");
            }
            logger.info("we have  " + this.combat_deletion_effects.length + " deletions to try");
            this.s = CombatStep.PREFLIGHT_COMBAT_RESULTS;

            // constructoir
            this.directed_subeffect_loop = new DirectedSubEffectLoop(this.game, this.combat_deletion_effects, 1);
            //            this.interrupter_loop = new InterrupterLoop(this.game, this.combat_deletion_effects);
            this.combat_resolution_loop = undefined;
            // fall through
        }
        if (this.s == CombatStep.PREFLIGHT_COMBAT_RESULTS) {

            if (!this.directed_subeffect_loop!.step()) {
                return false;
            }
            this.s = CombatStep.FINISH_FIELD_COMBAT;
            // fall through
        }
        if (this.s == CombatStep.FINISH_FIELD_COMBAT) {
            logger.debug("");
            let piercing = this.attacker.has_piercing();
            // "not on field" isn't the right test, I should make 
            // sure they were deleted in battle
            if (piercing && !this.defender_i.in_play()) {
                // I needed to check for piercing up above in the battle deletion 
                // step. The monster keeps it for battle even if they lose the
                // thing that gave it <Piercing> text.
                this.game.log("Piercing lets us continue.");
                this.s = CombatStep.CONTINUE_TO_SECURITY_STACK;
                return false;
            } else {
                this.s = CombatStep.END_OF_ATTACK_EFFECT_LOOP_1;
                return false;
            }
        }

        if (this.s == CombatStep.CHECK_FOR_VICTORY) {
            /*
            if (this.defender.kind == "Instance" || this.defender instanceof Instance) {
                logger.error("checking instance's security stack, error");
                logger.trace();
                return true;
            }*/
            if (this.attacker.get_sa() >= 1) {
                if (this.defender_p.security.length == 0) {
                    this.game.winner = 3 - this.defender_p.player_num;
                    this.game.la("Swing into empty security stack, game over.");
                    this.game.phase = Phase.GAME_OVER;
                    this.game.la(`Player ${this.game.winner} wins`);
                    return [];
                }
            }
            this.s = CombatStep.CONTINUE_TO_SECURITY_STACK;
            return false;
        }
        if (this.s == CombatStep.CONTINUE_TO_SECURITY_STACK) {
            if (this.defender_p.kind == "Instance" || this.defender_p instanceof Instance) {
                logger.error("checking instance's security stack, error");
                //logger.trace();
                return [];
            }
            // just handle it all right now, I'm getting impatient, 
            // c'mon make at least one step() per loop
            let sa = this.attacker.get_sa(); // this can change, a lot!
            this.game.log(`Attacker has SA of ${sa}, has done ${this.security_attacks_done} attacks so far`);
            if (sa <= this.security_attacks_done) {
                this.game.log("All checks completed.");
                this.s = CombatStep.DONE_WITH_SEC_CHECKS;
                return false;
            }
            this.security_attacks_done += 1;

            this.game.log(`Defender stack is ${this.defender_p.security.length} `);

            if (!this.attacker.in_play()) {
                this.game.la("Attacker not on field any more.");
                this.s = CombatStep.DONE_WITH_SEC_CHECKS;
                return false;
            }
            if (this.defender_p.security.length == 0) {
                this.game.log(`No cards left in stack`);
                this.s = CombatStep.DONE_WITH_SEC_CHECKS;
                return false;
            }
            this.defender_p.security[this.defender_p.security.length -1].flip_face_up(true);
            this.game.ui_card_move(); // to show face up sec
            let sec_card: Card = this.defender_p.security.pop()!;
            this.game.log('Card removed from stack...');
            sec_card.move_to(Location.NULLZONE);

            // REACT TO THAT! ... do I need to interrupt, too?
            this.security_card = sec_card;
            // TODO: put this in a temp area
            this.defender_dp = sec_card.dp;

            let msg = `Card revealed ${sec_card.name}`;
            logger.debug("defender has " + this.defender_p.expiring_status_effects.length + " expiring and " +
                this.defender_p.constant_status_effects.length + " constant effects");
            if (sec_card.has_dp()) {
                let delta_dp = 0;
                for (let stat of (this.defender_p.all_player_status_effects(true))) {
                    logger.debug("STAT IS " + status_cond_to_string(stat));
                    if (stat.s.game_event == GameEvent.DP_CHANGE) {
                        logger.info("have dp change");
                        delta_dp += get_mult(stat.s);;
                    }
                }

                msg += ` with DP of ${this.defender_dp}`;
                if (delta_dp) {
                    this.defender_dp += delta_dp;
                    if (this.defender_dp < 0) this.defender_dp = 0;
                    msg += ` changed by ${delta_dp} to ${this.defender_dp}`;
                }
            }
            this.game.la(msg);

            if (sec_card.security_text) {
                this.game.la("Security effect: " + sec_card.security_text);
                // this will cause its own loop ... and I won't exit it right!
                let fx;
                if (false) {
                    // security to 'play this card' removed apr 25
                } else {
                    fx = this.defender_p.get_option_effect(sec_card, "SECURITY")!;
                    logger.info("fx of security " + fx.toString());
                    let cl = new CardLocation(this.game,
                        3 - this.game.turn_player,
                        // hey, I should make a special zone for this
                        Location.NULLZONE,
                        0);
                    fx.source = new SpecialCard(cl);
                    // I should make a subloop explicilty here
                }
                this.combat_resolution_loop = new ResolutionLoop(this.game, [fx], 1, []);
                this.s = CombatStep.SECURITY_EFFECT_LOOP;
                return false;
            } else {
                this.s = CombatStep.SECURITY_CARD_REMOVED_LOOP_FIRST;
                return false;
            }

            // can't get here;
        }

        //// DUPE CODE!
        if (this.s == CombatStep.SECURITY_EFFECT_LOOP) {
            let x = this.combat_resolution_loop?.step();
            if (x) {
                logger.info("done with security effect, go into security battle");
                this.s = CombatStep.SECURITY_CARD_REMOVED_LOOP_FIRST;
                return false;
            }
            return false;
            // I think I can re-order these             
        }

        if (this.s == CombatStep.SECURITY_CARD_REMOVED_LOOP_FIRST) {
            // technically this might be part of the previous loop,
            // but I'm not sure how to get the rules to apply here
            let card_removed: SubEffect = {
                cause: EventCause.GAME_FLOW, // could be security_battle?
                game_event: GameEvent.MOVE_CARD,
                chosen_target: this.defender_p, // obsolete now
                label: 'battle reveals security',
                td: new TargetDesc("nullzone"), // to?
                td2: new TargetDesc("security"), // not saying which player :(
                n_player: 3 - this.game.turn_player
            };

            this.directed_subeffect_loop = new DirectedSubEffectLoop(this.game, [card_removed], 1);
            this.s = CombatStep.SECURITY_CARD_REMOVED_LOOP_SECOND;
            // fall through
        }

        if (this.s == CombatStep.SECURITY_CARD_REMOVED_LOOP_SECOND) {
            let x = this.directed_subeffect_loop!.step();
            if (!x) return false;
            logger.info("done with whatever responded to card being removed");
            this.s = CombatStep.SECURITY_BATTLE1;
            // fall through
        }


        if (this.s == CombatStep.SECURITY_BATTLE1) {
            if (!this.attacker.legal_combatant()) {
                this.game.la("Attacker not on field any more.");
                // even if we lost SA, we're still going into it
                this.s = CombatStep.DONE_WITH_SEC_CHECKS;
                return false;
            }
            // ooohh, I should have a defense against running game logic when in a loop
            let sec_card = this.security_card!;
            // do battle -- is this code duped enough?
            let more_deaths = [];
            if (sec_card.has_dp()) {
                // do security battle
                let msg = `Security battle, ${this.attacker.dp()} vs ${this.defender_dp} `;
                if (this.attacker.has_jamming()) {
                    msg += " but attacker has jamming"
                }
                this.game.la(msg);
                if (this.attacker.dp() <= this.defender_dp && !this.attacker.has_jamming()) {
                    this.del_attacker.cause = EventCause.SECURITY_BATTLE
                    more_deaths.push(this.del_attacker!);
                    /// HANDLE FIVE STEP HERE
                }
            }
            if (more_deaths.length > 0) {
                this.directed_subeffect_loop = new DirectedSubEffectLoop(this.game, more_deaths, 1);
                if (this.directed_subeffect_loop.step() == false) {
                    this.s = CombatStep.SECURITY_BATTLE_LOOP;
                    return false;
                }
            }
            this.s = CombatStep.END_OF_BATTLE_START;
            // fall through
        }

        if (this.s == CombatStep.END_OF_BATTLE_START) {
            let solids = this.game.check_for_phase_events(Phase.END_OF_BATTLE);
            logger.info("count of end-of-battle effects: " + solids.length);
            if (solids) {
                this.game.log("End of battle effects have triggered: " + solids.map(x => x.label).join(","));
                this.game.do_effects(solids);
                this.s = CombatStep.END_OF_BATTLE_LOOP;
                return false;
            }
            this.s = CombatStep.END_OF_BATTLE_LOOP;
            // fall through, we will fall through the next one too
        }
        if (this.s == CombatStep.END_OF_BATTLE_LOOP) {
            if (this.directed_subeffect_loop?.step()) {
                // go back up to put the security card in the trash and then restart the loop
                this.s = CombatStep.FINISH_SEC_BATTLE_old;
                return false;
            }
            return false;
        }
        if (this.s == CombatStep.FINISH_SEC_BATTLE_old) {
            logger.info("finishing, nullzone is " + this.defender_p.nullzone.length);
            logger.info("null is " + this.defender_p.nullzone.map(x => x.name).join("="));

            logger.info("finishing, trash is " + this.defender_p.trash.length);

            for (let card of this.defender_p.nullzone) {
                this.game.log("Moving defender's " + card.get_name() + " to trash");
                card.move_to(Location.TRASH);
            }
            this.defender_p.nullzone.length = 0;
            /*
            if (this.defender_p.nullzone.length > 0) {

                this.game.la("Moving security card to trash");

                this.defender_p.trash_card(new CardLocation(this.game,
                    this.defender_p.player_num,
                    Location.NULLZONE,
                    0));
            } else {
                this.game.log("Security card already moved someplace else, not trashing.")
            }*/
            logger.info("finished, nullzone is " + this.defender_p.nullzone.length);
            logger.info("finished, trash is " + this.defender_p.trash.length);
            logger.info("trash is " + this.defender_p.trash.map(x => x.name).join("="));
            // it might already have been pushed some place else!

            this.s = CombatStep.CONTINUE_TO_SECURITY_STACK; // go back up to try again
            return false;
        }
        if (this.s == CombatStep.SECURITY_BATTLE_LOOP) {
            if (this.directed_subeffect_loop?.step()) {
                // go back up to put the security card in the trash and then restart the loop
                this.s = CombatStep.END_OF_BATTLE_START;
                return false;
            }
            return false;
        }


        if (this.s == CombatStep.DONE_WITH_SEC_CHECKS) {

            for (let card of this.defender_p.nullzone) {
                card.move_to(Location.TRASH);
            }
            this.defender_p.nullzone.length = 0;


            this.game.log("Done with security checks.");
            this.s = CombatStep.END_OF_ATTACK_EFFECT_LOOP_1;
            return false;
        }
        if (this.s == CombatStep.END_OF_ATTACK_EFFECT_LOOP_1) {


            for (let card of this.defender_p.nullzone) {
                card.move_to(Location.TRASH);
            }
            this.defender_p.nullzone.length = 0;


            // not done, but I'm done coding this for now
            this.game.log("End of attack");

            // Now I should do what I should've been doing from the start, and
            // make combat second-chair to the effect loop. Too
            // bad it's all at the end.

            // Is there anything *but* the source that will have
            // an END_OF_ATTACK effect?

            // It looks like [Security] cards have things that happen at end of battle but this is battle

            // I should have this whole branch in a subroutine
            if (!this.attacker.legal_combatant()) {
                this.s = CombatStep.ATTACK_ENDS;
                return [];
            }
            let solids = this.attacker.get_triggered_events(Phase.END_OF_ATTACK, this.game);
            logger.info("solid end-of-attack count is " + (solids && solids.length));
            if (solids) {
                this.game.log("End of attack effects have triggered: " + solids.map(x => x.label).join(","));
                this.game.do_effects(solids);
                this.s = CombatStep.END_OF_ATTACK_EFFECT_LOOP_2;
                return false;
            }
            this.s = CombatStep.ATTACK_ENDS;
            return [];
        }
        if (this.s == CombatStep.END_OF_ATTACK_EFFECT_LOOP_2) {
            return [];
        }

        console.error("we fell through");

        console.trace();
        return [];
    }
}