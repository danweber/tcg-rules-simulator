
//import express, { Express, Request, Response } from "express";
//import dotenv from "dotenv";

var express = require('express');
var router = express.Router();

// this ois unused???

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
router.get('build/*', (req, res) => {
  res.sendFile(path.join(__dirname+'/build/index.html'));
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Rule Simulator v0.505050' });
});

module.exports = router;
