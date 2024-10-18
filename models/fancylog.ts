import { chown } from "fs";
import { SolidEffect, SubEffect } from "./effect";



export class FancyLog {
    logs: FancyLogObject[] = [];
    id: number = 0;
    constructor() {

    }
    add_string(layer: number, action: string):void  {
        let o = new FancyLogObject(this.id, layer, action);
        this.logs.push(o);
        this.id += 1;
    }
    // I don't even need the argument, I already have the reference
    update_effect(layer: number, e: SolidEffect): void {
        let last_obj = this.logs[this.id - 1];
        if (last_obj.current == e) {
            return;
        }
        let o = new FancyLogObject(this.id, layer, "");
        o.current = e;
        this.logs.push(o);
        this.id += 1;
    }
    update_triggers(layer: number, triggers: SolidEffect[]): void {
        let o = new FancyLogObject(this.id, layer, "");
        o.triggers = triggers;
        this.logs.push(o);
        this.id += 1;
    }
    emit(since: number): any[] {
        let ret = [];
        let i;
        for (i = 0; i < this.id; i++) {
            let object = this.logs[i];
            ret.push(object.emit());
        }
        return ret;
    }

}

class FancyLogObject {

    id: number; // redundnant information
    layer: number;
    triggers?: SolidEffect[];  // we care about n_player, label, source_text
    current?: SolidEffect; // we care about n_player, label, source_text, activated?, Atomic[],
    // AtomicEffect, per each: activated?, game_event, target, game_action ("attacks X into Y" as effect)
    // Target: [ p_number, label, name, id ]
    action: string; //  { n_player, VERB, },
    // VERB of DELETE, PLAY, BOUNCE, BOTTOMDECK, INTO-SEC, STATUS
    // special form for "attack" or "evolve"
    // emit as "P2 Bryw alters Bryw until turn 6" or "p1 deletes agumon but can't"

    constructor(id: number, layer: number, action: string) {
        this.id = id;
        this.layer = layer;
        this.action = action;
    }
    emit_trigger(x: SolidEffect) {
        let ret =  {
        n_player: x.source.get_n_player(),
        label: x.label,
        text: x.raw_text.substring(0,20)
        }
//        console.error(ret);
        return ret;
    }
    emit_target(chosen: any) {
        if ("get_name" in chosen) {
            return chosen.get_name();
        } else {
            return "?";
        }
    }
    emit_solid(x: SolidEffect) {
        let r:any = [];
        // this isn't all the data we want; we should track "activated/not activated", and does
        // that go into the AtomicEffect structure, or a new structure, or this structure?
        if (!this.current) return r;
        let all_subs:SubEffect[] = [];
        for (let atomic of this.current?.effects) {
            all_subs.push(... atomic.events);
        }
        for (let subeffect of all_subs) {
            r.push ({ event: subeffect.game_event, choose: subeffect.choose, targets: this.emit_target( subeffect.chosen_target ) })
        }
    }
    emit() {
        if (this.action) {
            return { id: this.id, layer: this.layer, action: this.action };
        }
        if (this.triggers) {
            let t = this.triggers.map(x => this.emit_trigger(x) );
//            console.error(t);
            return { id: this.id, layer: this.layer, triggers: t }
        }
        if (this.current) {
            // parse as much as is defined
            let s = this.emit_solid(this.current);
            return { id: this.id, layer: this.layer, event: s }
        }

    }

}
