#!/usr/bin/env node

var resolveTree = require('../lib/');
var tree = require('@remy/npm-tree');
var fs = require('then-fs');

var usage = 'Usage: snyk-resolve <package-dir>';
var args = require('./args')(process.argv);
var src = args._.shift();

var echo = function (res) {
  console.log(JSON.stringify(res, '', 2));
  return res;
};

Promise.resolve().then(function () {
  if (!src) {
    throw new Error(usage);
  }

  return fs.stat(src);
}).then(function (found) {
  if (found) {
    return resolveTree(src)
      .then(function (res) {
        if (args.json) {
          return echo(res);
        }

        console.log(tree(res));
        if (res.problems) {
          // console.log(res.problems.join('\n'));
        }
      });
  }

  throw new Error('Can\'t load ' + src);
}).catch(exit);

function exit(error) {
  console.log(error.stack);
  // process.exit(1);
}