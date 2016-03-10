#!/usr/bin/env node
var clite = require('clite');
clite(require('./config')).catch(function (error) {
  console.log(error.stack);
});