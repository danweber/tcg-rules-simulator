
import { Instance } from './instance'
import { Player } from './player';
import { Card, CardLocation } from './card';
import { Phase, GameStep } from './phase';
import { DirectedSubEffectLoop, InterrupterLoop, ResolutionLoop, RootLoop, SolidEffectLoop, XX } from './effectloop';
import { Location } from './location';
import { v4 as uuidv4 } from 'uuid';

import Mastergame = require('./mastergame');

import { SolidEffect, SubEffect } from './effect.js';
import { EventCause, GameEvent } from './event';
import { Conjunction, DynamicNumber, SpecialCard, SpecialInstance, SubTargetDesc, TargetDesc, TargetSource, fSpecialPlayer } from './target';

import seedrandom from 'seedrandom';


import { createLogger } from "./logger";
import { FancyLog } from './fancylog';
import { EffectAndTarget, verify_special_evo } from './util';
import { new_parse_line } from './newparser';

const logger = createLogger('game');

var fs = require('fs');
var util = require('util');

interface CardArray {
    [key: string]: Card
}

export interface UserQuestion {
    command: string,
    text: string,
    ver?: string
}

interface GameCommand {
    id: number;
    n_player: number;
    command: string;
    options?: string;
}

export class Game {
    command_history: GameCommand[]; // This hasn't worked as well as we hoped

    private event_count: number = 1;
    private event_reset: number = 1;
    private command_id: number;
    gid: string;
    private memory: number;
    //    private label: string;
    n_turn: number;
    phase: Phase;
    winner?: number;
    recursion_depth: number;  // unused but planned for better reporting
    gamestep: GameStep;
    seed: string;
    rng: () => number;

    readonly root_loop: RootLoop; // mostly for testing
    lingering_happenings: SubEffect[] = [];
    turn_player: number;
    Player1: Player;
    Player2: Player;
    instances: Instance[];
    history: string[];

    private control: number; // player we're waiting on, not necessarily whose turn
    lastlog1: number;
    lastlog2: number;
    master: Mastergame; // a mastergame can have several independent games going at once, but a crash in any game kills all games
    _id: number;  // next instance number
    _card_instance_id: number; // next card instance number
    _card_move_id: number; // each time a card is moved, we track that
    // I may not need _card_instance_id.
    // obsolete? not yet
    unused_message_queue: string[];

    //    wait_counter: number;
    wait_player: number;
    private wait_choices: UserQuestion[];
    private wait_answer?: string[] | null;
    private wait_control: number;
    private wait_question: string;
    wait_count: number; // number of answers, right now means "up to"
    wait_mod: string = ""; // could be "upto"
    control_log: number;
    socket_list: any[];
    bots: number[];
    fancy: FancyLog = new FancyLog();
    counter = 0;
    msg_counter = 0;


    private last_thing?: Instance[] | CardLocation[];
    set_last_thing(x: Instance[] | CardLocation[]) {
        let str = x.map(x => (x && "get_name" in x) ? x.get_name() : "un-nameable").join(", ");
        logger.warn(`setting last thing to ${str}`);
        this.last_thing = x;
    }
    get_last_thing(): Instance[] | CardLocation[] { return this.last_thing!; }
    // last_thing shouldn't be global, it shoudl be per-effect

    constructor(master: Mastergame, gid: string, bots: number[], p1string = "", p2string = "", bot1 = "", bot2 = "", seed = "") {
        logger.info(`ctor: ${gid} ${bot1},${bot2},${bots} [${p1string}] [${p2string}] seed:${seed}`);

        if (seed === "") seed = gid;
        this.bots = [];
        this.mode = "fast";
        this.root_loop = new RootLoop(this);
        this.command_id = 0;
        this.command_history = [];
        this.gid = gid;
        this.seed = seed;
        this.rng = seedrandom(seed);

        let unused = function () {
            let x = 1;
            //              seedrandom(seed);
            return x;
        }
        this.memory = 0;
        this.n_turn = 0;
        this.turn_player = 0;
        this.phase = Phase.AFTER_START_OF_TURN;
        this.history = [];
        this.control = 0;
        this.lastlog1 = this.lastlog2 = 0;
        this.master = master;
        this._id = 0;
        this._card_instance_id = 0;
        this._card_move_id = 0;
        this.socket_list = [];

        this.msg_counter = 0;
        this.recursion_depth = 0;
        this.gamestep = GameStep.START_OF_GAME;
        this.instances = [];
        this.unused_message_queue = [];

        this.wait_question = "User option:";
        this.wait_player = 0;
        this.wait_choices = [];
        this.wait_answer = null;
        this.wait_control = 0; // this is redundant but exists beecause sometimes control becomes 0
        this.wait_count = 0; // how may choices to make


        this.counter = 0;
        let logdir = (__dirname + '/logs');
        if (!fs.existsSync(logdir)) fs.mkdirSync(logdir, '0777');

        let clean_gid = gid.replace(/[^A-Z0-9]/ig, '').substring(0, 40);

        const date = new Date();
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        let file = "control-" + clean_gid + "-" + new Date(date.getTime() - offsetMs).toISOString().replace(/T/, '_').substring(0, 16)
        let filename = logdir + "/" + file;

        try {
            this.control_log = fs.openSync(filename, 'w'); // 'w' for writing (creates if not exists)
        } catch (err) {
            console.error(err);
            this.control_log = -2;
            let a: any = null; a.log_file();
        }

        // Player names, historically determined by special strings in the gid
        let p1name = "CS1";
        let p2name = "CS2";
        if (gid.includes("auto")) {
            p1name = "ST15";
            p2name = "ST16";
        }
        if (gid.includes("bot1") || bot1.includes("1")) {
            this.bots.push(1);
        }
        if (gid.includes("bot2") || bot2.includes("1")) {
            this.bots.push(2);
        }

        logger.debug(`p1name is ${p1name} p2name is ${p2name}`);
        if (gid.startsWith("test")) {
            p1name = "test";
            p2name = "test";
        }



        this.Player1 = new Player(p1name, 1, this, master, p1string, seed);
        this.Player2 = new Player(p2name, 2, this, master, p2string, seed);
    }

    // returns true (and modifies it if "update" set) if we can do it
    // returns false if it's already pended once
    check_event(solid: SolidEffect, update: boolean): boolean {
        logger.debug(`effect is labelled ${solid.interrupt_count} count is ${this.event_count} reset at ${this.event_reset} `);
        if (solid.interrupt_count < this.event_reset) {
            if (update) solid.interrupt_count = (++this.event_count);
            return true;
        }
        return false;
    }
    reset_event() { this.event_reset = (++this.event_count); }


    // "wait" is for getting answers to questions posed to a player
    get_wait_control(): number { return this.wait_control; }
    get_control(): number { return this.control; }
    no_control() { this.control = 0; }
    wait(n_player: number, choices: UserQuestion[], question: string = "Choose:", choose: number = 1, mod: string = "") {
        this.wait_count = choose;
        this.wait_mod = mod;
        logger.debug("WAIT DEBUG: WAIT MOD IS " + this.wait_mod);
        logger.debug(`WAIT DEBUG: asking for P${n_player} questions ${JSON.stringify(choices)}`);
        logger.debug(`PRIOR STATE: ${this.wait_choices.length} opts and answer ${!!this.wait_answer} ${this.wait_answer}`);
        if (this.control != 0 || this.wait_control != 0) {
            logger.error("asking question of " + n_player + " when control was held by " + this.control + " or " + this.wait_control);
        }
        this.wait_question = question;
        logger.debug(`WAIT changing from ${this.control} to ${n_player} `);
        if (!(n_player in { 1: 1, 2: 2 })) {

            logger.info("controlx going to " + n_player);
            this.control = 3
            this.wait_control = 3;
            logger.debug("control now " + this.control);

        } else {
            this.control = n_player;
            this.wait_control = n_player;
        }
        if (this.wait_choices.length != 0) {
            logger.error("question overlap!");
        }
        if (this.wait_answer != null) {
            logger.error("prior answer not picked up");
        }
        this.wait_answer = null;
        this.wait_choices = choices;
        logger.debug("asking for answer " + this.wait_question);
        //console.dir(choices, { depth: null });
        this.check_control();
        // got rid of debug stuff may 8
        //        for (let c of this.wait_choices) c.text += " P" + n_player;
    };

    waiting_answer(n_player: number = 0): boolean {
        if (this.control == 0) {
            this.control = this.wait_control;

        }
        return this.wait_choices.length > 0;
    }
    has_answer(n_player: number = 0): boolean {
        if (this.control == 0) {
            this.control = this.wait_control;
        }
        return !!this.wait_answer;
    }

    // works exactly once, TODO make sure the right player is requesting it
    // returns 0 if we don't have answer, otherwise clears everything out
    // TODO maybe let it return 0
    get_answer(n_player: number = 0): string {
        logger.debug(`WAIT DEBUG: P${n_player} getting answer ${this.wait_answer}`);
        logger.debug(`PRIOR STATE: ${this.wait_choices.length} opts and answer ${!!this.wait_answer} ${this.wait_answer}`);
        logger.debug("Should I  lose this.control in here?");
        let ret = this.wait_answer;
        if (!ret) return "";

        this.wait_choices.length = 0;
        this.wait_answer = null;
        this.wait_control = 0;
        this.control = 0;
        return ret[0];
    }
    // dupe code
    get_multi_answer(n_player: number = 0): string[] | null {
        logger.debug(`WAIT DEBUG: P${n_player} getting answer ${this.wait_answer}`);
        logger.debug(`PRIOR STATE: ${this.wait_choices.length} opts and answer ${!!this.wait_answer} ${this.wait_answer}`);
        logger.debug("Should I  lose this.control in here?");
        let ret = this.wait_answer;
        if (!ret) return null;
        this.wait_choices.length = 0;
        this.wait_answer = null;
        this.wait_control = 0;
        this.control = 0;
        return ret;
    }

    // verifing from right person and is valid choice
    set_answer(n_player: number, answer: string[]) {
        // player 0 is how the auto-tests work
        if (n_player > 0 && n_player != this.wait_control) {
            logger.warn(`WAIT ERROR: wrong player, ${n_player} when ${this.wait_control} expected`);
            if (n_player != 0) this.announce("wrong player responded");
            // if we don't see this much, we can return
            //            return;            
        }
        if (answer.length > this.wait_count) {
            logger.warn(`WAIT ERROR: too many choices, ${answer.length} when ${this.wait_count} expected: ${answer.join(",")}`);
            let msg = `Invalid choice, player ${n_player} gave ${answer.length} when ${this.wait_count} expected`;
            this.log(msg);
            this.announce(msg, n_player);
            return;
        }
        if (answer.length < this.wait_count && this.wait_mod == "") {
            logger.debug(`WAIT ERROR: too few choices, ${answer.length} when ${this.wait_count} expected`);
            let msg = `Invalid choice,${this.wait_mod} player ${n_player} gave ${answer.length} when ${this.wait_count} expected`;
            this.log(msg);
            this.announce(msg, n_player);
            return;
        }

        let sum = 0;
        let list = [];
        this.wait_choices.forEach(c => logger.info(`wait choice: ${c.command} ${c.text} ${c.ver}  (no_last_id)`));
        logger.info(`user did answer(s): ${answer.join("_")}`);
        let m;
        for (let a of answer) {
            let blob = this.wait_choices.find(x => x.command == a);
            if (!blob) {
                let msg = `Invalid choice from player ${n_player}, try again`;
                this.log(msg);
                this.announce(msg, n_player);
                return;
            }
            if (this.wait_mod.includes("upto total")) {
                // I'm storing the DP value in the answer strings.
                let str = blob.text;
                let match = str.match(/(\d+) (DP|Cost)/);
                if (!match) {
                    let msg = `Invalid format choice ${this.wait_mod} from player ${n_player}, try again`;
                    this.log(msg);
                    this.announce(msg, n_player);
                    return;
                }
                let n = Number(match[1]);
                sum += n;
            } else if (m = this.wait_mod.match(/upto different (.*)/)) {
                let str = blob.text;
                let d = m[1];
                let match;
                switch (d) {
                    case "level":
                        match = str.match(/Lv.(\d+)/);
                        if (!match) {
                            let msg = `Invalid format choice ${this.wait_mod} from player ${n_player}, try again`;
                            this.log(msg);
                            this.announce(msg, n_player);
                            return;
                        }
                        list.push(match[1]);
                        break;
                    case "name":
                        match = str.match(/Target (.*?) (HAND|TRASH|\d).*/);
                        if (!match) {
                            let msg = `Invalid format choice ${this.wait_mod} from player ${n_player}, try again`;
                            this.log(msg);
                            this.announce(msg, n_player);
                            return;
                        }
                        list.push(match[1]);
                        break;
                    case "number":
                        match = str.match(/ (\S*)$/);
                        if (!match) {
                            let msg = `Invalid format choice ${this.wait_mod} from player ${n_player}, try again`;
                            this.log(msg);
                            this.announce(msg, n_player);
                            return;
                        }
                        list.push(match[1]);
                        break;
                    default:
                        this.announce("invalid diff");
                        logger.error("problem mod: " + this.wait_mod);
                        return;
                }
            } else {
                continue;
            }
        }
        logger.debug(`sum is ${sum} count is ${this.wait_count}`);
        if (this.wait_mod.includes("upto total") && sum > this.wait_count) {
            let msg = `Choices add up to too much, ${sum} instead of ${this.wait_count}, player ${n_player} try again.`;
            this.log(msg);
            this.announce(msg, n_player);
            return;
        }
        logger.info(`wait_mod is ${this.wait_mod} and list is ${list.join("-")}`);
        if (this.wait_mod.match(/upto different/) && !allUnique(list)) {
            let msg = `Choices have repeats, player ${n_player} try again.`;
            this.log(msg);
            this.announce(msg, n_player);
            return;
        }

        logger.debug(`WAIT DEBUG: P${n_player} setting answer ${this.wait_answer}`);
        logger.debug(`PRIOR STATE: ${this.wait_choices.length} opts and answer ${!!this.wait_answer} ${this.wait_answer}`);
        if (n_player != this.wait_control) {
            let msg = `wrong player ${n_player} WC  ${this.wait_control}  C ${this.control}`;
            logger.warn(msg);
            if (n_player) this.announce(msg);
        }
        this.wait_answer = answer;
        this.wait_choices.length = 0;
    }

    get_question(): string {
        if (this.wait_question && this.wait_question.length > 2) return this.wait_question;
        return "Make your choice:";
    }

    // need to change this to "get answers" or "get choices"
    get_wait_questions(n_player: number): any[] {
        logger.debug(` P${n_player} is wondering the quetions, ` +
            `control  ${this.control} wait_control ${this.wait_control}`);
        logger.debug(JSON.stringify(this.wait_choices));
        if (this.wait_choices.length == 0) return [];
        let ret: any[] = [];
        let i: number = 0;
        for (i = 0; i < this.wait_choices.length; i++) {
            let b = JSON.parse(JSON.stringify(this.wait_choices[i]));
            b.command = "ANSWER " + b.command;
            ret.push(b);
        }
        return ret;
    }

    x_check_control() { return; };
    // moved into step()...
    check_control() {
        let c = this.control;
        let autorun: number = 0; // which player to autorun, in theory


        const date = new Date();
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        const date_string = new Date(date.getTime() - offsetMs).toISOString().replace(/T/, '_').substring(0, 16);
        fs.writeSync(this.control_log, `_DATE: ${date_string}`);
        fs.writeSync(this.control_log, `_CONTROL NOW BELONGS TO ${this.control}\n`);
        if (this.wait_control) {
            fs.writeSync(this.control_log, `_QUESTION: ${this.get_question()}\n`);
            fs.writeSync(this.control_log, `_ANSWERS:\n`);
            let n = Math.floor(this.rng() * (this.wait_choices.length - 1) + 1);
            logger.info("RNG" + n);
            let count = 0;
            let opt = "!!!";
            for (let play of this.wait_choices) {
                fs.writeSync(this.control_log, `_\t${play.command.padEnd(20, " ")} ${play.text}\n`);
                if (count++ == n) opt = play.command;
            }

            /*
            fs.writeSync(this.control_log, `_WOULD MAKE RANDOM CHOICE: ${n} ${opt} \n`);
            if (c == autorun) {
                this.send(opt, 3, this.command_id);
            }*/
            return;


        }

        let p = this.get_n_player(this.control);
        let plays = JSON.parse(p.get_x_plays({ verbose: true, sort: false }));
        fs.writeSync(this.control_log, "_CHOICES:\n");
        let n = Math.floor(this.rng() * (plays.length - 1) + 1);
        let count = 0;
        let opt = "!!!";
        for (let play of plays) {
            fs.writeSync(this.control_log, `_\t${play.command.padEnd(20, " ")} ${play.text}\n`);
            if (count++ == n) opt = play.command;
        }
        // getting random command
        /*
        fs.writeSync(this.control_log, `_WOULD MAKE RANDOM CHOICE: ${n} ${opt} \n`);
        if (c == autorun) {
            p.execute_string(opt);
        }*/
        return;

    }

    next_id(): number {
        if (!this._id) this._id = 1;
        return this._id++;
    }

    next_card_id(): number {
        if (!this._card_instance_id) this._card_instance_id = 30;
        return this._card_instance_id++;
    }

    // for the turn player
    public available_memory(): number {
        return 10 + this.memory;
    }

    public change_memory(n: number): void {
        this.log(`Memory changing by ${n}, to ${this.memory + n}`);
        this.memory += n;
        if (this.memory < -10) {
            this.log("Memory went below -10, was the last move legal?");
            this.memory = -10;
        }
        if (this.memory > 10) {
            this.log("Capping memory to 10.");
            this.memory = 10;
        }
    }

    public set_memory(n: number): void {
        this.log(`Memory set to ${n}`);
        this.memory = n;
    }

    public get_memory(): number {
        return this.memory;
    }

    public get_n_player(n: number) {
        return (n == 1) ? this.Player1 : this.Player2;
    }

    public get_player(str: string) {
        return str == "P1" ? this.Player1 : this.Player2;
    }

    public reset(): void {

    }

    // shuffles and sets security 
    public start(): void {

        // pick first player here
        this.Player1.set_game(this, this.Player2);
        this.Player2.set_game(this, this.Player1);
        logger.debug("SETTING PLAYERS!");


        this.Player1.shuffle("deck");
        this.Player2.shuffle("deck");
        this.Player1.shuffle("eggs");
        this.Player2.shuffle("eggs");

        this.Player1.start_game();
        this.Player2.start_game();
        // ignore mulligan

    }

    // log and announce
    la(msg: string) {
        this.log(msg);
        this.announce(msg);
    }

    log(msg: string) {
        const logmsg = `TURN ${this.n_turn} ${msg} `;
        logger.info("LOG: " + logmsg);
        this.history.push(logmsg)
    }

    debug(msg: string) {
        logger.debug(msg);
        //        this.history.push(`TURN ${this.n_turn} ${msg} `);
    }

    logs(n: number = 0) {
        return this.history.slice(n);
        return this.history.join("\n");
    }

    can_pay_memory(i: number): boolean {
        // there's one weird condition where we might be able to pay costs on opponent's turn
        return (this.memory - i >= -10);
    }

    pay_memory(i: number): void {
        // side effect
        this.log(`memory going from ${this.memory} to ${this.memory -= i}`);
    }

    public player(i: number): Player {

        return (i == 1) ? this.Player1 : this.Player2;
    }

    public dump(extra: string = "", testmode: number = 2): string {
        let p1: string[] = [];
        let p2: string[] = [];
        let e1: string[] = []
        let e2: string[] = [];
        let extras = (extra ? extra : "").split(",");
        let version = 1; // this will update
        let dp = extras.includes("DP");

        if (extras.includes("V2")) testmode = 2;
        let show_keywords = extras.includes("KEYWORDS");
        let name = extras.includes("NAME");
        let color = extras.includes("COLOR");
        // we need a function that is "show all keywords"
        let keywords = ["Blocker", "Piercing", "Reboot", "Armor Purge", "Jamming", "Retaliation", "Alliance", "Rush", "Security Attack"];

        for (let instance of this.instances) {
            if (!instance) continue;
            if (!instance.in_play() && !instance.in_eggzone()) continue;
            let summary = instance.dump_summary(testmode);
            if (dp) summary += "," + instance.dp() + "DP";
            if (show_keywords) {
                if (false) {
                    for (let word of keywords) {
                        if (instance.has_keyword(word)) { summary += "," + word.toUpperCase().replaceAll(" ", "_"); }
                    }
                } else {
                    let keywords = instance.get_all_keywords();
                    if (keywords.length > 0)
                        summary += "," + instance.get_all_keywords().map(s => s.toUpperCase()).join(",");
                }
            }
            if (name) summary += "," + instance.get_name().toUpperCase().replaceAll(" ", "_");
            if (color) summary += "," + instance.s_colors();
            if (instance.me_player == this.Player1) {
                (instance.in_play() || testmode == 1 ? p1 : e1).push(summary);
            } else {
                (instance.in_play() || testmode == 1 ? p2 : e2).push(summary);
            }
        }
        let str = "";
        if (testmode == 1) {
            str += "P1:" + p1.join(" ") + "\n" +
                "P2:" + p2.join(" ") + "\n";
        } else if (testmode == 2) {
            str += "FIELD1:" + p1.join(" ") + "\n" +
                "FIELD2:" + p2.join(" ") + "\n";
        }
        if (extras.includes("SECURITY")) {
            str += "SECURITY1:" + this.Player1.security.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "SECURITY2:" + this.Player2.security.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (extras.includes("SEARCH")) {
            str += "SEARCH1:" + this.Player1.search?.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "SEARCH2:" + this.Player2.search?.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (extras.includes("TRASH")) {
            str += "TRASH1:" + this.Player1.trash.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "TRASH2:" + this.Player2.trash.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (extras.includes("HAND")) {
            str += "HAND1:" + this.Player1.hand.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "HAND2:" + this.Player2.hand.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (extras.includes("REVEAL")) {
            str += "REVEAL1:" + this.Player1.reveal.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "REVEAL2:" + this.Player2.reveal.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (extras.includes("EGGS")) {
            str += "EGGS1:" + this.Player1.eggs.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "EGGS2:" + this.Player2.eggs.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (extras.includes("EGGZONE")) {
            str += "EGGZONE1:" + e1 + "\n";
            str += "EGGZONE2:" + e2 + "\n";
        }
        if (extras.includes("DECK")) {
            str += "DECK1:" + this.Player1.deck.map(x => x.testname(testmode)).join(" ") + "\n";
            str += "DECK2:" + this.Player2.deck.map(x => x.testname(testmode)).join(" ") + "\n";
        }
        if (testmode == 1) {
            str +=
                "Turn:P" + this.turn_player + " Phase: " + Phase[this.phase] + "\n" +
                "Memory: " + this.memory + "\n"
        } else if (testmode == 2) {
            str += `GAME:P${this.turn_player} T${this.n_turn} ${Phase[this.phase]} ${this.memory}\n`;
        }
        // + "Turn: " + this.n_turn + "\n"


        //            logger.debug("^^^^^^");
        //          logger.debug(str);
        //        logger.debug("vvvvvvvv");
        return str;

    }

    // this should be replace with the grammar's At rules?
    get_expiration(expire: any, n_player: number): [number, Phase] {
        let n = 0;
        let p = Phase.NUL;
        if (expire["END_OF_BATTLE"] != undefined) {
            // expires this turn, as long as we're not in an attack
            // Just make sure we check this before the next attack starts!
            n = this.n_turn;
            p = Phase.END_OF_BATTLE;
        }
        if (expire["END_OF_ATTACK"] != undefined) {
            // expires this turn, as long as we're not in an attack
            // Just make sure we check this before the next attack starts!
            n = this.n_turn;
            p = Phase.END_OF_ATTACK;
        }
        if (expire["END_OF_TURN"] == "OPPONENT") {
            n = this.opponent_turn(n_player);
            /*            logger.debug("my number is " + this.n_me_player +
                            " and game player turn is " + this.game.turn_player);
                        logger.debug("this turn is " + this.game.n_turn +
                            " opponent's turn is " + s.n); */
            p = Phase.END_OF_TURN
        }
        if (expire["END_OF_TURN"] == "YOUR") {
            n = this.your_turn(n_player);
            p = Phase.END_OF_TURN
        }
        if (expire["END_OF_TURN"] == "THIS") {
            n = this.n_turn;
            p = Phase.END_OF_TURN
        }
        if (expire["UNSUSPEND"] == "YOUR") {
            n = 99;
            p = Phase.UNSUSPEND;
        }
        logger.info(`Setting expiration of effect to turn ${n} Phase ${Phase[p]}`);
        return [n, p];

    }

    // the next turn of your opponent's tthat ends. This turn 
    // it's theirs, n+1 if it's your turn
    opponent_turn(n_player: number) {
        return (n_player == this.turn_player) ? (this.n_turn + 1) : (this.n_turn);
    }

    // the next turn of yours. This turn 
    // it's yours, n+1 if it's not your turn
    your_turn(n_player: number) {
        return (n_player == this.turn_player) ? (this.n_turn) : (this.n_turn + 1);
    }

    _remove_instance(i: number) {

        let inst = this.get_instance(i);
        let top;
        //  while (top = inst.pile[0])
        //    top.extract().move_to(Location.TRASH);

        delete this.instances[i];
    }

    // returns null instance if player or label not found
    get_instance(instance_id: number | string): Instance {
        if (typeof instance_id === 'string') {
            if (instance_id == "0" || instance_id.toUpperCase() == "PLAYER") return this.instances[0];
        }
        if (!instance_id) return this.instances[0];
        let i: number = Number(instance_id);
        if (i > 0) {
            return this.instances[i];
        }
        // we don't enforce uniqueness on labels
        for (let i of this.instances) {
            if (!i) continue;
            if (i && i.get_label() == instance_id) {
                return i;
            }
        }
        logger.info("error " + instance_id);
        return this.instances[0];
    }

    // this doesn't work like you'd like, each player has a wipe_field now
    public wipe_field(): void {
        // WIPE
        this.Player1.field.length = 0;
        this.Player2.field.length = 0;
        this.instances.length = 0;
        this._id = 0;
        this._card_instance_id = 0;
    }

    private async _set_up_board(blob: string): Promise<string> {
        if (!blob || blob.length < 3)
            return "";
        // logger.debug("board is:\n" + blob + "\n");                                                                           
        if (JSON.stringify(blob).length < 3)
            return "";
        this.wipe_field();
        this.start();
        let output = "err";
        try {
            output = await this._continue_board(blob);
        } catch (error) {
            if (error instanceof Error) {
                console.log(error.stack);
            } else {
                console.log("Caught an unknown error:", error);
            }
            output = 'err ' + error;
        }
        return output;
    }
    private async _continue_board(blob: string): Promise<string> {
        //   logger.debug("999999999");
        let _lines = blob.split("\n");
        let output = "";
        this.mode = "step";
        let testmode: number = 1;
        for (let line of _lines) {
            line = line.trim();
            logger.debug("SET UP line is " + line);
            if (line.length < 3) continue;
            if (line[0] == "#") continue;
            let [key, value, arg1] = line.split(":");
            if (line == "VERSION:2") {
                testmode = 2;
                this.Player1.security.length = 0;
                this.Player2.security.length = 0;
                this.Player1.hand.length = 0;
                this.Player2.hand.length = 0;
                this.Player1.deck.length = 0;
                this.Player2.deck.length = 0;
            }
            key = key.toUpperCase();
            if (key.endsWith("1")) {
                let r = this.Player1._set_up(key, value, testmode);
                if (r) output += "ERROR: " + r + "\n";
            } else if (key.endsWith("2")) {
                let r = this.Player2._set_up(key, value, testmode);
                if (r) output += "ERROR: " + r + "\n";
            } else if (key == "MODE") {
                /// this code doesn't matter because I overwrite below
                if (value == "fast") this.mode = "fast";
                if (value == "step") this.mode = "step";
                if (value == "auto") this.mode = "auto";
            } else if (key == "GAME") {
                // GAME:P1 T2 MAIN 8
                let [player, turn, phase, memory] = value.split(" ");
                this.turn_player = (player == "P1") ? 1 : 2;
                this.control = this.turn_player;
                this.check_control();
                this.n_turn = parseInt(turn.substring(1));
                if (phase == "BREEDING") {
                    this.phase = Phase.HATCHING;
                } else if (phase == "MAIN") {
                    this.phase = Phase.MAIN;
                } else {
                    logger.debug("unknown phase2");

                }
                this.memory = parseInt(memory);



            } else if (key == "TURN") {
                this.turn_player = (value == "P1") ? 1 : 2;
                this.control = this.turn_player;
                this.check_control();
            } else if (key == "PHASE") {

                // typescript wtf
                //    let str: keyof typeof Phase = value.toString();
                //  this.phase = Phase[str]; // value.toString()];                
                //                let s : string = "HATCHING";
                logger.debug(`value is <${value}>`);
                if (value == "HATCHING") {
                    this.phase = Phase.HATCHING;
                } else if (value == "MAIN") {
                    this.phase = Phase.MAIN;
                } else {
                    // hstile user can crash the server
                    logger.debug("unknown phase");
                }

                this.log("TECH: phase now " + Phase[this.phase]);
            } else if (key == "NTURN") {
                this.n_turn = parseInt(value);
            } else if (key == 'MEMORY') {
                this.memory = parseInt(value);
            } else if (key == "UPDATE") {
                this.process_game_flow();
                this.ui_card_move();
            } else if (key == "SLEEP") {
                await this.sleep(800);
            } else if (key == "STEP") {
                let to = (value == "TO"); // untested
                let autoanswer = value == "AUTOANSWER";
                let answers: string[] = (arg1 || "").split(",");
                //                let answer = parseInt(arg1) || 0;
                logger.info(`to is ${to}, answers is ${answers.join(' , ')}`);
                let capture = (arg1 == "CAPTURE");
                let limit = 200;
                let no_more_answers = false;
                do {
                    logger.info(`in loop, ${limit} left`);
                    logger.debug("STATE: " + this.step_state());
                    // what to do with messages here? Just spit them onto console I guess
                    if (!no_more_answers && this.waiting_answer()) {
                        if (capture) {
                            output += this.get_wait_questions(0).map((x) => `CAPTURE:${x.text}\n`).join('');
                        }

                        // pull the next answer off the queue, without leaving it empty
                        let s_answer: string = (answers.length > 1) ? answers.shift()! : answers[0];
                        if (s_answer.includes("/") || (this.wait_count > 1 && !autoanswer)) {
                            this.set_answer(0, s_answer.split("/"));
                        } else {

                            let answer = parseInt(s_answer) || 0;
                            logger.info(`making guess of s_answer ${s_answer} answer ${answer}`);
                            //logger.debug("we have options", this.wait_choices);
                            //                        logger.debug("choosing array " + answer);
                            // TODO: this should be a library

                            let anss: string[] = this.get_auto_answers(answer);

                            //          logger.debug("that's answer " + ans), this.wait_choices[index];
                            this.set_answer(0, anss); // [ans]);
                        }
                        if (to) {
                            logger.info("answered just one, continue to next question");
                            no_more_answers = true;
                        }
                    }
                    let done = this.step();
                    if (done) break;
                    if (limit-- < 0) {
                        logger.error("limit hit in autorunning effects"); logger.error("limit hit");
                        break;
                    }
                } while (true);
                logger.info("we are done waiting");
            } else if (key == "START") {
                // um was something here once?
            } else if (key == "CMD") {
                // make sure previous command finished
                // this won't answer questions, maybe it should
                let r = this.get_turn_player().execute_string(value);
                if (r) output += "ERROR: " + r + "\n";
                if (testmode == 2) {
                    while (!(this.step())) {
                        logger.debug("steppin'"); // delete this
                    }
                }
            } else if (key == "EFFECT-TREE") {
                let tree = this.root_loop.get_effect_tree();
                output += tree.map(x => `EFFECT-TREE:${x}\n`).join("");
            } else if (key == "GET-X-PLAYS") {
                // this is undefined if not in an open move state
                let x = this.get_turn_player().get_x_plays({ automatic: true, verbose: true, sort: false });
                let objs = JSON.parse(x);
                for (let obj of objs) {
                    output += `GET-X-PLAYS: ${obj.command} ${obj.text}\n`;
                }
            } else if (key == "GET-CHOICES") {
                let q = this.get_question();
                output += `GET-CHOICES:${q}\n`;
                let tree = this.get_wait_questions(0);
                output += tree.map(x => `GET-CHOICES:${x.text}\n`).join("");
            } else if (key == "DUMP") {
                this.refresh_constant_effects();
                output += this.dump(value, testmode);                // return status... where?
            } else if (key == "ECHO") {
                output += "ECHO:" + value + "\n";
            } else if (key == "EXIT") {
                break;
            }
        }
        this.mode = "fast";
        if (output.length > 0) {
            return output;
        }
        //    this.memory *= -1;
        //        this.next_turn();
        //      this.next(); // I guess? back to the top??
        return "";
    }


    // for auto-running in tests
    // reads game state, takes index, returns value
    get_auto_answers(answer: number): string[] {
        let count = this.wait_count;
        if (this.wait_question.includes("Choose up to") || this.wait_question.includes("Choose any number")) {
            // this entire function might be useless
            count = Math.min(this.wait_choices.length, this.wait_count, 1);
        }
        logger.info(`looking for ${count} answers`);
        let ret = [];
        logger.info("===== " + answer);
        let choices = [...this.wait_choices]; // copy
        for (let i = 0; i < count; i++) {
            logger.debug(choices.toString());
            let len = choices.length;
            let index = (answer < 0) ? len + answer : answer;
            logger.debug("" + index);
            let ans = choices.splice(index, 1)[0].command;
            ret.push(ans);
        }
        logger.info("ret" + ret.join("-"));
        return ret;

    }

    public apply_collected_constant_effect(eats: EffectAndTarget[]): void {
        for (let eat of eats) {
            let sub = eat.s;
            // Is it really always an instance?
            let immune_test = eat.t as Instance; //  (sub.game_event == GameEvent.EVOLVE) ? sub.spec_source : sub.chosen_target;
            //          console.error(955, !!immune_test);
            //console.error(952, "an event " + GameEvent[sub.game_event] + " and a target " + immune_test?.id);
            if (immune_test && immune_test.can_do) {
                //                console.error(956, "test " + immune_test.id + " " + immune_test.get_name());
                let can = immune_test.can_do(sub);
                if (!can) {
                    console.error(958, "skipping");
                    continue;
                }
            }

            XX.do_terminus_effect(1, eat.s, eat.t, this);
        }
    }

    public refresh_constant_effects() {
        // console.trace();
        // we seem to call this a lot???
        //        logger.debug("REAPPLY CONSTANT EFFECTS");

        this.Player1.expire_effects();
        this.Player2.expire_effects();


        // This used to allow for a much more complicated
        // "house of cards" but @crazypants got an answer from robo
        // to say it's not needed. Disable this block to get that back.
        {
            for (let i of this.instances) {
                i && i.clear_constant_effects();
            }
            this.Player1.clear_constant_effects();
            this.Player2.clear_constant_effects();
        }
        // in theory, we could need to re-run this several times for things to propogate
        // this could get expensive, running the whole loop N times if we have N effects
        let count = 0;
        let el = 1;
        do {
            count += 1;
            // collect all effects
            let eats: EffectAndTarget[] = [];
            for (let i of this.instances) {
                if (!i) continue;
                if (!i.in_play()) continue;
                eats.push(...i.collect_constant_effects());
            }
            eats.push(... this.Player1.collect_my_constant_effects());
            eats.push(... this.Player2.collect_my_constant_effects());

            for (let i of this.instances) {
                i && i.clear_constant_effects();
            }
            this.Player1.clear_constant_effects();
            this.Player2.clear_constant_effects();

            this.apply_collected_constant_effect(eats);
            logger.info(`iteration ${count} apply ${eats.length} persistent effects`);
            el = eats.length;
        } while (count <= el);
        // 
        // what if the player has a constant effect?

        // then re-apply consnant effects
        // check health
    }

    public next_turn() {
        if (this.phase != Phase.AFTER_END_OF_TURN) {
            logger.error("not end of turn!");
        }
        this.n_turn++;
        this.phase = Phase.BEFORE_START_OF_TURN;
        this.log("START OF TURN " + this.n_turn);
        this.log(`P1 Deck ${this.Player1.deck.length} Security ${this.Player1.security.length}`);
        this.log(`P2 Deck ${this.Player2.deck.length} Security ${this.Player2.security.length}`);
        // npot sure the best place to expire effectsm probably when
        // checking them?

        // clear all constant effects
        for (let i of this.instances) {
            i && i.expire_effects();
        }
        this.refresh_constant_effects();
        this.turn_player = (this.turn_player == 1) ? 2 : 1;
        this.memory *= -1;
        this.fancy.add_string(0, `Turn ${this.n_turn} for P${this.turn_player} with ${this.memory} memory`);
        this.log(`MEMORY AT ${this.memory} FOR PLAYER ${this.turn_player}`);
    }


    public all_logs(who: (boolean | number)): string {
        let both: boolean = (who === true);
        let ret = "<b>GAME LOGS</b>\n";
        ret += this.logs();
        ret += "\n<b>INSTANCE LOGS</b>\n";

        for (let instance of this.instances) {
            if (instance) {
                let l = instance.logs();
                if (l) {
                    ret += "<b>LOGS FOR INSTANCE " + instance.id + ":</b>\n";
                    ret += l + "\n";
                }
            }
        }
        if (both || who == 1) {
            let l = this.Player1.logs();
            ret += `<b>LOGS FOR PLAYER 1:</b> ${l.length} ${this.lastlog1}\n`
            ret += l.slice(0, this.lastlog1).join("\n");
            ret += "\n<b>" + l.slice(this.lastlog1).join("\n") + "</b>";
            this.lastlog1 = l.length;
        }
        if (both || who == 2) {
            let l = this.Player2.logs();
            ret += `<b>LOGS FOR PLAYER 2:</b> ${l.length} ${this.lastlog2}\n`
            ret += l.slice(0, this.lastlog2).join("\n");
            ret += "\n<b>" + l.slice(this.lastlog1).join("\n") + "</b>";
            this.lastlog2 = l.length;
        }
        return ret;
    }

    // doesn't do anyting, but returns subeffects to do
    rules_process(): SubEffect[] | false {

        this.reset_event(); // this may be the only place we need it, if events reset with the same timing as rules checks

        //        logger.debug(`RULES PROCESSING`);
        let rules_subs: SubEffect[] = [];
        // I think we've already had 


        for (let instance of this.instances) {
            if (!instance) continue;
            if (!instance.in_play()) continue;
            let dp = instance.dp();
            logger.debug(`instance ${instance.id} named ${instance.get_name()} dp of ${dp} has_dp ${instance.has_dp()} is egg ${instance.is_egg()}  `);
            if (dp <= 0) {
                let del_dp = {
                    game_event: GameEvent.DELETE,
                    // what is n_player for combat?
                    label: 'delete by rules',
                    n_player: instance.n_me_player,
                    chosen_target: instance, td: new TargetDesc(""),
                    cause: EventCause.ZERO_DP // maybe?
                };
                rules_subs.push(del_dp);
                //                instance.do_delete("zero dp");
            }
            // this really should say "no dp" but placed options have no DP either
            // so for now it really is "egg"
            // I'm just trashing it instantly, not an interruptible or respondable effect
            // logger.debug(`RULES: ${instance.id} ${instance.get_name()} ${instance.is_egg()} ${instance.has_dp()} `);
            if (instance.is_egg() && !instance.has_dp()) {
                this.la(`Trashing ${instance.get_name()} for having no DP`);
                instance.do_trash("no dp");
            }
            let plug_trash_count = 0;
            for (let pcard of instance.get_plugs()) {

                let lcs = pcard.get_link_requirements();
                let costs: number[] = Card.can_evolve_into(instance, lcs);
                logger.info("trashing by trait? " + costs.length);
                if (costs.length === 0) {
                    let trash_link = {
                        cause: EventCause.GAME_FLOW,
                        game_event: GameEvent.TRASH_LINK,
                        label: "plug_trash",
                        chosen_target: pcard,
                        td: new TargetDesc(""),
                        n_player: instance.n_me_player
                    }
                    rules_subs.push(trash_link);
                    plug_trash_count++;
                };
            }
            // can we choose what does if we already trashed based on above?            
            if (instance.get_links() - plug_trash_count < instance.get_plug_count()) {
                // for now just force it to be the first
                let n = instance.get_plug_count() - instance.get_links() - plug_trash_count;
                while (n > 0) {
                    n--;
                    logger.info(`settings plug ${n} to trash`);
                    let trash_cl = new CardLocation(this, instance.n_me_player,
                        Location.BATTLE, n, instance.id, "plug");
                    let trash_link = {
                        cause: EventCause.GAME_FLOW,
                        game_event: GameEvent.TRASH_LINK,
                        label: "plug_trash",
                        chosen_target: trash_cl,
                        td: new TargetDesc(""),
                        n_player: instance.n_me_player
                    }
                    rules_subs.push(trash_link);
                }
            }
        }
        if (rules_subs.length > 0) return rules_subs;
        return false;
        // for now DP deletion is just happening on its own


    }


    // kick off the game, or move forward
    go(): void {
        logger.debug("GAME GO");
        if (this.n_turn == 0) {
            this.n_turn += 1;
            if (this.gid.includes("flip"))
                this.turn_player = (this.rng() > 0.5) ? 1 : 2;
            else
                this.turn_player = 1; // (Math.random() > 0.5) ? 1 : 2;

        }
        this.control = 0;
        this.log("Game start");
        this.phase = Phase.BEFORE_START_OF_TURN;
        this.gamestep = GameStep.NORMAL_PLAY;
        // could there possibly be START_OF_TURN effects on turn1?
        this.process_game_flow();
    }

    // both reveal and nullzone
    clear_reveal() {
        for (let player of [this.Player1, this.Player2]) {

            for (let card of player.optzone) {
                this.log(`sending ${card.name} to trash`);
                card.move_to(Location.TRASH);
            }
            player.optzone.length = 0;

            logger.warn("not clearing");
            /*     for (let card of player.reveal) {
                this.log(`sending ${card.name} to trash`);
                card.move_to(Location.TRASH);
            }
             player.reveal.length = 0;
             */
        }
        this.ui_card_move();

    }

    // return true if we unsuspended nothing
    do_unsuspend_phase(): boolean {
        this.log("Unsuspend phase");
        let player = this.player(this.turn_player);
        let other_player = this.player(3 - this.turn_player); // 1+2=3
        // trigger queue empty
        let unsuspend_events: SubEffect[] = [];
        let _ = new TargetDesc("dummy");

        for (let i of player.my_mons()) {
            if (!i.is_ready()) {
                // i.unsuspend("unsuspend phase");
                // this.log(`unsuspended ${i.name()}`);

                let unsuspend: SubEffect = {
                    cause: EventCause.GAME_FLOW,
                    game_event: GameEvent.UNSUSPEND,
                    label: 'unsuspend by rules',
                    chosen_target: i,
                    td: _,
                    n_player: player.player_num
                };
                unsuspend_events.push(unsuspend);
            }
        }
        //        this.log("checking opponent for reboot");
        for (let i of other_player.field) {
            //                this.log(`REBOOT: checking ${i.name()}`);
            if (!i.is_ready() && i.has_reboot()) {
                this.la("Reboot " + i.name()); // optimistic, might not unsuspend
                //i.unsuspend("reboot");

                let unsuspend: SubEffect = {
                    cause: EventCause.EFFECT,
                    game_event: GameEvent.UNSUSPEND,
                    label: 'reboot',
                    chosen_target: i,
                    td: _,
                    n_player: other_player.player_num
                };
                unsuspend_events.push(unsuspend);
            }
        }
        //logger.error("turn is " + this.n_turn + " and length is " + unsuspend_events.length);
        //        return true;


        if (unsuspend_events.length == 0) return true;
        let x = new DirectedSubEffectLoop(this, unsuspend_events, 1);
        this.root_loop.add_res_loop(x);


        this.gamestep = GameStep.IN_LOOP;
        //        while (!this.root_loop.step()) { };
        /*      if (!this.waiting_answer()) { this.root_loop.step(); }
                if (!this.waiting_answer()) { this.root_loop.step(); }
                if (!this.waiting_answer()) { this.root_loop.step(); }
                if (!this.waiting_answer()) { this.root_loop.step(); }
                if (!this.waiting_answer()) { this.root_loop.step(); }
                if (!this.waiting_answer()) { this.root_loop.step(); }
                if (!this.waiting_answer()) { this.root_loop.step(); }*/

        this.ui_card_move();

        return false;
        // examine trigger queue
    }

    // do a thing to a target
    // build this to be generalized
    // we need a reason
    delete_target(target: Instance) {
        logger.error("OBSOLETE FUNCTION");

        // step 1, can I *try* to delete you? 
        if (!target) {
            logger.error("BAD TARGET");
            return;
        }

        //HERE: announce event, give interrupters a chance to respond

        target.do_delete("why");
    }


    //        let res : ActionTest = can_delete(target, action);

    evolve(p: Player, cl: CardLocation, onto: Instance, onto2: Instance | CardLocation | undefined, cost: number | undefined, mode: string) {
        // Checking if the user "can" evolve is difficult
        let td = new TargetDesc("");
        // for playing the target is the card.
        // for evolve the target is the card
        // and the source is the instance.

        // this will probably need to change in the future

        // and the source is the card.
        // Is this proper? I don't know. I want
        // to be able to target the instance for "when would evolve" interrupters
        let card = cl.card;
        let evo_cost = card.e_cost;
        // The caller is responsible for verifying the cost is legit
        // (Is this called anywhere but Player::evolve()?)
        if (typeof cost === "number" && !isNaN(cost)) evo_cost = cost;

        let e: SubEffect[] = [];
        let app_card;
        console.error(1369, mode);
        if (mode === "app") {
            app_card = onto2;
            // the card gets stacked on top, but not in a way that we can notice
            // if we ever have an effect like "when this card stops being a link card"
            // or "when this card is used for an app fuse" we don't be able to notice
/*            e.push({
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.TARGETED_CARD_MOVE,
                chosen_target: onto2, // move plugged card...
                n_mod: "top",
                chosen_target2: [onto], // ... to top of stack
                spec_source: onto,
                td: td,
                n_player: p.player_num,
                label: "appfuse"
            });
            onto2 = undefined; // otherwise we will try to fusion evo
            */
        }
        if (mode === "burst") {
            // two simultaneous things. that's not right but will get you close
            // also we can't do this by effect
            e.push({
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.EVOLVE,
                chosen_target: cl, // Should be this 
                chosen_target2: [onto],
                spec_source: onto, // this "causes" the evolve, but is distinct from what we evo onto
                td: td,
                n_player: p.player_num, // speifically for counter
                n: evo_cost, // there could be multiple
                label: "burst"
            });
            e.push({
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.FIELD_TO_HAND,
                chosen_target: onto2,
                spec_source: cl, // this "causes" the evolve, but is distinct from what we evo onto
                td: td,
                n_player: p.player_num, // speifically for counter
                label: "bounce"
            });
            let [, pend, ,] = new_parse_line("trash the top card of this monster", undefined, "burst trash", "main");
            // we have to change the target because new_parse_line couldn't figure it out
            pend.effects[0].events[0].td = new TargetDesc(onto.id, "instance");

            let trigger: any = { phase: Phase.END_OF_TURN, END_OF_TURN: "THIS" };
            e.push({
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.CREATE_PENDING_EFFECT,
                delayed_effect: pend,
                choose: new DynamicNumber(1),
                delayed_phase_trigger: trigger,
                chosen_target: onto,
                spec_source: onto, // by the time this runs, this will be the source
                td: new TargetDesc(onto.id, "instance"), // I wanted to check that it was a monster :( new TargetDesc(""),
                n_player: p.player_num, // speifically for counter
                label: "pend"
            });
            // console.error(1280, onto);
            let x = new DirectedSubEffectLoop(this, e, 1);
            this.root_loop.add_res_loop(x);

        } else { // evo, fusion evo, app fuse

            let cause = EventCause.GAME_FLOW;
            if (mode === "fusion") cause |= EventCause.DNA;
            if (mode === "app") cause |= EventCause.APP_FUSE;
            logger.warn("should be evolving into a cardlocation, not a card");  // but why
            //        let cl = new CardLocation(c);
            e.push({
                // is "game flow" right? Effects could show up here... and blast_digi *is* an effect
                cause: cause,
                game_event: GameEvent.EVOLVE,
                // chosen_target: card,
                chosen_target: cl, // Should be this 
                chosen_target2: [onto],
                spec_source: onto, // this "causes" the evolve, but is distinct from what we digi onto
                chosen_target3: onto2,
                td: td,
                n_player: p.player_num, // speifically for counter
                n: evo_cost, // there could be multiple
                label: "normal evolve"
            });
            let x = new DirectedSubEffectLoop(this, e, 1);
            this.root_loop.add_res_loop(x);
        }
        this.gamestep = GameStep.IN_LOOP;
        if (!this.waiting_answer()) { this.root_loop.step(); }
        if (!this.waiting_answer()) { this.root_loop.step(); }
    }

    link(p: Player, source: CardLocation | Instance,
        recipient: Instance,
        cost: number,
        to_trash: CardLocation[]) {
        let e: SubEffect[] = [];
        let limit = 1; // receipient.get_limit();

        let source_card = source;
        if (source instanceof Instance) {
            source_card = new CardLocation(this, source.n_me_player,
                Location.BATTLE, source.pile.length - 1, Number(source_card.id));
        }


        for (let trash of to_trash) {
            // pretty sure this is simultaneous
            e.push({
                cause: EventCause.GAME_FLOW,
                game_event: GameEvent.TRASH_LINK,
                label: "plug_replace",
                chosen_target: trash,
                td: new TargetDesc(""),
                n_player: p.player_num,
            })
        }
        e.push({
            cause: EventCause.GAME_FLOW,
            game_event: GameEvent.PLUG,
            label: "plug",
            chosen_target: source,
            chosen_target2: [recipient],
            chosen_target3: source_card,
            td: new TargetDesc(""),
            n_player: p.player_num,
            n: cost,
        });
        let x = new DirectedSubEffectLoop(this, e, 1);
        this.root_loop.add_res_loop(x);
        this.gamestep = GameStep.IN_LOOP;
        if (!this.waiting_answer()) { this.root_loop.step(); }
        if (!this.waiting_answer()) { this.root_loop.step(); }
    }

    // right now "source" is your hand... does this
    // function even care where it's played from?
    play_or_use_from_source(p: Player, card: Card, label: string) {

        let event = (label == "option") ? GameEvent.USE : GameEvent.PLAY;
        let l = (label == "option") ? "use" : "play";
        l += " " + card.name;
        let e: SubEffect[] = [];
        e.push({
            // is GAME_FLOW right? Don't play by effects end up in here?
            cause: EventCause.GAME_FLOW,
            game_event: event,
            label: l, // normal play?
            // I'll cheat later by changing this to the instance that gets made
            // that way we can search for it in responder effects.
            //... I *could* just manually trigger "on play"? Would that 
            // be less of a cheat?
            chosen_target: card,
            td: new TargetDesc(""),
            n_player: p.player_num,
            play_label: label
        });
        /*
        // always follow a USE with an ACTIVATE
        if (event === GameEvent.USE) {
            e.push({
                cause: EventCause.GAME_FLOW, //?
                game_event: GameEvent.ACTIVATE,
                label: card.get_name(), // ?
                td: new TargetDesc(""),
                n_player: p.player_num,
                play_label: card.get_name(), // ?
            });
    
        }*/

        let x = new DirectedSubEffectLoop(this, e, 1);
        this.root_loop.add_res_loop(x);
        this.gamestep = GameStep.IN_LOOP;
        // we can't care about what comes back here, this is the root loop

        if (!this.waiting_answer()) { this.root_loop.step(); }
        if (!this.waiting_answer()) { this.root_loop.step(); }

        //while (! this.root_loop.step()) { logger.debug("spinnin"); }
        //this.root_loop = undefined;

        //         let played = Instance.play(card, this, p, p.other_player!);
        //    p.field.push(played);

    }

    // remove non-alphanumberics from start and end
    trim_non_an(str: string): string {
        return str.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
    }

    // this can't return link cards. We should just abandon this entirely. 
    // the function that needed link cards has been refactored to avoid keys
    find_by_key(player_num: number, location: number, index: number, instance_id?: number): CardLocation | Instance {
        logger.info(`p${player_num}  l${location}, L${Location[location]} , i${index}`);
        if (location == 0 && index == 0) return undefined!;
        if (location == Location.BATTLE) {
            if (instance_id) {
                return new CardLocation(this, player_num, location, index, instance_id);
            }
            if (index == 0) {
                console.error(location, index);
                let a: any = null; a.bad_key();
            }
            return this.get_instance(index);
        }
        return new CardLocation(this, player_num, location, index);
    }

    static get_target_number(sel: SolidEffectLoop | undefined, n: number): CardLocation | Instance | false {
        if (!sel) return false;
        return sel.chosen_targets![0];

    }

    // common tests to see if this last_thing is one we can return
    static verify_last_thing(chosen_target: any, parse_matches: any, s: TargetSource) {
        // is instance is a function but just its existence is checked
        if (chosen_target && chosen_target.kind === "Instance"
            && chosen_target.in_play() // if the instance isn't there any more, no match: should this end the search, or do we keep searching for something else?
            && chosen_target.top()) {
            logger.info("PROIPR LOCATION IS " + chosen_target.location_to_string);
            logger.info("PRIOR TARGET FOUND! prior thing was " + chosen_target.get_name() + " or " + chosen_target.id + " and " + chosen_target.kind);
            // does s.get_name() ever return a *function*? 
            logger.info("i am " + s.get_name(true) + " " + s.id());
            // how do we compare for equality??
            if (chosen_target.id == s.id()) {
                // "THAT" will never be self... right? Maybe what we should be skipping is *costs*
                // "when a monster is played, by suspending a monster, that monster may evolve into..."
                return false;
            }
            logger.warn("returing prior thing");
            logger.warn("prior thing is " + chosen_target.get_name());

            let x = [chosen_target];
            // make sure this target is of the kind we want, like "that green monster"
            // we're not chasing this cat all the way up the tree below, just here for now
            // TODO: chase the cat all the way (but we need test cases)
            if (parse_matches) {
                x = x.filter((x: any) => verify_special_evo(x, parse_matches, s));
            }
            if (x.length > 0) {
                return x;
            } else {
                // fall thru
            }
        }
    }               


    static get_last_thing_from_sel(sel: SolidEffectLoop | false, s: TargetSource, parse_matches?: any): (Instance | CardLocation)[] {


        if (!sel) {
            // I'm not sure why we want the old pronoun logic, but some tests fail without it
            // we're searching on the NIL event which is worrisome.
            // even weirder is that some tests seem to use that logic but still don't fail if it's skipped
            //         return [];
            console.error("NO SEL!");
            console.trace()
        } else {
            // check solid_starter if another solid effect started us, and check
            // the targets of both of those in turn
            let _solid = sel.effect;

            // short-circuit, if we are in td2, td1 could be a match
            if (sel.chosen_targets && sel.chosen_targets.length > 0) {                
                let first = sel.chosen_targets[0];
                let test = Game.verify_last_thing(first, parse_matches, s);
                if (test) return test;
             }


            for (let solid of [_solid, _solid.solid_starter]) {
                if (!solid) continue;
                let n = solid.effects.length;
                // work backwards, looking for prior target
                // if looking for "THAT MONSTER" we shouldn't match on self
                while (n > 0) {
                    n--;
                    let atomic = solid.effects[n];
                    let eff = atomic.events[0];
                    let test = Game.verify_last_thing(eff.chosen_target, parse_matches, s);
                    if (test) return test;

                }

                // if this was a set pending effect, look back in the effect that started us
                // does this clause belong inside the loop or not?
                logger.info("no prior found in effect, should check trigger clause");
                // if we couldn't find it in effects, search for triggers
                // Right here we capture the problem that we might need to react to 2 different played monsters 

                let ti = solid.trigger_incidents;
                if (ti && ti.length > 0) {

                    // if the triggering incident was "attacking" we're going
                    // to cheat and assume the attacker was the pronoun. We
                    // probably determine this in posteffect / preflight and that's 
                    // where we should get our answer
                    let ret = (ti[0].game_event == GameEvent.ATTACK_DECLARE) ?
                        ti.map(e => e.spec_source) :
                        ti.map(e => e.chosen_target);
                    logger.info("returning " + ret.length + " pronouns");
                    if (ti[0].game_event === GameEvent.EVOLVE) {
                        ret = ti[0].chosen_target2 as (Instance | CardLocation)[];
                    }

                    logger.info(ret.map(x => x.get_name()).join(":::"));

                    //        if (parse_matches) {
                    //          ret = ret.filter((x: any) => verify_special_evo(x, parse_matches, s));
                    //    }
                    return ret;
                }
            }
            /*
            for (let eff of sel.reacted_to) {
                console.error(`checking REACT event  ${GameEvent[eff.game_event]}`);
                if (eff.chosen_target) {
                    logger.warn("returing prior thing");
                    logger.warn("prior thing is " + eff.chosen_target.get_name());
                    console.error("prior thing was " + eff.chosen_target.get_name());
                    return [eff.chosen_target];
                }    
                logger.warn("prior thing is " + eff.chosen_target.get_name());

            }*/


            logger.warn("no prior thing in effect");
        }

        return [];
        /*
        if (!this.last_thing || 5 > 4) {
            console.error("nothing found " + GameEvent[ge]);
            logger.error("no last thing!");
            return [];
        } else {

            logger.error("getting last thing! " + this.last_thing.length);
            logger.error(this.last_thing.map(x => x.get_name()).join(":"));
            return this.last_thing;
        }*/
    }

    // I've used the gameevent as a clue to where I'm searching and what I'm returning,
    // but I think I should just explicitly 
    find_target(t: TargetDesc, ge: GameEvent, s: TargetSource, sel: SolidEffectLoop | false,
        search_loc: Location = Location.UNKNOWN,
        prior_target?: TargetSource
        // search_loc isn't used as much as it should be.

        //, debug: boolean = true

    ): //(Instance[] | CardLocation[]) {
        (Instance | CardLocation)[] {
        //       this.log("Searching for targets for " + t.raw_text);
        let debug = false;
        let ret: (Instance | CardLocation)[] = [];

        logger.info(`FINDING FOR TARGET: ${t.toString()} Event ${GameEvent[ge]} TargetSource ${s.id()},${s.card_id()},${s.location()} `);
        let master_location: Location = Location.NIL;
        if (t.raw_text) {
            logger.info("raw_text is " + t.raw_text);
            // if we say "with evolutoin cards" we end up searching all cards when
            // we should search instances, and the util.js code isn't properly 
            // distinguishing them
            if (t.raw_text.includes("evolution card") // searching ev cards 
                && ! t.raw_text.includes("with ")  // but NOT "with X evolution card"
                && ! t.raw_text.includes("in its"))  // or "with X in its cards"
                master_location |= Location.UNDER_CARDS;
            if (t.raw_text.includes("from under"))
                master_location |= Location.UNDER_CARDS;
            if (t.raw_text.includes("link cards"))
                master_location |= Location.UNDER_CARDS;

            if (t.raw_text.includes(" trash")) master_location |= Location.TRASH;
            if (t.raw_text.includes(" hand")) master_location |= Location.HAND;
            if (t.raw_text.includes(" security")) master_location |= Location.SECURITY;
            if (t.raw_text.match(/among them/i)) master_location |= Location.REVEAL;
            if (t.raw_text.match(/among it/i)) master_location |= Location.SEARCH; // special case
            if (t.raw_text.match(/token/i)) master_location |= Location.TOKENDECK; // special case

            // if nothing was set, default to batle
            if (master_location === Location.NIL) master_location = Location.BATTLE;
            if (t.raw_text.includes("this card")) master_location = Location.NIL; // search cards for sure
            logger.debug(`raw_text Location is ${Location[master_location]} ${master_location}`);

            // TODO:
        }
        if (t.conjunction == Conjunction.LAST_THING) {

            if (sel) return Game.get_last_thing_from_sel(sel, s);
            // a b c
        }

        let p = s.get_player();
        let o_p = p?.other_player;
        if (t.conjunction == Conjunction.SELF) {
            let id = s.id();
        }

        // things that 'target' the player
        if ([
            GameEvent.DRAW,
            GameEvent.REVEAL,
            GameEvent.REVEAL_CLEAR,
            GameEvent.MEMORY_CHANGE,
            GameEvent.MEMORY_SET
        ].includes(ge)) return []; // [s.get_instance()];
        // we know by game event what kind of target it is

        // TARGET: CARDLOCATION

        function all_sources(game: Game) {
            let ret: CardLocation[] = [];
            for (let instance of game.instances) {
                if (!instance) continue;
                if (instance.location !== Location.BATTLE) continue;
                for (let index in instance.pile) {
                    // push in backwards, so top cards appear first in list
                    ret.unshift(new CardLocation(game, instance.n_me_player, Location.BATTLE, Number(index), instance.id));
                }
                for (let index in instance.plugged) {
                    ret.unshift(new CardLocation(game, instance.n_me_player, Location.BATTLE, Number(index), instance.id, "plug"));
                }
            }

            return ret;
        }

        let pm, froms: string = "";
        if (pm = (t as any).parse_matches!) {
            //  console.log(1632, pm.length);
            //console.log(1633, pm);
            //     console.dir(pm, {depth: 7});
            froms = pm.map((x: any) => x.from?.raw_text).filter((x: any) => x).join(", ");
            //    console.log(1635, pm.length, froms);
        }   // we aren't using froms yet, but we could use this to filter out just the things to search more efficiently


        let search_cards: boolean = [
            GameEvent.TRASH_FROM_HAND,
            GameEvent.PLAY,
            GameEvent.USE,
            GameEvent.TRASH_TO_HAND,
            GameEvent.REVEAL_TO_HAND,
            GameEvent.PLACE_IN_FIELD,
            GameEvent.EVOLVE,
            GameEvent.TARGETED_CARD_MOVE,
            GameEvent.STACK_ADD,
            GameEvent.EVOSOURCE_REMOVE,
            GameEvent.EVOSOURCE_MOVE,
            GameEvent.TRASH_LINK,
            GameEvent.PLUG, // can be both card and instance
        ].includes(ge)
            || !!t.raw_text.match("security");

            // eventually we'll not just search like this
        if (master_location !== Location.NIL && master_location === Location.BATTLE) search_cards = false;
        if (master_location !== Location.NIL && master_location === Location.UNDER_CARDS) search_cards = true; // needed because the all_sources is under this branch
        if (ge === GameEvent.STACK_ADD) search_cards = true;

        logger.debug(`pre-search Location is ${Location[master_location]} and ${search_cards}`);
        if (search_cards) {

            let to_search: CardLocation[] = [];
            if (t.raw_text.match(/token/i)) {
                to_search.push(...p.tokendeck.map((c, i) => new CardLocation(this, p.player_num, Location.TOKENDECK, i)));
            } else if (ge != GameEvent.REVEAL_TO_HAND) {
                // replace all location.XXXX to Y..get_location
                to_search.push(...p.hand.map((c, i) => new CardLocation(this, p.player_num, Location.HAND, i)));
                to_search.push(...p.trash.map((c, i) => new CardLocation(this, p.player_num, c.get_location(), i)));
                to_search.push(...o_p.trash.map((c, i) => new CardLocation(this, o_p.player_num, Location.TRASH, i)));
                to_search.push(...p.nullzone.map((c, i) => new CardLocation(this, p.player_num, Location.NULLZONE, i)));
                // why do we need to search optzone? what could possibly be there we want to reference?
                to_search.push(...p.optzone.map((c, i) => new CardLocation(this, p.player_num, Location.OPTZONE, i)));
                if (search_loc & Location.SECURITY || ge == GameEvent.EVOLVE) {
                    to_search.push(...p.security.map((c, i) => new CardLocation(this, p.player_num, Location.SECURITY, i)));
                }
                if (search_loc & Location.EGGZONE && p.egg_zone) {
                    console.error("can't search for cardloc for eggzone yet");
                    //to_search.push(new CardLocation(this, p.player_num, Location.EGGZONE, 0));
                }
            }
            to_search.push(...p.reveal.map((c, i) => new CardLocation(this, p.player_num, Location.REVEAL, i)));

            // do we need to target cards under other cards?
            if (ge == GameEvent.EVOSOURCE_REMOVE ||
                ge == GameEvent.EVOSOURCE_DOUBLE_REMOVE ||
                ge == GameEvent.EVOSOURCE_MOVE ||
                t.raw_text.includes("evolution cards") ||
                t.raw_text.includes("from under") ||
                ge == GameEvent.TRASH_LINK) {
                //to_search.length = 0;
                logger.info("Adding all sources " + t.raw_text);
                to_search.push(...all_sources(this));
            }
            if (ge == GameEvent.PLUG) {
                for (let instance of this.instances) {
                    if (!instance) continue;
                    if (instance.location !== Location.BATTLE) continue;
                    for (let index in instance.plugged) {
                        // push in backwards, so top cards appear first in list
                        to_search.unshift(new CardLocation(this, instance.n_me_player, Location.BATTLE, Number(index), instance.id, "plug"));
                    }
                }
            }

            // if we're searching an area, just use that.
            // what if something interrupts this search?
            if (p.search) {
                to_search.length = 0;
                to_search.push(...p.security.map((c, i) => new CardLocation(this, p.player_num, c.get_location(), i)));
            }

            logger.info("searching card count " + to_search.length);
            for (let s of to_search) {
                logger.info(`s ${to_search.length} is ${s.id} ${s.get_name()}`);
            }
            logger.info(`t is ${t.raw_text} or ${t.toString()} or ${t.toPlainText()}`);
            // we don't have a "biggest level" or anything for CardLocations
            ret.push(...to_search.filter(x => t.matches(x, s, this, undefined, sel)));
            ret = t.sort(ret);
            logger.info(`ret length is ${ret.length}`);
            // play-self-from-trash, or for anything else that requires targeting a specific card in trash
            if (t.conjunction == Conjunction.SELF) {
                // for returning a card location for "SELF" only return the one that is us.
                // This function is passing back the correct card location, but a UI element
                // that relies on a label like TRASH-CS1-06 can't distinguish. 
                //  ret = ret.filter( x=> x.card == s.get_instance().top());
            }
            // just return as many as we need

            if (ge != GameEvent.STACK_ADD) return ret;
            // for now, just list all the cards in hand
            /*
                        let a: CardLocation[] = [];
                        for (let i = 0; i < s.get_player().hand.length; i++) {
                            a.push(new CardLocation(this, Location.HAND, i));
                        }
                        return a;*/
        }

        // TARGET: INSTANCES
        // I could short circuit "must attack" targets by filtering here.
        logger.info(`prior_target in bb is ${!!prior_target}`);

        // call with default of UNKNOWN: just battle
        // call with FIELD: both battle and eggzone
        // call with EGGZONE: just eggzone
        let locus = Location.BATTLE;
        // if this is an [on deletion] we can reference ourselves in the trash
        let i = s.get_instance(); 
        if (search_loc & Location.EGGZONE) { //  || search_loc === Location.FIELD) {
            logger.info("switching locus from " + locus + " to " + search_loc);
            locus = search_loc;
        }
        // if we are searching for "this (green) monster" add trash.
        if (t.raw_text.match(/^this.{1,10}monster/i)) locus |= Location.ALLTRASH;
        logger.info(`searching location ${locus} and ${Location[locus]}`);  
        let bb = this.instances.filter(x => (x.location & locus) && t.matches(x, s, this, prior_target, sel));

        let ss = t.sort(bb); // for when we need "biggest level" or something

        if (ge == GameEvent.ATTACK_TARGET_SWITCH) {
            if (t.raw_text.includes("player"))
                ss.push(new Instance(this, this.Player1, this.Player2, true));
            // dummy instance
        }

        logger.info  (`found ${bb.length} targets, and then sorted them down to ${ss.length}`);
        if (debug) logger.debug("fone");
        ret.push(...ss);
        return ret;
    }

    n(x: any): number {
        return x;
    }

    // got rid of obsolete find_all 27-june

    // todo: get rid of old style events
    check_for_phase_events(phase: Phase): SolidEffect[] {
        let s_ret: SolidEffect[] = [];
        logger.debug("looking for  phase events");
        for (let i of this.instances) {
            if (!i) {
                logger.debug("instance doesn't exist? player? ");
                continue;
            }
            if (!i.in_play()) continue; // oh no you don't
            let a;
            //            this.log(`apple checking instance ${i.name()}`);

            //            logger.debug("looking for  phase events on " + i.get_name());
            a = i.get_triggered_events(phase, this);
            if (a.length > 0) {
                //              logger.debug("a length is " + a.length);
                for (let eacha of a) {
                    s_ret.push(eacha);
                }
                logger.debug(`lengths now ${s_ret.length}`);;
            }
        }
        for (let player of [this.Player1, this.Player2]) {
            let x = player.get_pending_effect(phase, this.n_turn, false);
            s_ret.push(...x);
        }
        let l = `PhaseEvent: At ${Phase[phase]} we have `;
        l += s_ret.length + " entries: " + s_ret.map(x => x.label).join(",");
        logger.info(l);
        return s_ret;
    }


    // "card_effects" are those associated with a CardLocation, not an Instance.
    // being plugged is a CardLocation effect even though it doesn't look like one.

    all_card_effects(kind: "posteffect" | "preflight", e: SubEffect[]): SolidEffect[] {
        let ret = [];
        for (let p of [this.Player1, this.Player2]) {
            let p_number = p.player_num;
            // search plugged cards
            for (let instance of p.field) {
                if (!instance) continue;
                if (!instance.on_field()) continue;
                // todo: make iterator for this
                for (let i = 0; i < instance.plugged.length; i++) {
                    let card = instance.plugged[i];
                    for (let se of card.new_link_effects) {
                        // this being a link effect makes things so difficult.
                        if (se.keywords.includes("[When Linking]")) {
                            let cl = new CardLocation(this, p_number, Location.BATTLE, i, instance.id, "plug");
                            // if we chose to plug a instance, we need to compare the card it is to see we're the same
                            // maybe plug and source_add should've worked on only Cards? well, source_add does care about instance effects
                        
                            if (Instance.one_effect_matchup(kind, se, e, new SpecialCard(cl), p_number, this, cl)) {
                                logger.info("plug effects matches " + se.label);
                                ret.push(se);
                            }
                        }
                    }
                }
            }
            for (let index = 0; index < p.trash.length; index++) {
                let card = p.trash[index];
                for (let se of card.new_effects) {
                    if (se.active_zone! & Location.TRASH) {
                        //                        ret.push(se);
                        let cl = new CardLocation(this, p_number, Location.TRASH, index);
                        if (Instance.one_effect_matchup(kind, se, e, new SpecialCard(cl), p_number, this, cl)) {
                            ret.push(se);

                        }
                    }
                }
            }
        }
        return ret;

    }


    posteffect_actions(e: SubEffect[]): SolidEffect[] {
        this.reset_event(); // interruptives can go again
        let ret: SolidEffect[] = [];

        logger.debug("2234 looking for reactors to " + e.length + "  events: " + e.map(x => GameEvent[x.game_event]).join(","));;
        for (let i of this.instances) {
            if (!i) continue;          
            // only let instances in BATTLE or TRASH react. We'll need to add EGG_ZONE
            if ((i.location & (Location.BATTLE | Location.ALLTRASH)) === 0) continue;
            let trigger;
            logger.debug("searching post trigger of " + i.id + " " + i.name() + " " + (i.has_retaliation() ? "RAT" : "(no)"));
            trigger = i.check_posteffect(e);
            logger.debug("got " + trigger.length + " respondudes");
            while (trigger.length > 0) { ret.push(trigger.pop()!) }
        }
        // this says "preflight... but it's the same logic, right?


        ret.push(... this.all_card_effects("posteffect", e));
        return ret;

    }

    preflight_actions(e: SubEffect[]): SolidEffect[] {
        // for now we just query every single instance
        // later we will need to query other things
        let ret: SolidEffect[] = [];

        logger.info("preflight actions " + e.length + " events: " + e.map(x => GameEvent[x.game_event]).join(","));;
        // remove effects that are in an egg zone... I'm not sure this is right,
        // I ended up needing to do it inside Instance::check_preflight() so maybe
        // I can completely delete this.
        for (let i = e.length - 1; i >= 0; i--) {
            let s: SubEffect = e[i];
            if (s.chosen_target && s.chosen_target.location == Location.EGGZONE) {
                e.splice(i, 0);
            } else {
                logger.info("game event " + GameEvent[s.game_event] + " chosen target " + s.chosen_target?.get_name());
                // "when you would play this" instance doesn't exist yet!
                if (s.game_event == GameEvent.PLAY || s.game_event == GameEvent.USE || s.game_event == GameEvent.EVOLVE) {
                    // get card from card/cardlocation
                    let c: Card = ("card" in s.chosen_target) ? s.chosen_target.card : s.chosen_target;
                    let l = c.get_location();
                    let id = c.id;
                    // cardlocation for things in source is still working out bugs
                    let cl = ("card" in s.chosen_target) ? s.chosen_target : new CardLocation(this, s.n_player!, l, id);
                    logger.error("maybe not grabbing right card location?");
                    let pi = c.play_interrupt;
                    if (pi) {
                        let match = Instance.one_effect_matchup("preflight", pi, e, new SpecialCard(cl), cl.n_me_player, this, cl);
                        logger.info("INTERRUPTING PLAY/USE " + GameEvent[s.game_event] + " MATCH IS " + match);;
                        if (match) {
                            // do we need to mark_outbound_solid_effedts()
                            pi.source = new SpecialCard(cl);
                            // I don't understand how trigger_incidents already
                            // had something in here.
                            pi.trigger_incidents = [s];
                            ret.push(pi);
                        }
                    }
                }
            }

        }
        // these are things that have *triggered*. Is this always a solid effect?
        for (let i of this.instances) {
            if (!i) continue;
            // things in eggzone cannot interrupt stuff (YET)
            //if (i.in_eggzone()) continue;
            // *instances* in trash can't interrupt, can they? but cards could
            if (i.in_trash()) continue;
            // definitely nothing in hand
            if (i.in_hand()) continue;
            let trigger;
            trigger = i.check_preflight(e);
            while (trigger.length > 0) { ret.push(trigger.pop()!) }
        }

        for (let player of [this.Player1, this.Player2]) {
            let x = player.get_pending_effect(Phase.NUL, this.n_turn, e);
            ret.push(...x);
        }


        ret.push(... this.all_card_effects("preflight", e));

        return ret;
    }

    pass_turn(): void {
        // todo: verify phase
        this.memory = -3;
        this.log("Turn passed");
        //        this.next();
    }

    get_other_turn_player(): Player {
        return this.player(3 - this.turn_player);
    }

    get_turn_player(): Player {
        return this.player(this.turn_player);
    }

    // tell the UI that a card has moved
    ui_card_move() {
        if (!this.Player1 || !this.Player2) return;

        this.copied_get_master_JSON();
    }

    // copied from bin/www, it sends out the game update to everyone each time we make an announcement
    copied_get_master_JSON(): void {
        let game = this;
        let x = game.master_JSON_game();
        let last_id = game.next_command_id();
        x.status.last_id = last_id;
        let p1_blob = JSON.parse(JSON.stringify(x));
        let p2_blob = JSON.parse(JSON.stringify(x))
        // remove private data. 
        p1_blob.p2.moves = null;
        delete p1_blob.p2.hand.cards;
        p1_blob.p1.moves[0].last_id = last_id;
        p2_blob.p1.moves = null;
        delete p2_blob.p1.hand.cards;
        p2_blob.p2.moves[0].last_id = last_id;

        game.broadcast_sockets(p1_blob, p2_blob);
    }


    announce(msg: string, player: number = 0) {
        let obj = { messages: [msg], fancy: {} };
        logger.debug(msg);
        let fancy = this.fancy.emit(0);
        obj.fancy = fancy;
        if (process.env.FANCY)
            console.error(this.fancy.emit(0));

        // this is a brute-force method of updating the entire game state 
        //  this.copied_get_master_JSON(); 

        this.broadcast_sockets({}, {}, obj, player);
        //       this.message_queue.push(`${this.msg_counter++} ${msg}`);
        //        this.message_queue.push(msg);
    }


    register_socket(socket: any, pid: number) {

        let obj = { socket: socket, pid: pid };
        this.socket_list.push(obj);
    }

    broadcast_sockets(p1: object, p2: object, incoming?: any, player?: number) {
        for (let i = this.socket_list.length - 1; i >= 0; i--) {
            let s = this.socket_list[i];
            if (!s) {
                this.socket_list.splice(i, 1);
            }
        }

        let msg = incoming;

        //  logger.debug("talking to " + this.socket_list.length + " sockets");

        let d = false; // debug
        let disconnected = [];
        for (let obj of this.socket_list) {
            if (!obj) { logger.error("no obj!"); continue; }
            //            console.dir(obj, { depth: 0 });
            let s = obj.socket;
            if (!s) { logger.error("no socket!"); continue; }
            if (!s.connected) { disconnected.push(s.id); continue; }
            if (!obj.pid) { logger.error("no pid!" + s.id); continue; }
            //            logger.debug(obj);

            // if meant for only one person, make sure
            if (player && obj.pid != player) { continue; }

            let player_obj = (obj.pid == 1) ? p1 : p2;

            let m = (msg) ? msg : player_obj;
            //                this.socket_list.
            if (d) logger.debug(`emiting to ${s.id}, P${obj.pid}`);
            s.emit('server-response', JSON.stringify(m));
            if (d) logger.debug(m);
        }
        if (disconnected.length > 0) {
            logger.debug("disconnected sockets: " + disconnected.join(","));
        }
    }

    current_command_id() { return this.command_id; }
    next_command_id() {
        let x = ++this.command_id;
        logger.debug("      >>>>>>>>>> SETTING COMMAND ID TO x " + x);
        return x;
    }

    // game commands come in through two portals, this one
    // and 
    execute_string(msg: string, n_player: number, last_id: number) {
        logger.info(`executing2 ${msg} last_id ${last_id} command_id ${this.command_id}`);
        if (last_id != this.command_id) {
            this.la(`UI out of sync 2: ${this.command_id} expected, got ${last_id} `);
            // do nothing, I hope we can recover
            return;
        }

        // This declaration conflicts!
        let c: GameCommand = {
            id: this.command_id,
            n_player: n_player,
            command: msg,
            //   options: this.get_n_player(n_player).get_plays({})
        };
        this.command_history.push(c);
        let error = this.get_n_player(n_player).execute_string(msg);
        if (error) logger.warn("error: " + error);
    }

    // this should be called receive... ?
    send(msg: string, n_player: number, last_id: number): void {
        logger.info(`executing1 ${msg} last_id ${last_id} command_id ${this.command_id}`);
        if (last_id != this.command_id) {
            this.la(`UI out of sync 1: ${this.command_id} expected, got ${last_id} `);
            return;
        }
        let c: GameCommand = {
            id: ++this.command_id,
            n_player: n_player,
            command: msg,
            //options: this.get_n_player(n_player).get_plays({})
        };
        this.command_history.push(c);


        logger.debug(`COMMAND ${this.counter++}: ${JSON.stringify(this.wait_choices)}  ${msg}  `);
        logger.debug("length is " + this.wait_choices.length);
        if (this.wait_choices.length > 0) {
            logger.debug("trying ansewR");
            let answer = msg;
            // is 0 ever an answer? This will fail
            let check = this.wait_choices.find(x => x.command == answer);

            if (!check) {
                this.announce("Waiting for answer ...");
                return;
            }
            logger.debug("alternate answer?");
            // is this how players actually answer?
            this.announce("Got (ver1) answer of " + answer);

            this.wait_answer = [answer];
            this.wait_choices.length = 0;
            this.wait_question = "";
            // fall through to step() below;
        }

        // do something with message
        this.step();
    }

    // returns false if we're busy
    // returns true if we can proceed
    run_phase_effects(additional_solids: SolidEffect[] = []): boolean {
        let temp = this.check_for_phase_events(this.phase);
        let _x: SolidEffect[] = [];
        for (let t of temp) {
            if (true || "phase_trigger" in t) { // got a solid effect
                _x.push(t);
            }
        }
        // additional_solids because we might have rules_processing events
        let both = _x.concat(additional_solids);
        if (both.length) {
            logger.debug(`Processes ${both.length} events for Phase ${Phase[this.phase]}`);
            this.do_effects(both);
            // give up control
            return false;
        }
        return true;
    }

    do_effects(s: SolidEffect[]) {
        if (this.root_loop) {
            logger.warn("we still have root loop");
        }
        // WE SHOULD BE USING THE DIRECTED LOOP HERE!!!
        if (s.length > 0) {
            logger.error("should be using directed loop");
            let x = new ResolutionLoop(this, s, 1, []);
            // is this really 0?
            this.root_loop.add_res_loop(x);
            // how do we know where to pick this back up??
            this.gamestep = GameStep.IN_LOOP;
        }

    }


    // debug 
    step_state() {
        /*
        let loop: (CombatLoop | ResolutionLoop);
        if (this.gamestep == GameStep.COMBAT_LOOP) {
            loop = this.combat_loop!;
        } else if (this.gamestep == GameStep.EFFECT_LOOP) {
            loop = this.resolution_loop!;
        } else {
            return "no resolution loop";
        }*/

        logger.debug("in step state");
        if (this.gamestep != GameStep.IN_LOOP) {
            return "not in loop"; // return `No loop, ${this.gamestep} instead`;
        }
        let loop = this.root_loop;
        if (!loop) return `In loop but it's undefined`;
        let ret = loop.dump();
        if (this.wait_choices.length > 0) {
            ret += `Waiting for answer from ${this.wait_player} among ${this.wait_choices.length} opts`;
            ret += JSON.stringify(this.wait_choices);
            //this.announce("Waiting for answer in range: " + this.wait_range.join(","));
        }
        return ret;
    }

    sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    mode: string;

    step(mode: string = this.mode): boolean {

        // the outer do-loop is here to try to spin through in cases of automatic control
        let outer = 0;
        do {
            outer += 1;
            logger.debug("SPIN: normal " + outer);
            if (mode == "step") {
                return this._internal_step();
            }
            if (mode == "auto") {
                let intervalId = setInterval(() => {
                    const result = this._internal_step();
                    if (this.waiting_answer() || result === true || this.waiting_answer()) {
                        clearInterval(intervalId);
                    }
                }, 100);

                return true;
            }
            let i = 0;
            // let control: number[] = [1,2];
            let cmd = "";
            let strat = ["NUL", "random", "random"]

            logger.debug("BOTS IS " + this.bots.join(" ") + " " + this.bots.length);
            do {
                if (this.waiting_answer()) {
                    logger.debug("waiting answer");

                    const date = new Date();
                    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
                    const date_string = new Date(date.getTime() - offsetMs).toISOString().replace(/T/, '_').substring(0, 16);
                    fs.writeSync(this.control_log, `DATE: ${date_string}`);
                    fs.writeSync(this.control_log, `WAITING ANSWER FROM ${this.wait_control}\n`);
                    fs.writeSync(this.control_log, `QUESTION: ${this.get_question()}\n`);
                    fs.writeSync(this.control_log, `ANSWERS:\n`);
                    for (let play of this.wait_choices) {
                        fs.writeSync(this.control_log, `\t${play.command.padEnd(20, " ")} ${play.text}\n`);
                    }

                    if (this.bots.includes(this.wait_control)) { // == control) { 
                        logger.debug("attempting auto answer");
                        let arr = this.wait_choices;
                        const randomElements: Set<UserQuestion> = new Set();
                        while (randomElements.size < this.wait_count && randomElements.size < arr.length) {
                            let r = (strat[this.wait_control] == "pigeon" ? arr.length - 1 - randomElements.size : Math.floor(this.rng() * arr.length))
                            logger.info(`wait_mod ${this.wait_mod} arr.length ${arr.length} waitcontrol ${this.wait_control} strat ${strat[this.wait_control]} size ${randomElements.size} count ${this.wait_count} r ${r}`);
                            randomElements.add(arr[r]);

                            if (this.wait_mod == "upto total") break; // just pick 1   
                        }

                        //           if (this.wait_count > 1) break;                    
                        //                        let len: number = this.wait_choices!.length;
                        //                      let index = Math.floor(Math.random() * len);
                        //                    let command: string = this.wait_choices[index].command;
                        let car = [...randomElements];
                        let commands = car.map(x => x.command);
                        logger.debug("doing answer " + commands.join("/"));
                        fs.writeSync(this.control_log, "DOING ANSWER" + commands.join("/") + "\n");
                        this.set_answer(this.wait_control, commands);
                    } else {
                        break;
                    }
                }
                if (this._internal_step()) {
                    logger.debug("internal step is done, control is " + this.control);
                    let p = this.get_n_player(this.control);
                    let plays = JSON.parse(p.get_x_plays({ verbose: true, sort: false }));
                    for (let play of plays) {
                        fs.writeSync(this.control_log, `\t${play.command.padEnd(20, " ")} ${play.text}\n`);
                    }
                    if (this.bots.includes(this.control)) { //== control) {
                        let len: number = plays.length;
                        let index = (strat[this.control] == "pigeon"
                            ? len - 1
                            : Math.floor(this.rng() * (len - 1.8)) + 1);
                        cmd = plays[index].command;
                        logger.info("doing command? " + cmd);
                        logger.info("executing3 " + cmd);
                        fs.writeSync(this.control_log, "DOING COMMAND? " + cmd + "\n")
                        break;
                    } else {
                        break;
                    }
                }
                logger.debug("spin " + i);
            } while (true);


            //        while (!this.waiting_answer() && !this._internal_step() && !this.waiting_answer()) {
            //          logger.debug("spin");
            //    }

            logger.debug("CONTROL BELONGS TO PLAYER " + this.control + " ON TURN " + this.turn_player + " WAITING IS " + this.wait_control);
            if (cmd != "") {
                // now we want to do something
                // If we're only doing this for one 
                // person, we can call Player.execute().
                logger.debug("command is " + cmd);
                let p = this.get_n_player(this.control);
                let r = p.execute_string(cmd);
                // I think this is non-interactive
                if (r) logger.error("had non-interactive error: " + r);
                logger.debug("command was " + cmd);

                continue; // don't return yet
            }
            break;
        } while (true);
        return true;
    }

    // will return true once everything is done and we're
    // back in main... or waiting for player response?
    _internal_step(): boolean {
        logger.debug("doing step x");
        /*
     
        let loop: (CombatLoop | ResolutionLoop);
        if (this.gamestep == GameStep.COMBAT_LOOP) {
            loop = this.combat_loop!;
        } else if (this.gamestep == GameStep.EFFECT_LOOP) {
            loop = this.resolution_loop!;
        } else {
            this.announce("No loop");
            return true;
        }*/
        if (this.gamestep != GameStep.IN_LOOP) {
            logger.debug("____");
            //            logger.debug(1);
            if (!this.root_loop.step()) {
                logger.debug("root loop wasn't done");
                logger.debug(this.root_loop.dump(true));
                let c: any = null; c.loopissue();
            }
            logger.debug("processing game flow");
            return this.process_game_flow();
        }

        if (this.wait_choices.length > 0) {
            this.announce("Waiting for answer in range:");

            return true;
        }
        if (!this.root_loop) {
            //        logger.debug(3);
            return true;
        }
        //  logger.debug(4);


        let ret = this.root_loop?.step();
        //logger.debug(ret);
        if (ret) {
            logger.debug("WHAT HAPPEN: RET LENGTH IS " + ret.length);
            // oh whew, we can pass in the subeffects that happened here
            if (ret.length > 0) this.lingering_happenings = ret;
            return this.process_game_flow();
        }
        return ret;
    }


    xstep(): void {
        if (this.phase == Phase.START_OF_GAME) {
            this.phase = Phase.AFTER_START_OF_TURN;
            this.announce("Enter Start of Turn");
            let triggered_events: any[] = []; // this.get_triggers(Phase.START_OF_TURN);
            if (triggered_events.length > 0) {
                this.announce(`Effects triggered: ${triggered_events.length}`);
                // TODO: label each effects and print it.
            } else {
                this.announce("No events found.", 1);
            }

        }/*

        if (this.gamestep == GameStep.LIST_OF_EFFECTS) {
            this.announce("Looking at triggers:");
            this.announce("Effects in queue: " + this.resolution_loop.length);
            this.announce("Effects: " + this.resolution_loop.effects.map((x, i) => `[${i + 1}: ${x.label}] `);;
            this.gamestep++;
            return;
        }
        if (this.gamestep == GameStep.DETERMING_NEXT_TRIGGER) {
            let l = this.resolution_loop.effects.length;
            if (l == 0) {
                this.announce("No more effects, done with this loop");
                // go up to top .... HOW?
            } else if (l == 1) {
                this.announce("Choosing one remaining effect:
            }


        }*/

    }



    // after everything is "done", see if it's time to move phases and stuff

    // do I even need this function? like at all?
    to_main(): boolean {
        if (this.phase != Phase.HATCHING) {
            logger.error("NOT HATCHING");
            return false;
        }
        logger.debug("going into before main");
        this.phase = Phase.BEFORE_MAIN;
        logger.debug("going after before main");
        this.la("PHASE: MAIN");

        return this.process_game_flow();
    }

    // what is the return boolean? 

    // We have effects to do in start of main.
    // W will go through, and if we find them, we leave the game
    // in the state IN_LOOP and the phase will be START_OF_MAIN.
    // The next time we step out of a loop, we know we've done all the 
    // START_OF_MAIN effects, and can continue.
    process_game_flow(): boolean {
        logger.debug("GAME_FLOW1: Phase is " + Phase[this.phase] +
            " Step is " + GameStep[this.gamestep]);
        if (this.gamestep == GameStep.IN_LOOP) {
            //            this.announce("need to step");
            //           logger.error("need to step");
            return false;
        }
        if (this.phase == Phase.GAME_OVER) {
            this.log("Game is still over, player " + this.winner + " still won");
            this.control = 0;
            return true;
        }

        this.refresh_constant_effects();

        if (this.phase == Phase.BEFORE_START_OF_TURN) {
            this.phase = Phase.START_OF_TURN_PHASE_FX;
            logger.debug("PHASE: START OF TURN");

            // I've got this problem where each time I need to interrupt I need
            // to add a brand new return-and-loop step.
            // Is there a way to implement this better?

            // is here the place to run rules_process()? Doesn't feel right.


            // I need this at the start of every phase. Maybe put it *into* run_phase_effects
            let rules_effects: SubEffect[] | false = this.rules_process();
            if (rules_effects) {
                // run the rules with interrupters, collect the respponders, but *don't* run the responders

                // I'm only 
                let int_loop = new InterrupterLoop(this, rules_effects, 1, false);
                // copied stuff into here from run_phase_effects and do_effects
                this.root_loop.add_res_loop(int_loop);
                this.gamestep = GameStep.IN_LOOP;
                return false;
            } else {
                // I'M IN THIS PHASE ANYWAY!?????!
                this.phase = Phase.START_OF_TURN_PHASE_FX;
                // fall through\
            }

        }
        if (this.phase == Phase.START_OF_TURN_PHASE_FX) {
            //    logger.debug("WHAT HAPPEN");
            // we don't get called back in here until the loop is done.
            if (false) {
                let r = this.root_loop.step();
                if (!r) return false;
            }
            // Either we had an empty root_loop, and got empty SubEffects[],
            // or we did stuff, and got a list of stuff that happened.

            let rules_solids: SolidEffect[] = [];
            //     logger.debug(`WHAT HAPPENED IS ${this.lingering_happenings.length} ..`);
            if (this.lingering_happenings.length > 0) {
                // get_responder_loop gives us a loop pre-filled with the list
                // of things that responded. We *almost* want that, but [start of turn]
                // effets trigger at the same time. 

                // So I'm just going to get the list of SolidEffects that
                // happen, nad pass them into run_phase_effects, which
                // will staple them onto the effects it has.
                rules_solids = this.posteffect_actions(this.lingering_happenings);
                this.lingering_happenings.length = 0;
            }
            // We have the subeffects that happened. 
            //    logger.debug("WHAT HAPPEN, RULES EFFECT IS " + rules_solids.length);

            let resume = this.run_phase_effects(rules_solids);
            logger.debug("RESUME IS " + resume);
            // same step in either branch, does that make sense?
            if (!resume) {
                // we're still chugging
                this.phase = Phase.AFTER_START_OF_TURN;
                return false;
                // we don't get called back in here until the loop is done
            } else {
                this.phase = Phase.AFTER_START_OF_TURN;
                this.control = this.turn_player;
                this.check_control();
                // fall through
            }
            this.debug("Advancing to unsuspend phase");
            // fall through    
        }
        /*
        if (this.phase == Phase.START_OF_TURN) {
            // we can fall through now
            this.phase = Phase.AFTER_START_OF_TURN;
     
        }
        */
        if (this.phase == Phase.AFTER_START_OF_TURN) {
            this.phase = Phase.UNSUSPEND;
            this.la("PHASE: UNSUSPEND");

            // technicaly we might want to return false here
            let unsuspend_to_do = this.do_unsuspend_phase(); // this logs the stage, does it log effects?
            if (!unsuspend_to_do) return false;
        }
        if (this.phase == Phase.UNSUSPEND) {
            this.la("PHASE: DRAW");
            this.phase = Phase.DRAW;
            if (this.n_turn == 1) {
                this.log("Skipping draw, turn 1");
                this.get_turn_player().log("Skipping draw, turn 1");
            } else {
                let success = this.get_turn_player().draw();
                if (!success) {
                    this.la("Player has decked out, Game Over");
                    this.winner = 3 - this.turn_player;
                    this.phase = Phase.GAME_OVER;
                    this.la(`Player ${this.winner} wins`);
                    return true;
                }
            }
            // fall through, unless something triggers here
        }
        if (this.phase == Phase.DRAW) {
            this.la("PHASE: HATCHING");

            this.phase = Phase.HATCHING;
            this.log("Hatching phase");
            this.control = this.turn_player;
            this.check_control();
            return true;
        }
        if (this.phase == Phase.HATCHING) {
            return true;
        }
        if (this.phase == Phase.BEFORE_MAIN) {
            //            logger.debug(" 123 processing " + Phase[Phase.BEFORE_MAIN]);

            this.phase = Phase.START_OF_MAIN;
            let resume = this.run_phase_effects();
            if (resume) {
                this.phase = Phase.MAIN;
                this.control = this.turn_player;
                //                logger.error("entering main");
                //               console.trace();
                this.log("Entering MAIN for player " + this.turn_player);
                this.check_control();
                return true;
            } else {
                return false;
            }

        }
        if (this.phase == Phase.START_OF_MAIN) {
            // roll right on through. 
            this.phase = Phase.MAIN;
        }
        if (this.phase == Phase.MAIN) {
            // this was triggering like 23 times:
            // this.log(`Open action complete, player ${this.turn_player} with memory ${this.memory}`);
            let threshold = this.get_turn_player().get_turn_change_memory();
            if (this.memory >= threshold) {
                logger.debug("back to main!");
                this.control = this.turn_player;
                this.check_control();
                return true;
            }
            this.log(`Memory less than ${threshold}, main ends.`);
            this.phase = Phase.END_OF_MAIN;
        }
        if (this.phase == Phase.END_OF_MAIN) {
            this.phase = Phase.END_OF_TURN;
            let resume = this.run_phase_effects();
            if (!resume) return false;
        }
        if (this.phase == Phase.END_OF_TURN) {
            // double-check memory... we go back to MAIN, which 
            // isn't correct, we should go back to wherever we were
            let threshold = this.get_turn_player().get_turn_change_memory();

            if (this.memory >= threshold) {
                logger.info("back to main!");
                this.control = this.turn_player;
                this.log(`Memory at least ${threshold}, turn continues.`)
                this.phase = Phase.MAIN;
                this.check_control();
                return true;
            }
            this.phase = Phase.AFTER_END_OF_TURN;
            this.next_turn(); // increments phase for us
            // we can recurse, this will never get deep
            return this.process_game_flow();
        }
        console.error("UNHANDHED GAME STEP: ", Phase[this.phase]);
        return false;
    }


    public dangerous_to_call_JSON_allcards() {
        return this.master.raw_data;
    }

    public JSON_card_data(ids: string[]) {
        let ret: any = {}
        for (let id of ids) {
            ret[id] = this.master.get_card_data(id);
        }
        return ret;
    }

    //    public JSON_

    public master_JSON_game() {
        return this.x_JSON_game(3);
    }

    debug_effect_tree = process.env.DEBUG_EFFECT;

    public JSON_effect_tree() {
        let x: string[] = this.root_loop.get_effect_tree();
        if (this.debug_effect_tree) console.error(x);
        if (!x || x[0] == "NOTHING") return {};
        // RES DEPTH 1 Ice Shield, Great Sword
        let out: any = {}
        for (let layer of x) {
            layer = layer.after("DEPTH").trim();
            if (!layer || layer.length < 2) continue;
            let i = parseInt(layer);
            layer = layer.substring(2).trim();
            out[i] = { layer };
        }
        if (this.debug_effect_tree) console.error(out);
        return out;
    }

    // return for player1, player2, or both players (player3)
    public x_JSON_game(n_player: number, verbose: boolean = false) {

        let step = GameStep[this.gamestep];
        let raw = step;
        if (this.gamestep == GameStep.IN_LOOP) {
            step += this.root_loop?.dump();
        }

        let status = {
            last_id: this.command_id,
            turn_player: this.turn_player,
            n_turn: this.n_turn,
            phase: Phase[this.phase],
            memory: this.memory,
            control: this.control,
            gamestep: raw,
            step_text: step,
            ver: uuidv4(),
            effect_tree: this.JSON_effect_tree()

        };
        // I *could* track instances here in game state
        let p1 = this.Player1.JSON_player(true);
        let p2 = this.Player2.JSON_player(true);
        let temp_zones: any = [];

        // this significantly bloats the size of the blob
        if (true || process.env.CARD_DATA == "true") {
            let public_card_ids: string[] = [];
            public_card_ids.push(... this.Player1.public_cards_ids());
            public_card_ids.push(... this.Player2.public_cards_ids());
            let p1_private_ids = this.Player1.private_cards_ids();
            let p2_private_ids = this.Player1.private_cards_ids();
            let p1_cards = [...new Set(public_card_ids.concat(p1_private_ids))];
            let p2_cards = [...new Set(public_card_ids.concat(p2_private_ids))];
            let p1_card_data = this.JSON_card_data(p1_cards);
            let p2_card_data = this.JSON_card_data(p2_cards);
            if (n_player !== 2) p1.card_data = p1_card_data;
            if (n_player !== 1) p2.card_data = p2_card_data;
        }

        // nothing ever used this; it's potentially valuable for deep queries, but
        // maybe we make the UI query individually. Don't forget, each player's
        // blob will have their current instances already
        // let instances = this.instances.map(x => x.JSON_instance()).filter(x => x);

        let game = {
            status: status,
            //instances: instances,
            p1: p1,
            p2: p2,
            temp_zones: temp_zones
        };
        return game;
    }

    get_card(a: string) {
        return this.master.get_card(a);
    }

    get_instances() {
        let ret = [];
        for (let i in this.instances) {
            if (!this.instances[i]) {
                ret.push(`${i} not found`);
                continue;
            }
            ret.push(`${i} status ${JSON.stringify(this.instances[i].JSON_instance())}`);
        }
        return ret.join("\r\n");
    }

    game_status(): string {
        let ret = `<div align=center>` +
            `<span class=turn>Player  ${this.turn_player == 1 ? "ONE" : "TWO"}'s Turn, <b>${Phase[this.phase]}</b> phase.</span> ` +
            `<span class=memory>MEMORY ${this.memory} </span>` +
            `Turn ${this.n_turn}.  ` +
            ` <span class=turn>Waiting for `;
        switch (this.control) {
            case 0: ret += "unknown"; break
            case 1: ret += "player 1"; break;
            case 2: ret += "player 2"; break;
        }
        ret += " to move</span>  step " + GameStep[this.gamestep] + "  x </div>";
        return ret;
    }

    dump_all(player: number): string {
        let ret = this.game_status();
        ret += "<hr>";
        if (player == 1) {
            ret += "***PLAYER TWO***  " + this.Player2.dump_all(false);;
            ret += "<hr>";
            ret += "<hr>";
            ret += "***PLAYER ONE***  " + this.Player1.dump_all(true);
        } else {
            ret += "***PLAYER ONE***  " + this.Player1.dump_all(false);;
            ret += "<hr>";
            ret += "<hr>";
            ret += "***PLAYER TWO***  " + this.Player2.dump_all(true);

        }
        logger.debug("yyyy");
        return ret;
    }

    // wrap in mutex

};

const allUnique = (l: string[]) => {
    const set = new Set(l);
    return set.size === l.length;
};



