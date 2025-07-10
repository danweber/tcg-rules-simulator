
const path = require('path');

if (false)
    console.log = (function () {
        var original = console.log;
        return function () {
            var stack = new Error().stack!.split('\n');
            // stack[0] is Error
            // stack[1] is this function
            // stack[2] is the caller
            var caller = stack[2].split(' ')[1];
            var file = path.basename(caller.split(':')[0]);
            var line = caller.split(':')[1];
            var func = stack[2].split(' ')[5];
            original.apply(console, [`${new Date().toISOString()} [${file}:${line}] ${func}:`, ...arguments]);
        };
    })();


const origlog = console.log;

//GOOD     at Game.process_game_flow (/Users/me/Documents/game/src/myServerApp/models/game.js:1407:22)
//ERR:     at /Users/me/Documents/game/src/myServerApp/routes/game.js:165:24

import * as fs from 'fs';

//const fs = require('fs');
var util = require('util');

const open = util.promisify(fs.open);


async function createWriteStreamWithOpenSync(filename: string) {
    await open(filename, 'w');
    return fs.createWriteStream(filename);
}



export class Loggerx {
    log_file: number = -1; // fs.Mode;

    constructor(gid: string) {
        this.log_file = -3;
        let logdir = (__dirname + '/logs');
        if (!fs.existsSync(logdir)) fs.mkdirSync(logdir, '0777');
        let clean_gid = gid.replace(/[^A-Z0-9]/ig, '').substring(0, 40);

        const date = new Date();
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        const localISOTime = new Date(date.getTime() - offsetMs).toISOString();

        let file = clean_gid + "-" + localISOTime.replace(/T/, '_').substring(0, 16)
        let filename = logdir + "/" + file;
        console.log("making " + filename);
        try {
            this.log_file = fs.openSync(filename, 'w'); // 'w' for writing (creates if not exists)
        } catch (err) {
            console.error(err);
            let a: any = null; a.log_file();
            this.log_file = -2;
            // Handle errors appropriately (e.g., exit program)
        }


        console.log("made?");
        fs.writeSync(this.log_file, `ugh ${gid}\n`);
        //        console.log(this.log_file);
        //    var log_stdout = process.stdout;
    }


    log(...args: any[]) {

        //const date = new Date().toISOString().substring(
        const date = new Date().toString().split(" ")[4]
        const err = new Error();
        const stack = err.stack!.split('\n')[3];
        const regex = /\((.*):(\d+):(\d+)\)$/;
        const match = stack.match(regex);
        let file = '??'; let line = "0";
        let func = 'x';
        if (match) {
            // console.error("GOOD " + stack);
            file = path.basename(match[1]);
            line = match[2];
            func = stack.split(' ')[5];

        } else {
            let m
            if (m = stack.match(/\((.*?):(.*?):/)) {
                file = m[1];
                line = m[2];
                //   console.error("ERR: " + stack);
            }
        }
        const className = this.constructor.name;
        let fileline = `${file}:${line}`.padStart(15, " ");
        let namefunc = `${className}.${func}`.padStart(20, " ");

        const logMessage = `[${date}] ${fileline} ${namefunc}: ${args.join(' ')}`;
        if (this.log_file > 0) {
            fs.writeSync(this.log_file, logMessage + '\n');  // Write the log message to a file
            //
        } else {
            console.debug("DEBUG  " + this.log_file + " " + logMessage);
        }




        //   origlog(`[${date}] ${fileline} ${namefunc}:`, ...args);

        //        origlog(`[${date}] ${file}:${line} ${func}:`, ...arguments);
    }
}
