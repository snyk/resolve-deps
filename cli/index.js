#!/usr/bin/env node

var walkDepTree = require('../lib/');
var tree = require('@remy/npm-tree');
var fs = require('then-fs');

var usage = 'Usage: snyk-resolve <package-dir>';
var src = process.argv[2];

Promise.resolve().then(function () {
  if (!src) {
    throw new Error(usage);
  }

  return fs.stat(src);
}).then(function (found) {
  if (found) {
    return walkDepTree(src, { dev: true }).then(function (res) {
      console.log(tree(walkDepTree.logicalTree(res)));
      // console.log(tree(res));
    });
  }

  throw new Error('Can\'t load ' + src);
}).catch(exit);

function exit(error) {
  console.log(error.stack);
  // process.exit(1);
}