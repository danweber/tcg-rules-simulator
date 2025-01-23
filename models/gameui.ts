//const mongoose = require('mongoose');
//const shared = require('./shared'); // Assuming shared.js is in the same directory
//
import { Game } from './game';
import { Loggerx } from './loggerx';
import Mastergame = require('./mastergame');
import { Player } from './player';
import { v4 as uuidv4 } from 'uuid';




class GameUI {
    master: Mastergame;
    gamelist: Game[];
    counter: number = 0;
    // 3 option cards

    logger: Loggerx;

    constructor(master: Mastergame, game_list: Game[]) {
        this.gamelist = game_list;
        this.master = master;
        this.logger = new Loggerx("gameui");
    }

    public get_master_JSON(object: any): any {
        try {
            let pid = object.pid == "2" ? 2 : 1;
            let gid = object.gid;
            if (!gid) gid = "bob"; // use the default for now for test window
            let game: Game = this.gamelist[gid];
            let x = game.master_JSON_game();
            let last_id = game.next_command_id();
            x.status.last_id = last_id;
            let p1_blob = JSON.parse(JSON.stringify(x));
            let p2_blob = JSON.parse(JSON.stringify(x))
            p1_blob.p2.moves = null;
            delete p1_blob.p2.hand.cards;
            p1_blob.p1.moves[0].last_id = last_id;
            p2_blob.p1.moves = null;
            delete p2_blob.p1.hand.cards;
            p2_blob.p2.moves[0].last_id = last_id;
            return [p1_blob, p2_blob];
        } catch (e) {
            console.error(111);
            console.error(e);
            console.error(222);
            return [{ "error": e}, {"error": e} ]
        }
    }

    public send_command(object: any): any {
        try {
            this.logger.log("===");
            this.logger.log(object);
            this.logger.log(JSON.stringify(object));
            let pid = object.pid == "2" ? 2 : 1;
            let gid = object.gid;
            let cmd = object.message;
            let bots = object.bots;
            let game_command = object.command;
            let last_id = object.last_id;

            if (!cmd) {
                cmd = object;
            }

            if (!gid) gid = "bob"; // use the default for now for test window

            this.logger.log(`COUNTER ${this.counter++} pid is ${pid} gid is ${gid} cmd is ${cmd}`);


            // queue ought to be per-person
            let game: Game = this.gamelist[gid];

            if (cmd == "reset") {
                this.logger.log("RESETTING NEW GAME " + gid);
                let old_game = this.gamelist[gid];
                game = new Game(this.master, gid, bots);
                if (old_game && old_game.socket_list) game.socket_list = old_game.socket_list;
                this.gamelist[gid] = game;
                game.start();
                game.go(); // is this right? I think I used it for historical purposes
            }

            if (!game) {
                this.logger.log("MAKING NEW GAME " + gid);
                game = new Game(this.master, gid, bots);
                this.gamelist[gid] = game;
                game.start();
                game.go(); // is this right? I think I used it for historical purposes
            }

            let p: Player = game.get_n_player(pid);

            // play, evolve, attack/answer, main, next, use, hatch, raise, link
            if (game_command && game_command.match && game_command.match(/^[PEAMNUHRL]/)) {
                // assume legit command
                // bad commands here can absolutely break the game
                console.log("a executing string " + game_command);
                this.logger.log(`COMMAND (${game_command}) PID (${pid}) GID (${gid}) LAST_ID (${last_id}) `);
                game.execute_string(game_command, pid, last_id);
                return true; // game.JSON_game(pid);
            }

            if (cmd.startsWith("logs")) {
                let b = cmd.split(" ");
                let c = parseInt(b[1]);
                let l = game.logs(c);
                return {
                    "log_line": c + l.length,
                    "logs": l
                };
            }

            //        this.logger.log("game turn is " + game.turn_player);
            //      this.logger.log("game isnt length is " + game.instances.length);

            if (cmd == "step") {
                this.logger.log("*** step");
                game.step();
                let y = game.step_state();
                let x: string[] = []; // this used to be game.messages(). removed 27-june
                this.logger.log("x", x);
                this.logger.log("y", y);

                let ret = { messages: x, ver: uuidv4() };
                this.logger.log(ret);
                return ret;
            } else if (cmd == "stat") {
                this.logger.log("*** stat");
                let x = game.step_state();
                this.logger.log(x);
                return x;
            } else if (cmd == "loop") {
                this.logger.log("*** loop");
                return game.x_JSON_game(pid).status;
            } else if (cmd == "inst") {
                this.logger.log("*** inst");
                let x = game.get_instances();
                this.logger.log(x);
                return x;
            } else if (cmd == "cards") {
                this.logger.log("*** cards");
                // let x = game.all_cards();
                //            this.logger.log(x);
                //   return x;
                return "unimplemented";
            } else if (cmd == "json") {
                this.logger.log("*** json");
                this.logger.log("COMMAND");
                //            let player: Player = game.player(1);
                //            p.execute_string(cmd);
                return true; // game.JSON_game(pid);
            } else {
                this.logger.log("*** other");
                game.send(cmd, pid, last_id); //  pid); // where things get answered
                return ""; // used to be game.messages()
            }


            //
            //        let player:Player = game.player(1);
        } catch (err) {
            console.error(99, err);
            return false; // i guess?
        }
    }

};
//    let player:Player = game.player(1);




export = GameUI;
