

import { Game } from './game';
import { Card } from './card';

// intened for short-term life, but maybe I *do* want long-term refernences 
// to public cards

export function location_to_string(bitmask: Location): string {
    const locations = Object.keys(Location)
        .filter(key => isNaN(Number(key))) // Filter out numeric keys
        .map(key => ({ key, value: Location[key as keyof typeof Location] }))
        .filter(location => (bitmask & location.value) !== 0)
        .map(location => location.key)
        .join(" or ");

    return locations ? `in ${locations}` : "unknown location";
}

export function string_to_location(s: string): Location {
    switch (s.toLowerCase()) {
        case "trash": return Location.TRASH;
        case "hand": return Location.HAND;
        case "security": return Location.SECURITY;
        case "battle": return Location.BATTLE;
        case "field": return Location.BATTLE | Location.EGGZONE;
       
        case "reveal": return Location.REVEAL;
    }
    return Location.UNKNOWN;
}

//I originally intended this to be for Instances, but I guess
//it can work for cards, too.
export enum Location {
    UNKNOWN = 1,
    NEW = 2,
    BATTLE = 4,
    TRASH = 8,
    HAND = 16,
    EGGZONE = 32,
    FIELD = BATTLE | EGGZONE,
    SECURITY = 64,
    EGGDECK = 128,
    DECK = 256,
    REVEAL = 512,
    NULLZONE = 1024, // for top card of security
    OPTZONE = 2048, // for displayed options
    TOKENDECK = 4096,
    TOKENTRASH = 8192,
    ALLTRASH = TRASH | TOKENTRASH,
    TEMPSTACK = 16834, // this is the temporary stack we build like for a stack summon
    SHADOWREALM = 32768,
    END = 65536
};

