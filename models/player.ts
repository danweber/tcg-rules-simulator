import { Game, UserQuestion } from './game';
import { all_colors, Card, CardLocation, Color } from './card';
import { Instance } from './instance';
import { Location, location_to_string, string_to_location } from './location';
import { StarterDecks } from './starterdecks';


import { CombatLoop } from './combat';
import { Phase, GameStep, PhaseTrigger } from './phase';
import { DirectedSubEffectLoop, ResolutionLoop, RootLoop, SolidEffectLoop } from './effectloop';
import { InterruptCondition, SolidEffect, status_cond_to_string, StatusCondition, SubEffect } from './effect';
import { EventCause, GameEvent, attacking_events } from './event';
import { TargetSource, fSpecialPlayer, SpecialCard, TargetDesc, SpecialInstance } from './target';
import { v4 as uuidv4 } from 'uuid';

import Mastergame from './mastergame';
import seedrandom from 'seedrandom';

type PlaceList = { [key: string]: string; };

import { createLogger } from "./logger";
import { EffectAndTarget } from './util';
import { plugin } from 'mongoose';
import { flatMapDepth } from 'lodash';
const logger = createLogger('player');

interface Hash {
    [key: string]: string; // (string | number | boolean);
}

export interface Command {
    command: string;
    text: string;
    ver: string; // uuid to be different each time
    last_id?: number;
    evo_left?: any; // location obj
    evo_right?: any; // location obj
    link_source?: any,
    link_target?: any,
    link_trash?: any,
    attack_source?: any,
    attack_dest?: any,
    cost?: string;
    evo_target?: string;
    evo_card?: any;
}

interface LinkOptions {
    from_hand?: boolean,
    from_field?: boolean,
    source?: TargetSource,
    target_instance?: TargetDesc,
    to_plug?: TargetDesc
}

interface Args {
    automatic?: boolean,
    verbose?: boolean,
    internal?: boolean,
    sort?: boolean
}

interface HatchingArray {
    [key: string]: boolean
}
// This is insufficient. It works for evolve from hand to instance. But not from health or from graveyard.
interface EvolveArray {
    [key: number]: number[];
}

class PendingEffect {
    n_turn: number = 0;
    one_time: boolean = false;
    solid: SolidEffect;
    phase: Phase;
    interrupt: InterruptCondition[] | false;
    source: TargetSource;
    // solid_starter: SolidEffect; // what started us; necessary for ACTIVATE effects like Options (what about for "activate the effect below" effects?)

    constructor(solid: SolidEffect,
        turn: number, phase: Phase,
        source: TargetSource,
        interrupt: InterruptCondition[] | false,
        solid_starter?: SolidEffect) {
        this.solid = solid;
        this.n_turn = turn;
        this.interrupt = interrupt;
        this.solid.solid_starter = solid_starter;
        if (!solid_starter)
            this.solid.solid_starter = ("ABCDEF" as unknown) as SolidEffect;
        this.phase = phase; this.source = source;
    }
}

export class Player {
    other_player: Player;
    player_num: number;
    game: Game;
    my_name: string;
    deck: Card[];
    eggs: Card[]
    egg_zone: (Instance | null); // ugh
    field: Instance[];
    security: Card[];
    trash: Card[];
    tokendeck: Card[];
    tokentrash: Card[];
    reveal: Card[];
    stack: Card[] = []; 
    optzone: Card[] = [];
    history: string[];
    hand: Card[];
    nullzone: Card[] = [];
    readonly kind: string;
    id: number = 0; // to be similar to Instane
    search: Card[] | undefined = undefined; // only a few references to this, be careful
    rng: () => number;

    expiring_status_effects: StatusCondition[] = [];
    constant_status_effects: StatusCondition[] = [];
    pending_effects: PendingEffect[] = [];

    constructor(name: string, player_num: number, game: Game,
        master: Mastergame, cardstring: string, seed: string) {
        this.player_num = player_num;
        this.other_player = this; // this is wrong, but we will fix it later
        this.rng = seedrandom(seed)
        this.kind = "Player";
        this.game = game;
        this.my_name = name;
        this.deck = []; // 0 is bottom of deck
        this.eggs = []; // 
        this.tokendeck = [];
        this.tokentrash = [];
        this.egg_zone = null; // hard-coded to 1
        this.field = []; // list of instances
        this.security = [];
        this.trash = [];
        this.history = [];
        this.hand = [];
        this.reveal = [];

        logger.info("creating player");
        if (cardstring != "") {
            cardstring = cardstring.replaceAll(/[["\]]/ig, "");
            let cards = cardstring.split(/[,\s]+/);
            for (let id of cards) {
                if (id.length < 2) continue;
                let card = master.get_card(id);
                if (!card) {
                    logger.error("no such card " + id);
                    continue;
                }
                let ttt = Card.create(card.id, game, this);
                if (!ttt) {
                    logger.error("card not made " + id);
                    continue;
                }
                if (ttt.is_egg()) {
                    ttt.move_to(Location.EGGDECK)
                } else if (ttt.is_token()) {
                    ttt.move_to(Location.TOKENDECK)
                } else {
                    ttt.move_to(Location.DECK);
                }
            }
            if (this.deck.length != 50) {
                logger.error("Deck not 50 cards");
            }
        } else {
            // makes deck as side-effect
            let init = new StarterDecks(name, this.game, this);
        }

    }

    // maybe these should be pushed off into the field or deck class.

    get_name(): string { return this.my_name; }

    set_game(game: Game, other_player: Player) {
        this.other_player = other_player;
        this.game = game;
    }

    log(msg: string): void {
        logger.debug(`Log P${this.player_num}: ${msg}`);
        this.history.push(`TURN ${this.game.n_turn} ${msg} `);
    }

    // For polymorphism, which doesn't exist in TypeScript but I never let that stop me before.
    is_monster() { return false; }
    is_token() { return false; }
    is_tamer() { return false; }
    is_option() { return false; }
    dp() { return Number.NaN; }
    get_level() { return Number.NaN; }
    get_playcost() { return Number.NaN; }
    get_source_count() { return Number.NaN; }
    name_contains(_: string) { return false; }
    name_is(_: string) { return false; }
    trait_contains(_: string) { return false; }
    is_two_color(_: string) { return false; }
    // not used, but should be:
    is_player() { return true; }


    shuffle(deck: "deck" | "security" | "eggs") {
        
        let pile = (deck === "security") ? this.security : (deck === "eggs") ? this.eggs : this.deck;

        let n = pile.length, random;
        while (n > 0) {
            random = Math.floor(this.rng() * n);
            n--;
            [pile[n], pile[random]] = [pile[random], pile[n]];
        }
    }

    can_hatch() { return this.egg_zone == null && this.eggs.length > 0; }
    can_raise() {
        let egz = this.egg_zone;
        if (egz == null) return false;
        if (egz.has_level() && egz.get_level() <= 2) {
            return false;
        }
        if (egz.has_dp()) {
            return true;
        }
        return false;
    }

    // A draw on an empty deck has no result, but doesn't necessarily lose the game
    // Returns false if couldn't draw all cards needed.
    draw(n: number = 1): boolean {
        for (let i = 0; i < n; i++) {
            let d: Card;
            {
                let c: (Card | undefined) = this.deck.pop();
                if (c == undefined) {
                    this.log(`Tried to draw, empty deck`);
                    this.game.log(`Player ${this.player_num} tried to draw, empty deck`);
                    return false;
                }
                d = c;
            }

            this.log(`Drawing ${d.name} to hand`);
            // too verbose //this.game.announce(`You drew ${d.name}`, this.player_num);
            this.game.log(`Player ${this.player_num} drew a card`);
            d.move_to(Location.HAND);
            // Unconditional sorting here is bad. I need to toggle it for v1 tests.
            this.hand.sort(this.sorter);
        }
        return true;
    }

    // Returns false if all cards not added
    recover(n: number = 1): boolean {
        let d: Card;
        this.log("Adding card from deck to security");
        this.game.log(`Player ${this.player_num} recovering ${n} from deck to security`);

        for (let i = 0; i < n; i++) {
            let c: (Card | undefined) = this.deck.pop();
            if (c == undefined) {
                this.log(`Tried to recover, empty deck`);
                this.game.log(`Player ${this.player_num} tried to recover, empty deck`);
                return false;
            }
            d = c;
            d.move_to(Location.SECURITY);
        }
        return true;
    }
    // rename this function
    xxx_has_control(): boolean {
        return this.game.get_control() == this.player_num || this.game.get_control() == 3;
    };

    // with mulligan, this function will go away
    start_game(): void {
        this.draw(5);
        this.recover(5);
    }

    logs(last: number = 0): string[] {
        return this.history;
    }

    // Get the logs for an instance; not used much
    instance_logs(i: number): string {
        return this.get_instance(i).logs();
    }

    // stuff copied from instance.  this all needs to go into effect
    unexpired(effect: StatusCondition): boolean {
        logger.debug(`cc this is ${this} and this.game is ${this.game}`);
        logger.debug(`EXPIRE: ${effect.n} against ${this.game.n_turn}`);
        if (effect.p == Phase.END_OF_ATTACK) {
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
    // this is identical code to instance.ts. They should
    // all belong to some overall class.
    expire_effects() {
        this.expiring_status_effects = this.expiring_status_effects.filter(x => this.unexpired(x));
    }

    // assumes all pending effects are phasetriggers. They aren't. 
    // Significant overlap with PhaseTrigger and ExpiringEffects.
    set_pending_effect(solid: SolidEffect,
        turn: number,
        phase: Phase,
        game: Game,
        source: TargetSource,
        interrupt: InterruptCondition[] | false,
        solid_start?: SolidEffect) {
        if (!solid || !phase) {
            let a: any = null; a.assert_missing_pending();
        }
        let pe = new PendingEffect(solid, turn, phase, source, interrupt, solid_start);
        pe.n_turn = turn; // the effect will only activate this turn
        // also assuming just one time, unless end-of-turn
        // ASAP and END_OF_ATTACK are surely one_time
        if (phase !== Phase.END_OF_TURN)
            pe.one_time = true;
        this.pending_effects.push(pe);
    }

    // If looking for interrupt, sfx is non-false.
    // Otherwise, only phasetriggers.
    // No way right now to respond non-interruptively.
    get_pending_effect(phase: Phase, n_turn: number, sfx: SubEffect[] | false): SolidEffect[] {
        let ret: SolidEffect[] = [];
        logger.error("CHECKING OUT OF " + this.pending_effects.length + " PENDING");
        for (let pe of this.pending_effects) {
            if (sfx) {
                // look for interrupts, must be this turn
                if (pe.n_turn === this.game.n_turn && pe.interrupt) {
                    logger.warn("only preflight");
                    pe.solid.interrupt = pe.interrupt;
                    let targetsource = pe.source;
                    let match = Instance.one_effect_matchup("preflight", pe.solid, sfx,
                        targetsource, this.player_num, this.game, pe.source.get_card_location());
                    if (match) ret.push(pe.solid);
                    pe.n_turn = 0; // can't trigger a second time
                }
            } else {
                logger.warn("incomplete pending events phases");
                logger.info(`game ${n_turn} ${phase} against ${pe.n_turn} and ${pe.phase}`);
                if (pe.n_turn == n_turn && pe.phase == phase) {
                    pe.solid.source = pe.source;
                    ret.push(pe.solid);
                    if (pe.one_time) { pe.phase = Phase.NUL; }
                }
            }
        }
        return ret;
    }

    // is this applying global effects to everything, even though an effect
    // could say "all your red monsters"? Yes, check all monsters with [rb] trait
    collect_my_constant_effects(): EffectAndTarget[] {
        let ret: EffectAndTarget[] = [];
        for (let i = 0; i < this.security.length; i++) {
            let card = this.security[i];
            if (!card.face_up) continue;
            logger.debug("after faceup test, length is " + card.new_effects.length);
            // Why would amnything be face-up and *not* have a [health] effect?
            // (Security) effects are new effects

            for (let s of card.new_effects) {
                logger.debug(`before secloc test: ${s.active_zone}`);
                if (s.active_zone != Location.SECURITY) continue;
                let cl = new CardLocation(this.game, this.player_num, Location.SECURITY, i);
                let ts: TargetSource = new SpecialCard(cl);
                let array = Instance.collect_persistent_effect(s, this.game, this.player_num, ts);
                for (let t of array) {
                    ret.push(new EffectAndTarget(s.effects[0].events[0], t));
                }


            }
        }
        return ret;
    }

    all_player_status_effects(security?: true | false | undefined, instance?: Instance): StatusCondition[] {
        let ret = this.expiring_status_effects.concat(this.constant_status_effects);
        if (security == undefined) return ret; // return all
        ret = ret.filter(stat => !!(stat.parent_subeffect && stat.parent_subeffect.td.text!.match(/security/)) == security)
        if (ret.length == 0) return [];
        if (instance) {
            // moved
            //              ret = ret.filter(stat => stat.parent_subeffect?.td.targets[0].matches(instance, spec_source, this.game));
        }
        return ret;
    }
    add_status_cond(sub: SubEffect) { // s: StatusCondition) {
        let _s = sub.status_condition!;
        for (let s of _s) {
            s.parent_subeffect = sub;
            // console.error(381, "target", sub.td.targets);
            //console.error(383, "source", sub.spec_source);
            if (s.exp_description) {
                this.expiring_status_effects.push(s);
            } else {
                this.constant_status_effects.push(s);
            }
        }
    }
    clear_constant_effects(): void {
        logger.debug(`EFFECTS ${this.constant_status_effects.length} CLEARED ON PLAYER ${this.player_num}`);
        logger.debug("they are" + this.constant_status_effects.map(x => status_cond_to_string(x)).join(";"));
        this.constant_status_effects.length = 0;
    }


    // Nothing else is happening, and we now start an effect.
    do_effect(fx: SolidEffect): void {
        if (!fx.source) {
            let a: any = 0; a.no_source();
        }
        this.game.no_control();
        let x = new ResolutionLoop(this.game, [fx], 1, []);
        this.game.root_loop.add_res_loop(x);

        this.game.gamestep = GameStep.IN_LOOP;
    }


    get_use_array(use_td: TargetDesc, source: TargetSource, solid: SolidEffectLoop | false = false): Command[] {
        let verbose_use: Command[] = [];
        // cards from hand?

        let cards = <CardLocation[]>this.game.find_target(use_td, GameEvent.USE, source, solid);
        for (let cl of cards) {
            if (!cl.is_option()) continue; // how could this happen? the td should already say 'option'
            if (!this.can_play(cl.card)) continue;  // handles both color and cost, will need to break these eventually                        
            let v_key = `PLAY ${cl.index}}`;
            let v_value = `Use ${cl.get_name()}`;
            verbose_use.push({ command: v_key, text: v_value, ver: uuidv4() });
        }
        return verbose_use;
    }

    // returns two things; first is what we want, verbose_attack
    // second is legacy can_attack array that should really be taken out and shot
    get_attacker_array(_attackers?: Instance[], attack_td?: TargetDesc, attack_conditions?: string): [Command[], EvolveArray] {
        let can_attack: EvolveArray = {};
        let verbose_attack: Command[] = [];
        let attackers = _attackers ||= this.field;
        for (let att of attackers) {
            let targets = att.can_attack(attack_td, attack_conditions);
            if (targets) {
                can_attack[att.id] = targets;
                for (let target of targets) {
                    // here would be an excellent use for labels!
                    let v_key = `ATTACK ${att.id} ${target}`;
                    let s_target = target ? this.get_instance(target).get_name() : "player";
                    let v_value = `Attack ${att.get_name()} into ${s_target}`;
                    let attack_source = att.id;
                    let attack_dest = target;
                    verbose_attack.push({ command: v_key, text: v_value, ver: uuidv4(), 
                        attack_source: attack_source, attack_dest: attack_dest });
                }
            }

        }
        return [verbose_attack, can_attack];
    }

    // for both PLAY and USE
    // This may need to be updated to be a CardLocation.
    // Because could use from trash
    use(hand_number: number, card: Card) {
        if (!this.can_play(this.hand[hand_number])) {
            logger.error("Tried to use card that can't be used");
            return;
        }
        if (card.u_cost == undefined) {
            this.log(`No use cost for ${card.name}`);
            logger.error(`No use cost for ${card.name}`);
            return;
        }
        logger.info(`USING ${card.name} from hand.`);
        this.log(`USING ${card.name} from hand.`);

        card.extract().move_to(Location.OPTZONE);
        this.game.play_or_use_from_source(this, card, "option");
        /*
        let c = this.hand.splice(hand_number, 1)[0];
        // card exists in an alternate space at this point
        if (c != card) {
            let a: any = null; a.dieoff();
        }
        c.move_to(Location.OPTZONE);
        //        this.reveal.push(c);
        let fx = this.get_option_effect(card, "MAIN")!;
        let cl = new CardLocation(this.game,
            this.player_num,
            Location.OPTZONE,
            0);
        // why do I need a new cl ?
        fx.source = new SpecialCard(cl);
        this.do_effect(fx);
        */
    }

    // not just option effects!!
    get_option_effect(card: Card, keyword: string): SolidEffect {
        // if security effect, and first security effect is use main, do that
        logger.info(`solid count on card ${card.new_effects.length} keyword is ${keyword}`);
        if (keyword == "SECURITY") {
            // activate 'main', or first security effect
            logger.silly(card.new_security_effects.toString());
            let solid = card.new_security_effects[0]; // assuming just 1 sec effect
            logger.debug(solid.toString());
            if (solid.activate_main) {
                let fx = card.new_effects[0];
                let sp = new fSpecialPlayer(this);
                fx.source = sp;
                return fx;
            }
            let fx = card.new_security_effects[0];
            return fx;
        }
        for (let e of card.new_effects) {
            logger.info(`e is ${e.raw_text} keyword are ${e.keywords.join()}`);
        }
        // It's not necessarily the first effect. Well, I guess it should be, but ordering got
        // messed up somewhere, so make sure we're not picking a <Delay> effect.
        let fx = card.new_effects.find(x => x.keywords.includes("[Main]") && !(x.keywords.includes("＜Delay＞")));
        if (!fx) {
            console.error("missing", card);
            logger.error("missing effect");
        }
        logger.info("option effect found: " + fx?.raw_text);

        // why don't we need to set fx.source here?
        return fx!;
        // removed commented out code, apr 29
    }


    play(hand_number: number, hash: Hash = {}) {

        this.log("before card comes out: memory is " + this.game.get_memory());
        //        let cl: CardLocation = new CardLocation(this.game, this.player_num, Location.HAND, hand_number);
        let pile = this.hand;
        let card: Card = pile[hand_number];
        //let card = cl.card;
        if (!card) return;
        if (card.n_type == 4) {
            return this.use(hand_number, card);
        }
        logger.info("playing card " + card.get_name() + " hand number " + hand_number);
        // we should reveal, then try to play. That's not quite working.
        // does play-by-effect also put the card into REVEAL?
        // TODO: don't do this here, let terminus do it
        let cl = new CardLocation(this.game, this.player_num, Location.HAND, hand_number);
        card.save_prior_location(cl);
        card.extract();
        card.move_to(Location.REVEAL);

        let label: string = hash.label;
        if (!label) label = "Yyy";
        // the sooner we fix this Yyy the easier on our test suite
        this.game.play_or_use_from_source(this, card, label); //  card.p_cost);
    }

    // Move all the cards in my REVEAL zone to a place.
    put_reveal(l: Location) {
        let c;
        if (l == Location.REVEAL) return; // what! is you doin??
        while (c = this.reveal.pop()) {
            this.game.log(`Putting ${c.name} to ${Location[l].toLowerCase()}`);
            c.move_to(l, undefined, "BOTTOM");
        }
    }

    // reveal from deck
    reveal_cards(n: number): number {
        let i;
        let txt = [];
        for (i = 0; i < n; i++) {
            let c: Card | undefined = this.deck.pop!();
            if (!c) {
                if (txt.length > 0) this.game.la("Revealed: " + txt.join(", "));
                this.game.la("Deck empty.");
                return i;
            }
            txt.push(c.name);
            c.move_to(Location.REVEAL);
        }
        this.game.la("Revealed: " + txt.join(", "));
        return i;
    }

    trash_card(cl: CardLocation): boolean {
        let c: Card = cl.extract();
        if (!c) { let ff: any = null; ff.trash(); }
        c.move_to(Location.TRASH);
        return true;
    }

    // technically this puts a card into hand
    untrash_card(cl: CardLocation): boolean {
        let c: Card = cl.extract(); // TODO, write get_card_by_location or something
        if (!c) { let gg: any = null; gg.untrsh(); }
        c.move_to(Location.HAND);
        return true;
    }

    hatch(depth: number): boolean {
        this.log("trying to hatch");
        if (!this.can_hatch()) return false;
        let card: Card = this.eggs.pop()!;

        let baby = Instance.hatch(card, this.game, this, this.other_player!);
        logger.silly(baby.summary());
        this.egg_zone = baby;
        this.log(`Hatch egg ${card.id} to new instance ${baby.id}`);
        this.game.log(`Player ${this.player_num} hatched ${baby.id}`);
        this.game.fancy.add_string(depth, `Player ${this.player_num} hatched ${baby.name()}`);
        this.game!.ui_card_move();

        return true;
    }

    // Technically this is a move(), and should be extended to that for P-143
    raise(depth: number): boolean {
        if (!this.can_raise()) return false;
        if (!this.egg_zone) return false;
        let ref: Instance = this.egg_zone;
        ref.move(Location.BATTLE);
        this.field.push(ref);
        this.log(`Raise instance ${ref.id} named ${ref.name()} to field(now sized ${this.field.length}`);
        this.game.log(`Player ${this.player_num} raised ${ref.name()} `);
        this.game.fancy.add_string(depth, `Player ${this.player_num} raised ${ref.name()}`);
        this.egg_zone = null;
        this.game!.ui_card_move();
        return true;
    }

    // (Does this function belong here on in card.ts?)
    // Takes either a card object or a card number
    can_play(card: Card): boolean {
        if (typeof (card) == 'number') {
            card = this.hand[card];
        }
        let mem = this.game.available_memory();
        // assume I can't play to egg_zone
        return card.can_play(this, mem);
    }



    can_counter_evo(): boolean {
        for (let c of this.hand) {
            if (this.can_evolve(c, true, "yes", true)) return true; // normal blast
            //            if (this.can_evolve(c, true, true)) return true
        }
        return false;
    }

    get_counter_evo_questions_OBSOLETE(blast: boolean = false): UserQuestion[] {
        return [];
    }

    // For a single card in hand, show what I *could* evolve onto.
    // Returns array of pairs, first is the target inst, second is the cost. 
    // (Cost *could* be more than we have available.)

    static link_options_into_questions(links: Array<[CardLocation | Instance, Instance, number, number?]>): UserQuestion[] {
        let ret: Command[] = [];
        for (let link of links) {
            let [plugger, recipient, cost, totrash] = link;
            let str = `Link ${plugger.get_name()} ${plugger.id} to ${recipient.get_name()} ${recipient.id} `;
            let key_array = [plugger.get_key(), recipient.get_key(), cost]
            let cmd_trash:any = false;
            if (typeof totrash == "number") {
                key_array.push(totrash);
                let trash_name = recipient.plugged[totrash].get_name()
                str += "trashing " + trash_name;
                cmd_trash = { location: "FIELD", id: totrash, name: trash_name }
                 
            }
            str += cost;
            let key = key_array.join("-");
            logger.info("CMD: " + key);
            let cmd_plugger = { location: Location[plugger.location], id: plugger.index };
            let cmd_recipient = { location: Location[recipient.location], id: recipient.id, name: recipient.name() };
            ret.push({
                command: key,
                text: str,
                ver: uuidv4(),
                link_source: cmd_plugger,
                link_target: cmd_recipient,
                link_trash:  cmd_trash,
                cost: String(cost)
            });
        }
        return ret;
    }

    // 
    static evo_options_into_questions(evos: Array<[CardLocation, CardLocation | Instance, CardLocation | Instance | undefined, 'evo' | 'fusion' | 'burst' | 'app', number?]>, blast: boolean = false): UserQuestion[] {
        let ret: Command[] = [];

        // TODO: merge with other question generator (this is for by effect, but 
        // they could be made common)
        if (blast) {
            ret.push({ command: "-1", text: "Don't Blast Evolve", ver: uuidv4() });
        }
        for (let evo of evos) {
            let [into, left, right, type, cost] = evo;
            logger.info(` into ${into} ${!!into} left ${left} ${!!left} right ${right} ${!!right} cost ${cost} ${!!cost} `);

            let str = `Lv.${into.card.get_level()} ${into.get_field_name(Location.HAND)}`;
            let l = into.location;
            let left_s = left.get_field_name();
            let right_s = right ? " and " + right.get_field_name() : "";
            let cost_s = (cost == undefined) ? "-" : String(cost);

            let into_key = into.get_key();
            let left_key = left.get_key();
            let right_key = right ? right.get_key() : "0-0-0";

            let evo_left = { location: Location[left.location], id: left.id };
            let evo_right = right && { location: Location[right.location], id: right.id };
            let evo_card = { location: Location[into.location], id: into.index };


            let v = `Evolve ${str} onto ${left_s}${right_s} (${cost_s})`;
            let cmd = `${into_key}-${left_key}-${right_key}-${cost_s}`;
            logger.info("CMD: " + cmd);
            ret.push({
                command: cmd,
                text: v,
                ver: uuidv4(),
                evo_left: evo_left, evo_right: evo_right, evo_card: evo_card, cost: cost_s,
                evo_target: `${left_s}${right_s}`


            });
        }
        return ret;
    }




    // in theory, what restrictions would we have?
    // 
    get_all_links(solid: SolidEffectLoop | false, source?: TargetSource, to_plug?: TargetDesc, recipient?: TargetDesc):
        // plugger     reciipent     cost     totrash
        (Array<[CardLocation | Instance, Instance, number, number?]>) {
        let ret: Array<[CardLocation | Instance, Instance, number, number?]> = [];

        // from_hand and from_field aren't being checked
        let plug_candidates: (CardLocation | Instance)[] | undefined = undefined;
        if (to_plug && source) {
            plug_candidates = <CardLocation[]>this.game.find_target(to_plug, GameEvent.PLAY, source, solid, Location.BATTLE);
        }
        if (!plug_candidates) {
            plug_candidates = this.hand.map((c, i) => new CardLocation(this.game, this.player_num, Location.HAND, i));
            plug_candidates.push(... this.field);
        }
        let recipients: Instance[] | undefined = undefined;
        if (recipient && source) {
            recipients = <Instance[]>this.game.find_target(recipient, GameEvent.DELETE, source, solid, Location.BATTLE);
        }
        if (!recipients) {
            recipients = [];
            for (let i of this.field) {
                if (!i.is_monster()) continue; // only monsters can be linked
                if (i.is_token()) continue; // tokens can't be linked
                recipients.push(i);
            }
        }


        for (let pc of plug_candidates) {
            let lcs = pc.get_link_requirements();
            if (lcs.length == 0) continue;
            for (let i of recipients) {
                if (pc === i) continue; // can't link to self

                let costs: number[] = Card.can_evolve_into(i, lcs);
                // can_"evolve" isn't right
                    for (let cost of costs) {
                    if (i.plugged.length + 1 > i.get_links()) {
                        for (let n = 0; n < i.plugged.length; n++) {
                            ret.push([pc, i, cost, n]);
                        }
                    } else {
                        ret.push([pc, i, cost]);
                    }
                }

            }
        }


        return ret;
    }

    // CARDINTO: always cardlocation, if undefined then hand
    // LEFT: usually instance, if undefined then field
    // RIGHT: FOR FUSION: second monster
    //        FOR BURST:  tamer to bounce
    //        FOR APP:    for app, index of plugged card (always 0 for now)
    // *  common mode: x_plays, call with fusion: "yes", field x field
    // *  blast mode: for fusion, compare all field x hand
    // *  by effect, non-fusion: find all td2
    // *  by effect, for fusion: find all td2, all td3, cross them both ways
    get_all_evolves(blast: boolean,
        fusion: "yes" | "no" | "only",
        app: "yes" | "no" | "only",
        solid: SolidEffectLoop | false,
        source?: TargetSource,
        left?: TargetDesc, into?: TargetDesc, right?: TargetDesc,
        mod?: string,
        include_eggs?: boolean):
        (Array<[CardLocation, CardLocation | Instance, CardLocation | Instance | undefined, 'evo' | 'fusion' | 'burst' | 'app', number?]> | false) {
        let ret: Array<[CardLocation, CardLocation | Instance, CardLocation | Instance | undefined, 'evo' | 'fusion' | 'burst' | 'app', number?]> = [];
        // return value: card to evo into, left, right, type, cost

        // we recalculate a lot of things repeatedly, this is ripe for optimization

        logger.info(`EVO TEST into ${into} left ${left?.toString()} right ${right?.toString()} source ${source && source.id()} `);

        let cards = undefined;
        if (into && source)
            cards = <CardLocation[]>this.game.find_target(into, GameEvent.EVOLVE, source, solid);
        let lefts = undefined;
        // if fusiuon, grab from hand and field. otherwise, grab from field.
        let evo_from = (fusion === "no") ? GameEvent.DELETE : GameEvent.STACK_ADD;
        if (left && !left.empty() && source) {
            lefts = <CardLocation[]>this.game.find_target(left, evo_from, source, solid);
        }
        let rights = undefined;
        // gameEvent.STACK_ADD returns both card locations and instances
        if (right && source)
            rights = <CardLocation[]>this.game.find_target(right, evo_from, source, solid);


        if (!cards) {
            cards = this.hand.map((c, i) => new CardLocation(this.game, this.player_num, Location.HAND, i));
        }
        if (!lefts) {
            lefts = this.field;
            // also don't hit here if by effect
            if ((!blast)) {
                if (this.egg_zone && false) lefts.concat(this.egg_zone);
            }
        }

        logger.info(`length into ${cards.length} ontop of ${lefts.length} and ${rights && rights.length}`);


        if (app === "yes" || app === "only") {
            for (let cl of cards) {
                lefts.forEach(l => {
                    let costs = cl.card.can_app_evolve(l as Instance);
                    if (costs) costs.forEach(cost => {
                        // assume always first plug; can_app_evolve needs to change
                        // interface if multiple plugs possible
                        ret.push([cl, l, undefined, 'app', cost]);
                    })
                });
            };
            if (app === "only") return ret;
        }

        let xx = 0; for (let cl of cards) for (let left of lefts) logger.debug(`xx is ${xx++} cl is ${cl.get_field_name()} left is ${left.get_field_name()} left.id ${left.id}  and left.i is ${("index" in left) && left.index}.  `);
        for (let cl of cards) {
            if (mod?.includes("ignore requirements")) {
                // add all combos; what if the cost is free? 
                let cost = cl.card.e_cost;
                lefts.forEach(l => ret.push([cl, l, undefined, 'evo', cost]));
            } else {
                // args are card, blast, fusion, split
                let _evo = this.can_evolve(cl.card, blast, fusion, blast, lefts, rights, include_eggs);
                if (_evo) {
                    for (let _target of _evo) {
                        let [l, r, cost] = _target;
                        logger.debug(`checking that lefts in l, may be too broad lid = ${l.id}`);
                        ret.push([cl, ..._target]);
                    }
                }
            }
        };
        logger.debug("return length is " + ret.length)
        return ret;
    };


    // if nothing, return false.
    // answers "what can digi into me" for 1 specific card
    can_evolve(card: Card, blast: boolean = false,
        fusion: "yes" | "no" | "only", split: boolean = false,
        lefts?: (CardLocation | Instance)[],
        rights?: (CardLocation | Instance)[],
        include_egg?: boolean

        //  target?: number, ignore_requirement?: boolean
    ): (Array<[CardLocation | Instance, CardLocation | Instance | undefined, 'evo' | 'fusion' | 'burst', number?]> | false) {
        let ret: Array<[CardLocation | Instance, CardLocation | Instance | undefined, 'evo' | 'fusion' | 'burst', number?]> = [];
        logger.debug(`args: card ${card.get_name()} blast ${blast} fusion ${fusion} split ${split} ` +
            `lefts ${lefts ? lefts.map(x => x.get_field_name()).join("/") : "nul"} rights ${rights} `);
        if (blast) {
            // counter is a solid effect keyword, not a card keyword
            if (!card.has_keyword("ACE", "main")) {
                return false;
            }
        }

        if (fusion != "no") {
            logger.debug("this can be optimized  " + split);
            // we recalculate "can this thing evo into the left" repeatedly

            if (lefts && rights) {
                logger.info("left and right");
                for (let left of lefts) {
                    for (let right of rights) {
                        if (left == right) continue;
                        let e, type: any;
                        for (type of ['fusion', 'burst']) { // we can't burst by  effect so this is never used
                            if (e = card.can_merge_evolve(left, right, type)) {
                                logger.debug("can merge lr match");
                                // forcing merge cost to be 0, not tecnically true
                                ret.push([left, right, type, 0]);
                            }
                            if (e = card.can_merge_evolve(right, left, type)) {
                                logger.debug("can merge rl match");
                                // forcing merge cost to be 0, not tecnically true
                                ret.push([right, left, type, 0]);
                            }

                        }
                    }
                }

            } else if (!split) {
                // we need to be able to fusion not just with stuff on field, but
                // also with stuff in hand

                // this is a stupid O(n^2) that duplicates so much work but should be okay for now.
                // The CRM doesn't say that you can't DNA in the eggzone, but assume we can't.

                // both sources on field
                for (let left of this.field) {
                    for (let right of this.field) {
                        if (left == right) continue;
                        let e, type: any;
                        for (type of ['fusion', 'burst'])
                            if (e = card.can_merge_evolve(left, right, type)) {
                                // forcing merge cost to be 0, not tecnically true
                                ret.push([left, right, type, 0]);
                            }
                    }
                }
            } else {
                if (!blast || card.can_fusion_blast()) {
                    let cards_to_search: CardLocation[] = [];
                    cards_to_search.push(...this.hand.map((c, i) => new CardLocation(this.game, this.player_num, Location.HAND, i)));
                    cards_to_search.push(...this.trash.map((c, i) => new CardLocation(this.game, this.player_num, Location.TRASH, i)));

                    // I could always make the first the field and the second the hand.
                    // Then, 
                    // one source on field, one in hand. Again, we'll recalculate something over and over again
                    for (let field of this.field) {
                        for (let cl of cards_to_search) {
                            let cost;
                            logger.info(`can we merge ${field.get_field_name(1)} and ${cl.get_field_name(1)} into me, ${card.name}`);
                            if (cost = card.can_merge_evolve(field, cl, 'fusion')) {
                                ret.push([field, cl, "fusion", cost[0]]);
                                logger.info("CAN FUSE FIELD AND HAND");
                            }
                            if (cost = card.can_merge_evolve(cl, field, 'fusion')) {
                                ret.push([cl, field, "fusion", cost[0]]);
                                logger.info("CAN FUSE HAND AND FIELD");
                            }
                            logger.info("len is " + ret.length);
                        }
                    }
                }
            }
        }

        if (typeof (card) == 'number') {
            card = this.hand[card];
        }
        if (fusion != "only") {
            if (!blast || card.can_blast()) {
                // interruptives on evolve could let us go over cost
                let mem = this.game.available_memory();
                let egz = !blast && include_egg && this.egg_zone;
                if (egz) {
                    //if (!target || target == egz.id)
                    {
                        let costs = egz.can_evolve(card, mem, 0, 'evo');
                        if (costs) for (let cost of costs) {
                            ret.push([egz, undefined, "evo", blast ? undefined : cost]);
                        }
                    }
                }
                let tgt = lefts;
                //console.debug(tgt?.map(x => x.get_field_name()).join(","));
                if (!tgt) tgt = this.field;
                //console.debug(tgt?.map(x => x.get_field_name()).join(","));
                for (let mon of tgt) {
                    //    if (target && mon.id != target) continue;
                    //       logger.info(`cat ${mon.get_field_name()} evo into ${
                    let costs = mon.can_evolve(card, mem, 0, 'evo');
                    if (costs) for (let cost of costs) {
                        ret.push([mon, undefined, "evo", blast ? undefined : cost]);
                    }
                }
            }
        }

        return (ret.length == 0 ? false : ret);
    }

    get_instance(instance_id_or_label: number | string): Instance {
        return this.game.get_instance(instance_id_or_label);
    }

    // it's already cleaned up itself, we need to delete it from our records
    _remove_instance(instance_id: number) {
        logger.debug("removing " + instance_id + " from field...");
        // for a fusion, it doesn't "leave the field"
        //this.log(`Removing ${instance_id} from field`);
        if (this.egg_zone && this.egg_zone.id == instance_id) {
            this.egg_zone = null;
            return;
        }
        for (let i = 0; i < this.field.length; i++) {
            logger.debug("searching in " + this.field[i].id);
            if (this.field[i].id == instance_id) {
                logger.info(`was in slot ${i}, name was ${this.field[i].name()}`);
                this.field.splice(i, 1);
                return;
            }
        }
        logger.error("INSTANCE NOT FOUND " + instance_id);
        this.log("ERROR: WAS NOT FOUND");
        return null; // maybe return a dead thing?
    }

    // get card in hand
    get_hand_index(word1: string): number {
        let arg1 = parseInt(word1);
        if (word1.includes("-")) {
            // We've got a name. Find this card.
            let _card = this.game.get_card(word1);
            logger.silly(_card && _card.name);
            if (!_card) return -1;
            let card_id = _card.id;
            logger.silly(card_id);
            arg1 = this.hand.findIndex(x => x.id == card_id);
        }
        return arg1;
    }



    execute_string(line: string): string {
        try {
            let ret = this.execute(line.split(/\s+/));
            for (let i = 0; i < 20; i++) this.game.step();
            return ret;
        } catch (e) {
            console.error(e);

        }
        return "no";
    }

    // returns error string; empty string on no error
    execute(words: string[]): string {
        let g = this.game;
        logger.info("EXECUTING " + words);
        //console.trace();
        let [word0, word1, word2, word3, word4, word5] = words;
        let cmd = word0.toUpperCase();
        let arg1 = parseInt(words[1]);
        let arg2 = parseInt(words[2]);
        let arg3 = words[3] ? parseInt(words[3]) : -1; // only for evo cost right now
        let arg4 = parseInt(word4);
        let arg5 = parseInt(word5);

        if (!this.xxx_has_control()) {
            logger.error("move out of order ");
            this.game.announce(`Player ${this.player_num} did something when control belonged to ${this.game.get_control()}`);
        }
        logger.silly(Phase[this.game.phase]);


        if (cmd == "ANSWER") {
            logger.debug(`words is ${words.join(":::")}`);
            // this is 
            g.log(`Player ${this.player_num} answering question`);
            if (!this.game.waiting_answer()) {
                this.game.announce("not in wait");
            }
            // TODO: check for it belonging to me!
            let x = words[1].toString().split(",");
            logger.info(`WAIT x is ${x.join("--")}`);
            this.game.set_answer(this.player_num, x);

            this.game.no_control(); // to spin through? 
            this.game.step("fast"); //?
            return "";
        }

        if (!this.xxx_has_control()) {
            // nothing below should run
            return "no control";
        }

        if (cmd === "DUMP") {
            return this.game.dump("HAND,TRASH,SECURITY,DECK,EGGS,EGGZONE", 1);
        }

        if (this.game.phase == Phase.HATCHING) {
            if (cmd == "HATCH") {
                if (this.can_hatch()) {
                    this.game.no_control()//  = 0;
                    if (this.hatch(1)) {
                        this.game.to_main(); // do all that in here??  
                    }
                }
            }
            if (cmd == "RAISE") {
                if (this.can_raise()) {
                    this.game.no_control()//  = 0;
                    if (this.raise(1)) {
                        this.game.to_main();
                    }
                }
            }
            // using "main" here causes confusion
            if (cmd == "MAIN" || cmd == "NEXT") {
                this.game.log(`Player ${this.player_num} leaving hatching`);
                this.game.no_control()//  = 0;
                this.game.to_main(); // see if still our turn
            }

            return ""; // no valid command
        }
        let msg = `PLAYER ${this.player_num} MAIN: `;
        if (cmd == "PLAY") {
            let arg1 = this.get_hand_index(word1);
            let card = this.hand[arg1];
            if (!card) return "invalid card " + word1;
            if (card.is_option()) {
                msg += `USE ` + card.name.toUpperCase();
            } else {
                msg += `PLAY ` + card.name.toUpperCase();
            }
            g.la(msg);
            this.game.no_control();
            this.play(arg1, { label: word2 });
            this.game.step();
        } else if (cmd.startsWith("EVO")) {
            let arg1 = this.get_hand_index(word1);
            let card = this.hand[arg1];
            if (!card) return "missing card";

            let monster = this.get_instance(word2);
            if (!monster) return "missing monster";

            arg2 = monster.id;
            msg += `EVOLVE ${card.name.toUpperCase()} ONTO ${monster.get_name().toUpperCase()}`;

            let monster2 = undefined;
            // at this point we need to always use a label
            if (word4 == "-1") {
                arg4 = -1;
            } else if (word4 && word4 != "0") {
                monster2 = this.get_instance(word4);
                if (!monster2) return "missing monster2";
                arg4 = monster2.id;
                msg += ` AND ${monster2.get_name().toUpperCase()}`;
            }

            g.la(msg);
            this.game.no_control();

            let r = this.evolve(arg1, arg2, arg4, { cost: arg3 });
            this.game.step();
            return r;
        } else if (cmd.startsWith("ATT")) {
            let attacker = this.get_instance(word1);
            if (!attacker || (arg2 && !this.get_instance(word2))) return "bad attack";
            arg1 = attacker.id;
            let target: Instance = this.get_instance(word2);
            //            get_name().toUpperCase() : "PLAYER";
            arg2 = target ? target.id : 0;
            let attacker_str = attacker.get_name().toUpperCase();
            let target_str = arg2 ? target.get_name().toUpperCase() : "PLAYER";
            msg += `ATTACK ${attacker_str} INTO ${target_str}`;
            g.la(msg);
            this.game.no_control();
            this.attack_new(1, arg1, arg2);
            this.game.step();

            // the above may not return, we have to get back 
            // to them in step(), which will land us in 
            // process_game_flow eventually
        } else if (cmd.startsWith("LIN")) {
            // LOCATION INDEX INSTANCE COST
            this.game.no_control();
            let l: Location = string_to_location(word1);
            let arg2;
            if (l === Location.HAND) {
                arg2 = this.get_hand_index(word2);
            } else if (l === Location.BATTLE) {
                let monster = this.get_instance(word2)
                if (!monster) return "bad monster";
                arg2 = monster.id;
            } else {
                return "bad location";
            }

            let recip = this.get_instance(word3);
            if (!recip) return "bad recipient";
            arg3 = recip.id;
            if (isNaN(arg5)) arg5 = undefined!;

            let r = this.link(l, arg2, arg3, arg5, { cost: arg4 });
            this.game.step();
            return r;
        } else if (cmd == "MAIN") {
            // TO DO: verify this is an actual effect *and* that it's my turn

            let i = this.game.get_instance(word1);
            if (!i) return "no instance";
            let fx = i.get_main();
            if (!fx) return "no main";
            msg += `[MAIN] EFFECT OF ${i.get_name().toUpperCase()}: ${fx.raw_text} `;

            // TODO: shouldn't even offer this

            if (fx.keywords.includes("＜Delay＞")) {

                if (i.play_turn == this.game.n_turn) {
                    this.game.log("cannot use ＜Delay＞ effect yet");
                    this.game.announce("cannot use ＜Delay＞ effect yet", this.player_num);
                    return "can't activate delay yet";
                }
                // pay the cost, and it will show as activating in the trash I guess?
                //    i.do_trash("delay effect");
            }

            fx.source = new SpecialInstance(i);
            // I stole this from player::get_triggered_events()
            fx.trigger_location = i.location;
            fx.trigger_instance_id = i.id;
            fx.trigger_top_card_location_id = i.top().card_instance_id;
            // all [Main] effects are on the top card

            this.do_effect(fx);
        } else if (cmd == "PASS" || cmd == "NEXT") {
            g.log(`PLAYER ${this.player_num} DOING FREE MOVE: PASS`);
            g.log(`passing turn, memory from ${this.game.get_memory()} to -3`);
            g.set_memory(-3);
            g.process_game_flow();
            this.game.step();
        } else {
            return "unknown command";
        }
        return ""; // default
    }

    // "original" target cannot block
    get_blockers(target?: Instance): Instance[] {
        return this.field.filter(i => i && i.can_block() && i !== target);
    }

    // returns IDs of all public cards
    public_cards_ids(): string[] {
        let ret: string[] = [];
        for (let t of this.trash) {
            ret.push(t.id);
        }
        if (this.egg_zone) {
            ret.push(... this.egg_zone.card_ids());
        }
        for (let i of this.field) {
            ret.push(...i.card_ids());
        }
        return ret;
    }
    // for now, just hand, but could also be other private cards
    private_cards_ids(): string[] {
        return this.hand.map(x => x.id);
    }


    get_hand(): string {
        let hand: object[] = [];
        for (let i in this.hand) {
            let c = this.hand[i];
            if (!c) continue;
            hand[i] = { index: i, name: c.name, id: c.id };
        }
        return JSON.stringify(hand);
    }

    // this should be done in Game, not Player
    // TEXT UI
    get_field(): string {
        let field: object[] = [];
        for (let i in this.game.instances) {
            let instance: Instance = this.game.instances[i];
            if (!instance) continue;
            if (!instance.in_play()) continue;
            field[i] = { index: i, name: instance.name() };
        }
        return JSON.stringify(field);
    }

    // all things the player can do now, as a JSON string 
    // the verbose arg is probably true; un-verbose is for old-fashioned text UI
    // short form is like {"PLAY":[0],"EVOLVE":{},"ATTACK":{},"MAIN":{}}

    get_x_plays(args: Args): string {

        this.verify();

        let first: Command = { command: "json", text: "REFRESH", ver: uuidv4(), last_id: -42 };
        let last: Command = { command: "NEXT", text: "PASS TURN", ver: uuidv4() };

        let verbose = args.verbose;
        let automatic = args.automatic;
        let sort = (args.sort === undefined) ? true : args.sort;

        if (this.game.waiting_answer()) {
            let x = this.game.get_control();
            logger.silly(` x is ${x} other player is ${this.other_player.player_num}`);

            if (x != this.other_player.player_num) {
                // give questions unless we know for sure it's the other player's question
                let l = this.game.get_wait_questions(this.player_num);
                logger.silly("l is " + JSON.stringify(l));

                if (l && l.length > 1) {
                    l.unshift(first);
                    l[0].text = this.game.get_question();
                    l[0].choose = this.game.wait_count;

                    return JSON.stringify(l);
                }
            }

            // other person's turn to answer
            return JSON.stringify([{
                command: "json",
                text: "(waiting other person's answer)",
                ver: uuidv4(),
                last_id: this.game.current_command_id(),
                choose: this.game.wait_count,
            }]);
        }

        logger.silly(`has control ${this.player_num} is ${this.xxx_has_control()}`);

        if (this.game.get_wait_control() == this.player_num
            ||
            (this.xxx_has_control() && this.game.waiting_answer())
        ) {
            let l = this.game.get_wait_questions(this.player_num);
            if (l && l.length > 1) return JSON.stringify(l);
        }

        if (!automatic && !this.xxx_has_control()) {
            if (this.game.get_control() == 3 - this.player_num) {
                return JSON.stringify([{ command: "json", text: "(other player's move)", ver: uuidv4() }]);
            }
            return JSON.stringify([{ command: "json", text: "(not your move.)", ver: uuidv4() }]);
        }

        if (this.game.gamestep == GameStep.IN_LOOP) {
            return JSON.stringify([{ command: "json", text: "(not your move).", ver: uuidv4() }]);
        }

        if (this.game.phase == Phase.HATCHING) {
            if (verbose) {
                let ret = [first];
                let x: Command;
                if (this.can_raise()) {
                    x = { command: "RAISE", text: "Raise from Breeding", ver: uuidv4() };
                    ret.push(x);
                }
                if (this.can_hatch()) {
                    x = { command: "HATCH", text: "Hatch an egg", ver: uuidv4() };
                    ret.push(x)
                }
                last.command = "NEXT";
                last.text = "Go to Main Phase";
                ret.push(last);

                return JSON.stringify(ret);
            }

            let obj: HatchingArray = {
                "RAISE": this.can_raise(),
                "HATCH": this.can_hatch()
            };

            return JSON.stringify(obj);
        }

        if (sort) this.hand.sort(this.sorter);
        let can_play: number[] = [];
        let verbose_play: Command[] = [];

        let can_evolve: EvolveArray = {};
        let verbose_evolve: Command[] = [];

        let can_attack: EvolveArray = {};
        let verbose_attack: Command[] = [];

        let can_main: EvolveArray = {};
        let verbose_main: Command[] = [];

        // can_link, we're no longer maintaining this
        let verbose_link: Command[] = [];

        let v_key: string;
        let v_value: string;



        let context_plays = [];
        for (let i = 0; i < this.hand.length; i++) {
            let card = this.hand[i];
            if (this.can_play(card)) {
                v_key = `PLAY ${i}`;
                v_value = `${card.is_option() ? "Use" : "Play"} ${card.get_name()}`;
                verbose_play.push({ command: v_key, text: v_value, ver: uuidv4() });
                can_play.push(i);
            }
        }

        let all_evos = this.get_all_evolves(false, "yes", "yes", false,
            undefined, undefined, undefined, undefined, undefined, true); // include eggs, no blast


        if (all_evos) {
            //           console.error(1223, all_evos);
            for (let [into, left, right, type, cost] of all_evos) {

                logger.debug("somewhat dupe code, but we can't use the same keys");
                // assume all basic evos are from hand and left is an instance
                let r_label = right ? right.id : 0;
                let r_name = right ? right.get_name() : '';
                if (type === 'app') {
                    r_label = "-1";
                    r_name = (left as Instance).plugged[0].get_name() + " AppFuse";
                }
                v_key = `EVOLVE ${into.index} ${left.id} ${cost} ${r_label}`;
                let str = `Lv.${into.get_level()} ${into.get_name()}`;
                let conjunction = type === 'fusion' ? 'and' : 'with';
                let fusion = (type !== 'evo') ? ` ${conjunction} ${r_name}` : ``;
                let prefusion = type === 'evo' ? '' : type === 'burst' ? 'Burst ' : 'DNA ';
                if (type === 'app') prefusion = 'AppFuse ';
                let cost_s = (cost == undefined) ? "-" : String(cost);
                logger.debug(`cost_s ${cost_s} udnefined ${cost == undefined} cost ${cost}`);
                let evo_target = left.get_name() + fusion;
                v_value = `${prefusion}Evolve ${str} onto ${evo_target} (${cost_s})`;
                let evo_left = { location: Location[left.location], id: left.id };
                let evo_right = right && { location: Location[right.location], id: right.id };

                let evo_card = { location: Location[into.location], id: into.index };
                verbose_evolve.push({
                    command: v_key, text: v_value, ver: uuidv4(),
                    evo_left: evo_left, evo_right: evo_right, evo_card: evo_card, cost: cost_s,
                    evo_target: evo_target
                });

            }
        }

        let all_links = this.get_all_links(false);

        for (let link of all_links) {
            let card: CardLocation | Instance, instance: Instance, cost: number, totrash: number | undefined;
            [card, instance, cost, totrash] = link;
            let card_location: string = Location[card.location];
            let card_index = card.index;
            let instance_id = instance.id;
            v_key = `LINK ${card_location} ${card_index} ${instance.id} ${cost}`;
            let card_label: string = ("cardloc" in card) ? card.id : card.name();
            v_value = `Link ${card_label} to ${instance.get_name()} ${instance.id}`;
            let link_trash:any = false;
            if (typeof totrash === "number") {
                v_key += ` ${totrash}`;
                const v_trash = instance.plugged[totrash].get_name();
                link_trash = { location: "FIELD", id: totrash, name: v_trash }
                v_value += ` and trash ${v_trash}`;
            }
            let link_source = { location: card_location, id: card_index };
            let link_target = { location: "FIELD", id: instance_id, name: instance.name() };

            verbose_link.push({
                command: v_key, text: v_value,
                link_source: link_source,
                link_target: link_target,
                link_trash: link_trash,
                cost: String(cost),
                ver: uuidv4()
            });

        }


        [verbose_attack, can_attack] = this.get_attacker_array();

        // ignoring Main effects in egg zone, hand, trash for now
        
        let my_mons = [ ...(this.egg_zone ? [this.egg_zone]: []), ...this.field]; 
        for (let mon of my_mons) {
            // assume each thing can only have 1 "main" effect
            if (mon.get_main()) {
                v_key = `MAIN ${mon.id}`;
                v_value = `Activate ${mon.name()} [Main] effect`;
                verbose_main.push({ command: v_key, text: v_value, ver: uuidv4() });
            }
        }
        if (!verbose) {
            return JSON.stringify({
                "PLAY": can_play,
                "EVOLVE": can_evolve,
                "ATTACK": can_attack,
                "MAIN": can_main
            });
        }
        let ret: Command[] = [first].concat(verbose_evolve).concat(verbose_play).concat(verbose_attack).concat(verbose_link).concat(verbose_main);
        ret.push(last);

        return JSON.stringify(ret);
    }

    // nominally returns empty string on success, error string on error
    link(location: Location, index: number, instance_id: number, to_trash: number | undefined, args: { cost: number }): string {

        let all_links = this.get_all_links(false);
        let _plugger: CardLocation | Instance, _index, _inst, _cost, _to_trash;
        let match = false;
        for ([_plugger, _inst, _cost, _to_trash] of all_links) {
            if (_plugger.location != location) continue;
            if ("card" in _plugger && _plugger.index !== index) continue;
            if (!("card" in _plugger) && _plugger.id !== index) continue;
            if (_inst.id !== instance_id) continue;
            if (_cost !== args.cost) continue;
            if (_to_trash !== to_trash) continue;
            match = true;
            break;
        }
        if (!match) return "no link match";
        if (!_inst) return "no instance";
        if (!_plugger!) return "no plugger";
        /*
        if (!("extract" in _plugger)) {
            // if we've targeting an instance, just grab the card on top
            _plugger = new CardLocation(_plugger.game, _plugger.n_me_player, 
                Location.BATTLE, _plugger.pile.length - 1, _plugger.id);
        }*/

        let limit = _inst.get_links();
        let trash: CardLocation[] = [];

        if (typeof _to_trash === "number") {
            // not handling multiple trashes
            let cl: CardLocation = new CardLocation(this.game, this.player_num,
                Location.BATTLE, _to_trash, _inst.id, "plug");
            trash.push(cl);
        }

        this.game.link(this, _plugger!, _inst!, _cost!, trash);
        return "";
    }


    // nominally returns empty string on success, error string on error
    evolve(hand_number: number, instance_id: number, instance2_id: number,
        args: { cost: number, force_unused?: boolean, free?: boolean }): string {
        let force = args && args.force_unused;
        let free = args && args.free
        let card = this.hand[hand_number];
        if (!card) {
            logger.warn("no card!");
            return "no card";
        }
        let type;
        // is this the same set of arguments we used before?
        let all_evos = this.get_all_evolves(false, "yes", "yes", false,
            undefined, undefined, undefined, undefined, undefined, true); // include eggs, no blast
        if (!all_evos) return "failure";
        let _cl, _left, _right, _type, _cost;
        for ([_cl, _left, _right, _type, _cost] of all_evos) {
            if (_cl.index === hand_number &&
                _left.id === instance_id) {
                if (isNaN(instance2_id) || instance2_id == -1 || instance2_id === 0 || _right?.id === instance2_id) {
                    if (args.cost === -1 || args.cost === _cost) {
                        // cl = _cl; left = _left as Instance; right = _right as Instance;
                        type = _type;
                        break; // assume just 1 match
                        // cost = _cost; this is a good idea but breaks old tests!
                    }
                }
            }
        }
        if (!_cl || !type || !_left) {
            logger.warn(`evo not found  ${hand_number}  ${instance_id} ${instance2_id} ${type}...`);
            return "evo not found";
            // we used to distinguish finding the evo with wrong cost vs not finding the evo
            // we could still do that with a little work here
        }

        let instance = this.get_instance(instance_id);
        if (!instance) {
            logger.warn("evolving onto " + instance_id + " not found");
            return "no target";
        }
        if (instance2_id) {
            logger.warn("fusion evolve conditions not checked");
        }

        let target2: CardLocation | Instance | undefined = instance2_id ? this.get_instance(instance2_id) : undefined;
        if (type === "app") {
            target2 = new CardLocation(this.game, this.player_num,
                Location.BATTLE, 0, instance_id, "plug");
        }

        let old_tag = `${instance.get_level()}: ${instance.name()}`;

        let can_evo = instance.can_evolve(card, 99, 0, 'evo');
        if (!instance2_id && (!can_evo || can_evo.length == 0)) {
            logger.warn("can't evolve here ");
            return "no evo"; // " + JSON.stringify(can_evo);
            //if (!force) return "no evo";
        }
        logger.debug(JSON.stringify(can_evo));
        let cost = args.cost;
        if (!instance2_id)
            if (cost == -1) {
                // use first choice ... not recommended as this may change
                // default to 10, just because we need a default. we should
                // have exited above if there's no cost.
                if (can_evo && can_evo.length > 1) {
                    console.error(`aevo onto ${instance.name(true)} with ${card.name} costs are ${can_evo.join(",")}`);
                    console.error("bb\nbb\x073");
                }
                if (can_evo && can_evo.length > 0) cost = can_evo[0];
            } else {
                if (can_evo && !can_evo?.includes(cost)) {
                    return "invalid cost "; // + JSON.stringify(can_evo);
                }
            }

        let cl: CardLocation = new CardLocation(this.game, this.player_num,
            Location.HAND, hand_number);
        if (!type) type = 'evo';
        this.game.evolve(this, cl, instance, target2, cost, type);
        //        this.game.evolve(this, cl, left, right, cost, type);


        // this.game.evolve(this, cl, instance, instance2, cost);
        return ""; // I guess we assume it succeeded
    }

    all_effects() {
        let ret = [];
        for (let instance of this.field) {
            if (!instance) continue;
            if (instance.location === Location.BATTLE) ret.push(...instance.all_effects());
            // TODO: [security], [hand], [trash]
        }
        return ret;
    }

    get_turn_change_memory(): number {
        let s = this.all_effects().find(e => e.raw_text.match(/turn end condition is (?:.*)(\d)/))
        if (!s) return 0;
        let m = s.raw_text.match(/turn end condition is (.*)(\d)/);
        if (!m) return 0;
        let d = parseInt(m[2]);
        if (m[1].match(/opponent/)) d *= -1;
        return d + 1;
    }

    // doesn't distinguish "play cost" or "evolution" cost reduction; nor which player is hit by it
    has_reduction_floodgate(type: "play" | "evo" | "use" | "link", both: boolean): boolean {

        let who = both ? "Players" : "opponent";
        if (this.all_effects().find(e => e.raw_text.match(`${who}.* can't reduce .*${type}.* costs`)))
            return true;
        return false;

    }

    has_mem_floodgate(): boolean {
        if (this.all_effects().find(e => e.raw_text.match(/gain memory.*Tamer effects?/i)))
            return true;
        return false;
    }

    my_colors(include_eggs: boolean = false): Color[] {
        let ret: Color[];
        ret = all_colors.filter(c => this.has_color(c, include_eggs));
        return ret;
    }

    // TODO: ask for multiple at once
    has_color(color: Color, include_eggs: boolean = true): boolean {
        if (include_eggs && this.egg_zone && this.egg_zone.has_color(color)) { return true; }
        for (let i = 0; i < this.field.length; i++) {
            if (this.field[i].is_option()) continue;
            if (this.field[i].has_color(color)) { return true; }
        }
        return false;
    }

    sorter(a: Card, b: Card) {
        if (a.id == b.id) return 0;
        return (a.id > b.id) ? 1 : -1;
    }

    get_pile(l: Location, i: number): Card[] {
        logger.debug(`getting pile location ${l} number ${i}`);
        switch (l) {
            case Location.DECK: return this.deck
            case Location.SECURITY: return this.security
            case Location.HAND: return this.hand
            case Location.TRASH: return this.trash
            case Location.EGGDECK: return this.eggs
            case Location.REVEAL: return this.reveal
            case Location.NULLZONE: return this.nullzone
            case Location.OPTZONE: return this.optzone
            case Location.TOKENDECK: return this.tokendeck
            case Location.TOKENTRASH: return this.tokentrash
            case Location.EGGZONE: return this.egg_zone ? this.egg_zone.pile : []
            case Location.BATTLE: return i ? this.get_instance(i).pile : []
            case Location.TEMPSTACK: return this.stack
            default:
                logger.error(Location[l]);
                let a: any = null; a.bad_locus();
        }
        return [];
    }

    // for board set up
    // nominally returns non-empty string on error
    _set_up(key: string, blob: string, testmode: number): string {
        let ret = "";
        // space-separated list of instances on field
        // each instance is a comma-separated list of cards,
        // REST to suspend
        logger.debug("set up is " + key + " " + blob);

        blob = blob ? blob : "";
        let instances = blob.split(/\s+/);
        let pile;
        let location;
        // TODO: use get_pile
        if (key.startsWith("DECK")) {
            pile = this.deck; location = Location.DECK;
        } else if (key.startsWith("SECURITY")) {
            pile = this.security; location = Location.SECURITY;
        } else if (key.startsWith("EGGS")) {
            pile = this.eggs; location = Location.EGGDECK;
        } else if (key.startsWith("TRASH")) {
            pile = this.trash; location = Location.TRASH;
        } else if (key.startsWith("HAND")) {
            pile = this.hand; location = Location.HAND;
        } else if (key.startsWith("TOKEN")) {
            pile = this.tokendeck; location = Location.TOKENDECK;
        } else if (key.startsWith("TOKENTRASH")) {
            pile = this.tokentrash; location = Location.TOKENTRASH;
        } else {
            // fall through;
        }

        if (pile && location) {
            logger.debug("pile length before was " + pile.length);
            pile.length = 0;
            logger.info("TECH: setting pile to empty");
            for (let _card of instances) {
                if (_card == "") continue;
                let [card, status] = _card.split(",");
                let c = Card.create(card, this.game, this);
                if (!c) {
                    ret += `failed to make ${card} `;
                } else {
                    logger.info(`TECH: Adding card  ${c} `);
                    c.move_to(location);
                    if (status == "FACEUP") c.face_up = true;
                }
            }
            if (testmode <= 1) this.hand.sort(this.sorter);
            return ret;
        }


        if (key[0] == "P" || key.startsWith("FIELD") || key.startsWith("EGGZONE")) {
            if (key[0] == "P") this._wipe_field();
            //  let instances = blob.split(" ");

            let place = key.startsWith("EGGZONE") ? Location.EGGZONE : Location.BATTLE;

            for (let i = 0; i < instances.length; i++) {
                let plug = false;

                logger.info(`making mon ${i} of ${instances.length} `);
                if (instances[i].length < 2) {
                    // empty or near-empty text, don't make;
                    continue;
                }
                logger.info("P " + this.player_num + " " + this.other_player.player_num);
                let thing = new Instance(this.game, this, this.other_player!);
                thing.location = place;
                let cards = instances[i].split(",");
                if (testmode == 2 && !cards[0].includes("-")) {
                    thing.set_label(cards[0]);
                    cards = cards.splice(1);
                }

                let faceup: boolean = true;
                for (let j = 0; j < cards.length; j++) {
                    let text = cards[j].trim();
                    if (text == "REST") {
                        thing._suspend("set up");
                        continue;
                    }
                    if (text == "PLUG") {
                        plug = true;
                        continue;
                    }
                    if (text == "FACEDOWN") {
                        faceup = false;
                        continue;
                    }
                    if (text.length < 3 || text.length > 40) {
                        continue; // or just crash
                    }
                    logger.silly("looking up (" + text + ")");
                    let c = Card.create(text, this.game, this);
                    if (c) {
                        if (plug) {
                            c.move_to(place, thing, "PLUG-BOTTOM");
                        } else {
                            c.move_to(place, thing, "BOTTOM");
                        }
                        c.face_up = faceup;
                        faceup = true; // return to default
                        logger.silly("length is now " + thing.pile.length);
                        logger.silly("stack is now " + thing.pile.map(x => x.name).join(" "));
                        logger.silly("stack is now " + thing.card_names());
                        logger.silly("stack is also " + thing.pile.map(x => x.id).join(" "));
                        logger.silly("stack is also " + thing.card_ids_s());
                        logger.silly("stack is named " + thing.name());
                    } else {
                        ret += `failed to make ${text} `;
                        logger.silly("C NO EXIST!");
                    }
                }
                this.log(`Set up: made ${thing.id}:${thing.name()} with cards ${thing.card_names()} `);
                logger.info(`thing.length is ${thing.pile.length} final name is ${thing.card_names()} `);
                if (thing.pile.length > 0) {
                    if (place == Location.BATTLE) {
                        this.field.push(thing);
                    } else {
                        this.egg_zone = thing;
                    }
                }
                logger.info(`lenfgth is ${this.field.length}`);
                logger.info("lengths now " + this.field.length + " " + (this.egg_zone ? 1 : 0));
                logger.info("aaaaaa");
            }
        }
        return ret;

    }

    _wipe_field() {
        if (this.egg_zone) {
            this.egg_zone.location = Location.SHADOWREALM;
            this.egg_zone = null;
        }
        for (let instance of this.field) {
            instance.location = Location.SHADOWREALM; // just go away            
        }
        this.field.length = 0; // this doesn't get rid of them in the game array

    }

    name() {
        return this.my_name;
    }

    // we are using this *only* formanual attack, not attack-by-effect, and maybe we should
    // target "0" is the other player.
    attack_new(depth: number, source: number, target: number, force = false) {
        logger.silly(`attack clause ${source} ${target} ${force}`);
        let g = this.game;
        let original_n_attacker = source;
        let original_n_target = target;
        let attacker = g.get_instance(source);
        let defender_i = g.get_instance(target); // might be null :<
        let defender_p = this.other_player;
        let defender_any: Instance | Player = defender_p;

        logger.info("defender mon is " + (defender_i && defender_i.name()));
        if (target > 0 && !g.get_instance(target)) {
            g.log("target doesn't exist");
            return;
        }
        if (!attacker || (!defender_i && !defender_p)) {
            g.log(`Tried to declare attack, failure ${!!attacker} or ${!!defender_i} `);
        }

        // valid attack and player can do it
        let plays = JSON.parse(this.get_x_plays({ automatic: true }));
        let attacks = plays['ATTACK'];
        if (!attacks) {
            logger.error("can't check if this is a legal attack???");
            return;
        }
        let my_targets = attacks[source];
        if (!my_targets) {
            logger.error("not legit attack, no source");
            return;
        }
        if (!my_targets.includes(target)) {
            logger.error("not legit attcak, no target");
            return;
        }

        logger.info("original_n_target is " + original_n_target);
        this.game.fancy.add_string(depth, attacker.name() + " attacks " +
            (defender_i ? defender_i.name() : "other player"));
        // This is importing so many things that it suggests this should not be here. Probably move to combat.ts?
        if (original_n_target > 0) defender_any = defender_i;
        let e: SubEffect[] = attacking_events(this.game, attacker, defender_any)
        let dsel = new DirectedSubEffectLoop(this.game, e, 1);
        this.game.root_loop.add_res_loop(dsel);
        this.game.gamestep = GameStep.IN_LOOP; // I don't like have to set this myself

        return;
    }

    /// FOR OLD-FASHIONED UI
    // for old-fashioned UI, move to views
    show_field_1(self: boolean = true): string {
        let ret: string = "";
        if (this.field.length == 0) {
            ret += "<h2>...</h2>";
        }
        //   ret += "Field: " + this.field.length + "\n";
        for (let i = 0; i < this.field.length; i++) {
            ret += "<div>     " + (i < 10 ? " " : "") +
                " " + "<span class=card>" + (this.field[i].summary(false)) + "</span></div>\n";

        }
        return ret;
    }

    show_eggs(self: boolean): string {
        let ret: string = "Egg deck: " + this.eggs.length;
        ret += "<p>";
        let z = this.egg_zone;
        ret += "Egg zone " + (z ? z.summary(false) : "{EMPTY}") + "\n";
        return ret;
    }

    // TEXT UI
    dump_better(self: boolean, controls: string): string {
        let skeleton: string = "";
        skeleton += `< table border = 1 width = 100 % height=200px style = 'layout:fixed' >
            <colgroup>`;
        if (self) {
            skeleton += `
            < col span = "1" style = "width: 20;" >
                <col span="1" style = "width: 80%;" > `;
        } else {
            skeleton += `
                    < col span = "1" style = "width: 40;" >
                        <col span="1" style = "width: 60%;" > `;
        }
        skeleton += `     < /colgroup>
                                <tbody>`;
        if (self) {
            skeleton += ` < tr > <td colspan=2 > <div class=field > ` + this.show_field_1(false) + "</div>" +
                ` < tr > <td>` + this.show_eggs(false) + ` < td > hand`;
            skeleton += ``;
        } else {
            skeleton +=
                ` < tr > <td>` + controls + "<td><div class=field>" + this.show_field_1(true) + "</div>" +
                ` < tr > <td>` + this.show_eggs(true) + ` < td > hand`;
        }
        skeleton += ` < /tbody></table > `;
        return skeleton;
    }

    dump_all(self = true) {
        let ret = `<span class=deck > Deck: ${this.deck.length} </span>  ` +
            `<span class=deck> Security: ${this.security.length} </span> ` +
            `<span class=trash> Trash: ${this.trash.length} `;
        if (this.trash.length > 0) ret += ": ";
        let copy = [...this.trash].sort(this.sorter);
        //        for (let i = 0; i < copy.length; i++) {
        //         ret += "     " + (i < 10 ? " " : "") + i + " " + copy[i].summary + "\n";
        ret += copy.map(x => x.id).join(" ");
        //      }
        ret += "</span>\n";
        ret += "<table style='width:100%;'> <tr><td style='max-width: 20%'><div class=eggzone>";
        ret += "Eggs: " + this.eggs.length + "<p>\n";
        let z = this.egg_zone;
        ret += (z ? "<span class=egg>" + z.summary(false) + "</span>" : "{EMPTY EGG ZONE}") + "\n";
        ret += "</div><td><div class=field>";
        ret += this.show_field_1();
        /*        ret += "Field: " + this.field.length + "\n";
                for (let i = 0; i < this.field.length; i++) {
                    ret += "     " + (i < 10 ? " " : "") + i + " " + this.field[i].summary() + "\n";
        
                }*/
        ret += "</div></table>";
        ret += "<hr>";
        ret += "Hand: " + this.hand.length + "\n";
        if (self) {
            this.hand.sort(this.sorter);
            for (let i = 0; i < this.hand.length; i++) {
                let card = this.hand[i];
                let cp = (this.can_play(card) ? "P" : " ");
                let cd = (this.can_evolve(card, undefined, "yes") ? "D" : " ");
                ret += " " + cp + " " + cd + "  " + (i < 10 ? " " : "") + i + " " + card.id + " <span class=card>" + (card.summary) + "</span>\n";
            }
        }
        return ret;
    }

    // Make sure every card is where it's supposed to be.
    verify() {
        let card;
        for (card of this.deck) card.verify(Location.DECK);
        for (card of this.eggs) card.verify(Location.EGGDECK);
        for (card of this.security) card.verify(Location.SECURITY);
        for (card of this.trash) card.verify(Location.TRASH);
        for (card of this.hand) card.verify(Location.HAND);
        for (card of this.reveal) card.verify(Location.REVEAL);
        for (let instance of this.field)
            for (card of instance.pile) card.verify(Location.BATTLE);
        if (this.egg_zone)
            for (card of this.egg_zone?.pile) card.verify(Location.EGGZONE);
    }

    // for passing to smart UI. If "self" show private information.
    JSON_player(self: boolean = false) {

        let moves = self ? JSON.parse(this.get_x_plays({ verbose: true, sort: false })) : null;
        let eggzone = this.egg_zone ? this.egg_zone.JSON_instance() : null;
        let field = this.field.map(x => x.JSON_instance()).filter(x => x);
        let hand: any = { count: this.hand.length };
        let security: any = { count: this.security.length };
        let eggs = { count: this.eggs.length };
        let deck = { count: this.deck.length };
        let reveal: any = { count: this.reveal.length };
        let nullzone: any = { count: this.nullzone.length };
        let relative_memory: number = (this.game.get_memory() * (this.game.turn_player == this.player_num ? 1 : -1));
        let search: any = { count: this.search?.length };
        // search is private
        if (self == true) {
            hand['cards'] = this.hand.map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`);
            search['cards'] = this.search?.map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`);
        }
        security['cards'] = this.security.map(c => c.face_up ? `${c.id}@${c.colors_s()}@${c.card_instance_id}` : `DOWN`);
        reveal['cards'] = this.reveal.map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`);
        nullzone['cards'] = this.nullzone.map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`);


        let trash = this.trash.map(x => `${x.id}@${x.colors_s()}@${x.card_instance_id}`);
        let player = {
            moves: moves,
            eggzone: eggzone,
            field: field,
            hand: hand,
            security: security,
            eggs: eggs,
            deck: deck,
            trash: trash,
            reveal: reveal,
            relative_memory: relative_memory,
            search: search,
            nullzone: nullzone,
            card_data: undefined
        };
        return player;
    }

}
