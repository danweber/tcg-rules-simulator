
const Player = require('../models/player');
const { Game } = require('../models/game');
const Instance = require('../models/instance');
const Mastergame = require('../models/mastergame');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');

const shared = require('./shared'); // Assuming shared.js is in the same directory


let mastergame = shared.mastergame;
let gg = shared.gg;
let game_list = shared.game_list;
//let mastergame = new Mastergame();
//let gg = new Game(mastergame);
//game_list["bob"] = gg;
//gg.start();                       
//gg.go();

// const { io } = require('../bin/www');

//const fred = new Player('Bobby', game);

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'dddddd' });
});

const path = require('path'); // Import the path module

router.get('/ui', (req, res) => {

  res.sendFile(__dirname + '/index.html');

  // const message = 'Hello from routes/index.js!';
  // global.io.emit('chat-message', message); // Emit the message to all connected clients
  // res.send('Message sent');
});


router.get('/test', (req, res) => {
  res.send("xxx");
});


function escape_html(str) {
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}


router.get('/command', (req, res) => {
  let gid = clean(req.query.gid);
  let pid = parseInt(req.query.pid);
  if (!game_exists(gid)) { res.redirect('/new_game'); return; }
  let game = game_list[gid];
  let player = game.player(pid);

  let cmd = req.query.cmd;
  let cmd2 = req.query.cmd2;
  let output = eval(cmd + cmd2);
  let name = player.my_name;
  //    console.log(output);
  res.send("<pre>" + escape_html(output) + "</pre>" + "<hr>" +
    "<form method=GET action=/game/command>" +
    "<input name=pid value=" + req.query.id + " /> " +
    "<input name=cmd value=\"" + req.query.cmd + "\" />" +
    "<input type=submit value=go  /> " +
    "<input name=cmd2  value=\"" + req.query.cmd2 + "\" />   </form>"
  );
  //    res.render('deck', { name, player });    
});

//router.use(express.text());

router.get('/logs', (req, res) => {
  let gid = clean(req.query.gid);
  let n = clean(req.query.from);
  let g = game_list[gid];
  //  console.log("getting logs...");

  if (!g) { res.send(); return; }
  let _logs = g.logs(n);

  let logs = _logs.join("\r\n");
  res.send(logs);
});

// creative mode uses this
router.get('/cards', (req, res) => {
  //res.set('Content-Type', 'text/plain');  Text mode was neat and we should have it again
  let cards = mastergame.all_cards();

  let output = "<table border>\n";
  for (let id in cards) {
    let c = cards[id];
    let name = c.name;
    // let first = true;
    output += `<tr><td>${id}<td>${name}\n`; //  : "<tr><tr>";
    for (let effect of c.new_effects) {
      //prefix = first ? "<td>${id}<td>${name}" : "<tr><tr>";
      output += `<td>${effect.toPlainText()}\n`;
    }
    for (let effect of c.new_inherited_effects) {
      //prefix = first ? "<td>${id}<td>${name}" : "<tr><tr>";
      output += `<td>ESS ${effect.toPlainText()}\n`;
    }
    for (let effect of c.new_security_effects) {
      //prefix = first ? "<td>${id}<td>${name}" : "<tr><tr>";
      output += `<td>SEC ${effect.toPlainText()}\n`;
    }
    output += "</tr>";
  }
  output += "</table>\n";
  res.send(output);
});


router.get('/witness', (req, res) => {

  let uuid = parseInt(clean(req.query.uuid));
  let gid = clean(req.query.gid);
  let test = parseInt(clean(req.query.test));
  let proceed = clean(req.query.proceed);
  let test_case = 'failed-xros-from-trash';
  if (test === 2) {
    test_case = 'pending-gravitycrush';
  } else if (test === 3) {
    test_case = 'pending-gravitycrush-2';
  } else if (test === 4) {
    test_case = 'replay'
  } else if (test !== 1) {
    res.send(`<ul> Visualized Test Cases
        <li> <a href="?test=1">Failed Xros from trash<a>
        <li> <a href="?test=2">Multiple Gravity Crush in one turn</a>
        <li> <a href="?test=3">Gravity Crush w/ multiple EoT<a>
        <li> <a href="?test=4">Appmon v Royal Base</a>
      </ul>`);
    return;
  }
  let filePath = `tests/${test_case}.in`;
  let lines = [];
  console.log("old gid is " + gid);

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    lines = data.split("\n")
  } catch (err) {
    console.error('Error reading file:', err);
  }
  let game;
  if (proceed) {
    game = game_list[gid];
  } else {
    gid = uuidv4();
    gid = new_game(gid);
    game = game_list[gid];
  }
  let init = "";

  let words;
  let text = "Watch the scenario.";
  let past = false;
  for (let line of lines) {
    if (words = line.split(":")) {
      if (words[0].trim() === "TEXT")
        text = words[1].replace(/[^.-a-z0-9_ <>＜＞]/gi, ''); // 
    }
    // first line with DUMP is where we stop?
    if (line.startsWith("DUMP")) {
      past = true;
    }
    if (past && proceed) {
      init += line + "\n";
    }
    if (!past && !proceed) {
      init += line + "\n";
    }
  }
  console.log("made new gid " + gid);
  if (proceed)
    game._continue_board(init);
  else
    game._set_up_board(init);

  let launch = 1;
  if (launch < 3) {
    res.redirect('/build/index.html?gid=' + gid + '&pid=' + launch + "&test=" + test + "&text=" + text); return;
    return;
  }


});



// creative mode uses this
router.get('/launch', (req, res) => {
  let gid = clean(req.query.gid);
  let launch = parseInt(req.body.launch);


  if (launch < 3) {
    res.redirect('/build/index.html?gid=' + gid + '&pid=' + launch); return;
    return;
  }
  res.send(`<html><body>` +
    `Launch <a href='/build/index.html?gid=${gid}&pid=1' >p1</a>  ` +
    `and <a href='/build/index.html?gid=${gid}&pid=2' >p2</a>,`);
  return;

});

let rnd_words = ["time", "year", "people", "way", "day", "man", "woman", "thing", "life", "child", "world", "school", "state", "family", "student", "group", "country", "problem", "hand", "part", "place", "case", "week", "company", "system", "program", "question", "work", "government", "number", "night", "point", "home", "water", "room", "mother", "area", "money", "story", "fact", "month", "lot", "study", "books", "eye", "job", "word", "business", "issue", "side", "kind", "head", "house", "service", "friend", "father", "power", "hour", "game", "line", "end", "member", "law", "car", "city", "community", "name", "president", "team", "minute", "idea", "kid", "body", "information", "back", "parent", "face", "others", "level", "office", "door", "health", "person", "art", "war", "history", "party", "result", "charge", "morning", "reason", "research", "girl", "guy", "moment", "air", "teacher", "force", "education", "technology"]

let prior_ip = "";
router.post('/set_up_board', async (req, res) => {

  //console.log("Client IP?");

  let bot1 = req.body.bot1 ? "1" : "0"
  let bot2 = req.body.bot2 ? "1" : "0";
  var ip = req.ip ||
    (req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  if (prior_ip != ip) {
    prior_ip = ip;
    console.log('Client IP b:', ip);
  }
  let gid = clean(req.query.gid);
  let pid = parseInt(req.query.pid);
  let launch = parseInt(req.query.launch || req.body.launch);

  let board = req.query.board || req.body.board;
  let no_init = parseInt(req.query.no_init || req.body.no_init);
  let game;
  if (!board || board.length < 2 || JSON.stringify(board).length < 4) {
    res.redirect(301, `/game/set_up_board`);
    return;
  }
  if (no_init) {
    game = game_list[gid];
    console.log("contingueing");
    let test_data = game._continue_board(board);
    if (test_data.length > 0) {
      res.send(test_data);
      return;
    }
    console.error("NO DATA, FALL THROUGH");
  }
  gid = new_game(gid);
  if (!game_exists(gid)) { res.redirect('new111_game'); return; }
  game = game_list[gid];
  let player = game.player(pid);

  let test_data = await game._set_up_board(board);
  if (test_data.length > 0) {
    res.send(test_data);
    return;
  }

  if (launch < 3) {
    res.redirect('/build/index.html?gid=' + gid + '&pid=' + launch); return;
    return;
  }
  res.send(`<html><body>` +
    `Launch <a href='/build/index.html?gid=${gid}&pid=1' >p1</a>  ` +
    `and <a href='/build/index.html?gid=${gid}&pid=2' >p2</a>'`);
  return;

})

router.get('/set_up_board', (req, res) => {

  res.send(`
    <h1>Creative Mode</h1>

<p>Creative mode can absolutely create situations not yet handled by the current engine.</p>

Enter the board state and press "go" underneath. Make your own down below, or use a sample


<form method=POST action=/game/set_up_board><textarea rows=25 cols=120 name=board>
# Lines with # at the start are ignored comments.
# Use Version:2, you don't want version:1, it was much flimsier
VERSION:2

# Monsters on field.
# Let's make two for player 1. Their field is caled "FIELD1".
# We have "Fred" which is an Ice Shield with a Tiny Shield egg under it, and "George" which is just a Paper Shield, rested.
FIELD1:Fred,CS1-05,CS1-02 George,CS1-02,REST
# Monster IDs don't need to be done by card ID. You can also use a unique enough prefix so that only 1 card matches.
FIELD2:MyTamer,CS1-Gideon DogMon,CS2-GreatSword,CS2-DoggieDagger Giant,CS2-Masamune,CS2-Lazy,CS2-Sharp

# The label like "Fred" or "Giant" isn't necessary, the game will stuff in some placeholder, but we can identify instances by their label.
# EGGZONE is just a single instance, or nothing. The label here is "Egg" which is accurate enough, but it will keep the label as it moves.
EGGZONE1:Egg,CS1-01
# For player 1, yhe zones SECURITY1, DECK1, EGGDECK1, HAND1, TRASH1 are just simple lists of cards, bottom on the left.
EGGDECK1:CS1-01 CS1-01 CS2-01
# Same for player 2.
DECK2:CS2-02 CS2-03 CS2-04

</textarea> <br>
<input type="submit" id="go" value="go"  style="height:100px; width:300px" />
</form>

`);

  return;
});


function clean(str) {
  if (!str) return str;
  //  console.log('cleaning');
  // console.log(str);
  return str.replace(/[^-a-z0-9_]/gi, '');
}

function n_clean(str) {
  let i = parseInt(str);
}


function footer(gid, pid) {
  gid = clean(gid);
  pid = parseInt(pid);
  return `<form method=POST><input type=hidden id=gid value=${gid} />` +
    `<input type=hidden id=pid value=${pid} /> ` +
    "COMMAND (hatch raise next) (play N, evolve N M attack N M main N next) <input name=cmd />" +
    "</form>";
}

function new_game(gid, p1string, p2string, bot1, bot2, seed) {
  if (gid && (gid.startsWith("auto") || gid.startsWith("test"))) {
    // oh we just completely wipe, did I do that on purpose?
    game_list[gid] = new Game(mastergame, gid, [], p1string, p2string, bot1, bot2);
    game_list[gid].start();
    game_list[gid].go();
    return gid;
  }

  if (!gid) {
    // TODO: retry random words
    let index = Math.floor(Math.random() * rnd_words.length);
    let word = rnd_words[index]
    gid = word;
  }
  console.log(339, gid);
  game_list[gid] = new Game(mastergame, gid, [], p1string, p2string, bot1, bot2, seed);
  game_list[gid].start();
  game_list[gid].go();
  return gid;
}

router.post('/game_state', (req, res) => {
  console.log("GAME STATE POST");
  console.log(req.body);
  let gid = clean(req.query.gid);
  let pid = parseInt(req.query.pid);
  if (!game_exists(gid)) { res.redirect('/new_game'); return; }
  let game = game_list[gid];
  let player = game.player(pid);
  let verb = req.body.verb;
  let arg1 = req.body.arg1;
  let arg2 = req.body.arg2;
  let output;
  if (verb && verb != "") {
    player.execute([verb, arg1, arg2])
  } else {
    let words = req.body.cmd.split(" ");
    output = player.execute(words);
  }
  if (output) {
    res.send("<pre>" + output + "</pre>");
  } else {
    res.redirect(`game_state?gid=${gid}&pid=${pid}`);
  }
});

router.get('/game_state', (req, res) => {
  let gid = clean(req.query.gid);
  let pid = parseInt(req.query.pid);
  console.log("gid is " + gid);
  let game = game_list[gid];
  if (!game) {
    game = new Game(mastergame, gid);
    game_list[gid] = game;
  }
  let player = game.player(pid);
  console.log("game is " + (game ? "Y" : "N"));
  if (!game_exists(gid)) { res.redirect('/new_game'); return; }
  console.log("before");
  console.log(req.query);

  let body = "<html><head><link rel='stylesheet' href='/stylesheets/style.css'></head><body><table style='width: 1000px;table-layout:fixed;' >";
  body += "<tr><td style='width: 800px; overflow:hidden; overflow:auto;'>";

  let plays = player.get_x_plays({});
  console.log("PLAYS IS " + plays);

  let controls = ux_blob(plays, player.get_field(), player.get_hand(), gid, pid);
  let _ret = player.dump_better(pid == 2, controls) + "<hr>" + player.dump_better(pid == 1, controls);

  let ret = game.dump_all(pid);
  console.log("after" + _ret.length);
  let bottom = "";
  bottom += "<hr>x ";
  bottom += plays;
  bottom += "<hr>";
  bottom += controls;


  //  let all_of_it = game.dump_better();

  // i hate how this got re-factored up in here
  let all_of_it = body +
    "<div><pre>" + (ret) + "</pre></div>" +
    "</td><td><div>" +
    "<div id=log style='width: 600px; height: 500px; overflow:auto;'>" +

    "<pre>" + game.all_logs(pid) + "</pre>" +

    "</div></div></td></tr></table>" +

    "<script>document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;</script>" +

    "<hr>" + bottom +
    footer(gid, pid) +
    "<hr>";


  res.send(all_of_it);

});

router.post('/init_game', (req, res) => {
  let p1string = req.body.p1string;
  let p2string = req.body.p2string;
  let bot1 = req.body.bot1 ? "1" : ""
  let bot2 = req.body.bot2 ? "1" : "";
  let launch = parseInt(req.body.launch);
  // why would I let them set the gid?
  let seed = req.body.seed;
  {

    /*    let index = Math.floor(Math.random() * rnd_words.length);
        gid = rnd_words[index];
        console.log(gid);*/
    gid = new_game(undefined, p1string, p2string, bot1, bot2, seed);

    /*if (!game_list[gid]) {
      console.error(req.query);
      let game = new Game(mastergame, gid, [], p1string, p2string, bot1, bot2, seed);
      game_list[gid] = game;
      game.start(); // shuffle, set health
      game.go(); // go to turn 1 
      break;
    }*/
    // try again
  }

  if (launch < 3) {
    res.redirect('/build/index.html?gid=' + gid + '&pid=' + launch); return;
    return;
  }
  res.send(`<html><body>` +
    `Launch <a href='/build/index.html?gid=${gid}&pid=1' >p1</a>  ` +
    `and <a href='/build/index.html?gid=${gid}&pid=2' >p2</a>;`);
  return;
});


// obsolete?
router.get('/new_game', (req, res) => {
  let gid = clean(req.query.gid);
  let pid = parseInt(req.query.pid);
  if (gid && !game_list[gid]) {
    res.send("<p>This game doesn't exist.</p>" +
      "<p>If this is an old link the game might be deleted or the server crashed. </p>" +
      "<p>To make a game with this ID, <form action=new_game method=POST>" +
      `<input type=hidden name=gid value=${gid} /> <input type=hidden name=pid value=${pid}  /> ` +
      "<button type=submit name=go value='tap me' >tap here</button>" +
      "</form>");
  } else if (gid && game_list[gid]) {
    res.send("<p>A game already exists here.</p>" +
      `<a href=/game/main_page?gid=${gid}&pid=${pid}>Go here</a> to get to it` +
      ", or <a href=/game/new_game>make a new one</a>");
  } else {
    res.send("<p>Pick a short word or number to identify your game:</p>" +
      "<form method=POST action=new_game ><input name=gid /></form>");
  }
});

function game_exists(gid) { return gid && game_list[gid] };

// obsolete? maybe for text ui
router.post('/new_game', (req, res) => {
  // console.log(req);
  console.log(req.body);
  console.log(req.body.gid);
  let gid = clean(req.body.gid);
  console.log("clean value " + gid);
  if (!gid) { res.redirect('/game/new_game'); return; }
  if (game_exists(gid)) {
    res.send("<p>A game already exists here.</p>" +
      "<a href=/game/main_page>Go here to get to it, or <a href=/game/new_game>make a new one</a>");
  } else {
    let game = new Game(mastergame, gid);
    game_list[gid] = game;
    game.start();

    game.go();



    let ret = `<h1>game started<h1>` +
      `<a href=game_state?gid=${gid}&pid=1>PLAYER ONE HERE</a>`
      + "<hr>" +
      `<a href=game_state?gid=${gid}&pid=2>PLAYER TWO HERE</a>`;

    res.send(ret);
    //    res.redirect(`/game/main_page?gid=${gid}`);
  }
});

function thingy(input) {
  return "empty";
}

function ux_blob(get_plays_str, field, hand, gid, pid) {
  let get_plays = JSON.parse(get_plays_str);
  let ret = `applesauce
  <form  method=POST><table border=1>
  <tr><td colspan=2> `;
  for (i in get_plays) {
    let x = get_plays[i];
    ret += `<button type=button onclick=stuff('${i}') value=${i}1  `;
    if (x === true || Object.keys(x).length > 0) { ret += " true "; } else { ret += " disabled=disabed  " }
    ret += ` >${i}</button>  `;
  }

  ret += ` <button type=buttpn onclick=stuff('NEXT')>NEXT</button> <input type=hidden name=cmd id=thing value=3 />
  <input type=hidden name=gid3 value=${gid} /> <span id=prep> </span> <input type=hidden name=pid3 value=${pid} />

  <tr><td> ACTION: <input name=verb id=verb type=hidden /> <td> <select id=arg1 name="arg1" onchange="next_level()" /> <td> <select id=arg2 name="arg2" /> <td> <button id=go name=go type=submit value=111>GO</button>
</td>

</table>
</form>
<script>
let plays = ${get_plays_str};
let field = ${field};
field[0] = {"index": 0, name: "Player" };
let hand = ${hand};
function clear_opt(sel) {
  let length = sel.options.length - 1;
  for(i = length; i >= 0; i--) {
     sel.remove(i);
  }
}

function stuff(str) {
  if (str == "HATCH" || str == 'RAISE' || str == 'NEXT') {
    document.getElementById('thing').value = str;
    document.getElementById('go').click();
    return;
  }
  document.getElementById('verb').value = str;
  populate(str);
}

// for play, use hand
// for evo, use hand then field
// for attack, use field then field
// for main
// for use, use hand
let refs = { "PLAY": [hand],
             "EVOLVE": [hand, field],
             "ATTACK": [field, field],
             "USE": [hand],
             "MAIN": [field]
};

function next_level(ref) {
  return function() {
  let sel2 = document.getElementById('arg2');
  clear_opt(sel2);

  let e = document.getElementById('arg1');
  let i = e.selectedIndex;
  let o = e[i];
  if (!o) return;
  console.log("XXX");
  console.log(e, i, o);
  console.log("kids are " + o.kids);
  if (o.kids && Array.isArray(o.kids)) {
  for (t of o.kids) {
    var opt2 = document.createElement('option');
    opt2.value = t;
    opt2.innerText = " " + t + " " + (ref[t].name || ref[t].name()) + " ";; 
    sel2.appendChild(opt2);
  }
}  else {
  //
}
}
}

function populate(str) {
  console.log(hand);
  console.log(str);
  console.log();
  let sel = document.getElementById('arg1');
  clear_opt(sel);
  let thingy = plays[str];
  first = null;
  for (let i in thingy) {
    let arg1 = thingy[i];

    let next_step = Array.isArray(arg1); // don't need to do this each loop
    let ref2 = refs[str][1];
    sel.onchange = next_level(ref2);


    let key = next_step ? i : arg1;
    console.log("key is " + key + " and i is " + i + " and next step is " + next_step);
    var opt = document.createElement('option');
    opt.value= key;
    if (!first) first = key;
    //    opt.onChange = function () {console.log(key)};
    // for play, use hand
    // for evo, use hand then field
    // for attack, use field then field
    // for main
    // for use, use hand
    let ref = refs[str][0];
    // what info we display to let them choose
    opt.innerText =  ref[key].name + " " + (ref[key].id||"");
    console.log(33);
    opt.kids = arg1;
    console.log(44);
   
    sel.appendChild(opt);

  }
  console.log(1);
  console.log(sel);
  console.log(2);
  console.log(sel.options);
  console.log(3);
  console.log(sel.options[0]);
  sel.options[0].value = first;
  console.log(sel.onchange);
  if (sel.onchange) sel.onchange();
}
</script>`;
  return ret;
}


router.post('/set_up_board', (req, res) => {
  // this is a duplicate endpoint

  var ip = req.ip ||
    (req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  console.log('Client IP:', ip);

  let gid = clean(req.query.gid);
  let pid = parseInt(req.query.pid);
  //  if (!game_exists(req.query.id)) { res.redirect('/new_game'); return; }

  //et player = (req.query.id == 1) ? game.Player1 : game.Player2;
  //  const player = new Player(playerName);// .getPlayerHand(playerName);

  let launch = parseInt(req.query.launch);

  if (game_exists(gid)) { game._set_up_board(req.query.board) };
  res.send("<hr>" +
    "<form method=GET action=/game/set_up_board>" +
    "<textarea rows=5 cols=100 name=board>\n" +
    `#ignore lines starting with #
#each stack is read left-to-right as the top-to-bottom cards
#status modifiers can appear anywhere
P1:REST,ST15-12,ST15-11,ST15-02 ST15-05 ST15-03,ST15-01
P2:ST16-05,ST16-02,ST16-01 ST16-13 ST16-13,ST16-01 REST,ST16-12
Turn:P1
Memory:4


# Retaliate test 
# P1 has big attackers ready to go, some with big stacks, 
P1:ST15-13 ST15-13,ST15-08 ST15-12,ST15-05,ST15-01 ST15-13 ST15-13 ST15-13 ST15-13
DECK1:ST15-15
# P2 has skullmammothmon ST16-13 on top of ST16-10, 12K blocker on top of inherited Retaliation 
# gotsumon, native retaliation, tapirmon inherited, then gotsumon on tapirmon for both
P2:ST16-13,ST16-10,ST16-01,REST ST16-05,REST  ST16-05,ST16-04,REST   ST16-08,ST16-04,REST  ST16-04,REST
Turn:P1
Memory:2
x

`+
    "</textarea>  <input name=gid value=bob /> <input type=submit value=go /> </form>"
    + req.query);
  //    res.render('deck', { name, player });     

});



module.exports = router;
