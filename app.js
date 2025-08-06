var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

const env_test = process.env.ENV_TEST;

var indexRouter = require('./routes/index');
var gameRouter = require('./routes/game');

var words = ['time', 'way', 'year', 'work', 'government', 'day', 'man', 'world', 'life', 'part', 'house', 'course', 'case', 'system', 'place', 'end', 'group', 'company', 'party', 'information', 'school', 'fact', 'money', 'point', 'example', 'state', 'business', 'night', 'area', 'water', 'thing', 'family', 'head', 'hand', 'order', 'john', 'side', 'home']

var app = express();

var corsOptions = {
  origin: ['http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.2.133:3000/'],
  optionsSuccessStatus: 200
}

app.use(cors())

// Serve static files from the React app
//app.use('/ui', express.static(path.join(__dirname, 'ui')));

let prior_ip = "x";

app.use(function (req, res, next) {
  var ip = req.ip ||
    (req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  if (prior_ip != ip) {
    prior_ip = ip;
    ///console.log('Client IP a:', ip);
  }
  next();
});


app.use(express.json());

// if someone wants to add extra routes, include them here; if not, do nothing
try {
  const routesPath = path.join(__dirname, 'extra.js');
  const loadApp = require(routesPath);
  loadApp(app);
} catch (e) {
  console.log(e); // not really an error, this file is optional 
}


// Serve static files from the React app
app.use('/build', express.static(path.join(__dirname, 'build')));

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')))



// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.

//app.get('build/*', (req, res) => {
//  res.sendFile(path.join(__dirname+'/build/index.html'));
//});


app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));


if (true) {
  //var app = express.Router();

  app.set('views', path.join(__dirname, '/views'));
  app.set('view engine', 'ejs');
  app.get('/', function (req, res, next) {
    let index = Math.floor(Math.random() * words.length);
    let word = words[index]
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    const title = 'Rule Simulator v0.9.34.1.11'
    console.log("version is " + title);
    res.render('index', { title: title, word: word, text: url, test: env_test });
  });

  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));


  app.use('/', indexRouter);
  app.use('/game', gameRouter);

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });
  // error handler
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', { error: err });
  });
}

//app.set('trust proxy', true);



app.use(logger('dev')); // pushed down

module.exports = app;
