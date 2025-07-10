
import { Player } from './player';
import { AppEvolveCondition, Card, CardLocation, Color, EvolveCondition, KeywordArray, LinkCondition } from './card';
import { Game } from './game';
import { Location } from './location';
import { Phase, PhaseTrigger, TriggerMap } from './phase';
import { InterruptCondition, AtomicEffect, SubEffect, SolidEffect, StatusCondition, subeffect_to_string, status_cond_to_string, Solid_is_triggered } from './effect.js';
import { EventCause, GameEvent, attacking_events } from './event';
import { TargetDesc, SpecialInstance, Conjunction, TargetSource } from './target';
import { XX } from './effectloop';

import { createLogger } from "./logger";
import { EffectAndTarget, for_each_count_target, get_mult } from './util';
import { cpSync } from 'fs';
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
    index: number; // numeric index, to match CardLocation interface
    pile: Card[];
    // given plugged cards, we should move to a model where an instance
    // is exactly 1 card, with a pile of "evolution cards" and a pile of "plugged cards"
    plugged: Card[] = []; // ordered bottom to top, again. 

    play_turn: number;
    location: Location;
    game: Game;
    record: string[]; // track record of everything that happens to an instance, some events are missing
    readonly kind: string;
    expiring_status_effects: StatusCondition[];
    private constant_status_effects: StatusCondition[];
    private label = "Xxx";

    static PLAYER_ID: number = 999;

    constructor(game: Game, me_player: Player, other_player: Player, empty: boolean = false) {
        // I hate overloading an instance to be a player
        this.kind = empty ? "Player2" : "Instance";
        this.me_player = me_player;
        this.expiring_status_effects = [];
        this.constant_status_effects = [];
        this.n_me_player = me_player.player_num;
        this.other_player = other_player;
        this.n_other_player = other_player.player_num;
        this.suspended = false;
        this.id = empty ? Instance.PLAYER_ID : game.next_id();
        this.index = this.id;
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
        let ret = this.pile.map(x => x.name).join(",");
        // if (this.plugged.length > 0)
        //    ret += "PLUG," + this.plugged.map(x => x.name).join(",");
        return ret;
    }
    public card_ids(): string[] {
        return this.pile.map(x => x.id);
    }
    public card_ids_s(): string {
        return this.pile.map(x => x.id).join(",");
    }
    colors(): Color[] {
        let ret: Color[] = [];
        for (let i = Color.NONE; i < Color.MAX; i++) {
            if (this.has_color(i)) {
                ret.push(i);
            }
        }
        return ret;
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

    // source_cards is a list of all things under us
    source_cards_UNUSED(): Card[] {
        return [];
    }

    // TODO: a generic way of getting a source card so, regardless if it's
    // an inherit or a plug, we can request its text, its effect, its keywords
    source_effects(): SolidEffect[] {
        let ret: SolidEffect[] = [];
        //        for (let i = this.pile.length - 2; i >= 0; i--) {
        for (let i = 0; i < this.pile.length - 1; i++) {
            ret.push(... this.pile[i].new_inherited_effects);
        }
        for (let plug of this.plugged) {
            // "when linking" shouldn't be considered a linked effect
            let plug_fx = plug.new_link_effects;
            ret.push(...plug.new_link_effects.filter(x => !x.keywords.includes("[When Linking]")));
        }
        return ret;
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
    summary(short: boolean = false): string {
        let ret = "";
        if (!short) {
            ret = this.id + " ";
            if (this.top().n_type != 2) { ret += this.top().type + " "; }
            ret += this.name() + " ";
            ret += this.top().id + " ";
        }
        let debug = true;
        //        let effects = debug ? this.all_statuses() :
        //          [... new Set(this.expiring_status_effects)];
        let effects = this.all_statuses(true);
        effects.forEach(sc => {
            let s = status_cond_to_string(sc);
            // why no valid_effect in here??
            if (!this.can_do(sc.parent_subeffect!, false))
                s = "<s>" + s + "</s>";
            ret += "•" + s + "<br/>";
        }
        )
        // special case for linkDP, while we figure out what it does
        for (let plug of this.plugged) {
            //          if (plug.link_dp) {
            //            dp += plug.link_dp;
            //            ret += "• +" dp +  + s + "<br/>";
            //  }
        }


        //    effects.array.forEach(element => {
        //        
        //   });
        //   effects.forEach( x => ret += "x";
        //            let str = status_cond_to_string(x);

        //   };

        //        ret += effects.map(x => "•" + status_cond_to_string(x)).join("<br>") + "<br>";
        if (!short) {
            if (this.suspended) { ret += this.status("RESTED"); }
        }

        if (this.can_attack()) { ret += this.status("CAN_ATK"); }

        // TODO: read this list of requested keywords from the client
        //let keywords = ["Blocker", "Piercing", "Reboot", "Armor Purge", "Jamming", "Retaliation", "Alliance", "Rush"];
        // don't need Security A here, it'll be handled elsewhere

        for (let word of this.get_all_keywords()) {
            // checking has_keyword filters out Security A but maybe we should just filter it out otherwise
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
        // handled elsewhere now
        //if (this.has_dp()) { ret += this.dp() / 1000 + "K "; }
        if (!short) {
            let ess = "";
            if (this.is_monster() && this.pile.length > 1) {
                ret += "[" + (this.pile.length - 1);
                for (let i = this.pile.length - 2; i >= 0; i--) {
                    // we should have a function that says "Agumon EX-1"
                    //         logger.debug("*** " + i);
                    //       logger.debug("*** " + this.pile[i]);
                    ret += " " + this.pile[i].name;
                    ess += " " + this.encode(this.pile[i].inherited_text);
                    // this isn't the right place to escape
                }
                for (let i = this.pile.length - 2; i >= 0; i--) {
                    // we should have a function that says "Agumon EX-1"
                    //         logger.debug("*** " + i);
                    //       logger.debug("*** " + this.pile[i]);
                    ret += " " + this.pile[i].name;
                    ess += " " + this.encode(this.pile[i].link_text);
                    // this isn't the right place to escape
                }

                ret += " ]" + ess;
            }
        }
        // ret += " " + this.pile.map( c => c.id ).join(",");
        return ret;
    }

    // doesn't show immune effects
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
    all_statuses(include_ignored: boolean = false): StatusCondition[] {
        this.expire_effects();
        // Player status may not necessarily apply to me, like "All of your yellow monsters" 
        let status_conditions = this.expiring_status_effects.concat(this.constant_status_effects);
        let blankets = this.me_player.all_player_status_effects(false, this);
        // only the blankets that apply to me

        blankets = blankets.filter(stat0 => {
            // console.error(370, "instance", this && this.id, this.top().name);
            // what's the "source"? I don't think it's the instance.
            //let spec_source = new SpecialInstance(instance);
            // for blanket effects, the first targets struct is what we filter on, if anything
            let parent = stat0.parent_subeffect;
            if (parent) {
                //console.error(374, parent.td.targets);
                //  console.error(377, parent.spec_source);
                let target = parent.td.targets[0];
                let spec_source = parent.spec_source;
                if (spec_source) {
                    let special = new SpecialInstance(spec_source as Instance);
                    let match = target.matches(this, special, this.game);
                    //console.error(385, "match", match);
                    return match;
                }
            }
            return true;
        })

        return status_conditions.concat(blankets);
    }

    // "valid" might be misleading.
    valid_effect(s: SolidEffect): boolean {
        let atomic = s.effects && s.effects[0];
        if (!atomic) return false;
        if (atomic.can_activate) {
            if (!atomic.can_activate(s)) {
                // I'm not sure anything will ever hit this
                // let a: any = null; a.finally();
                return false;
            }
        }
        let weirdo = atomic.events[0];
        if (!weirdo) return false;
        return this.can_do(weirdo);
    }

    // Returns all currently useable SolidEffects: 
    // * gets effects on top card, on inherited cards, and tenp effects
    // * filters out "while X" if not X, and [your/opponent's turn] when not 
    // * doesn't filter out things where activation conditions fail
    // * doesn't filter out things where there's immunity
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

        if (this.is_monster()) {
            ret.push(...this.source_effects());
        }
        let with_sources = ret.length;

        /*     for (let i = 0; i < this.expiring_status_effects.length; i++) {
                 if (this.expiring_status_effects[i].solid) {
                     ret.push(... this.expiring_status_effects[i].solid!);
                 }
             }*/
        let with_temp = ret.length;

        // what effects were here before??
        /*    for (let i = 0; i < this.me_player.expiring_status_effects.length; i++) {
                if (this.me_player.expiring_status_effects[i].solid) {
                    ret.push(... this.me_player.expiring_status_effects[i].solid!);
                }
            }
    */
        let status_conditions = this.all_statuses();
        for (let i = 0; i < status_conditions.length; i++) {
            if (status_conditions[i].solid) {
                //.  console.error(278, status_conditions[i]);
                ret.push(...status_conditions[i].solid!);
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

        ret = ret.filter(x => !(x.once_per_turn && x.n_last_used_turn == this.game.n_turn));

        // assume that instances only exist on field
        ret = ret.filter(x => !x.active_zone);
        logger.debug(`Instance ${this.id} Effect counts are ${normal} then ${with_sources} then temp ${with_temp} then player ${with_player} and test_fails is down to ${without_test_fails}`);



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
    // returns false if the instance is broken, what calls this should filter that out
    JSON_instance(): any {

        // check if we have no cards.
        // could extract() take care of checking this? feels bad to check here instead
        // nothing in the game right now should extract() the only card in a stack but as future-proofing we handle it

        if (this.pile.length == 0) {
            this.game._remove_instance(this.id);
            this.me_player._remove_instance(this.id);
            console.error("REMOVING INSTANCE " + this.id);
            return undefined;
        }

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
            stack: this.pile.map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`),
            plugs: this.plugged.reverse().map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`),
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
            // we were keeping track of the prior negation.
            // what else was being tracked?
            se.effects.forEach(
                function (atomic: AtomicEffect) {
                    atomic.events.forEach(
                        function (sub: SubEffect) {
                            sub.negated = false;
                            // sub.chosen_target = undefined;
                            //   sub.chosen_target2 = undefined;
                            // sub.chosen_target3 = undefined;

                        })
                })
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
        logger.info(`Checking posteffect instance ${this.id} name ${this.name()} effects ${sfx.map(x => GameEvent[x.game_event]).join(",")}`);

        logger.debug("looking in my " + my_effects.length + ": " + my_effects.map(x => GameEvent[x.respond_to[0] ? x.respond_to[0].ge : 1]).join(","));
        logger.debug("looking in game's " + sfx.length + ": " + sfx.map(x => GameEvent[x.game_event]).join(","));

        let me = new SpecialInstance(this);

        // If this effect matches *any*, it returns, but only once.
        // If I have an effect like "draw 1 for each monster deleted",
        // I still trigger just once, but need to keep track of how
        // many things hit me. That isn't implemented yet. 
        for (let my_fx of this.all_effects()) {

            //    if (Instance.one_effect_matchup("preflight", my_fx, sfx, new SpecialInstance(this), this.n_me_player, this.game, this))
            //      ret.push(my_fx);



            if (!my_fx.respond_to) continue;
            // things not on field


            let my_reactors = my_fx.respond_to;
            // Things in trash only respond to self-deletion (implemented) or if they are [Trash] effects (not implemented)
            logger.debug(`i am ${this.get_name()} my location is ${Location[this.location]}`);
            if (this.location == Location.TRASH) {
                let delete_of_self = false;
                for (let reactor of my_reactors) {
                    if (reactor.ge == GameEvent.DELETE && reactor.td.matches(this, me, this.game)) {
                        delete_of_self = true;
                        break;
                    }
                }
                if (!delete_of_self) continue; // we're in trash but this effect isn't [on deletion]
                logger.info("delete of self matched");
            }
            logger.debug(`my_fx is ${my_fx.label} ${my_fx.raw_text}, respond to is ${JSON.stringify(my_reactors)}`);
            let what_triggers_me = [];

            //            game_effect_loop:
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
                    logger.debug("fifth is " + my_reactors[0].td.matches(this, new SpecialInstance(this), this.game));
                }

                // compare the game's EFFECT to my REACTOR
                let match = false;
                let me = new SpecialInstance(this);

                let my_matching_rx;
                let n = my_reactors.filter(x => x.ge == g_fx.game_event).length;
                if (n > 1) logger.error(`we have ${n} matches where we expec t only 1`);



                if (my_matching_rx = my_reactors.find(x => Instance.match_certain_effect(g_fx, x, this.n_me_player))) {
                    //                if (g_fx.game_event == my_rx.ge) {
                    // I am hoping that, if I have multiple triggers, only 1 is matchibg.
                    logger.info("events line up: " + GameEvent[ge] + " " + GameEvent[my_matching_rx.ge] + " " + my_fx.label);
                    if (ge == GameEvent.NIL) continue;
                    logger.info("EFFECT game fx chosen target");
                    logger.info("EFFECT my target desc " + my_matching_rx.td);

                    if (ge == GameEvent.MOVE_CARD) {
                        // easy cae
                        match = Instance.match_move(g_fx, my_matching_rx);
                    } else if (ge == GameEvent.FIELD_TO_HAND && my_matching_rx.ge == GameEvent.MOVE_CARD) {
                        match = Instance.match_move(g_fx, my_matching_rx);
                        // I think *most* things are going to be in this clause
                    } else if (my_matching_rx.ge == GameEvent.ADD_CARD_TO_HAND) {
                        match = true;
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
                            if (!my_matching_rx.source.matches(g_fx.spec_source!, me, this.game)) {
                                logger.debug("wrong source");
                                fail = true;
                            }
                        };
                        if (!fail) {
                            if (my_matching_rx.td.matches(g_fx.chosen_target, me, this.game)) {
                                logger.debug("target matches, too");
                                match = true;
                                // cheat for retaliate
                                my_fx.effects[0].weirdo.chosen_target = g_fx.spec_source;

                            }
                        }
                    } else if (ge == GameEvent.TRASH_FROM_HAND) {
                        if (my_matching_rx.td.matches(g_fx.chosen_target, me, this.game)) {
                            // this used to be a special case but maybe it doesn't need to be any more
                            match = (this.n_me_player == g_fx.chosen_target.n_me_player);
                        }
                    } else if (true) { // if (ge == GameEvent.SUSPEND || ge == GameEvent.DELETE || ge == GameEvent.PLAY || ge == GameEvent.EVOLVE || ge == GameEvent.PLUG) {
                        logger.info(" trying default for GE " + GameEvent[ge]);
                        logger.info(" conjunction of game fx is " + Conjunction[g_fx.td.conjunction]);
                        logger.info(" conjunction of my fn is  " + Conjunction[my_matching_rx.td.conjunction]);

                        if (!Instance.compare_cause(g_fx, my_matching_rx, this.n_me_player)) {
                            //                      if (my_matching_rx.cause && (my_matching_rx.cause & g_fx.cause!) == 0) {
                            logger.info(`event causes don't line up mine ${my_matching_rx.cause} game ${g_fx.cause}`);
                            continue;
                        }

                        if (g_fx.chosen_target == this &&
                            my_matching_rx.td.matches(this, me, this.game)) {
                            match = true;
                            // cheat for retaliate      
                            my_fx.effects[0].weirdo.chosen_target = g_fx.spec_source;
                            // retaliate is only for deletions in battle, not
                            // deletions by effect or security battles.
                            logger.info(`my_cause ${my_matching_rx.cause} and ${g_fx.cause}`);
                            // Not matching on cause, skip
                            if (my_matching_rx.cause && (my_matching_rx.cause & g_fx.cause!) == 0)
                                match = false
                        } else if (my_matching_rx.td.conjunction == Conjunction.SOURCE) {
                            if (g_fx.spec_source == this) {
                                logger.info("I caused the event, match up!");
                                match = true;
                            }
                        } else {
                            match = my_matching_rx.td.matches(g_fx.chosen_target, me, this.game);
                        }

                        if (!Instance.check_td2(my_matching_rx, g_fx, ge, me, this.game)) {
                            logger.info("td2 check failed");
                            match = false;
                        }// common code


                    } else {
                        logger.warn("Trying default??? " + GameEvent[ge] + ".");
                        match = true;

                    }
                    if (match) {
                        my_fx.source = new SpecialInstance(this);
                        what_triggers_me.push(g_fx);
                        //my_fx.trigger_incidents = [g_fx]; // why only 1?? this is a bug
                        //ret.push(my_fx);
                        logger.debug("MATCH!");
                        //break game_effect_loop;
                    }
                }
            }
            if (what_triggers_me.length > 0) {
                my_fx.trigger_incidents = what_triggers_me;
                ret.push(my_fx);
            }

        }
        logger.info(`posteffect  returning ${ret.length} effects`);

        return this.mark_outbound_solid_effects(ret);
    }

    // as side effect, alters my_fx to track what triggered it
    static one_effect_matchup(type: "preflight" | "posteffect", my_fx: SolidEffect, sfx: SubEffect[], me: TargetSource, n_me_player: number, game: Game, thus: Instance | CardLocation): boolean {

        let my_matchups;
        if (type === "preflight") {
            my_matchups = my_fx.interrupt;
        } else {
            my_matchups = my_fx.respond_to;
        }
        if (!my_matchups) return false;

        let ret: SolidEffect[] = [];

        let what_triggers_me = [];
        for (let g_fx of sfx) {
            // if we have a target, and it's in the bench, don't react, we can't see in there.
            // Kind of weird what there would ever be effects there.
            if (g_fx.chosen_target && g_fx.chosen_target.location == Location.EGGZONE) continue;
            let ge = g_fx.game_event;
            if (ge == GameEvent.NIL) continue;

            let match = false;
            for (let my_interrupter of my_matchups) {

                //Instance.event_compare(g_fx, my_interrupter, n_me_player)

                if (Instance.match_certain_effect(g_fx, my_interrupter, n_me_player)) {
                    logger.info("events kinds match up... " + GameEvent[ge]);
                    //  if (my_matching_rx.cause && (my_matching_rx.cause & g_fx.cause!) == 0) {

                    if (my_interrupter.cause && (my_interrupter.cause & g_fx.cause) == 0) {
                        logger.info("events line up, but causes don't, skipping.");
                        continue;

                    }



                    if (g_fx.game_event === GameEvent.PLUG && my_interrupter &&
                        type === "posteffect"
                    ) {
                        if (!my_interrupter.td.matches(g_fx.chosen_target3, me, game)) {
                            logger.info("plug target doesn't match");
                            continue;
                        }
                    } else if (!my_interrupter.td.matches(g_fx.chosen_target, me, game)) {
                        logger.info("target doesn't match");
                        continue;
                    }
                    logger.info("still testing");
                    // more things should be made generic like this
                    if (g_fx.game_event == GameEvent.MOVE_CARD) { //  || g_fx.game_event == GameEvent.FIELD_TO_HAND) {
                        logger.info("move card test?");
                        if (Instance.match_move(g_fx, my_interrupter)) {
                            my_fx.source = me;
                            what_triggers_me.push(g_fx);
                        }

                    } else if (g_fx.chosen_target == this && my_interrupter.td.matches(thus, me, game)) {
                        logger.info("SPECIAL INST MADE TO BE " + thus.id);
                        my_fx.source = me;
                        for (let i = 0; i < my_fx.effects.length; i++) {
                            let atomic = my_fx.effects[i];
                            for (let j = 0; j < atomic.events.length; j++) {
                                atomic.events[j].n_player = n_me_player;
                            }
                        }
                        //                        my_fx.effects[0].events[0].n_player = this.n_me_player;
                        what_triggers_me.push(g_fx);
                    } else if (true && my_interrupter.ge == GameEvent.EVOLVE) {
                        logger.info("evo test?");

                        // If the *source* is in the bench, skip. 
                        if (g_fx.spec_source?.location == Location.EGGZONE) continue;
                        // we are trying to interrupt evolve; if the interrupting card is in
                        // the REVEAL zone we won't have a get_instance()
                        logger.debug("do we match? " + my_interrupter.td.toString() +
                            " player owner of target is " + g_fx.chosen_target.n_me_player +
                            " chosen tgt " + g_fx.chosen_target.get_name() +
                            " tgt_id " + g_fx.chosen_target.id + " me: " + me.get_instance()?.get_name());
                        if (my_interrupter.td.matches(g_fx.chosen_target, me, game) &&
                            Instance.check_td2(my_interrupter, g_fx, my_interrupter.ge, new SpecialInstance(thus as Instance), game)) {
                            logger.debug("evolve matches");
                            my_fx.source = me;
                            what_triggers_me.push(g_fx);
                        }
                    } else {
                        logger.info("auto match up");
                        // by default, it matches
                        my_fx.source = me;
                        what_triggers_me.push(g_fx);
                    }
                }
            }
        }

        if (what_triggers_me.length > 0) {
            my_fx.trigger_incidents = what_triggers_me;
            return true; // .push(my_fx);
        }
        return false;
    }

    // preflight and postflight might just be the same logic
    // We're about to do something(s), get all effects that might interrupt it.
    check_preflight(sfx: SubEffect[]): SolidEffect[] {
        logger.info(`Checking preflight instance ${this.id} name ${this.name()} effects ${sfx.map(x => GameEvent[x.game_event]).join(",")}`);
        let ret: SolidEffect[] = [];

        let my_effects = this.all_effects();

        for (let my_fx of this.all_effects()) {
            if (Instance.one_effect_matchup("preflight", my_fx, sfx, new SpecialInstance(this), this.n_me_player, this.game, this))
                ret.push(my_fx);
        }
        logger.info(`preflight returning ${ret.length} effects`);
        return this.mark_outbound_solid_effects(ret);
    }

    // not for everything, but eventually everything should be in here
    // needing the n_me_player suggests this shouldn't be static
    static match_certain_effect(actual_event: SubEffect, candidate: InterruptCondition, n_me_player: number): boolean {
        let actual = actual_event.game_event;
        let cand = candidate.ge;
        logger.warn("DO EVENT LINE UP: actual " + GameEvent[actual] + " and " + GameEvent[cand] + " " + candidate.td.raw_text + "/" + candidate.td2?.raw_text);
        if (actual == GameEvent.TARGETED_CARD_MOVE) {
            let t: CardLocation | Instance = actual_event.chosen_target;
            logger.warn(`moving from ${!!t} and ${t && t.location}}}`);
        }
        if (
            (actual == cand) ||
            (actual == GameEvent.FIELD_TO_HAND && cand == GameEvent.MOVE_CARD) ||
            (actual == GameEvent.TARGETED_CARD_MOVE && cand == GameEvent.MOVE_CARD) ||
            (cand == GameEvent.ALL_REMOVAL &&
                [GameEvent.ALL_REMOVAL, GameEvent.DELETE, GameEvent.STACK_ADD, GameEvent.FIELD_TO_HAND, GameEvent.TUCK, GameEvent.TO_BOTTOM_DECK].includes(actual)) ||
            // TARGETED_CARD_MOVE is how to put Instances into security
            // It is also how we move a card from plugs to elsewhere
            // Why don't plugs have a PLUG_MOVE like EVOSOURCE_MOVE ?
            (cand == GameEvent.ALL_REMOVAL && actual == GameEvent.TARGETED_CARD_MOVE &&
                actual_event.chosen_target.location == Location.BATTLE &&
                actual_event.chosen_target.kind === "Instance" // not moving a card
            ) ||
            (cand == GameEvent.ALL_REMOVAL) && actual == GameEvent.PLUG &&
            actual_event.chosen_target.kind === "Instance"
            ||
            // add_card_to_hand can be BOUNCE or DRAW
            (cand == GameEvent.ADD_CARD_TO_HAND &&
                [GameEvent.DRAW, GameEvent.FIELD_TO_HAND].includes(actual))
            // ADD_CARD_TO_HAND and some MOVE CARD 

        ) {
            logger.info("EVENT LINE UP: " + GameEvent[actual] + " and " + GameEvent[cand]);
            let cause = Instance.compare_cause(actual_event, candidate, n_me_player);
            logger.info(`COMPARE CAUSE IS ${cause} ${candidate.cause} ${actual_event.cause!}`);
            // pushed source into here, this was smaert
            if (!cause) return false;
            //

            return cause;
        }
        return false;
    }

    // see if tf2 matches up, including special cases
    static check_td2(myTrigger: InterruptCondition, actualEvent: SubEffect, ge: GameEvent, me: SpecialInstance, game: Game): boolean {
        if (myTrigger.td2) {
            let act2 = actualEvent.chosen_target2 && actualEvent.chosen_target2[0];

            if (ge === GameEvent.EVOLVE) {
                logger.info(`TD2 check, ct2 ${!!actualEvent.chosen_target2} ct3 ${!!actualEvent.chosen_target3} `);
                logger.info(`TD2 check, ct2t ${!!act2?.top()} ct3t ${!!actualEvent.chosen_target3?.top()} `);

                if (actualEvent.cause & EventCause.DNA) {
                    logger.info("fusion evo");
                    // * for a fusion evo, we have both candidates *before* we run
                    // * for a fusion evo, we may have *neither* candidate *after* we run.
                    //   we default to that being true for now.
                    logger.info(`TD2 check, ct2 ${!!actualEvent.chosen_target2} ct3 ${!!actualEvent.chosen_target3} `);
                    // we've lost the original mons if we are post_effect'ing a fusion. we need
                    // to be able to track their references as they were for "when a X evolves"
                    // but aren't right now
                    logger.info(`TD2 check, ct2t ${!!act2.top()} ct3t ${!!actualEvent.chosen_target3?.top()} `);
                    console.warn("we just need to match on any td2, right?");
                    if (!act2?.top()) return true; // no actual target, better say we succeed
                    if (myTrigger.td2.matches(act2, me, game)) return true;
                    if (!actualEvent.chosen_target3?.top()) return true;
                    if (myTrigger.td2.matches(actualEvent.chosen_target3, me, game)) return true;
                    return false; // no match
                }
                logger.info("non-fusion evo");
                // non-fusion evo
                if (!act2?.top()) return true; // no actual target, better say we succeed
                if (myTrigger.td2.matches(act2, me, game)) return true;
                return false;
            }
            // if a second target, make sure it matches, too.
            // sometimes this can lead us to checking an instance that has no cards...
            if (!myTrigger.td2.matches(act2, me, game))
                return false;
        }
        return true;
    }

    static compare_cause(actual_event: SubEffect, candidate: InterruptCondition, n_me_player: number): boolean {
        let match = false;
        logger.info(`cc1 ${candidate.cause} actual ${actual_event.cause!}`);

        // if no cause, auto-match
        if (!candidate.cause || (candidate.cause & actual_event.cause!) != 0) {
            logger.info("nominal cause match ");
            // we have a candidate, check if the source matters
            match = true;
            let source = candidate.td2?.raw_text;
            logger.info("SOURCE " + source);
            if (source) {
                // hand-code these?
                // not needed with not_cause
                if (source === "their effects") {
                    let actual_source_player = actual_event.spec_source?.n_me_player;
                    logger.info(`player ${actual_source_player} and ${n_me_player}`);
                    if (actual_source_player === n_me_player) {
                        logger.info("can't rx to own effect");
                        // this doesn't make sense, it should be opponent effect...
                        match = false;
                    }
                }
            }
        }
        logger.info("match is " + match + ", continuing?");
        if (!match) return false;
        let not_match = false;
        logger.info(`cc2 ${candidate.not_cause} actual ${actual_event.cause!}`);
        if (!!candidate.not_cause) { // only care if not_cause is defined
            if ((candidate.not_cause & actual_event.cause!) != 0) {
                not_match = true;
                logger.info("nominal not cause match");
                let not_source = candidate.td3?.raw_text;
                logger.info("NOT SOURCE " + candidate);
                if (not_source) {
                    if (not_source === "your effects") {
                        let actual_source_player = actual_event.spec_source?.n_me_player;
                        logger.info(`player ${actual_source_player} and ${n_me_player}`);
                        if (actual_source_player !== n_me_player) {
                            logger.info("can't rx to own effect");
                            not_match = false; // our not_match is now false
                        }
                    }

                }

            }
        }
        logger.info(`match ${match} !not_match ${!not_match} both ${match && !not_match}`);
        return match && !not_match;
        //        return true;
    }


    // for MOVE_CARD events; but could be more generic
    static match_move(se: SubEffect, ic: InterruptCondition): boolean {



        // ic should be contained within se:
        //   interrupt on "Security" matches on "your security",
        //   but interrupt on "your security" not on "their security"
        let ret = false
        let ic_from = ic.td2?.raw_text.toLowerCase() || "";
        let ic_to = ic.td.raw_text.toLowerCase() || "";

        let ge_from = se.td2?.raw_text.toLowerCase() || "";
        let ge_to = se.td?.raw_text.toLowerCase() || "";


        logger.info(`ic from ${ic_from} to ${ic_to}`);
        logger.info(`ge from ${ge_from} to ${ge_to}`);



        if (ge_from.includes(ic_from) &&
            (ge_to.includes(ic_to))) {
            ret = true;
        }
        if (se.game_event === GameEvent.FIELD_TO_HAND) {
            if (!ic_from.includes("security") && !ic_from.includes("deck") && !ic_from.includes("hand")) {

                logger.info("FORCING TRUE because field_to_hand");
                ret = true;
            }
        }
        logger.info(`MOVE_CARD: seeing if actual move from '${ge_from}' to '${ge_to}' matches putative '${ic_from}' to '${ic_to}' ${ret.toString().toUpperCase()}`);
        return ret;
    }

    //# for board game dumping
    dump_summary(testmode: number = 1): string {
        // I'm returned "REST" in here but "DP" at the top...
        //let ret = this.suspended ? "REST," : "";
        let ret = "";
        let body = this.pile.map(x => x.testname(testmode)).reverse();
        let rested = (this.suspended) ? ["REST"] : [];
        let plugs: string[] = [];
        if (this.plugged.length > 0) {
            plugs.push("PLUG");
            plugs.push(...this.plugged.map(c => c.testname(testmode)).reverse()); // not reversed
        }
        if (testmode == 2) return [this.label].concat(body).concat(rested).concat(plugs).join(",");
        // version 1 untested with plugged cards
        if (testmode == 1) return rested.concat(body).concat(plugs).join(",");
        return "Err";
    }

    on_field(): boolean {
        return !!(this.location & (Location.BATTLE | Location.EGGZONE));
    }
    in_play(): boolean {
        return this.location == Location.BATTLE;
    }

    in_eggzone(): boolean {
        return this.location == Location.EGGZONE;
    }
    in_trash(): boolean {
        return this.location == Location.TRASH || this.location == Location.TOKENTRASH;
    }
    in_hand(): boolean {
        return this.location == Location.HAND;
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
    // TODO: Can we have this run terminus_effect??
    // This is being updated to capture the logic of "can I pay the cost?"
    can_do(effect: SubEffect, force_apply_status: boolean = true): boolean {
        logger.debug("can do??? " + GameEvent[effect.game_event]);
        //console.error("TEST FOR " + GameEvent[effect.game_event]);
        //  console.trace();
        if (effect.game_event == GameEvent.UNSUSPEND && this.is_ready()) return false;
        if (effect.game_event == GameEvent.SUSPEND && !this.is_ready()) return false;
        for (let sc of this.all_statuses()) { //  expiring_status_effects) {
            logger.debug(`sc.s is ${sc.s} ${sc.s.immune} ${GameEvent[sc.s.game_event]} --> ${GameEvent[effect.game_event]}`);
            logger.debug(`ge is ${GameEvent[sc.s.game_event]}`);
            logger.debug(`td is ${sc.s.td.raw_text}`);
            logger.debug(`choose is is ${sc.s.choose}`);
            if (sc.s.immune) {
                // When looking at "immune to opponent's monster effects" we need to
                // 1. recognize it's by effect
                // 2. recognize the source
                // sc.s.game_event is what I'm immune to 
                if (sc.s.game_event == effect.game_event) {
                    logger.debug("immune check for source" + effect.spec_source?.get_name() + "targety" + effect.chosen_target?.get_name() + "target type" + effect.chosen_target?.kind + GameEvent[sc.s.game_event] + GameEvent[effect.game_event]);
                    let sccs = sc.s.cause;
                    if (sc.s.cause == undefined || !effect.cause) {
                        let a: any = null; a.effect_cause();
                    }
                    logger.info(`1rew game events match up: ${GameEvent[effect.game_event]}`);
                    logger.info(`1rew Effect cause is ${EventCause[effect.cause]} and the immune effect has cause ${EventCause[sc.s.cause]}`)

                    // If causes overlap, we can't do this
                    // this line should only be here if we're immune to EVERYTHING
                    if (sc.s.cause & effect.cause) {
                        logger.debug("check td of " + sc.s.td.raw_text);
                        // the below block is theoretical
                        if (sc.s.td.conjunction === Conjunction.DUMMY) {
                            return false;
                        }
                        logger.info("td for immune: " + sc.s.td.raw_text);
                        // special case for attack, i hate special cases. Incorporate this into MultiTargetDesc
                        if (sc.s.game_event === GameEvent.ATTACK_DECLARE && sc.s.td.raw_text === "player") {
                            // cannot attack players
                            if (effect.chosen_target?.kind === "Player") return false;
                        } else if (sc.s.td.matches(effect.spec_source!, new SpecialInstance(this), this.game)) {
                            console.info("match, so we're immune!");
                            return false;
                        }
                    } else {
                        // causes don't match, so not immune
                    }
                }

                // For now, exempt SUSPEND and ATTACK_DECLARE from "all"
                // We've partially implemented checking the source,
                // that's how we should check things here.

                // Also, being immune still absolutely means we can get a status condition played on us
                if (sc.s.game_event == GameEvent.ALL &&
                    effect.game_event != GameEvent.SUSPEND &&
                    effect.game_event != GameEvent.ATTACK_DECLARE &&
                    (effect.game_event != GameEvent.GIVE_STATUS_CONDITION || !force_apply_status)) {
                    logger.info(`1rew game events match up: ${GameEvent[effect.game_event]}`);
                    logger.info(`1rew Effect cause is ${EventCause[effect.cause]} and the immune effect has cause ${EventCause[sc.s.cause]}`)
                    let td_match = sc.s.td.matches(effect.spec_source!, new SpecialInstance(this), this.game);
                    logger.info(`1rew td match is ${td_match} td is ${sc.s.td} and source is ${effect.spec_source} `)
                    let cause_match = (sc.s.cause & effect.cause);
                    if (cause_match && td_match) return false;
                }
            }
        }
        logger.debug("can do " + GameEvent[effect.game_event]);
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
        // we recalculate our effects every time, and we usually call
        // has_color several times in a row. It might be time for a
        // refactor, maybe including changing color into a bitmap
        let colors = this.top().colors_s();
        let status_conditions = this.all_statuses();
        // how do we handle normal friendly color additions?
        colors = this.update_information("Color", status_conditions, colors);
        return colors.toUpperCase().includes(Color[color].toUpperCase());
    }

    source_match(td: TargetDesc | undefined, s: TargetSource) {
        logger.error("need plug match, too");
        if (!td) return false;
        for (let i = 0; i < this.pile.length - 1; i++) {
            let cl: CardLocation = new CardLocation(this.game, this.n_me_player,
                this.location, i, this.id);
            if (td.matches(cl, s, this.game)) return true;
        }
        return false;
    }
    get_link_requirements(): LinkCondition[] { return this.top().link_requirements };

    get_color_count(): number { if (this.top().is_two_color()) return 2; return 1; }
    // move away from this function
    // why would an *instance* ever need to check 2-color?
    color_count(): number { return this.top().color_count(); }

    get_playcost(): number | undefined { return this.top().p_cost; }
    get_usecost(): number | undefined { return this.top().u_cost; }

    has_level(): boolean { return !!this.top().level; }

    get_level(): number { return this.top().level; }

    has_dp(): boolean {
        let d = this.dp();
        return !isNaN(d);
    }
    get_sources(): CardLocation[] {
        let ret: CardLocation[] = [];
        for (let i = 0; i < this.pile.length - 1; i++)
            ret.push(new CardLocation(this.game, this.n_me_player,
                this.location, i, this.id));
        return ret;
    }
    get_plugs(): CardLocation[] {
        let ret: CardLocation[] = [];
        for (let i = 0; i < this.plugged.length; i++)
            ret.push(new CardLocation(this.game, this.n_me_player,
                this.location, i, this.id, "plug"));
        return ret;
    }
    get_source_count(): number { return this.pile.length - 1; }
    get_plug_count(): number { return this.plugged.length; }
    new_inherited_effects(): SolidEffect[] {
        console.error("we really shouldn't be checking this");
        return [];
    }

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

    // [Your Turn] While this Monster has [xxx] or [yyy] in its name, it gains <Piercing>.",
    /// check my turn, then check condition, then target gets effect

    // [All Turns] While this Monster is suspended, it gets +1000 DP. ",
    //// check condition, then apply effect

    // We need a policy of how to apply these effects boardwide.
    // 
    // this function can be moved out of this file
    static collect_persistent_effect(cc: SolidEffect, game: Game, n_me_player: number, source: TargetSource):
        (CardLocation | Instance | undefined)[] {
        if (!Solid_is_triggered(cc)) {
            // do we need to just include [security] in the solid_is_triggered test?
            logger.info("WE HAVE A X CONSTANT EFFECT! " + cc.toString());
        } else {
            return [];
        }

        let in_security = (source.location() == Location.SECURITY);
        let needs_to_be_in_security = cc.keywords.includes("[Security]");
        if (in_security !== needs_to_be_in_security) return [];

        if (cc.source) {
            //  logger.debug("WE HAVE A SOURCE");
        } else {
            //    logger.debug("WE HAVE A NON SOURCE");
        }
        // assume always first atomic and first subeffect, which should be true, since this is passive
        let atomic = cc.effects[0];
        let w: SubEffect = atomic.events[0];
        // logger.debug("WE HAVE A WEIRDO td and ge OF " + (w.td ? w.td.toString() : 'nul') + " -- " + w.game_event.toString());
        // assume just a simple effect, first atomic and first effect

        cc.source = source;
        if (atomic.test_condition) {
            //            console.error("TESTING TC " + atomic.test_condition.toPlainText());
            if (atomic.test_condition.test(game, source).length == 0) {
                logger.debug("test condition failed");
                return [];
            }
        }
        if (atomic.can_activate) {
            //     console.error("TESTING CA "+ atomic.can_activate );
            if (!atomic.can_activate(cc)) {
                logger.debug("can_activate failed");
                return [];
            }
        }
        if (w.game_event == GameEvent.NIL) return [];
        let c1;
        if (c1 = w.n_count_tgt) {
            for_each_count_target(w, game, source, n_me_player);
        }
        w.n_player = n_me_player;
        w.label = cc.label;
        logger.info(`doing terminus for ${GameEvent[w.game_event]} on ${w.td.raw_text} or ${Conjunction[w.td.conjunction]}`);
        if (w.td.conjunction == Conjunction.PLAYER || w.td.raw_text.match(/security/)) {
            logger.info("applying player effect " + w.td.raw_text + " ... " + Conjunction[w.td.conjunction]);
            return [undefined];
        } else {
            // do we really need to pass in solideffect here? will we do pronouns?
            let targets = w.td && game.find_target(w.td, w.game_event, source, false);
            return targets;
        }

    }

    /*
                logger.debug("length of targets for constant " + targets.length);
                for (let target of targets) {
                    logger.debug(`applying ${GameEvent[w.game_event]} target ${target.get_name()}`);
                    logger.debug(target.toString());
                    w.n_player = n_me_player;
                    XX.do_terminus_effect(1, w, target, game);
                }
     
    */



    collect_constant_effects(): EffectAndTarget[] {
        // find all things that get this effect and apply them
        // THESIS: They are constant if no trigger

        let fx_i_apply: EffectAndTarget[] = [];
        for (let cc of this.all_effects()) {
            let array = Instance.collect_persistent_effect(cc, this.game, this.n_me_player, new SpecialInstance(this));
            for (let t of array) {
                cc.effects[0].events[0].spec_source = this;
                fx_i_apply.push(new EffectAndTarget(cc.effects[0].events[0], t));
            }
        }
        return fx_i_apply;
    }

    update_information<T extends string | number | boolean>(field: string, statuses: StatusCondition[], original: T): T {
        let key, value;
        for (let sc of statuses) { // this.expiring_status_effects) {
            //log(`for ${this.card_ids_s()} or ${this.card_ids()}  sc is ${status_cond_to_string(sc)} ...`);
            // checking for immunity causes an infinite loop
            //            if (this.can_do(sc.parent_subeffect!, false)) {
            if (sc.s.game_event == GameEvent.CHANGE_INFORMATION ||
                sc.s.game_event == GameEvent.ADD_INFORMATION) {
                let mods = sc.s.n_mod!.split(";");
                for (let mod of mods) {
                    [key, value] = mod.split(":");
                    if (key === field) {
                        // can't change value we don't have; right now that's only numbers
                        if (sc.s.game_event === GameEvent.CHANGE_INFORMATION &&
                            (Number.isNaN(original) || undefined === original)) {
                            continue;
                        }
                        if (typeof original === 'string') {
                            original = value as T;
                        } else if (typeof original === 'number') {
                            original = parseInt(value) as T;
                        } else if (typeof original === 'boolean') {
                            original = Boolean(value) as T;
                        }
                    }
                    //       }
                }
            }
        }
        return original;
    }

    // This is being called too often, but at least not every UI tick
    dp(): number {
        // If any of my effects say "immune to X" I do that first
        let dp = this.top().dp;
        // these should be applied in order, are they?
        let status_conditions = this.all_statuses();
        dp = this.update_information("DP", status_conditions, dp);

        if (isNaN(dp))
            return dp;
        logger.debug(`DP CALC FOR ${this.id} ${this.name()} ${this.top().id} WITH ${status_conditions.length} STATUS CONDITIONS`);
        // CHECK FOR IMMUNITY


        for (let plug of this.plugged) {
            if (plug.link_dp) dp += plug.link_dp;
        }

        // TODO: this should use the above functions that calculate active effects
        for (let sc of status_conditions) { // this.expiring_status_effects) {
            logger.debug(`SEE IF CAN DO ${status_cond_to_string(sc)} `);
            if (this.can_do(sc.parent_subeffect!, false)) {
                if (sc.s.game_event == GameEvent.DP_CHANGE) {
                    logger.debug(`DP e ${dp} nn ${sc.s.n} `);
                    dp += get_mult(sc.s);
                }
            }
        }
        // do we ever hit this branch???? It would be 
        // awesome if not because it feels stupid 
        // self effects, like from inherited or native  
        for (let cc of this.all_effects()) {
            if (this.valid_effect(cc)) {
                let atomic = cc.effects[0];
                let weirdo = atomic.events[0];
                if (weirdo.game_event == GameEvent.DP_CHANGE) {
                    logger.debug(`DP ${dp} nn ${atomic.events[0].n} `);
                    dp += get_mult(weirdo);
                }
            }
            // assume just a simple effect, first atomic and first effect
        }
        if (dp < 0) dp = 0;
        return dp;
    }

    // in the long-term, we should move to an "update" loop that recalcs everything

    is_token(): boolean { return this.top().is_token(); }
    _monster_cached: boolean = true;
    is_monster_cached(): boolean { return this._monster_cached; }
    is_monster(simple: boolean = false): boolean {
        if (!this.top()) {
            console.trace();
            return false;
        }
        let b: boolean = this.top().is_monster() || this.top().is_egg();
        // all_statuses() can lead to a loop
        {
            let status_conditions = this.expiring_status_effects.concat(this.constant_status_effects);
            let blankets = this.me_player.all_player_status_effects(false, this);
            let x = status_conditions.concat(blankets);
            b = this.update_information("Monster", status_conditions, b);
        }
        if (false && !simple) {
            let status_conditions = this.all_statuses();
            b = this.update_information("Monster", status_conditions, b);
        }
        this._monster_cached = b;
        return b;
    }
    is_type(type: string): boolean {
        switch (type.toLowerCase()) {
            case "monster": return this.is_monster();
            case "option": return this.is_option();
            case "tamer": return this.is_tamer();
            case "egg": return this.is_egg();
            case "token": return this.is_token(); // is "token" appropriate at this level?            
            default: return false;
        }
    }
    is_tamer(): boolean { return this.top().is_tamer(); }
    is_option(): boolean { return this.top().is_option(); }
    is_egg(): boolean { return this.top().is_egg(); }
    is_evo_card(): boolean { return false; } // never for instance
    is_plugged_card(): boolean { return false; } // never for instance
    get_instance(): Instance { return this; } // ever used?

    // I can probably just recalc this each time we edit the stack...
    top(): Card { return this.pile[this.pile.length - 1]; }

    get_card_id(): string {
        return this.top().id;
    }
    card_id(): string {
        return this.top().id;
    }
    get_set(): string {
        let id = this.top().id;
        return id.split("-")[0];
    }
    name_is(str: string): boolean {
        return this.top().name_is(str);
    }

    has_trait(str: string): boolean {
        return this.top().has_trait(str);
    }
    has_stack_add(): boolean {
        return !!this.top()?.stack_summon_list;
    }
    text_contains(str: string): boolean {
        return this.top().text_contains(str);
    }
    name_contains(str: string): boolean {
        return this.top().name_contains(str);
    }
    trait_contains(str: string): boolean {
        return this.top().trait_contains(str);
    }

    // number-number pair, first is location, second is index (for pile) or id (for field)
    get_key(): string {
        return `${this.location}-0-${this.id}`;
    }
    // if not in expected place, label it up
    get_field_name(l: Location = Location.BATTLE): string {
        let ret = /* this.get_set() + "-" + */ this.get_name();
        if (this.location != l) {
            ret += ` in ${Location[this.location]}`;
        }
        return ret;
    };

    name(simple: boolean = false): string {
        if (!this.top()) { return "Player"; } // for attack-by-effect
        let name = this.top().name;
        if (!simple) {
            // for debug purposes, we shouldn't dump the name
            let status_conditions = this.all_statuses();
            name = this.update_information("Name", status_conditions, name);
        }
        return name;

    }
    get_name(simple: boolean = false): string {
        return this.name(simple);
    }
    has_name(name: string): boolean {
        return this.name() == name;
    }

    get_links(): number {
        let links = 1;
        for (let e of this.get_new_effects_by_keyword("LINK")) {
            let m = e.match(/Link.([+-\d]+)/);
            if (m) links += parseInt(m[1]);
        }
        return links;
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

    // This is unlikely to do the right thing for searching "cards with <Keyword>" 
    get_all_keywords(): string[] {
        let ret: string[] = [];
        let t: Card = this.top();
        let k = t.all_keywords();
        ret.push(...Object.keys(k));
        if (this.is_monster()) {
            for (let i = 0; i < this.pile.length - 1; i++) {
                let t = this.pile[i];
                let k = t.all_keywords("inherited");
                ret.push(...Object.keys(k));
            }
            for (let i = 0; i < this.plugged.length; i++) {
                let t = this.plugged[i];
                let k = t.all_keywords("linked");
                ret.push(...Object.keys(k));
            }
        }
        // duped from card::has_keyword
        // TODO: use the all_effects() routines in here; this may not match 
        for (let sc of this.all_active_statuses()) {
            if (!sc.keywords) continue;
            let k: KeywordArray = sc.keywords;
            ret.push(...Object.keys(k));
        }
        // normalizing
        ret = ret.map(s => s.replace(/[＜＞]/g, '').replace(/\(.*?\)/, "").trim()).sort();
        // removing unneeded
        let remove = ["ACE", "Overflow"];
        ret = ret.filter(word => !remove.includes(word));
        ret = [... new Set(ret)];
        return ret;
    }


    // Maybe refactor with previous function; only advantage here is that it short-circuits
    // This is unlikely to do the right thing for searching "cards with <Keyword>" 
    get_new_effects_by_keyword(label: string): string[] {
        let ret = [];
        let t: Card = this.top();
        let a;
        if (a = t.has_keyword(label, "main")) {
            ret.push(a);
        }
        if (this.is_monster()) {
            for (let i = 0; i < this.pile.length - 1; i++) {
                let t = this.pile[i];
                if (a = t.has_keyword(label, "inherited")) { // inherited
                    ret.push(a);
                }
            }
            for (let i = 0; i < this.plugged.length; i++) {
                let t = this.plugged[i];
                if (a = t.has_keyword(label, "linked")) { // linked
                    ret.push(a);
                }
            }

        }
        // duped from card::has_keyword
        let regexp = new RegExp(label.replaceAll(/[ _]/ig, "."), "i");
        // TODO: use the all_effects() routines in here; this may not match 
        for (let sc of this.all_active_statuses()) {
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
        let x = t.has_keyword(keyword, "main");
        if (x && x.length > 0) {
            return [x]; // <-- move to this style
        }

        // Do I need to distinguish between *card* keywords and *effect* keywords???
        if (this.is_monster()) {
            for (let i = 0; i < this.pile.length - 1; i++) {
                let c: Card = this.pile[i];
                let x = c.has_keyword(keyword, "inherited");
                if (x && x.length > 0) return [x];
            }
            for (let i = 0; i < this.plugged.length; i++) {
                let c: Card = this.plugged[i];
                let x = c.has_keyword(keyword, "linked");
                if (x && x.length > 0) return [x];
            }

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
        //        console.error("KAS KEYWORD " + keyword);
        //      console.trace();
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
        if (!this.in_play()) return false;
        if (this.pile.length == 0) return false;
        if (!this.is_monster()) return false;
        if (!this.has_dp()) return false; // not sure this ever happens
        return true;
    }
    can_block(): boolean {
        if (!this.in_play()) return false;
        if (this.suspended) return false;
        if (!this.has_blocker()) return false;
        let [suspend, ] = attacking_events(this.game, this, this.other_player);

        if (!this.can_do(suspend)) return false;
        
	    let block = {
		// do we distinguish attacking by effect??
		cause: EventCause.GAME_FLOW,
		game_event: GameEvent.BLOCK,
		label: "suspend to block",
		chosen_target: this, td: new TargetDesc(""),
		n_player: this.n_me_player,
    	};
        if (!this.can_do(block)) return false;

        return true;
    }
    can_attack(td?: TargetDesc, conditions?: string): (false | number[]) {
        logger.debug("can_attack conditions " + conditions);
        // I'm manually parsing td
        if (this.game.turn_player != this.n_me_player) return false;
        if (this.game.phase === Phase.HATCHING) return false;
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

        // if effect only lets me attack monsters; move this to "conditions"
        let can_attack_mon = (td && td.raw_text != "" && td.raw_text != "your opponent's monster") ? false : true;

        // TODO: verify all these are legit attack targets
        let ret = [];
        if (can_attack_mon) {
            for (let mon of this.other_player.field) {
                // TODO: make this.can_do() handle the is_ready and is_monster clauses automatically
                if (!mon.is_ready() && mon.is_monster()) {
                    let [, declare_mon] = attacking_events(this.game, this, mon);
                    if (this.can_do(declare_mon)) {
                        ret.push(mon.id);
                    }
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

    // 


    // FUSION EVO: we have a LEFT and RIGHT
    // BURST EVO: LEFT is monster and RIGHT is tamer

    // Can this card evolve on top of us?
    // "available_memory" used to be checked, it isn't now.
    can_evolve(card: Card, available_memory: number, fusion_evo_pos: number, type: 'evo' | 'fusion' | 'burst' | 'link'): number[] | false {
        let top = this.top();
        if (!top) {
            logger.error("NO TOP!");
            return false;
        }
        let ret: number[] = [];
        logger.debug(`I am ${this.name()} level ${this.get_level()} with colors ${this.s_colors()}`);
        // if fusion_evo_pos is 0, check on normal evo
        // if 1, check on left-hand condition
        // if 2, check on right-hand condition
        let conditions: EvolveCondition[];
        switch (fusion_evo_pos) {
            case 1: conditions = type === 'fusion' ? [...card.fusion_evolve_conditions.map(e => e.left)] : [...card.burst_evolve_conditions.map(e => e.monster)]; break;
            case 2: conditions = type === 'fusion' ? [...card.fusion_evolve_conditions.map(e => e.right)] : [...card.burst_evolve_conditions.map(e => e.tamer)]; break;
            default: conditions = [...card.evolve_conditions];
        }
        logger.debug("can i evo into " + JSON.stringify(conditions));
        // check on refactoring this into other statuses
        if (fusion_evo_pos == 0) {
            let status_conditions = this.all_statuses(); // lthis.expiring_status_effects.concat(this.constant_status_effects);
            for (let sc of status_conditions) { // this.expiring_status_effects) {
                logger.debug(`SEE IF CAN EVO ${status_cond_to_string(sc)} `);
                if (this.can_do(sc.parent_subeffect!, false)) {
                    if (sc.s.game_event == GameEvent.MAY_EVO_FROM) {
                        logger.info(`we can evo (${fusion_evo_pos}) into ${sc.s.n_mod}`);
                        if (sc.s.n_mod == card.name) {
                            ret.push(sc.s.n!);
                        }
                    }
                }
            }
        }
        // we're not handling the case where a card could have 2 plugged candidates and each app fuses
        //       conditions.push(...card.app_evolve_conditions);

        ret.push(...Card.can_evolve_into(this, conditions));
        ret = [... new Set(ret)] // only unique elements
        //logger.info("returning 1174 " + JSON.stringify(ret));
        if (ret.length > 0) return ret;
        return false;
    }

    do_evolve(_card: Card) {  // doesn't check if we "can"
        // TODO: check "if this would evolve" effects
        if (this.location != Location.BATTLE &&
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
        for (let s of sub.status_condition!) {
            s.parent_subeffect = sub;
            if (s.exp_description) {
                this.expiring_status_effects.push(s);
            } else {
                this.constant_status_effects.push(s);
            }
        }
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

    /*  never used, not even once
    strip_source(location: string): boolean {
        // if we strip multiple things we rebuild this data structure each time
        if (!location) return false;
        let sources = this.get_sources();
        if (sources.length == 0) return false;
        let cl: CardLocation;
        if (location.includes("bottom")) {
            cl = sources[0];
        } else {
            cl = sources[sources.length - 1];
        }
        let card = cl.extract();
        card.move_to("trash");
        return true;
    }*/ 

    // "reason" is purely for human consumption
    do_bounce(reason: string) { this.do_removal("hand", reason); }

    do_trash(reason: string) { this.do_removal("trash", reason); }

    do_move_to_security(reason: string) { this.do_removal("security_deck", reason); }

    do_bottom_deck(reason: string) { this.do_removal("bottom_deck", reason); }

    do_delete(reason: string) { this.do_removal("delete", reason); }

    // Make sure I delete from the bottom to the top
    do_removal(which: string = "delete", reason: string) {
        logger.info(`removing by ${which} ${this.name()} ${this.id} for ${reason}???`);
        let verb = "Deleting";
        let location = Location.TRASH;
        if (this.top() && this.top().is_token()) location = Location.TOKENTRASH;
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
        } else if (which == "security_deck") {
            verb = "Sending-to-security";
            location = Location.SECURITY;
            s_location = "bottom of deck";
            position = "BOTTOM";
        } else if (which == "nul") { // "nul" isn't "nullzone"
            verb = "Disappearing";
            location = Location.UNKNOWN
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
        let plug;
        for (let i = 0; i < this.plugged.length; i++) {
            let plug = this.plugged[i];
            this.push_to_trash(plug);
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

        card.move_to(Location.BATTLE, instance);
        instance.play_turn = game.n_turn;
        logger.debug("Placed on n_turn " + game.n_turn);
        instance.log(`Placed as ${card.name} ${card.id} `);
        instance.location = Location.BATTLE;
        game.ui_card_move();
        return instance;
    };

    // new instance made, just with top card
    // something else needs to move all cards and then unalive the old instances
    static fusion(card: Card, game: Game, me: Player, other: Player): Instance {
        let instance = new Instance(game, me, other);
        card.extract().move_to(Location.BATTLE, instance);
        logger.debug("fusioned on n_turn " + game.n_turn);
        instance.log(`Fusioned as ${card.name} ${card.id} for cost ${0}`);
        instance.location = Location.BATTLE;
        game.ui_card_move();
        return instance;
    };


    // returns a newly created instance is played, go here. 
    // TODO: consolidate with "place" above and "hatch" below
    static play(card: Card, game: Game, me: Player, other: Player): Instance {
        let instance = new Instance(game, me, other);

        //        console.error(`sp card ${card.get_name()} in ${Location[card.get_location()]}`);
        // why only do this if it's in reveal? 
      //  if (card.get_location() == Location.REVEAL) { 
             card.extract(); 
     //   }
        card.move_to(Location.BATTLE, instance);
        //        console.error(`sp card ${card.get_name()} in ${Location[card.get_location()]}`);
        instance.play_turn = game.n_turn;
        logger.debug("played on n_turn " + game.n_turn);
        instance.log(`Played as ${card.name} ${card.id} for cost ${card.p_cost}`);
        instance.location = Location.BATTLE;
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

    has_must_block(): boolean {
        if (this.all_effects().find(e => e.raw_text.match(/must block/i)))
            return true;
        return false;
    }

    // returns an instance
    static hatch(card: Card, game: Game, me: Player, other: Player): Instance {
        let instance = new Instance(game, me, other);
        instance.game = game; //. delete this
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
        let pile = order.match(/PLUG/) ? this.plugged : this.pile;
        if (order.match(/TOP/)) {
            pile.push(card);
        } else {
            pile.unshift(card);
        }
    }


};


