2
import { Card } from './card';
import { Game } from './game';
import { Location } from './location';
import { Player } from './player';

export class StarterDecks {
    // default decks

    st7: number[] = [];
    st8: number[] = [];
    st15: number[] = [];
    st16: number[] = [];
    st17: number[] = [];

    constructor(name: string, game: Game, player: Player) {

        if (name == "ST17new") {
            Card.create("EX4-002", game, player)?.move_to(Location.EGGDECK);
        }

        this.st7 = [
            3, 5,
            2, 2, 2, 2,
            3, 3, 3, 3,
            4, 4, 4, 4,
            5, 5, 5, 5,
            6, 6, 6, 6,
            7, 7, 7, 7,
            8, 8, 8, 8,
            9, 9, 9, 9,
            10, 10, 10, 10,
            11, 11, 11, 11,
            12, 12, 12, 12
        ];
        this.st8 = this.st7;

        this.st15 = [2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
            6, 6, 6, 17, 7, 7, 7, 17, 8, 8, 9, 9, 9, 9,
            10, 10, 10, 10, 11, 11, 12, 12, 13, 13, 13, 13,
            14, 14, 14, 14, 15, 15, 16, 16, 16, 16];
        this.st16 = [2, 2, 2, 2, 3, 17, 17, 4, 4, 4, 5, 17, 5, 5,
            6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 9, 9, 9, 9,
            10, 10, 10, 10, 11, 11, 12, 12, 13, 13, 13, 13,
            14, 14, 14, 14, 15, 15, 16, 16, 16, 16];
        this.st17 = [2, 2, 2, 2,
            3, 3, 3, 3,
            4, 4, 4, 4,
            5, 5, 5, 5,
            6, 6, 6, 6,
            7, 7, 7, 8, 8, 9, 9, 9, 9,
            10, 10, 10, 4, 11, 11, 12, 12, 13, 13, 13,
            2, 3, 4, 5, 6, 7, 8, 9, 10, 11];


        if (this.st17.length != 50 || this.st15.length != 50 || this.st16.length != 50 || this.st17.length != 50) {
            throw (1);
        }

        let ref = this.st16;

        if (name == "ST15") {
            ref = this.st15;
        } else if (name.startsWith("ST17")) {
            ref = this.st17;
        } else if (name.startsWith("ST7")) {
            ref = this.st7;
        }

        let cardlist: string[] = [];

        if (name == "YVAX16") {
            cardlist = ["BT1-087", "BT1-087", "BT13-034", "BT13-034", "BT14-003", "BT14-003", "BT14-033", "BT14-033", "BT14-033", "BT14-033", "BT14-037", "BT14-037", "BT14-037", "BT14-037", "BT14-084", "BT14-084", "BT14-084", "BT14-084", "BT14-093", "BT14-093", "BT15-003", "BT15-003", "BT15-003", "BT15-038", "BT15-038", "BT15-042", "BT15-087", "BT16-082", "BT16-082", "BT16-082", "BT16-101", "BT16-102", "BT16-102", "BT16-102", "BT16-102", "BT2-038", "BT3-105", "BT5-033", "BT5-033", "BT8-039", "BT8-039", "BT8-039", "BT8-039", "BT8-094", "BT9-098", "BT9-098", "EX4-068", "EX4-068", "EX4-074", "P-105", "P-105", "ST17-06", "ST17-06", "ST17-06", "ST17-06"]
        }
        if (name == "YVAX") {
            cardlist = ["BT1-087", "BT1-087", "BT10-042", "BT10-042", "BT13-003", "BT13-003", "BT13-003", "BT13-003", "BT13-012", "BT13-034", "BT13-034", "BT13-034", "BT14-033", "BT14-033", "BT14-033", "BT14-033", "BT14-037", "BT14-037", "BT14-037", "BT14-037", "BT14-084", "BT14-084", "BT14-084", "BT14-084", "BT14-093", "BT14-093", "BT14-102", "BT14-102", "BT14-102", "BT14-102", "BT15-034", "BT15-034", "BT15-037", "BT15-037", "BT15-037", "BT15-037", "BT15-038", "BT15-038", "BT15-038", "BT15-038", "BT7-036", "BT8-039", "BT8-039", "BT9-033", "BT9-033", "BT9-033", "EX4-074", "EX5-033", "EX5-033", "P-037", "P-037", "P-105", "P-105", "P-105"]
        }

        if (name == "ST7") {
            cardlist.push(...Array(4).fill("ST7-02"));
            cardlist.push(...Array(2).fill("ST7-03")); // 2
            cardlist.push(...Array(4).fill("ST7-04"));
            cardlist.push(...Array(2).fill("ST7-05")); // 2
            cardlist.push(...Array(4).fill("ST7-06"));
            cardlist.push(...Array(4).fill("ST7-07"));
            cardlist.push(...Array(4).fill("ST7-08"));
            cardlist.push(...Array(2).fill("ST7-09"));
            cardlist.push(...Array(4).fill("ST7-10"));
            cardlist.push(...Array(2).fill("ST7-11"));
            cardlist.push(...Array(4).fill("ST7-12"));

            cardlist.push(...Array(4).fill("BT1-009"));
            cardlist.push(...Array(4).fill("BT1-019"));
            cardlist.push(...Array(2).fill("BT1-020"));
            cardlist.push(...Array(4).fill("ST1-16"));


        }
        if (name == "ST8") {
            cardlist.push(...Array(4).fill("ST8-02"));
            cardlist.push(...Array(4).fill("ST8-03"));
            cardlist.push(...Array(2).fill("ST8-04"));
            cardlist.push(...Array(2).fill("ST8-05"));
            cardlist.push(...Array(4).fill("ST8-06"));
            cardlist.push(...Array(4).fill("ST8-07"));
            cardlist.push(...Array(4).fill("ST8-08"));
            cardlist.push(...Array(4).fill("ST8-09"));
            cardlist.push(...Array(2).fill("ST8-10"));
            cardlist.push(...Array(4).fill("ST8-11"));
            cardlist.push(...Array(4).fill("ST8-12"));

            cardlist.push(...Array(4).fill("BT1-028"));
            cardlist.push(...Array(4).fill("BT1-037"));
            cardlist.push(...Array(2).fill("BT1-038"));
            cardlist.push(...Array(2).fill("ST2-13"));

        }

        if (name == "ST17new") {
            // 3
            cardlist.push(...Array(3).fill("ST17-02"));
            cardlist.push(...Array(2).fill("ST17-03"));
            cardlist.push(...Array(3).fill("EX4-032"));
            cardlist.push(...Array(2).fill("EX4-033"));
            cardlist.push(...Array(2).fill("EX4-034"));

            // 4
            cardlist.push(...Array(2).fill("ST17-04"));
            cardlist.push(...Array(3).fill("ST17-05"));
            cardlist.push(...Array(2).fill("ST17-06"));
            cardlist.push(...Array(3).fill("BT8-039"));

            // 5
            cardlist.push(...Array(4).fill("EX4-057"));
            cardlist.push(...Array(4).fill("ST17-07"));

            // 6
            cardlist.push(...Array(3).fill("ST17-08"));
            cardlist.push(...Array(2).fill("ST17-09"));

            // tamer
            cardlist.push(...Array(2).fill("ST17-10"));
            cardlist.push(...Array(3).fill("BT8-091"));
            cardlist.push(...Array(3).fill("EX2-061"));

            cardlist.push(...Array(3).fill("ST17-11"));
            cardlist.push(...Array(4).fill("ST17-12"));


            if (cardlist.length > 0 && cardlist.length != 50 && !name.startsWith("test")) {
                console.error(cardlist.length);
                console.error(cardlist.join(","));
                let a: any = null; a.bad_size(cardlist.length);
            }


        }

        if (!name.startsWith("test")) {
            let index = name.substring(0, 4) + "-01";
            for (let i = 0; i < 4; i++) {
                let egg = Card.create(index, game, player);
                egg?.move_to(Location.EGGDECK);
            }
        }
        if (cardlist.length == 50) {
            for (let id of cardlist) {
                let _ttt = Card.create(id, game, player);
                if (_ttt) _ttt.move_to(Location.DECK);
            }
        } else {
            if (!name.startsWith("test")) {
                for (let i = 0; i < ref.length; i++) {
                    let n = ref[i];
                    let id = name + "-" + (n < 10 ? "0" : "") + n;
                    let _ttt = Card.create(id, game, player);
                    if (_ttt) _ttt.move_to(Location.DECK);
                    // deleted stuff here may 6
                }
            }
        }
        


    }
};

