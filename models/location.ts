

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

//I originally intended this to be for Instances, but I guess
//it can work for cards, too.
export enum Location {
    UNKNOWN = 1,
    NEW = 2,
    FIELD = 4,
    TRASH = 8,
    HAND = 16,
    EGGZONE = 32,
    SECURITY = 64,
    EGGDECK = 128,
    DECK = 256,
    REVEAL = 512,
    NULLZONE = 1024, // for option cards being used, and top card of security
    TOKENDECK = 2048,
    TOKENTRASH = 4096,
    SHADOWREALM = 8192,
    END = 16384
};

