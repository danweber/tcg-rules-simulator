

import Phase = require('./phase');
import { Player } from './player';
import { Instance } from './instance';
import { Game } from './game';

import { status_cond_to_gerund, StatusCondition, SubEffect } from './effect';
import { TargetDesc } from './target';

//	expires
// Things should be on this list if:
// An effect does them
// An effect prevents them
// They can be interrupted
// They can responded to

export enum EventCause {
	NONE = 0,
	EFFECT = 1,
	NORMAL_BATTLE = 2,
	SECURITY_BATTLE = 4,
	GAME_FLOW = 8,
	ALLIANCE = 16,
	ZERO_DP = 32,
	NO_DP = 64,
	DNA = 128,
	APP_FUSE = 256,
	ALL = 0xfffff,
}



// whatever structure has GameEvent should 
// probably also capture what caused it,
// normal rules or by effect, and also
// should track this game event as part 
// of targetting

function isGameEvent(eventStr: string): eventStr is keyof typeof GameEvent {
	const eventNames = Object.keys(GameEvent) as (keyof typeof GameEvent)[];
	return eventNames.some(name => name === eventStr);
}
export function strToEvent(str: string): GameEvent {
	if (str.toUpperCase() === "PLACECARD") return GameEvent.TARGETED_CARD_MOVE;
	if (str.toUpperCase() === "LINK") return GameEvent.PLUG;
	if (str.toUpperCase() === "ATTACK") return GameEvent.MUST_ATTACK;
	if (str.toUpperCase() === "MOVETOSECURITY") return GameEvent.FIELD_TO_SECURITY;
	if (str.toUpperCase() === "EVOSOURCEDOUBLEREMOVE") return GameEvent.EVOSOURCE_DOUBLE_REMOVE;
	//if (str.toUpperCase() === "ENTITYSTRIP") return GameEvent.EVOSOURCE_REMOVE_FROM;
	if (str.toUpperCase() === "REVEALTOHAND") return GameEvent.REVEAL_TO_HAND;
	str = str.toUpperCase();
	if (isGameEvent(str)) {
		return GameEvent[str];
	} else {
		console.error(`Unknown GameEvent: ${str}`);
		return GameEvent.NIL;
	}
}

// present tense verb
export function present(ge: GameEvent): string {
	switch (ge) {
		case GameEvent.EVOSOURCE_DOUBLE_REMOVE: 
		case GameEvent.EVOSOURCE_REMOVE: return "source strip";
		case GameEvent.EVOSOURCE_REMOVE_FROM: return "source strip";
		case GameEvent.ATTACK_TARGET_SWITCH: return "switching attack";
		case GameEvent.ATTACK_DECLARE: return "attack";
		case GameEvent.DEVOLVE_FORCE: return "remove top card";
		case GameEvent.MUST_ATTACK: return "attack";
		case GameEvent.FIELD_TO_HAND: return "bounce";
		case GameEvent.FIELD_TO_SECURITY: return "security-bounce";
		case GameEvent.TO_BOTTOM_DECK: return "bottom-deck";
		case GameEvent.PLACE_IN_FIELD: return "place";
		case GameEvent.OPTION_USED: return "use";
		case GameEvent.REVEAL_TO_HAND: return "keep";
		case GameEvent.TRASH_FROM_HAND: return "hand-trash";
		case GameEvent.TRASH_TO_HAND: return "exchange";
		case GameEvent.TARGETED_CARD_MOVE:
		case GameEvent.MOVE_CARD: return `move card`;
		// The below will likely necer be called
		case GameEvent.MODIFY_COST: return "modify cost";
		case GameEvent.MAY_EVO_FROM: return "allow evo of";
		case GameEvent.UNBLOCKABLE: return "not block";

		default:
			let verb = GameEvent[ge].toLowerCase();
			return verb.replaceAll("_", " ");
	}
}

export function gerund(ge: GameEvent, s?: StatusCondition[]): string {
	switch (ge) {

		case GameEvent.EVOSOURCE_DOUBLE_REMOVE: 
		case GameEvent.EVOSOURCE_REMOVE: return "source stripping";
		case GameEvent.EVOSOURCE_REMOVE_FROM: return "source stripping";
		case GameEvent.GIVE_STATUS_CONDITION: return status_cond_to_gerund(s);
		case GameEvent.ATTACK_TARGET_SWITCH: return "switching attacking target";
		case GameEvent.ATTACK_DECLARE: return "attacking";
		case GameEvent.DEVOLVE_FORCE: return "removing top card";
		case GameEvent.MUST_ATTACK: return "attacking";
		case GameEvent.FIELD_TO_HAND: return "bouncing";
		case GameEvent.FIELD_TO_SECURITY: return "security-bouncing";
		case GameEvent.TO_BOTTOM_DECK: return "bottom-decking";
		case GameEvent.PLACE_IN_FIELD: return "placing";
		case GameEvent.OPTION_USED: return "using";
		case GameEvent.REVEAL_TO_HAND: return "keeping";
		case GameEvent.TRASH_FROM_HAND: return "hand-trashing";
		case GameEvent.TRASH_TO_HAND: return "exchanging";
		case GameEvent.TARGETED_CARD_MOVE:
		case GameEvent.MOVE_CARD: return `moving card`;
		// The below will likely necer be called
		case GameEvent.MODIFY_COST: return "modifying cost";
		case GameEvent.MAY_EVO_FROM: return "allowing evo of";
		case GameEvent.UNBLOCKABLE: return "not blocking";


		default:
			let verb = GameEvent[ge].toLowerCase();
			if (verb[verb.length - 1] == 'e')
				verb = verb.substring(0, verb.length - 1);
			return verb + "ing"
	}
}


export enum GameEvent {
	NIL = 1,
	ALL,
	CANCEL, // for interrupters; may need more detail later

	//	IMMUNE, // are "IMMUNE" and "CANNOT" the same concept?
	//	CANNOT, // ^^ see above

	GIVE_STATUS_CONDITION,

	KEYWORD, // 5
	//GIVE_KEYWORD,  // like "give jamming"
	// not all keywords are te same
	GIVE_SOLIDEFFECT_UNUSED, // a whole 'nother level of testing, like "that mon gains 'lose 2 memory on attacking'
	DELETE, // 7
	BLOCK,
	ATTACK_TARGET_SWITCH, // do I need to distinguish "blocked"? 

	ATTACK_DECLARE,
	MUST_ATTACK,  // TODO: eliminiate this one 


	DEVOLVE, // 11
	DEVOLVE_FORCE,
	SUSPEND, // 13 could be mon or tamer
	UNSUSPEND, // ditto
	PLAY,
	MEMORY_CHANGE,
	MEMORY_SET,
	//	MON_PLAYED_BY_EFFECT,
	EVOLVE,
	CARD_REMOVE_FROM_HEALTH_OBSOLETE,  // 19
	TARGETED_CARD_MOVE,
	//CARD_TRASH_FROM_SECURITY,
	EVOSOURCE_ADD,
	EVOSOURCE_REMOVE, // targets cards
	EVOSOURCE_DOUBLE_REMOVE, // t1 targets instance, t2 targets cards
	EVOSOURCE_REMOVE_FROM, // targets entity
	EVOSOURCE_MOVE,
	TUCK, // put instance (not card) under monster
	//TAKE_fALLIANCE_BOOST, // I could probably get away with two events here but I like to cheat
	DP_CHANGE, // 27 // <-- this might never be called directly?
	// How does a constant "Get +1000DP" inherited show up?
	DP_EFFECT_CHANGE, // change maximum DP effect
	FIELD_TO_HAND,
	TO_BOTTOM_DECK, // from field, but also from hand??
	FIELD_TO_SECURITY,
	OPTION_USED,
	PLACE_IN_FIELD, // memory boost
	DRAW,
	SEARCH, // means to look at 
	REVEAL,
	REVEAL_CLEAR, // reveal to *someplace*... does it ever matter that we don't know the original source?
	REVEAL_unused, // I skipped this one
	ADD_TO_HAND_UNUSED, // this one maybe not used
	REVEAL_TO_HAND,
	TRASH_FROM_HAND,
	TRASH_TO_HAND,
	TRASH_FROM_FIELD, // from field? right now used for eggs that end up where they shouldn't be
	trash_From_someplace_else_idunno,
	MOVE_CARD, // generic, from location a to location b. trash card?
	// leave out PLACE_IN_FIELD and DRAW
	HATCH,
	CARD_TO_DECK_UNUSED, // maybe the same as instance to deck?
	CA2RD_TO_TRASH_UNUSED,  // maybe the same as instance to trash?

	MODIFY_COST, // maybe unused??

	MAY_EVO_FROM, // 
	UNBLOCKABLE,
	CREATE_PENDING_EFFECT,
	STACK_ADD,  // for stack summoning
	ALL_REMOVAL, // only for match conditions
	ADD_CARD_TO_HAND, // only for match condition
	//	CANT_ATTACK
	ADD_INFORMATION,
	CHANGE_INFORMATION,
	USE,
	ACTIVATE,
	SHUFFLE,
	PLUG, 
	TRASH_LINK,
	CHOOSE, // does nothing by itself

};


export function attacking_events(game: Game, attacker: Instance, defender_any: Instance | Player): SubEffect[] {
	let e: SubEffect[] = [];
	e.push({
		// do we distinguish attacking by effect??
		cause: EventCause.GAME_FLOW,
		game_event: GameEvent.SUSPEND,
		label: "suspend to attack",
		chosen_target: attacker, td: new TargetDesc(""),
		n_player: game.turn_player,
		spec_source: attacker, // not-so-special source
	});
	e.push({
		game_event: GameEvent.ATTACK_DECLARE,
		chosen_target: defender_any, td: new TargetDesc(""),
		label: "attack declare",
		spec_source: attacker, // not-so-special source
		n_player: game.turn_player,
		cause: EventCause.NORMAL_BATTLE
	});


	return e;

}

// WHEN PAYING A COST
// 1. Is it legal to target? I dunno if I should bother with this.
// 2. If I tried, would I succeed? e.g. I'm immune because of the source.
// 3. Then announce it's about to happen so interrupters can interrupt.
// 4. Do the thing.

// is an Effect 
// having both "players" and "player" in here is
// going to be confusing

/*
// do a thing

// game events, thimgs that happen in game.
// Some imply others.
// Can also use this structure to find out what's banned

// Things should be on this list if:
// An effect does them
// An effect prevents them
// They can be interrupted
// They can responded to

// There will be a separate variable to track
// one: * done by monster
//      * done by option
//      * done by battle
//      * done by rules

// Also variable for cost
// Do: * for free
//     * for set cost
//     * for reduced cost 



//export = Parse;


*/
