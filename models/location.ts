

import { Game } from './game';
import { Card } from './card';

// intened for short-term life, but maybe I *do* want long-term refernences 
// to public cards

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
    TOKENTRASH = 2048,
    SHADOWREALM = 4096,
    END = 8192
};

