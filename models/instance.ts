
import { Player } from './player';
import { Card, Color, KeywordArray } from './card';
import { Game } from './game';
import { Location } from './location';
import { Phase, PhaseTrigger, TriggerMap } from './phase';
import { InterruptCondition, AtomicEffect, SubEffect, SolidEffect, StatusCondition, subeffect_to_string, status_cond_to_string } from './effect.js';
import { EventCause, GameEvent, attacking_events } from './event';
import { TargetDesc, SpecialInstance, Conjunction } from './target';
import { XX } from './effectloop';

import { createLogger } from "./logger";
const logger = createLogger('instance');

logger.silly("no");
logger.debug("yes");
logger.info("yes");

export class Instance {
    me_player: Player;
    n_me_player: number;
    other_player: Player;
    n_other_player: number;
    suspended: boolean;
    id: number;
    pile: Card[];
    play_turn: number;
    location: Location;
    game: Game;
    record: string[]; // track record of everything that happens to an instance, some events are missing
    kind: string;
    expiring_status_effects: StatusCondition[];
    private constant_status_effects: StatusCondition[];
    private label = "Xxx";

    static PLAYER_ID: number = 999;

    constructor(game: Game, me_player: Player, other_player: Player, empty: boolean = false) {
        this.kind = "Instance";
        this.me_player = me_player;
        this.expiring_status_effects = [];
        this.constant_status_effects = [];
        this.n_me_player = me_player.player_num;
        this.other_player = other_player;
        this.n_other_player = other_player.player_num;
        this.suspended = false;
        this.id = empty ? Instance.PLAYER_ID : game.next_id();
        this.pile = []; // 0 is bottom of pile
        this.play_turn = 0;
        this.record = [];
        this.game = game;
        this.location = Location.UNKNOWN; // I'm not sure about keeping this 
        // information here, now it's in two places.
        // "EGG" "FIELD" 
        if (!empty) game.instances[this.id] = this;
        logger.info(`Created Instance ${this.id} for player ${this.n_me_player} ${me_player.name()} `);
    }

    //// Convenience methods for describing the stack 
    public card_names(): string {
        return this.pile.map(x => x.name).join(",");
    }
    public card_ids(): string[] {
        return this.pile.map(x => x.id);
    }
    public card_ids_s(): string {
        return this.pile.map(x => x.id).join(",");
    }
    s_colors(): string {
        let ret: string[] = [];
        for (let i = Color.NONE; i < Color.MAX; i++) {
            if (this.has_color(i)) {
                ret.push(Color[i]);
            }
        }
        return ret.join(",");
    }


    //// Legacy UI helpers.
    // The model should *not* be worrying about this output formatting, but it's here for legacy reasons,
    // and anyone thinking of adding anything new should consider putting it in the UI instead.
    keyword(str: string): string {
        return `<span class=keyword>&lt;${str}&gt;</span> `;
    }
    status(str: string): string {
        return `<span class=status>${str}</span> `;
    }
    temp(str: string): string {
        return `<span class=temp>${str}</span> `;
    }
    encode(str: string): string {
        if (!str) return "";
        return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    }

    // short summary: used as text on card on UI to show status effects. See above about how this really should be UI code, not model code.
    // long summary: used in old text-based UI.
    summary(short: boolean = true): string {
        let ret = "";
        if (!short) {
            ret = this.id + " ";
            if (this.top().n_type != 2) { ret += this.top().type + " "; }
            ret += this.name() + " ";
            ret += this.top().id + " ";
        }
        let debug = true;
        let effects = debug ? this.all_statuses() :
            [... new Set(this.expiring_status_effects)];
        ret += effects.map(x => status_cond_to_string(x)).join(", ");
        if (!short) {
            if (this.suspended) { ret += this.status("RESTED"); }
        }
        if (this.can_attack()) { ret += this.status("CAN_ATK"); }

        // TODO: read this list of requested keywords from the client
        let keywords = ["Blocker", "Piercing", "Reboot", "Armor Purge", "Jamming", "Retaliation", "Alliance"];
        for (let word of keywords) {
            if (this.has_keyword(word)) { ret += this.keyword(word); }
        }
        if (!short) {
            if (this.has_level()) { ret += "Lv" + this.get_level() + " "; }
        }
        let sa = this.get_sa();
        if (this.has_security_attack()) {
            let delta = this.get_sa() - 1;
            let str = (delta < 0 ? "" : "+") + delta;
            ret += this.keyword(`Security A. ${str}`);
        }
        if (this.has_dp()) { ret += this.dp() / 1000 + "K "; }
        if (!short) {
            let ess = "";
            if (this.pile.length > 1) {
                ret += "[" + (this.pile.length - 1);
                for (let i = this.pile.length - 2; i >= 0; i--) {
                    // we should have a function that says "Agumon EX-1"
                    //         logger.debug("*** " + i);
                    //       logger.debug("*** " + this.pile[i]);
                    ret += " " + this.pile[i].name;
                    ess += " " + this.encode(this.pile[i].inherited_text);
                    // this isn't the right place to escape
                }
                ret += " ]" + ess;
            }
        }
        // ret += " " + this.pile.map( c => c.id ).join(",");
        return ret;
    }

    all_active_statuses(): StatusCondition[] {
        let ret: StatusCondition[] = [];
        let status_conditions = this.all_statuses();
        for (let sc of status_conditions) { // this.expiring_status_effects) {
            logger.debug(`SEE IF CAN EVO ${status_cond_to_string(sc)} `);
            if (this.can_do(sc.parent_subeffect!, false)) {
                ret.push(sc);
            }
        }
        return ret;
    }

    // TODO: re-factor with all_activate_statuses()
    all_statuses(): StatusCondition[] {
        this.expire_effects();
        let status_conditions = this.expiring_status_effects.concat(this.constant_status_effects).concat(this.me_player.all_player_status_effects(false));
        return status_conditions;
    }

    // Returns all currently useable SolidEffects: 
    // * gets effects on top card, on inherited cards, and tenp effects
    // * filters out "while X" if not X, and [your/opponent's turn] when not 
    // * doesn't filter out things where activation conditions fail
    // * filters out once-per-turn that have been used
    all_effects(): SolidEffect[] {
        let ret: SolidEffect[] = [];
        if (!this.top()) {
            logger.error("no top card");
            return ret;
        }
        // new effects returns labeled SolidEffects
        ret.push(...this.top().new_effects);
        let normal = ret.length;

        for (let i = 0; i < this.pile.length - 1; i++) {
            ret.push(...this.pile[i].new_inherited_effects);
        }
        let with_sources = ret.length;

        for (let i = 0; i < this.expiring_status_effects.length; i++) {
            if (this.expiring_status_effects[i].solid) {
                ret.push(this.expiring_status_effects[i].solid!);
            }
        }
        let with_temp = ret.length;

        // what effects were here before??
        for (let i = 0; i < this.me_player.expiring_status_effects.length; i++) {
            if (this.me_player.expiring_status_effects[i].solid) {
                ret.push(this.me_player.expiring_status_effects[i].solid!);
            }
        }

        let with_player = ret.length;

        // Now remove SolidEffects that aren't active
        for (let i = ret.length - 1; i >= 0; i--) {
            let solid = ret[i];
            let atomic = solid.effects && solid.effects[0];
            if (atomic) {
                // took out tests for can_activate here, maybe put back in. But an effect I can't
                // activate now I might be able to activate soon. Check 89fd63e5c14a8cdbe61bf34be32fbef4695ef0de
                if (solid.whose_turn) {
                    if ((solid.whose_turn == "mine" && this.n_me_player != this.game.turn_player) ||
                        (solid.whose_turn == "theirs" && this.n_me_player == this.game.turn_player)) {
                        ret.splice(i, 1);
                    }
                }
            }
        }
        let without_test_fails = ret.length;

        ret = ret.filter( x => ! (x.once_per_turn && x.n_last_used_turn == this.game.n_turn) );         
        logger.debug(`Effect counts are ${normal} then ${with_sources} then temp ${with_temp} then player ${with_player} and test_fails is down to ${without_test_fails}`);
        return ret;
    }

    // SolidEffects that trigger at a given phase (or pseudo-phase)
    get_triggered_events(phase: Phase, game: Game): SolidEffect[] {
        let ret: SolidEffect[] = [];
        let anyret: any[] = [];
        let all = this.all_effects();
        let _ = all[0];
        logger.debug(`checking game phase ${Phase[phase]} against ${all.length} ${all.map(x => PhaseTrigger[x.phase_trigger!]).join()}`);

        for (let se of all) {
            if (!se.phase_trigger) continue;
            if (se.phase_trigger) logger.debug("comparing against phase trigger " + PhaseTrigger[se.phase_trigger] + " with effect " + se.toString());

            // I need to make this much more generic!!

            for (let tm of TriggerMap) {
                // if phase is start of main, do my effect if it triggers off start of my main and my turn, or opponent's turn
                // need 'start of all turns' effects
                if (phase == tm.phase) {
                    if ((se.phase_trigger == tm.my_phase && this.n_me_player == game.turn_player) ||
                        (se.phase_trigger == tm.opponent_phase && this.n_me_player != game.turn_player) ||
                        (se.phase_trigger == tm.both_phases)) {
                        logger.info(`phase triggered: ${PhaseTrigger[se.phase_trigger]} effect ${se.toString()}`);
                        se.source = new SpecialInstance(this);
                        // THIS IS SUPER IMPORTANT!
                        // As SolidEffects "leave" the Instance they get labeled with the instance
                        se.trigger_location = this.location;
                        se.trigger_instance_id = this.id;
                        se.trigger_top_card_location_id = this.top().card_instance_id;
                        // (When we get the JP rules that say that [on deletion] triggers on the field, this 
                        // will technically be wrong, but it will still function correctly.)
                        ret.push(se);


                    }
                }
            }
        }
        // I don't think this debug code is needed any more.
        if (ret.length > 0) {
            logger.debug("length is " + ret.length);
            for (let r of ret) {
                logger.debug(r.toString());
                if (r.source) {
                    logger.debug("player is " + r.source.get_n_player());
                }
            }
            return ret;
        }
        return [];
    }

    // For passing over an API. The "summary" is arguably cheating 
    JSON_instance(): any {
        let instance = {
            id: this.id,
            label: this.label,
            name: this.name(),
            colors: this.s_colors(),
            dp: this.dp(),
            level: this.get_level(),
            suspended: this.suspended,
            // why were we using the x.card_instance_id?
            // stack: this.pile.map(x => `${x.id}@${x.card_instance_id}`),
            stack: this.pile.map(x => `${x.id}@${x.colors_s()}`),
            sa: this.get_sa(),
            loc: this.location,
            location: Location[this.location],
            summary: this.summary(true),

        };
        return instance;
    }

    // When effects trigger, we need to note the location.
    mark_outbound_solid_effects(solids: SolidEffect[]): SolidEffect[] {
        for (let se of solids) {
            // i'm duping this code in a shitload of places
            // A SolidEffect should probably have trigger() and activate() methods
            se.trigger_location = this.location;
            se.trigger_instance_id = this.id;
            se.trigger_top_card_location_id = this.top().card_instance_id;
        }
        return solids;

    }

    // An effect just happened -- does that trigger something?
    // 
    check_posteffect(sfx: SubEffect[]): SolidEffect[] {

        let debug = 0;
        let ret: SolidEffect[] = [];

        let my_effects = this.all_effects();
        // this only shows the first respond_to per effect
        logger.info(`Checking posteffect instance ${this.id} name ${this.name()} effects ${sfx.map(x=>GameEvent[x.game_event]).join(",")}`);

        logger.debug("looking in my " + my_effects.length + ": " + my_effects.map(x => GameEvent[x.respond_to[0] ? x.respond_to[0].ge : 1]).join(","));
        logger.debug("looking in game's " + sfx.length + ": " + sfx.map(x => GameEvent[x.game_event]).join(","));

        let me = new SpecialInstance(this);

        // If this effect matches *any*, it returns, but only once.
        // If I have an effect like "draw 1 for each monster deleted",
        // I still trigger just once, but need to keep track of how
        // many things hit me. That isn't implemented yet. 
        for (let my_fx of this.all_effects()) {
            if (!my_fx.respond_to) continue;
            // things not on field

            let my_reactors = my_fx.respond_to;
            // Things in trash only respond to self-deletion (implemented) or if they are [Trash] effects (not implemented)
            if (this.location == Location.TRASH) {
                let delete_of_self = false;
                for (let reactor of my_reactors) {
                    if (reactor.ge == GameEvent.DELETE && reactor.td.matches(this, me)) {
                        delete_of_self = true;
                        break;
                    }
                }
                if (!delete_of_self) continue; // we're in trash but this effect isn't [on deletion]
            }
            logger.debug(`my_fx is ${my_fx.label} ${my_fx.raw_text}, respond to is ${JSON.stringify(my_reactors)}`);
            game_effect_loop:
            for (let g_fx of sfx) {
                let ge = g_fx.game_event;

                if (debug) {
                    logger.debug("comparing to " + GameEvent[ge]);
                    logger.debug("first is " + (g_fx.game_event == GameEvent.DELETE));
                    logger.debug("second is " + (g_fx.chosen_target == this));
                    logger.debug("third is " + my_fx.respond_to);
                }
                if (!my_fx.respond_to) continue;
                if (debug) {
                    // dumping just the first 1 reactor for debug
                    logger.debug("fourth is " + (my_reactors[0].ge == GameEvent.DELETE));
                    logger.debug("fifth is " + my_reactors[0].td.matches(this, new SpecialInstance(this)));
                }

                // compare the game's EFFECT to my REACTOR
                let match = false;
                let me = new SpecialInstance(this);

                let my_matching_rx;
                let n = my_reactors.filter(x => x.ge == g_fx.game_event).length;
                if (n > 1) logger.error(`we have ${n} matches where we expect only 1`);
                if (my_matching_rx = my_reactors.find(x => x.ge == g_fx.game_event)) {
                    //                if (g_fx.game_event == my_rx.ge) {
                    // I am hoping that, if I have multiple triggers, only 1 is matchibg.
                    logger.debug("events line up: " + GameEvent[ge]);
                    logger.debug("EFFECT game fx chosen target");
                    logger.debug("EFFECT my target desc " + my_matching_rx.td);

                    // I think *most* things are going to be in this clause
                    if (ge == GameEvent.SUSPEND || ge == GameEvent.DELETE || ge == GameEvent.PLAY || ge == GameEvent.EVOLVE) {
                        logger.debug(" conjunction of game fx is " + Conjunction[g_fx.td.conjunction]);
                        logger.debug(" conjunction of my fn is  " + Conjunction[my_matching_rx.td.conjunction]);

                        if (my_matching_rx.cause && (my_matching_rx.cause & g_fx.cause!) == 0) {
                            logger.debug(`event causes don't line up mine ${my_matching_rx.cause} game ${g_fx.cause}`);
                            continue;
                        }

                        if (g_fx.chosen_target == this &&
                            my_matching_rx.td.matches(this, me)) {
                            match = true;
                            // cheat for retaliate      
                            my_fx.effects[0].weirdo.chosen_target = g_fx.spec_source;
                            // retaliate is only for deletions in battle, not
                            // deletions by effect or security battles.
                            logger.debug(`my_cause ${my_matching_rx.cause} and ${g_fx.cause}`);
                            // Not matching on cause, skip
                            if (my_matching_rx.cause && (my_matching_rx.cause & g_fx.cause!) == 0)
                                match = false
                        } else if (my_matching_rx.td.conjunction == Conjunction.SOURCE) {
                            if (g_fx.spec_source == this) {
                                logger.debug("I caused the event, match up!");
                                match = true;
                            }
                        } else {
                            match = my_matching_rx.td.matches(g_fx.chosen_target, me);
                        }


                    } else if (ge == GameEvent.ATTACK_DECLARE) {
                        // removed debug code a03547b881e70c410a41e6dc4f650ba0f1a3a64b
                        let fail = false;

                        // Is this a chet to check for "player" match here?
                        // Should I do it in Target::matches() ?
                        if (my_matching_rx.td.conjunction == Conjunction.PLAYER) {
                            fail = !("deck" in g_fx.chosen_target);
                        };
                        if (my_matching_rx.source) {
                            logger.debug("   CHECKING SOURCE!");
                            // matching on "me"
                            // I care who is attacking (i.e., me)
                            if (!my_matching_rx.source.matches(g_fx.spec_source!, me)) {
                                logger.debug("wrong source");
                                fail = true;
                            }
                        };
                        if (!fail) {
                            if (my_matching_rx.td.matches(g_fx.chosen_target, me)) {
                                logger.debug("target matches, too");
                                match = true;
                                // cheat for retaliate
                                my_fx.effects[0].weirdo.chosen_target = g_fx.spec_source;

                            }
                        }
                    } else if (ge == GameEvent.TRASH_FROM_HAND) {
                        // For now it's only hand cards that get trashed
                        // so I need to notice from the game event that the
                        // source is me, and that it's an effect.
                        if (my_matching_rx.td.matches(this, me)) {
                            // recognizing trashing from own hand (but not necessarily by my own effect)
                            match = (this.n_me_player == g_fx.chosen_target.n_me_player);
                        }
                    } else {
                        logger.warn("Just matching because event matches by default " + GameEvent[ge] + ".");
                        match = true;
                    }
                    if (match) {
                        my_fx.source = new SpecialInstance(this);
                        ret.push(my_fx);
                        logger.debug("MATCH!");
                        break game_effect_loop;
                    }
                }
            }
        }
        logger.info(`posteffect  returning ${ret.length} effects`);

        return this.mark_outbound_solid_effects(ret);
    }

    // preflight and postflight might just be the same logic
    // We're about to do something(s), get all effects that might interrupt it.
    check_preflight(sfx: SubEffect[]): SolidEffect[] {
        logger.info(`Checking preflight instance ${this.id} name ${this.name()} effects ${sfx.map(x=>GameEvent[x.game_event]).join(",")}`);
        let ret: SolidEffect[] = [];

        let my_effects = this.all_effects();

        for (let my_fx of this.all_effects()) {
            if (!my_fx.interrupt) continue;
            let my_interrupter = my_fx.interrupt;
            for (let g_fx of sfx) {
                // if we have a target, and it's in the bench, don't react, we can't see in there.
                // Kind of weird what there would ever be effects there.
                if (g_fx.chosen_target && g_fx.chosen_target.location == Location.EGGZONE) continue;
                let ge = g_fx.game_event;
                let match = false;
                let me = new SpecialInstance(this);
                if (g_fx.game_event == my_interrupter.ge) {
                    logger.info("events kinds match up: " + GameEvent[ge]);

                    //  if (my_matching_rx.cause && (my_matching_rx.cause & g_fx.cause!) == 0) {

                    if (my_interrupter.cause && (my_interrupter.cause & g_fx.cause) == 0) {
                        logger.info("events line up, but causes don't, skipping.");
                        continue;

                    }

                    if (!my_interrupter.td.matches(g_fx.chosen_target, me))
                        continue;

                    if (g_fx.chosen_target == this && my_interrupter.td.matches(this, me)) {
                        logger.debug("SPECIAL INST MADE TO BE " + this.id);
                        my_fx.source = new SpecialInstance(this);
                        for (let i = 0; i < my_fx.effects.length; i++) {
                            let atomic = my_fx.effects[i];
                            for (let j = 0; j < atomic.events.length; j++) {
                                atomic.events[j].n_player = this.n_me_player;
                            }
                        }
                        //                        my_fx.effects[0].events[0].n_player = this.n_me_player;
                        ret.push(my_fx);
                    } else if (true && my_interrupter.ge == GameEvent.EVOLVE) {
                        // If the *source* is in the bench, skip. 
                        if (g_fx.spec_source?.location == Location.EGGZONE) continue;
                        // we are trying to interrupt evolve
                        logger.debug("do we match? " + my_interrupter.td.toString() +
                            " player owner of target is " + g_fx.chosen_target.n_me_player +
                            " chosen tgt " + g_fx.chosen_target.get_name() +
                            " tgt_id " + g_fx.chosen_target.id + " me: " + me.get_instance().get_name());
                        if (my_interrupter.td.matches(g_fx.chosen_target, me)) {
                            logger.debug("evolve matches");
                            my_fx.source = new SpecialInstance(this);
                            ret.push(my_fx);
                        }
                    } else {
                        // by default, it matches
                        my_fx.source = new SpecialInstance(this);
                        ret.push(my_fx);
                    }


                }
            }
        }
        logger.info(`preflight returning ${ret.length} effects`);
        return this.mark_outbound_solid_effects(ret);
    }

    //# for board game dumping
    dump_summary(testmode: number = 1): string {
        // I'm returned "REST" in here but "DP" at the top...
        //let ret = this.suspended ? "REST," : "";
        let ret = "";
        let body = this.pile.map(x => x.testname(testmode)).reverse();
        let rested = (this.suspended) ? ["REST"] : [];
        if (testmode == 2) return [this.label].concat(body).concat(rested).join(",");
        if (testmode == 1) return rested.concat(body).join(",");
        return "Err";
    }

    in_play(): boolean {
        return this.location == Location.FIELD;
    }

    in_eggzone(): boolean {
        return this.location == Location.EGGZONE;
    }
    in_trash(): boolean {
        return this.location == Location.TRASH || this.location == Location.TOKENTRASH;
    }


    is_ready(): boolean { return !this.suspended };

    // is effect unexpired... i really need to make this its own class
    unexpired(effect: StatusCondition): boolean {
        logger.debug(`cc this is ${this} and this.game is ${this.game}`);
        logger.debug(`EXPIRE: ${effect.n} against ${this.game.n_turn}`);
        if (effect.p == Phase.END_OF_ATTACK) {
            // expire if we're not currently in an attack
            if (this.game.root_loop.combatloop) {
                logger.debug("still in combat, effect stays");
                return true;
            } else {
                logger.debug("no longer in combat");
                return false;
            }
        }
        if (!effect.n) return true; // forever
        if (!effect.p) return true;
        if (effect.n > this.game.n_turn) return true;
        if (effect.n < this.game.n_turn) return false;
        return this.game.phase <= effect.p;
    }


    expire_effects() {
        this.expiring_status_effects = this.expiring_status_effects.filter(x => this.unexpired(x));
    }

    // Can this thing *do* thing or have *thing* done to it.

    // Not sure if GAME_EVENT is the right thing here,
    // maybe we need to see who's doing that
    // I should probably put <Jamming> in here

    // This is being updated to capture the logic of "can I pay the cost?"
    can_do(effect: SubEffect, force_apply_status: boolean = true): boolean {
        if (effect.game_event == GameEvent.SUSPEND && !this.is_ready()) return false;

        for (let sc of this.all_statuses()) { //  expiring_status_effects) {
            logger.debug(`sc.s is ${sc.s} ${sc.s.immune} --> ${GameEvent[effect.game_event]}`);

            logger.debug(`ge is ${GameEvent[sc.s.game_event]}`);
            logger.debug(`td is ${sc.s.td.raw_text}`);
            logger.debug(`choose is is ${sc.s.choose}`);
            if (sc.s.immune) {
                // When looking at "immune to opponent's monster effects" we need to
                // 1. recognize it's by effect
                // 2. recognize the source
                if (sc.s.game_event == effect.game_event) {
                    let sccs = sc.s.cause;
                    if (sc.s.cause == undefined || !effect.cause) {
                        let a: any = null; a.effect_cause();
                    }
                    logger.debug(`1rew game events match up: ${GameEvent[effect.game_event]}`);
                    logger.debug(`1rew Effect cause is ${EventCause[effect.cause]} and the immune effect has cause ${EventCause[sc.s.cause]}`)
                    // If causes overlap, we can't do this
                    if (sc.s.cause & effect.cause) return false;
                }
                // For now, exempt SUSPEND and ATTACK_DECLARE from "all"
                // We've partially implemented checking the source,
                // that's how we should check things here.

                // Also, being immune still absolutely means we can get a status condition played on us
                if (sc.s.game_event == GameEvent.ALL &&
                    effect.game_event != GameEvent.SUSPEND &&
                    effect.game_event != GameEvent.ATTACK_DECLARE &&
                    (effect.game_event != GameEvent.GIVE_STATUS_CONDITION || !force_apply_status)) {
                    logger.debug(`1rew game events match up: ${GameEvent[effect.game_event]}`);
                    logger.debug(`1rew Effect cause is ${EventCause[effect.cause]} and the immune effect has cause ${EventCause[sc.s.cause]}`)
                    let td_match = sc.s.td.matches(effect.spec_source!, new SpecialInstance(this));
                    logger.debug(`1rew td match is ${td_match} td is ${sc.s.td} and source is ${effect.spec_source} `)
                    let cause_match = (sc.s.cause & effect.cause);
                    if (cause_match && td_match) return false;
                }
            }
        }
        return true;
    }

    _suspend(str: string) {
        this.log("Suspended because " + str +
            (this.suspended ? " but weas already suspended" : ""));
        this.suspended = true;
    }

    unsuspend(str: string): void {
        this.log("Unsuspended because " + str);
        this.suspended = false;
    }

    get_label() { return this.label; }

    set_label(label: string | undefined) {
        logger.debug(`setting label for ${this.id} to <${label}> `);
        if (!label || label == "") {
            this.label = "I" + this.id;
        } else {
            this.label = label;
        }
    }

    // should be called is_color ?
    has_color(color: Color): boolean {
        // again, assume just one color
        return this.top().has_color(color);
    }

    get_color_count(): number { if (this.top().is_two_color()) return 2; return 1; }
    // move away from this function
    // why would an *instance* ever need to check 2-color?
    is_two_color(): boolean { return this.top().is_two_color(); }

    get_playcost(): number | undefined { return this.top().p_cost; }

    has_level(): boolean { return !!this.top().level; }

    get_level(): number { return this.top().level; }

    has_dp(): boolean { return !isNaN(this.top().dp); }

    get_source_count(): number { return this.pile.length - 1; }

    clear_constant_effects(): void {
        logger.debug(`EFFECTS ${this.constant_status_effects.length} CLEARED ON INSTANCE ${this.id}`);
        logger.debug("they are" + this.constant_status_effects.map(x => status_cond_to_string(x)).join(";"));
        this.constant_status_effects.length = 0;
    }


    //    All of your Monster with [Sword] in its traits or <Retaliation> gain <Rush> and <Blocker>.
    /// that one finds the targets and applies the effects

    // While [Rapidster] or [Nega Source] is in this Monster's evolution cards, all of your opponent's suspended Monster get -4000 DP.
    //// use 'while X' to determine if I fire or not
    //// then target all suspended Monster and apply constant effect

    //[Your Turn] All of your Monsters get +1000 DP.
    //// make sure I am in my turn, then target all mine with +1000DP

    //[Your Turn] While your opponent has 2 or more suspended Monster in play, this Monster gets +2000 DP.",
    //// make sure i am in my turn, and that the condition is met, 
    //// then the target gets +2000DP

    //[Your Turn] This card gets +1000 DP for each of your opponent's suspended Monster.
    /// make sure i am in my turn, 
    /// then target gets +X000 DP

    // All of your opponent's Monster get -5000 DP until the end of your opponent's turn
    //// GAME EFFECT: all targets get -5000DP

    // All of your opponent's Monster gain \"[When Attacking] Lose 2 memory.\" until the end of your opponent's next turn.",
    //// GAME EFFECT: all targets get this solideffect

    // While this Monster is suspended, all of your Security Monster get +5000 DP."
    //// no real targets

    // While this Monster has <Piercing>, it gets +2000 DP.
    //// check condition, then targtets

    // [Your Turn] While this Monster has [Gargomon] or [Rapidmon] in its name, it gains <Piercing>.",
    /// check my turn, then check condition, then target gets effect

    // [All Turns] While this Monster is suspended, it gets +1000 DP. ",
    //// check condition, then apply effect

    run_constant_effects(): void {
        // find all things that get this effect and apply them
        // THESIS: They are constant if no trigger
        for (let cc of this.all_effects()) {
            if (!cc.interrupt && cc.respond_to.length == 0 && !cc.phase_trigger && !cc.main && !cc.keywords.includes("[Counter]")) {
                logger.debug("WE HAVE A X CONSTANT EFFECT! " + cc.toString());
            } else {
                continue;
            }
            if (cc.source) {
                //  logger.debug("WE HAVE A SOURCE");
            } else {
                //    logger.debug("WE HAVE A NON SOURCE");
            }
            let atomic = cc.effects[0];
            let w = atomic.events[0];
            // logger.debug("WE HAVE A WEIRDO td and ge OF " + (w.td ? w.td.toString() : 'nul') + " -- " + w.game_event.toString());
            // assume just a simple effect, first atomic and first effect
            let me = new SpecialInstance(this);

            cc.source = me;
            if (atomic.test_condition) {
                if (atomic.test_condition.test(this.game, me).length == 0) {
                    logger.debug("test condition failed");
                    continue;
                }
            }
            if (atomic.can_activate) {
                if (!atomic.can_activate(cc)) {
                    logger.debug("can_activate failed");
                    continue;
                }
            }
            logger.info(`doing terminus for ${GameEvent[w.game_event]} on ${w.td.raw_text} or ${Conjunction[w.td.conjunction]}`);
            if (w.td.conjunction == Conjunction.PLAYER || w.td.raw_text.match(/security/)) {
                w.n_player = this.n_me_player;
                XX.do_terminus_effect(w, undefined, this.game);
            } else {
                let targets = w.td && this.game.find_target(w.td, w.game_event, me); //
                for (let target of targets) {
                    logger.debug(target.toString());
                    w.n_player = this.n_me_player;
                    XX.do_terminus_effect(w, target, this.game);
                }
            }
        }
    }

    // This is being called too often, but at least not every UI tick
    dp(): number {
        // If any of my effects say "immune to X" I do that first
        let dp = this.top().dp;
        if (isNaN(dp))
            return dp;
        let status_conditions = this.all_statuses();
        logger.debug(`DP CALC FOR ${this.id} ${this.name()} ${this.top().id} WITH ${status_conditions.length} STATUS CONDITIONS`);
        // CHECK FOR IMMUNITY

        // TODO: this should use the above functions that calculate active effects
        for (let sc of status_conditions) { // this.expiring_status_effects) {
            logger.debug(`SEE IF CAN DO ${status_cond_to_string(sc)} `);
            if (this.can_do(sc.parent_subeffect!, false)) {
                if (sc.s.game_event == GameEvent.DP_CHANGE) {
                    logger.debug(`DP e ${dp} nn ${sc.s.n} `);
                    dp += sc.s.n!;
                }
            }
        }
        // self effects, like from inherited or native  
        for (let cc of this.all_effects()) {
            // assume just a simple effect, first atomic and first effect
            let atomic = cc.effects && cc.effects[0];
            if (atomic) {
                // does this belong here? Maybe it belongs in all_effects()

                if (atomic.can_activate) {
                    if (!atomic.can_activate(cc)) {
                        // I'm not sure anything will ever hit this
                        //   let a: any = null; a.finally();
                        continue;
                    }
                }
                let weirdo = atomic.events[0];
                if (weirdo)
                    if (this.can_do(weirdo)) {
                        if (weirdo.game_event == GameEvent.DP_CHANGE) {
                            logger.debug(`DP ${dp} nn ${atomic.events[0].n} `);
                            dp += atomic.events[0].n!;
                        }
                    }
            }
        }
        if (dp < 0) dp = 0;
        return dp;
    }

    is_token(): boolean { return this.top().is_token(); }
    is_monster(): boolean { return this.top().is_monster() || this.top().is_egg(); }
    is_tamer(): boolean { return this.top().is_tamer(); }
    is_option(): boolean { return this.top().is_option(); }
    is_egg(): boolean { return this.top().is_egg(); }

    // I can probably just recalc this each time we edit the stack...
    top(): Card { return this.pile[this.pile.length - 1]; }

    card_id(): string {
        return this.top().id;
    }

    name_is(str: string): boolean {
        return this.top().name_is(str);
    }

    has_trait(str: string): boolean {
        return this.top().has_trait(str);
    }

    name_contains(str: string): boolean {
        return this.top().name_contains(str);
    }
    trait_contains(str: string): boolean {
        return this.top().trait_contains(str);
    }

    // primary name, do not rely on this
    // what if it has changed?
    name(): string {
        if (!this.top()) { return "Player"; }
        return this.top().name;
    }
    get_name(): string {
        return this.name();
    }
    has_name(name: string): boolean {
        return this.name() == name;
    }

    get_sa(): number {
        let sa = 1;
        for (let e of this.get_new_effects_by_keyword("SECURITY ATTACK")) {
            let m = e.match(/Security.Attack.([+-\d]+)/);
            if (m) sa += parseInt(m[1]);
        }
        return sa;
    }


    // static
    // search both an object and an array of objects
    UNUSED_search_effects(effects: (any | any[]), label: string): any {
        if (Array.isArray(effects)) {
            return effects.find(x => this.UNUSED_search_effects(x, label));
        } else {
            return effects && effects[label];
        }
    }

    // This is unlikely to do the right thing for BT5 Shoutmon searching for <Blitz> 
    get_new_effects_by_keyword(label: string): string[] {
        let ret = [];
        let t: Card = this.top();
        let a;
        if (a = t.has_keyword(label)) {
            ret.push(a);
        }
        for (let i = 0; i < this.pile.length - 1; i++) {
            let t = this.pile[i];
            if (a = t.has_keyword(label, true)) { // inherited
                ret.push(a);
            }
        }

        // duped from card::has_keyword
        let regexp = new RegExp(label.replaceAll(/[ _]/ig, "."), "i");

        // TODO: use the all_effects() routines in here; this may not match 
        for (let sc of this.expiring_status_effects) {
            if (!sc.keywords) continue;
            let keywords: KeywordArray = sc.keywords;
            let key = Object.keys(keywords).find(key => regexp.test(key));
            if (key) ret.push(keywords[key]);
        }
        for (let sc of this.constant_status_effects) {
            if (!sc.keywords) continue;
            let keywords: KeywordArray = sc.keywords;
            let key = Object.keys(keywords).find(key => regexp.test(key));
            if (key) ret.push(keywords[key]);
        }
        return ret;
    }

    // this finds CARD keywords
    find_simple_effect(keyword: string): string[] | false {
        logger.silly("LOOKING FOR " + keyword);
        logger.silly(`testing ${this.name()} with ${this.pile.length} cards for ${keyword}`);
        let t: Card = this.top();
        let x = t.has_keyword(keyword);
        if (x && x.length > 0) {
            return [x]; // <-- move to this style
        }

        // Do I need to distinguish between *card* keywords and *effect* keywords???
        for (let i = 0; i < this.pile.length - 1; i++) {
            let c: Card = this.pile[i];
            let x = c.has_keyword(keyword, true);
            if (x && x.length > 0) return [x];
        }

        let fx = this.all_effects();
        let regexp = new RegExp(keyword.replaceAll(/[ _]/ig, "."), "i");
        for (let solid of fx) {
            if (!solid.interrupt && !solid.respond_to && !solid.phase_trigger && !solid.main && !solid.keywords.includes("[Counter]")) {
                logger.debug("constant effect " + solid.toString() + "  == " + solid.keywords.join(",,,"));
            }

            let keywordlist = solid.keywords;
            logger.silly("searching in list " + keywordlist.join(","));
            let key = keywordlist.find(key => regexp.test(key));
            if (key) return [keyword];
        }
        return false;
    }

    has_keyword(keyword: string) {
        return this.get_new_effects_by_keyword(keyword).length > 0;
    }
    // Only use the syntactic sugars below if the game logic will be checking naturally
    has_reboot(): boolean {
        return this.get_new_effects_by_keyword("REBOOT").length > 0;
    }
    has_piercing(): boolean {
        return this.get_new_effects_by_keyword("PIERCING").length > 0;
    }
    has_jamming(): boolean {
        return this.get_new_effects_by_keyword("JAMMING").length > 0;
    }
    has_retaliation(): boolean {
        return this.get_new_effects_by_keyword("RETALIATION").length > 0;
    }
    has_blocker(): boolean {
        return this.get_new_effects_by_keyword("BLOCKER").length > 0;
    }
    // just has the keyword someplace
    has_security_attack(): boolean {
        return this.get_new_effects_by_keyword("SECURITY ATTACK").length > 0;
    }
    is_unblockable(): boolean {
        let status_conditions = this.all_active_statuses();
        return !!status_conditions.find(x => x.s.game_event == GameEvent.UNBLOCKABLE);
    }


    log(msg: string): void { this.history(msg); }
    history(msg: string): void {
        this.record.push(`TURN ${this.game.n_turn} ${msg} `);
        // also give to player, which will also give to game
        this.me_player.log(msg);
    }
    logs(): string { return this.record.join("\n"); }

    // This should handle all logic of combatants suddenly losing their
    // ability to be in combat
    legal_combatant(): boolean {
        if (!this.is_monster()) return false;
        if (!this.in_play()) return false;
        if (!this.has_dp()) return false; // not sure this ever happens
        return true;
    }
    can_attack(td?: TargetDesc, conditions?: string): (false | number[]) {
        logger.info("can_attack conditions " + conditions);
        // I'm manually parsing td
        if (this.game.n_turn == this.play_turn && !this.has_keyword("Rush")) {
            if (!conditions || !conditions.match(/the turn/)) {
                return false;
            }
        }
        if (!this.has_dp()) return false;
        if (!this.in_play()) return false;
        if (this.in_eggzone()) return false;

        let [suspend, declare] = attacking_events(this.game, this, this.other_player);
        // attacking self, as place holder

        if (conditions && conditions.match(/without suspending/)) {
            logger.info("attack without suspend");
        } else {
            if (!this.can_do(suspend)) return false;
        }

        let can_attack_mon = (td && td.raw_text != "" && td.raw_text != "your opponent's monster") ? false : true;

        // TODO: verify all these are legit attack targets
        let ret = [];
        if (can_attack_mon) {
            for (let mon of this.other_player.field) {
                // TODO: make this.can_do() handle the is_ready and is_monster clauses automatically
                if (!mon.is_ready() && mon.is_monster() && this.can_do(declare)) {
                    ret.push(mon.id);
                }
            }
        }
        // if we can attack directly add it. 
        if (this.can_do(declare)) {
            if (td) {
                if (td.raw_text == "your opponent's monster") {
                    // do nothing
                } else {
                    ret.push(0);
                }
            } else {
                ret.push(0);
            }
        }
        // things in the breeding area cannot attack...
        return ret.length == 0 ? false : ret;
    }

    // This is for "main" on field, so if I'm an Option, return the [Main] that has <Delay>"
    get_main(): SolidEffect | null {
        for (let solid of this.all_effects()) {
            if (solid.main) {
                if (this.is_option()) {
                    if (solid.keywords.includes("＜Delay＞")) return solid;
                } else {
                    return solid;
                }
            }
        }
        return null;

    }

    // Can this card evolve on top of us?
    // "available_memory" used to be checked, it isn't now.
    can_evolve(card: Card, available_memory: number): number[] | false {
        let top = this.top();
        if (!top) {
            logger.error("NO TOP!");
            return false;
        }
        let ret: number[] = [];
        logger.debug(`I am ${this.name()} level ${this.get_level()} with colors ${this.s_colors()}`);
        let conditions = [...card.evolve_conditions];

        // I should refactor this

        let status_conditions = this.all_statuses(); // lthis.expiring_status_effects.concat(this.constant_status_effects);
        for (let sc of status_conditions) { // this.expiring_status_effects) {
            logger.debug(`SEE IF CAN EVO ${status_cond_to_string(sc)} `);
            if (this.can_do(sc.parent_subeffect!, false)) {
                if (sc.s.game_event == GameEvent.MAY_EVO_FROM) {
                    logger.info(`we can evo into ${sc.s.n_mod}`);
                    if (sc.s.n_mod == card.name) {
                        ret.push(sc.s.n!);
                    }
                }
            }
        }

        for (let evo_cond of conditions) {
            if (evo_cond.text) logger.error("unknown evo condition: " + evo_cond.text);
            logger.debug(`looking up evo condition ${Color[evo_cond.color!]} level ${evo_cond.level} cost ${evo_cond.cost}`);
            // we have to match all things that exist
            if (evo_cond.color && !this.has_color(evo_cond.color)) continue;
            if (evo_cond.level && evo_cond.level != this.get_level()) continue;
            if (evo_cond.name_is && !this.name_is(evo_cond.name_is)) continue;
            if (evo_cond.name_contains && !this.name_contains(evo_cond.name_contains)) continue;
            if (evo_cond.trait && !this.has_trait(evo_cond.trait)) continue;
            ret.push(evo_cond.cost);
        }
        ret = [... new Set(ret)] // only unique elements
        if (ret.length > 0) return ret;
        return false;
    }

    do_evolve(_card: Card) {  // doesn't check if we "can"
        // TODO: check "if this would evolve" effects
        if (this.location != Location.FIELD &&
            this.location != Location.EGGZONE) {
            logger.error('evolving in wrong place ' + this.location + " " + this.id + " " + this.get_name());
            let a: any = null; a.evo_location();
        }
        // how do I remove the card from hand??        
        let card = _card.extract();
        card.move_to(this.location, this);
        this.history(`Evolved to ${card.name} ${card.id} for cost ${card.e_cost} `);
        logger.info("Evolved to " + card.id + " on turn " + this.game.n_turn);
        this.game!.ui_card_move();
    }

    add_status_cond(sub: SubEffect) { // s: StatusCondition) {
        let s = sub.status_condition!;
        s.parent_subeffect = sub;
        if (s.exp_description) {
            this.expiring_status_effects.push(s);
        } else {
            this.constant_status_effects.push(s);
        }
        //   let expire;
    }

    deevolve(count: number, args: any = {}): boolean {
        this.log("removing " + count + " from top, current size is " + this.pile.length);
        while (count > 0) {
            if (this.pile.length <= 1) {
                this.log("cannot remove only remaining card");
                return false;
            }
            if (this.has_level() && this.get_level() == 3 && !args['force']) {
                this.log("Monster is level 3, cannot devolve any more");
                return false; // ? false? I dunno.
            }
            let c: Card = this.pile.pop()!;
            this.log(`Moving ${c.id} to trash`);
            this.push_to_trash(c);
            count--;
        }
        return true;
    }

    // "reason" is purely for human consumption
    do_bounce(reason: string) { this.do_removal("hand", reason); }

    do_trash(reason: string) { this.do_removal("trash", reason); }

    do_bottom_deck(reason: string) { this.do_removal("bottom_deck", reason); }

    do_delete(reason: string) { this.do_removal("delete", reason); }

    // Make sure I delete from the bottom to the top
    do_removal(which: string = "delete", reason: string) {
        logger.debug(`removing by ${which} ${this.name()} ${this.id} for ${reason}???`);

        let verb = "Deleting";
        let location = Location.TRASH;
        let s_location = "trash";
        let position = "TOP"; // maybe stuff should go to top of trash anyway

        if (which == "trash") {
            verb = "Trashing";
        } else if (which == "hand") {
            verb = "Bouncing";
            location = Location.HAND;
        } else if (which == "bottom_deck") {
            verb = "Bottom-decking";
            location = Location.DECK;
            s_location = "bottom of deck";
            position = "BOTTOM";
        }

        this.log(`${verb} (for ${reason}?), sent to ${s_location} with this stack: ${this.pile.map(c => c.name + c.id).join(",")}`);

        // trash all remaining cards
        for (let i = 0; i < this.pile.length; i++) {
            let card = this.pile[i];
            logger.debug("MOVING CARD " + card.name + " TO TRASH");
            if (i < this.pile.length - 1) {
                this.push_to_trash(card);
            } else {
                this.push_to_location(location, card, position);
            }
        }

        // do I really need to remove an instance?
        this.me_player._remove_instance(this.id);
        this.location = location;

        // update ui
        this.game.ui_card_move();
    }

    push_to_deck_unused(card: Card) { this.push_to_location(Location.DECK, card, "BOTTOM"); }

    push_to_trash(card: Card) { this.push_to_location(Location.TRASH, card); }

    push_to_location(location: Location, card: Card, position: string = "TOP") {

        this.game.log(`Moving ${card.name} to ${Location[location].toLowerCase()} ${position}`);
        if (card.overflow != 0) {
            // Memory change happens immediately.
            // TODO: Consolidate with devolve. 
            this.game.la("Overflow " + card.overflow);
            if (this.n_me_player == this.game.turn_player) {
                this.game.change_memory(card.overflow);
            } else {
                this.game.change_memory(-card.overflow);
            }
        }
        card.move_to(location, undefined, position);
    }

    // for placing option cards
    static place(card: Card, game: Game, me: Player, other: Player): Instance {
        let instance = new Instance(game, me, other);

        card.move_to(Location.FIELD, instance);
        instance.play_turn = game.n_turn;
        logger.debug("Placed on n_turn " + game.n_turn);
        instance.log(`Placed as ${card.name} ${card.id} `);
        instance.location = Location.FIELD;
        game.ui_card_move();
        return instance;
    };

    // returns a newly created instance is played, go here. 
    // TODO: consolidate with "place" above and "hatch" below
    static play(card: Card, game: Game, me: Player, other: Player): Instance {
        let instance = new Instance(game, me, other);
        card.move_to(Location.FIELD, instance);
        instance.play_turn = game.n_turn;
        logger.debug("played on n_turn " + game.n_turn);
        instance.log(`Played as ${card.name} ${card.id} for cost ${card.p_cost}`);
        instance.location = Location.FIELD;
        game.ui_card_move();
        return instance;
    };

    // When an instance is moved from hatchery to battle area
    move(l: Location) {
        for (let card of this.pile) {
            card.move_to(l);
        }
        this.location = l;
    }

    // returns an instance
    static hatch(card: Card, game: Game, me: Player, other: Player): Instance {
        let instance = new Instance(game, me, other);
        instance.game = game;
        card.move_to(Location.EGGZONE, instance);
        instance.log(`Hatched as ${card.name} ${card.id}`);
        instance.location = Location.EGGZONE;
        game.ui_card_move();
        return instance;
    }

    // this is only called from card.ts, right?
    _add_card(card: Card, order: string = "TOP") {
        // this makes duplicate log entries
        this.log(`TECH: adding ${card.name}:${card.id}`);
        if (order == "TOP")
            this.pile.push(card);
        else
            this.pile.unshift(card);
    }


};


