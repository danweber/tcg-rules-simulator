
// shared.js
const Player = require('../models/player');

const { Game } = require('../models/game');

const GameUI = require('../models/gameui');
const Instance = require('../models/instance');
const Mastergame = require('../models/mastergame');

let game_list = {}; // associative array of games Game('game');
const mastergame = new Mastergame();
const gg = new Game(mastergame, "bob");
game_list["bob"] = gg;
gg.start();
gg.go();

module.exports = {
    mastergame: mastergame,
    gg: gg,
    game_list: game_list
};

//let gui = new GameUI(mastergame, gg);
