
import { Game } from './game';
import { Instance } from './instance'
import { Location } from './location';

import { ForEachTarget, GameTest, MultiTargetDesc, TargetDesc, TargetSource } from './target';
import { GameEvent, EventCause, gerund, present } from './event';

import { Phase, PhaseTrigger, GameStep } from './phase';
import { SolidEffect2, new_parse_line } from './newparser';
import { CardLocation, EvolveCondition, KeywordArray } from './card';
import { SolidEffectLoop, SolidsToActivate } from './effectloop';

// One complete effect, like "Do X, then Y." Will often be just one thing.
export class SolidEffect {
	rules: boolean = false; // fake solid event caused by game rules

	interrupt?: InterruptCondition[];// put interruptive clause here 
	cancels?: boolean; // not all interruptive events cancel
	changes_cost?: any; // need to define this
	interrupt_count: number = 0; // turns on the first time it interrupts in a loop

	solid_starter?: SolidEffect; 
	chosen_cancel_target?: SubEffect;
	
	respond_to: InterruptCondition[] = []; // interruptcondition is bad name
	phase_trigger?: PhaseTrigger;
	main?: boolean;
	active_zone?: Location;
	constant?: boolean;
	// is this going to be a horrible hack? Or the way I should've done
	// things the whole time?
	can_activate?: (e: SolidEffect, l?: SolidEffectLoop) => boolean;

	//n_player: number; // which player owns this
	//instance: Instance; // more important than n_player 
	// may eventually need to change to Instance | Card
	source: TargetSource;
	effects: AtomicEffect[];
	raw_text: string;
	label: string; // name of the owner card for the effect; if Trident Arm gives Gotsumon "must attack" the label is "Trident Arm"
	card_label: string; // cardid associated with label
	keywords: string[]; // 
	whose_turn?: string; // if exists, which turn we are active on
	once_per_turn?: boolean; // will eventually need twice per turn
	n_last_used_turn?: number;

	activate_main?: boolean; // shortcut to say "this security effect is just 'do main effect'
	//n_player?: number;

	trigger_location?: Location;
	trigger_instance_id?: number;
	trigger_top_card_location_id?: number; // needed (only) for trash effects
	trigger_card_location_id?: number; // I'm not using this yet, because I need to be able to get a reference to the card_location_id and right now I don't have that

	trigger_incidents?: SubEffect[];
	// for pronouns, the last thing we touched. Track it here.
	last_thing?: Instance[] | CardLocation[];

	//	solid2: SolidEffect2;
	//	atomics: AtomicEffect2[];

	// for interruptive effects, the cost is the first (only?)atomic effect. 
	// if cancels is true, paying the cost cancels whatever interrupted

	// do interruptive events always have costs?

	// weirdo is being used while bootstrapping this code
	//weirdo: SubEffect;// temp

	constructor(str: string, label: string) { // , parsed: any[]) {

		console.log("SOLID EFFECT");
		console.log(str);
		console.log("DONE");
		this.keywords = [];
		//this.n_player = -1;// we can't set at init :(
		this.source = null!;
		this.label = label;
		this.card_label = label;
		this.raw_text = str;
		this.effects = [];
		this.phase_trigger = PhaseTrigger.NUL;
		this.effects = [];
		this.n_last_used_turn = -1;


		let parsed_fx = null; // osbsolete 

		let [a, b, c] = new_parse_line(str, undefined, label, "main");
		console.log("..... " + label);
		console.log("C: " + a.toString());
		console.log("S: " + b.toString());
		console.log(`A${c.length}: ${c.map(c => c.toString()).join(" // ")}`);
		console.log("...... ");


		let solid2: SolidEffect2 = b;
		let atomics = c;
		//	this.solid2 = b;
		//		this.atomics = c;
		//	return;



		// This should be a defined once, not every time I run this file
		// oh, but I definitely want separate objects

		let nil = new TargetDesc("");
		let self = new TargetDesc("self");
		let on_deletion: InterruptCondition = {
			ge: GameEvent.DELETE,
			td: self
		};
		let on_self: InterruptCondition = {
			ge: GameEvent.NIL,
			td: self
		};
		let p;


		let m;

		let w;


		//[All Turns] When you trash a card in your hand using one of your effects, by suspending this Tamer, gain 1 memory.
		//[All Turns] When an attack target is switched, by suspending this tamer, <Draw 1> and 1 of your monster gets +2000 DP for the turn.


		// why is this being called during game play???=
		// oh, because of how I wrote armor purge
		console.log("PREATOMIC " + str);

		this.respond_to = solid2.respond_to;
		this.once_per_turn = solid2.once_per_turn;

		/*
		if (c[0]) this.can_activate = c[0].can_activate;
		console.log(`diff2 atomics2 length is ${c.length} native is ${this.effects.length} ${this.label}`);
		for (let i = 0; i < c.length; i++) {
			console.log(`diff2 ${i} ci.subs len ${c[i].subs.length} eio ${this.effects[i].events.length}`);
			console.log(`diff2 ${i}  vals ${c[i].subs.map( x => GameEvent[x.game_event] ).join(",")} ` +
								`  vs  ${this.effects[i].events.map( x => GameEvent[x.game_event] ).join(",")} `);
		}
		*/
		return;
	}
	// this gets transformed into a SubEffect
	// I can cheat for now by treating SolidEffects
	// as SubEffects.

	// I should probably re-make the keyword


	// Delete 1 of your opponent's level 5 or lower monster.
	//		let debug = str.includes("Delete 1 of your opponent");

	toPlainText(): string {
		let ret = "";
		/*
		ret += this.keywords.join(" ");
		ret += this.once_per_turn ? "[Once Per Turn]" : "";
		if (this.phase_trigger) ret += "[x" + Phase[this.phase_trigger] + "]";
		if (this.respond_to) ret += "When " + this.respond_to.toString();
		if (this.interrupt) ret += "When would: " + this.interrupt.toString();
*/
		return ret;
	}

	// this grabs the wrong thing
	toString(): string {
		let ret = "";
		ret += this.keywords.join(" ");
		ret += this.once_per_turn ? "[ONCE PER TURN]" : "";
		ret += "{" + this.label + "}";
		if (this.phase_trigger) ret += "[" + Phase[this.phase_trigger] + "]";
		if (this.respond_to) ret += "RESPOND: " + this.respond_to.toString();
		if (this.interrupt) ret += "INTERRUPT: " + this.interrupt.toString();
		ret = this.effects.map(x => x.toString()).join(". ");
		return ret;
	}

	// true if there's a once-per-turn and we've consumed it.
	// same interface for twice-per-turn once implemented

}

// solid helper functions
export function Solid_is_triggered(solid?: SolidEffect) {
	if (!solid) return false;
	return (solid.interrupt ||
		solid?.keywords.includes("[Main]") ||  // triggers manually
		solid.phase_trigger ||
		solid.main ||
		solid.respond_to.length > 0);
		// "pick an effect" also is triggered, we cheated in SolidsToActivate code
}


//     * for reduced cost 

export interface SubSearcher {
	n_choose: number;
	target: TargetDesc;
}

// interrupt condition should be a tuple of GameEvent and TargetDesc. 
// Or, like, a SubEffect 
// this is are effects that are interrupted in one go
export class AtomicEffect {
	optional: boolean;
	ask_other?: boolean;
	is_cost?: boolean; // if true, must succeed to proceed

	events_to_do?: SubEffect[]; // we don't consume this, it's used later for checking what we did
	flags?: any; // catch-all, everything here  shuld be reviewed
	cost_paid?: number; // 1 or more if cost paid
	trigger_condition?: (PhaseTrigger | GameEvent);
	status_condition_unused?: InterruptCondition; // what has to be true on the board to use? I'm not sure it's right
	interrupt_condition?: InterruptCondition; // what it interrupts or responds to
	events: SubEffect[];
	debuffer?: number;
	test_condition?: GameTest; // I *think* this is the right struct
	game?: Game;
	can_activate?: (e: SolidEffect, l?: SolidEffectLoop) => boolean;
	per_unit?: boolean; // benefit is per cost paid
	per_unit_test?: TargetDesc;
	// I worked out a list of AtomicEffects but I think this is the easiest way to do it

	search_n?: number; // how many cards to reveal for search
	search_multitarget?: MultiTargetDesc;
	unused_search_choose?: SubSearcher[]; // one or more things to pull
	search_final?: Location; // where they go at the end
	raw_text: string;
	keywords: string[] = [];
	weirdo: SubEffect;
	see_security?: boolean;
	sta?: SolidsToActivate;
	
	constructor(parsed_fx: any, str: string, g?: Game) {
		this.raw_text = str;
		this.debuffer = 4;
		//console.log("atomic ctor2");
		//console.log(parsed_fx);
		//console.log("atomic " + str);
		this.game = g!;
		this.optional = false;
		this.events = [];
		this.test_condition = undefined;
		let thing = {
			optional: false, game_event: GameEvent.NIL,
			td: new TargetDesc(""), choose: 0, n: 0,
			immune: false, cause: EventCause.EFFECT
		};
		let proper_thing: SubEffect = thing;
		this.weirdo = proper_thing;
		//this.ask_for_activaton = () => { return this.optional || !!this.is_cost; }

	}
	// both these functions are unused? LEftover remnants...
	toPlainText(): string {
		return "this is unused?";
	}
	toString(): string {
		let ret = this.optional ? "OPTIONAL: " : "";
		if (this.test_condition)
			ret += `If <${this.test_condition.toString()}/${this.test_condition.raw_text} > `;
		ret += `Target <${this.weirdo.td.toString()}/${this.weirdo.td.raw_text}> `;
		if (this.weirdo.choose == 1) ret += "Choose 1. ";
		if (this.weirdo.game_event) ret += "Then " + GameEvent[this.weirdo.game_event];
		return ret;
	}
}

// because of the AtomicEffect v AtomicEffect2 scandal, member functions are a pain
export function atomic_ask_to_activate(a: AtomicEffect) {
	return a.optional || !!a.is_cost;
}


// also useful for trigger condition?
/*export class InterruptCondition {
	ge: GameEvent,
	td: TargetDesc,
	td2?: TargetDesc, // surprised nothing broke when this wasn't here
	cause?: EventCause, // TODO: move this into GameEvent, which already has this!
	source?: TargetDesc,
};*/
// also useful for trigger condition?

// also useful for trigger condition?
export class InterruptCondition {
	ge: GameEvent;
	td: TargetDesc;
	td2?: TargetDesc; // matches cause? //surprised nothing broke when this wasn't here
	td3?: TargetDesc; // matches not cause?
	cause?: EventCause; // TODO: move this into GameEvent, which already has this!
	not_cause?: EventCause; // what *doesn't* trigger us
	source?: TargetDesc;
	constructor() {
		this.ge = GameEvent.NIL;
		this.td = new TargetDesc("");
	}
	toString(): string {
		return `<${gerund(this.ge)}> <${this.td.toString()}> <${this.cause && EventCause[this.cause]}> `;
	}
};
// also useful for trigger condition?


export function ica_to_string(_ic: InterruptCondition[]): string {
	return _ic.map(ic => ic_to_string(ic)).join(" OR ");
}

export function ic_to_string(ic: InterruptCondition): string {
	let msg = `${GameEvent[ic.ge]} of ${ic.td.toString()}`;
	if (ic.cause) msg += ` by ${EventCause[ic.cause]}`;
	if (ic.source) msg += ` from ${ic.source.toString()}`;
	return msg;
}

// We want the syntax here to match
// When XXXX, XXXX.
// Like "when you draw a card, you draw a card"
// Or "when you (would) draw a card, you draw a card"
// But "you" doesn't need to be there.
// Maybe "play this monster"
// Try present tense, we will add "Trigger: THING"

// better version, ic_to_string will become obsolete

export function ica_to_plain_text(_ic: InterruptCondition[]): string {
	return _ic.map(ic => ic_to_plain_text(ic)).join(" OR ");
}

export function ic_to_plain_text(ic: InterruptCondition): string {

	//let ret = "";
	let ic_txt = ic.td.toPlainText();
	if (ic.ge == GameEvent.ATTACK_DECLARE) {
		return `this Monster attacks ${ic.td.toPlainText().toLowerCase()}`;
	}
	if (ic.ge == GameEvent.MOVE_CARD) {
		return `moving a card from ${ic.td2?.raw_text} to ${ic.td.raw_text}`
	}
	if (ic.ge == GameEvent.ATTACK_TARGET_SWITCH) {
		return `Switch attack target`;
	}
	if (ic.ge == GameEvent.PLAY) {
		return `play ${ic_txt}`; // which health?
	}

	let msg = `${ic.td.toPlainText()} is ${GameEvent[ic.ge].toLowerCase()}d`;
	if (ic.cause) msg += `Cause: ${EventCause[ic.cause]}`;
	if (ic.source) msg += ` from ${ic.source.toString()}`;
	return msg;
}

// Do I have to distinguish between the text of an Event, like 
// "1 of your monster with [Greymon] in its name"
// from "Instance 6"

// the smallest possible effect
export interface SubEffect {
	n_mod?: string;
	n_max?: number;
	//	optional?: boolean;
	game_event: GameEvent;
	n_player?: number;
	n_function?: (s: SolidEffect) => number;
	choose?: number;

	td: TargetDesc; // april 23 tried to make this nullable
	chosen_target?: any; //     TODO: make this Instance | CardLocation; // selected target

	td2?: TargetDesc;  // in general, this is what somethiing is coming "from"
	td3?: TargetDesc;  // 3rd target, right now just for fusion evolves
	chosen_target2?: any
	chosen_target3?: any // at what point do we just use an array? chosen_target itself could be an array

	play_label?: string; // if we play out an instance, the label we give it
	label?: string;  // name of the thing that gave us this effect
	n?: number;
	n_mult?: number; // right now only used for per-each on persistent effects
	n_count_tgt?: ForEachTarget; // are these used?
	n_repeat?: GameTest; // do subeffect N times
	n_test?: GameTest; // "reduce by a further N"

	negated?: boolean; // set in the 4-step 
	cost_change?: any[];

	spec_source?: Instance | CardLocation; // not sure should be this
	// spec_source isn't that special, I need this
	// a lot!
	cause: EventCause;
	// Do I really not have any other place I track the 
	// source of a subeffect? 

	//until_turn?: number;
	//ntil_phease?: Phase;

	immune?: boolean;
	UNUSED_cannot?: boolean;
	status_condition?: StatusCondition[];
	delayed_effect?: SolidEffect;
	delayed_phase_trigger?: Phase; // this is overloaded with other data structures
	delayed_interrupt?: InterruptCondition[];
	paid?: boolean; 
}

// if your opponent has (a monster) in play
// if you have (a red tamer) in play
// while you have (a tamer with TRAIT) in play
// while this monster (has [greymon] in name)
// while this monster (is suspended)
// if you have (a monster that's black or has TRAIT) in play,
// if you have {{3 or fewer security cards}}

// to test if something has happened

export interface StatusCondition {
	parent_subeffect?: SubEffect;
	s: SubEffect,
	solid?: SolidEffect[], // if I'm giving a whole effect
	keywords?: KeywordArray,
	exp_description: any, // carried around, calculated when used
	n?: number,
	p?: Phase
}

// "tgt" is the actual targeted mon
//let tgt = new TargetDesc(""); // empty td
//let unused = new TargetDesc("");
// "give -2000 DP until X"
// these are the status conditions the target WILL HAVE in its struct

/*
let DP_change: StatusCondition = {
	s: { game_event: GameEvent.DP_CHANGE, td: new TargetDesc("") },
	exp_description: {},
	n: 4, p: Phase.END_OF_TURN
};

// has "cannot have DP changed".
// immune flag kicks in, basically uno reverse card
let immune_to_DP_change: StatusCondition = {
	s: { game_event: GameEvent.DP_CHANGE, td: unused, immune: true },
	exp_description: {},
	n: 4, p: Phase.END_OF_TURN
};
*/
/*
let targets: SubTargetDesc[] = [];

let _blank: TargetDesc = {
	raw_text: "Hi",
	conjunction: Conjunction.DUMMY,
	targets: targets,
	empty: () => true,
	matches: (a, b) => false
};
*/


// has "cannot have DP changed by opponent's monster effects"
/*
let oppo_mon: TargetDesc = _blank;
oppo_mon.conjunction = Conjunction.ALL;
targets = [new SubTargetDesc("other"), new SubTargetDesc("monster")];
oppo_mon.targets = targets;
let immune_to_DP_change_by_opponent_monster: StatusCondition = {
	s: {
		game_event: GameEvent.DP_CHANGE,
		td: oppo_mon,
		immune: true
	},
	exp_description: { "PHASE": "OPPONENT" },
	n: 4, p: Phase.END_OF_TURN
};
*/
/*
// subeffect to give the above
let sub_eff: SubEffect = {
	game_event: GameEvent.GIVE_STATUS_CONDITION,
	td: tgt,
	status_condition: immune_to_DP_change_by_opponent_monster
};
*/
// has "is immune to opponent's monster's effects forever"

/*let immune_to_oppo_mon_effects: StatusCondition = {
	s: {
		game_event: GameEvent.ALL,
		td: oppo_mon,
		immune: true
	},
	exp_description: {}

}*/

// has cannot suspend until X
/*let cannot_unsuspend: StatusCondition = {
	s: {
		game_event: GameEvent.UNSUSPEND,
		td: _blank,
		cannot: true
	},
	exp_description: { "WHEN": 1 }

}*/

// cannot gain memory by monster effects


// Everything is "done by effect" with a few exceptions
// 1. You can DELETE by battle
// 2. You can DELETE by game rules
// 3. You can SUSPEND for attacking.
// 4. You can UNSUSPEND by game effect.
// 5. You can PLAY by rules.
// 6. You can EVOLVE by rules.
//... Okay, I guess I should have flags to
//    distinguish "effect" v "rules" v "battle"
// cannot have DP changed by opponent's monster's (effect)


// DP_CHANGE is implemented via assigning a StatusCondition,
// which is simple enough to check at runtime.

// IMMUNE TO DP_CHANGE is implemented as a StatusCondition,
// DP_CHANGE until X, but contains an "immune" flag which 
// means it's read the other way

// IMMUNE TO DP_CHANGE by opponent is implement as StatusCondition,
// DP_CHANGE until X, but contains an "immune" flag 

// cannot change DP:


export function subeffect_to_string(sub: SubEffect): string {
	let ret = "";
	if (sub.immune) {
		ret += "CAN'T ";
		if (sub.game_event == GameEvent.ALL) {
			return "IMMUNE";
		}
	}

	let str = present(sub.game_event);
	if (sub.game_event == GameEvent.NIL) str = "?"
	ret += str.toUpperCase();
	//	ret += show number / string / whatever.
	return ret;
}

export function status_cond_to_string(sc: StatusCondition, short: boolean = true) {
	let detail = true; // for display
	let ret = subeffect_to_string(sc.s);
	if (sc.s.game_event == GameEvent.DP_CHANGE) {
		ret = "DP" + ((sc.s.n && sc.s.n > 0) ? "+" : "-");
		let mult = (sc.s.n_mult === undefined) ? 1 : sc.s.n_mult;
		if (detail) ret += Math.abs(sc.s.n! * mult) + " ";
	} else if (sc.s.game_event == GameEvent.KEYWORD) {
		let str = sc.keywords ? Object.keys(sc.keywords).join(",") : "KEYWORD?";
		ret = str;
	}
	let ps = sc.parent_subeffect;
	let label: any = ps ? ps.label : undefined;
	if (!label) {
		if (ps?.spec_source?.kind == "CardLocation")
			label = ps.spec_source.get_name(true);
		else if (ps?.spec_source?.kind == "Instance")
			label = ps.spec_source.get_name(true);
	}
	if (detail) {
		ret += ` from ${label}`;
	}
	if (sc.n && sc.p) {
		if (false) {
			//let phase = (sc.p == Phase.END_OF_TURN) ? "" : Phase[sc.p].replaceAll("_", " ").toLowerCase();
			//ret += ` until turn ${sc.n} ${phase} `;
		} else {
			// temporary
			ret = ret += " TIL TURN " + sc.n;
			//ret = "(" + ret + ")"
		}
	}
	return ret;
}




