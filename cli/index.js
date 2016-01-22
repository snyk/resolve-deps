#!/usr/bin/env node

var walkDepTree = require('../lib/');
var tree = require('@remy/npm-tree');
var fs = require('then-fs');

var usage = 'Usage: snyk-resolve <package-dir>';
var args = require('./args')(process.argv);
var src = args._.shift();

Promise.resolve().then(function () {
  if (!src) {
    throw new Error(usage);
  }

  return fs.stat(src);
}).then(function (found) {
  if (found) {
    console.log('searching deps (incl dev? %s)', args.dev);
    return walkDepTree(src, { dev: args.dev })
      .then(walkDepTree.logicalTree)
      .then(function (res) {
        if (args.json) {
          return console.log(JSON.stringify(res, '', 2));
        }

        console.log(tree(res));
      });
  }

  throw new Error('Can\'t load ' + src);
}).catch(exit);

function exit(error) {
  console.log(error.stack);
  // process.exit(1);
}