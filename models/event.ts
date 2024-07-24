

import Phase = require('./phase');
import { Player } from './player';
import { Instance } from './instance';
import { Game } from './game';

import { StatusCondition, SubEffect } from './effect';
import { TargetDesc } from './target';

//	expires
// Things should be on this list if:
// An effect does them
// An effect prevents them
// They can be interrupted
// They can responded to

export enum EventCause {
    EFFECT = 1,
    NORMAL_BATTLE = 2,
    SECURITY_BATTLE = 4,
    GAME_FLOW = 8,
    ALLIANCE = 16,
    ZERO_DP = 32,
	NO_DP = 64,

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
	if (isGameEvent(str)) {
		return GameEvent[str];
	} else {
		return GameEvent.NIL;
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
	// tamers can be deleted, too
	//	MON_DELETED_BY_BATTLE,
	//	MON_DELETED_BY_EFFECT,
	//	MON_DELETED_BY_RULES,
	ATTACK_TARGET_SWITCH, // do I need to distinguish "blocked"? 
	ATTACK_DECLARE,
	MUST_ATTACK,
	DEVOVLVE, // 11
	DEVOLVE_FORCE, // for armor purge
	SUSPEND, // 13 could be mon or tamer
	UNSUSPEND, // ditto
	PLAY,
	MEMORY_CHANGE,
	MEMORY_SET,
	//	MON_PLAYED_BY_EFFECT,
	EVOLVE,
	MON_DNA_DIGIVOLVE,
	MON_MATRIX_DIGIVOLVE, // cheating by making special case
	CARD_REMOVE_FROM_HEALTH,
	CARD_ADD_TO_HEALTH,
	//CARD_TRASH_FROM_SECURITY,
	DIGISOURCE_ADD,
	DIGISOURCE_REMOVE,
	DIGISOURCE_REORDERE,
	//TAKE_fALLIANCE_BOOST, // I could probably get away with two events here but I like to cheat
	DP_CHANGE, // 27 // <-- this might never be called directly?
	    // How does a constant "Get +1000DP" inherited show up?
	DP_EFFECT_CHANGE, // gallantmon deck
	FIELD_TO_HAND,
	TO_BOTTOM_DECK, // from field, but also from hand??
	MON_TO_SECURITY1,
	OPTION_USED,
	PLACE_IN_FIELD, // memory boost
	DRAW,
	REVEAL, // I skipped this one
	ADD_TO_HAND, // this one maybe not used
	REVEAL_TO_HAND, 
	TRASH_FROM_HAND,
	TRASH_TO_HAND,
	TRASH, // from field? right now used for eggs that end up where they shouldn't be
	trash_From_someplace_else_idunno,
	HATCH,
	CARD_TO_DECK, // maybe the same as instance to deck?
	CA2RD_TO_TRASH,  // maybe the same as instance to trash?

	MODIFY_COST, // maybe unused??

	MAY_DIGI_FROM, // this can digi into something else
	UNBLOCKABLE,
	//	CANT_ATTACK
};


export function attacking_events(game: Game, attacker: Instance, defender_any : Instance | Player  ):SubEffect[] {
	let e: SubEffect[] = [];
	e.push({
		// do we distinguish attacking by effect??
		cause: EventCause.GAME_FLOW,
		game_event: GameEvent.SUSPEND,
		chosen_target: attacker, td: new TargetDesc(""),
		n_player: game.turn_player,
		spec_source: attacker, // not-so-special source
	});
	e.push({
		game_event: GameEvent.ATTACK_DECLARE,
		chosen_target: defender_any, td: new TargetDesc(""),
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
// one: * done by digimon
//      * done by option
//      * done by battle
//      * done by rules

// Also variable for cost
// Do: * for free
//     * for set cost
//     * for reduced cost 



//export = Parse;


*/
