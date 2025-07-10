import { SolidEffect, SubEffect } from './effect';
import { GameEvent } from './event';
import { Game } from './game';

import { Instance } from './instance';

export enum PhaseTrigger {
    NUL = 1,
    START_OF_YOUR_TURN,
    START_OF_OPPONENTS_TURN,
    START_OF_ALL_TURNS,
    END_OF_UNSUSPEND_PHASE,
    START_OF_YOUR_MAIN,
    START_OF_OPPONENTS_MAIN,
    START_OF_ALL_MAIN,  // unused
    END_OF_YOUR_TURN, // unused
    END_OF_OPPONENTS_TURN, // unused
    END_OF_ALL_TURNS, // unused
    END_OF_BATTLE, // for options to play
    END_OF_ATTACK,
};

// These are not actual phases. For example, [end of turn] isn't a phase and can be during heatching
export enum Phase {
    NUL = 1,
    ASAP, // as soon as possible
    START_OF_GAME,
 
    BEFORE_START_OF_TURN, // just here for code landing
    START_OF_TURN_RULES_FX, // wait did I not need this???
    START_OF_TURN_PHASE_FX,
    AFTER_START_OF_TURN,
    
    UNSUSPEND,
    DRAW, // unused
    HATCHING,

    BEFORE_MAIN,
    START_OF_MAIN,
    MAIN,
    
    END_OF_BATTLE,
    END_OF_ATTACK,
    END_OF_MAIN, // does this eist?
    END_OF_TURN, 
    AFTER_END_OF_TURN,
    GAME_OVER
};
// depth = D   

export enum GameStep {
    START_OF_GAME = 1,
    NORMAL_PLAY,
    IN_LOOP,  // either combat or effect, just find it at root_loop

    TRIGGERS_ANNOUNCED,
    LIST_OF_EFFECTS,
    DETERMING_NEXT_TRIGGER, // 1 of N   <-- enter here on Option Play
    VERIFY_STILL_PRESENT_UNUSED,
    DONE_WITH_EFFECT,
    EFFECT_TRIGGERS,
    GET_NEXT_TRIGGER,  // N
};

class TriggerMapping {
    phase: Phase = Phase.NUL;
    my_phase: PhaseTrigger = PhaseTrigger.NUL;
    opponent_phase: PhaseTrigger = PhaseTrigger.NUL;
    both_phases?: PhaseTrigger = PhaseTrigger.NUL;
};

export const TriggerMap: TriggerMapping[] = [
    { phase: Phase.START_OF_TURN_PHASE_FX, my_phase: PhaseTrigger.START_OF_YOUR_TURN, opponent_phase: PhaseTrigger.START_OF_OPPONENTS_TURN },
    { phase: Phase.START_OF_MAIN,          my_phase: PhaseTrigger.START_OF_YOUR_MAIN, opponent_phase: PhaseTrigger.START_OF_OPPONENTS_MAIN },
    { phase: Phase.END_OF_TURN,            my_phase: PhaseTrigger.END_OF_YOUR_TURN,   opponent_phase: PhaseTrigger.END_OF_OPPONENTS_TURN,   both_phases: PhaseTrigger.END_OF_ALL_TURNS },
    { phase: Phase.END_OF_ATTACK,          my_phase: PhaseTrigger.END_OF_ATTACK,      opponent_phase: PhaseTrigger.NUL },
   // { phase: Phase.UNSUSPEND,              my_phase: PhaseTrigger.END_OF_ATTACK,      opponent_phase: PhaseTrigger.END_OF_UNSUSPEND_PHASE },
];


// killed effect fourstep, 89fd63e5c14a8cdbe61bf34be32fbef4695ef0de