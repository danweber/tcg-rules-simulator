import { GameEvent } from "./event";
import { DynamicNumber, MultiTargetDesc, TargetDesc } from "./target";


// this was the last gasp for regexp before giving up and moving to grammars

// when detaching a material or a card tucked under this one
export function parse_detach(line: string): any {
    let ret = parse_detach_action(line);
    if (ret) return ret;

    // look for AND/OR split. TODO: the "or" part
    let m;
    if (m = line.match(/(.*) and (.*)/)) {
        let l1 = parse_detach_action(m[1]);
        let l2 = parse_detach_action(m[2]);
        if (l1 && l2) {
            return [l1, l2]
        }
    }
    return ret;


}

function parse_placement(str: string) {
    // console.log("XXX" + str);
    // (to) the hand, to its owner's hand, etc
    let m;
    if (str.match(/^(your|their|its|the)( owner's)? hand$/)) {
        return "hand";
    }
    // (at|to) the top/bottom of the deck, of their deck, of your/your opponent's deck, their owner's decks
    if (m = str.match(/^the (top|bottom) of .{1,20} decks?$/)) {
        return "deck-" + m[1];
    }
    // (on) top|bottom of your security stack 
    if (m = str.match(/^(the )?(top|bottom) of .{1,15}security stack$/)) {
        return "security" + m[2];
    }
    // (as) your bottom security cards 
    if (m = str.match(/^your (top|bottom) security cards?$/i)) {
        return "security" + m[1];
    }
    // (in) the battle area
    if (str.match(/^the battle area$/i)) {
        return "battle";
    }
    return false;
}

// match "return..." or "play..." or "place..." or "trash..."
function parse_detach_action(line: string): any {
    let m;
    let in_evo = " this monster's evolution cards";
    let temp: any = {};
    line = line.trim().toLowerCase();
    if (m = line.match(/^(.*)[,.]/)) {
        // trim end punctuation
        line = m[1];
    }
    if (m = line.match(/^return(?:ing)? (.*) (?:to|on) (.*)$/)) { // to deck or hand
        console.error(63, m);
        let place = parse_placement(m[2]);
        if (!place || place.startsWith("security")) {
            console.error("unknown place " + m[2]);
            return false;
        }
        temp.game_event = GameEvent.EVOSOURCE_REMOVE;
        let t = m[1] + " from" + in_evo;
        temp.td = new MultiTargetDesc(t);
        if (!temp.td) return false;
        temp.td2 = new TargetDesc(place);
        temp.choose = temp.td.count();
        console.debug(92, "count missed??\b", temp.choose);
        return temp;
    }
    if (m = line.match(/^play(?:ing)? (.*)( without paying .{1,10}costs?)?$/)) {
        temp.game_event = GameEvent.PLAY;
        let to_play = m[1];
        temp.choose = new DynamicNumber(1);
        let for_free: boolean = !!m[2];
        // this isn't a great phrase in english, but the parser can handle it
        temp.td = new TargetDesc(to_play + in_evo); // for free?
        // to_play is normally a simple TargetDesc ("A" or "A or B") but could also be "A and B"
        return temp;
    }
    if (m = line.match(/^plac(?:e|ing) (.*) (?:in|on|as|at) (.*)/i)) {
        let target = m[1];
        let place = parse_placement(m[2]);
        if (!place) {
            console.error("unknown place " + m[2]);
            return false;
        }
        temp.game_event = GameEvent.EVOSOURCE_REMOVE;
        temp.td = new MultiTargetDesc(target + in_evo);// why no in_evo??
        temp.choose = temp.td.count();
        console.debug(92, "count missed??\b", temp.choose);
        temp.td2 = new TargetDesc(place);
        return temp;
    }
    // move from one stack to another stack
    if (m = line.match(/^plac(?:e|ing) (.*) (?:under) (.*)/i)) {
        let target1 = m[1];
        let target2 = m[2];
        temp.game_event = GameEvent.EVOSOURCE_MOVE;
        temp.td = new MultiTargetDesc(target1 + in_evo);
        temp.choose = temp.td.count();
        console.debug(92.1, "count missed\b", temp.choose);

        temp.td2 = new TargetDesc(target2);
        return temp;
    }

    if (m = line.match(/^trash(?:ing) (.*)/i)) {
        temp.game_event = GameEvent.EVOSOURCE_REMOVE;
        temp.td = new TargetDesc("m1");
        temp.td2 = new TargetDesc("trash");
        temp.choose = 1; // temp.td.count;
        console.debug(92.2, "count missed\b", temp.choose);

        return temp;
        //        if (parse_placement(m[1])) return true;
    }

    return false;
}

if (require.main === module) {

    let filename = "./fromsource.txt";
    if (process.argv.length > 2) { filename = process.argv[2]; }

    let fs = require('fs');
    let thingy: string = "test";
    try {
        thingy = fs.readFileSync(filename, 'utf8');
    } catch (error) {
        //
    }
    let m;

    for (let line of thingy.split("\n")) {
        let ret = parse_detach_action(line);
        if (ret) {
         //   console.log(line)
           // console.log(ret)
            continue;
        }
        if (m = line.match(/(.*?) (?:or|and) (.*)/)) {
            //   console.log("or clause <" + m[1] + "> <" + m[2] + ">");
            let p1 = parse_detach_action(m[1]);
            let p2 = parse_detach_action(m[2]);
            console.log(`match <${m[1]}> and <${m[2]}> ...`);
            console.log(`match <${p1}> and <${p2}> ...`);
            console.log(line);
        } else {
            console.log(line);
        }


    }

    // Execute test code here
} else {
    console.debug("parse-actions included as library");

    // Use your library code as needed
}
