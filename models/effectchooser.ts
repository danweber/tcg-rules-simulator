import { AtomicEffect, SolidEffect } from "./effect";
import { GameEvent } from "./event";
import { Game } from "./game";

import { createLogger } from "./logger";
import { ALL_OF, SpecialInstance } from "./target";
const logger = createLogger('effectloop');



export class EffectChooser {
    turn_player_fx: SolidEffect[];
    other_player_fx: SolidEffect[];
    current_queue: SolidEffect[];
    current?: SolidEffect;
    game: Game;
    rand: string;
    mode: string = "normal";
    depth: number;
    count: number;

    effects(): string[] {
        // depth should be the same here as the object holding me
        // return `EC DEPTH ${this.depth}: ${ this.turn_player_fx.concat(this.other_player_fx).map(x=>x.label).join(", ")}`;
        return this.turn_player_fx.concat(this.other_player_fx).map(x => x.label);
    }
    constructor(g: Game,
        effects: SolidEffect[],
        depth: number,
        mode: string = "normal",
        count: number = ALL_OF) {
        this.mode = mode;
        this.turn_player_fx = [];
        this.other_player_fx = [];
        this.rand = "chooz";
        this.depth = depth;
        this.count = count;

        if (g.has_answer()) {
            console.error("entering chooser when we have a question waiting");
            console.dir(g.get_wait_questions(0));
            // this consumes but we're crashing anyway
            console.dir("question is " + g.get_question());
            console.dir("answer is " + g.get_answer());
            let a: any = null; a.die();
        }
        logger.info(this.rand + "CHOOSER CONSTRUCTOR " + effects.length);
        for (let i = 0; i < effects.length; i++) {
            logger.info(this.rand + "i is " + i + " of " + effects.length);
            let eff = effects[i];
            logger.info(this.rand + "effects i is " + eff);
            if (!eff) {
                console.error("no effect!");
                console.trace();
                continue;
            }
            logger.info(this.rand + "effects i is " + effects[i].toString());
            logger.info(this.rand + "effects i source is " + effects[i].source);
            logger.info(this.rand + `effect done by P${effects[i].source!.get_n_player()} turn is P${g.turn_player} `);

            let n_effect_player = effects[i].source!.get_n_player();
            if (n_effect_player == g.turn_player) {
                this.turn_player_fx.push(effects[i]);
            } else if (n_effect_player == 3 - g.turn_player) {
                this.other_player_fx.push(effects[i]);
            } else {
                console.error(`failure, can't get player! ${n_effect_player}`);
                g.announce("missing player for effect");
            }
        }
        this.current_queue = this.turn_player_fx;
        logger.info(this.rand + `split ${effects.length} into ${this.turn_player_fx.length} ` +
            ` and ${this.other_player_fx.length} `);
        //        this.current_queue = this.turn_player_fx.length ? this.turn_player_fx : this.other_player_fx;
        this.current_queue = this.turn_player_fx;
        this.game = g;
    }
    toString(): string {
        let ret = "";
        if (this.turn_player_fx.length > 0) {
            ret += "Turn player has " + this.turn_player_fx.length +
                " effects left: " + this.turn_player_fx.map(x => `[${x.label}]`).join(" ");
        }
        if (this.other_player_fx.length > 0) {
            ret += "Non-turn player has " + this.other_player_fx.length +
                " effects left: " + this.other_player_fx.map(x => `[${x.label}]`).join(" ");
        }
        return ret;
    }
    length() { return this.turn_player_fx.length + this.other_player_fx.length };

    get_next(): true | false | SolidEffect {
        let g = this.game;
        logger.info(this.rand + "CHOOSER: picking one of " + this.length()
            + " " + this.toString() + " but checking rules first");

        // we have an answer, return something
        if (g.has_answer()) {
            let ans = g.get_answer();
            logger.info(this.rand + "getting answer " + ans + " toString was ");
            logger.silly(this.toString());
            let answer = parseInt(ans) - 1;
            logger.silly(this.rand + "answer  is " + answer);
            logger.silly(this.rand + "length is " + this.length());
            logger.silly(this.rand + `length of queues is ${this.turn_player_fx.length} ${this.other_player_fx.length}`);
            logger.silly(this.rand + `length of current queue is ${this.current_queue.length}`);
            if (answer >= this.current_queue.length) {
                console.error("TOO BIG!");
                let a = null; a!.die();
            }
            let temp = this.current_queue.splice(answer, 1);
            logger.silly(temp.toString());
            this.current = temp[0];
            logger.silly(this.current.toString());
            g.log("Chosen is " + this.current.label);
            g.fancy.add_string(this.depth, `P${this.current.source.get_n_player()} processes ${this.current.label}` +
                ` (${this.current_queue.length} left)`);
            logger.silly(this.rand + "return selecteD");
            this.count -= 1;
            return this.current;
        }

        if (g.waiting_answer()) {
            logger.debug("still waiting");
            return false;
        }

        logger.info(this.rand + `triggers left: ${this.length()} total, ${this.current_queue.length} in current queue`);


        if (this.mode == "normal") {
            let subs;
            if (subs = g.rules_process()) {

                let fake_solid: SolidEffect = new SolidEffect("rules", "rules");
                console.info("making fake solid " + subs.length + " " + subs.map(x => GameEvent[x.game_event]).join(":"));
                let atomic: AtomicEffect = new AtomicEffect("rules", "rules");
                fake_solid.effects[0] = atomic;
                atomic.events = subs;
                // There's no real source for .rules effects.
                fake_solid.source = new SpecialInstance(subs[0].chosen_target);
                fake_solid.rules = true;
                return fake_solid;
            }
        }

        if (this.length() == 0) {
            g.log(`EC DEPTH ${this.depth}: All triggers in set processed.`);
            return true;
        }
        if (this.count == 0) {
            g.log("Remaining " + this.length() + " effects don't activate.");
            return true;
        }

        if (this.current_queue.length == 0) {
            // by necessity, only the other player has effects left
            this.current_queue = this.other_player_fx;
        }

        let cql = this.current_queue.length;
        if (cql == 1) {
            // only announce opponent's actions?
            let depth_msg = (this.depth > 1) ? "Depth " + this.depth + ": " : "";
            this.game.log(depth_msg + "Processing effect " + this.current_queue[0].label + " (" + this.current_queue[0].raw_text + ")");
            this.current = this.current_queue[0];
            logger.info(this.rand + "return sql");
            this.count -= 1;
            return this.current_queue.pop()!;
        }

        let player = this.current_queue[0].source!.get_n_player();
        g.log(`EC DEPTH ${this.depth}: there are ${this.length()} effects left, player can choose 1 of ${cql}`);
        // 1-index for users
        let answers = [];
        for (let i = 0; i < cql; i++) {
            let text = (this.current_queue[i].label + " " + this.current_queue[i].raw_text);
            let fulltext = this.current_queue[i].raw_text;
            let instance_id = this.current_queue[i].source.id();
            let card_id = this.current_queue[i].card_label;
            if (text.length > 101) text = text.substring(0, 100) + "…";
            answers.push({
                command: (i + 1).toString(),
                instance: instance_id,
                card: card_id,
                text: text,
                fulltext: fulltext,
            });
        }
        this.game.wait(player, answers, "Choose effect to process:");
        return false;
    }
}

