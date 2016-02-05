#!/usr/bin/env node

var resolveTree = require('../lib/');
var tree = require('@remy/npm-tree');
var fs = require('then-fs');
var toObject = require('snyk-module');
var walk = require('../lib/walk');
var semver = require('semver');

var usage = 'Usage: snyk-resolve <package-dir>';
var args = require('./args')(process.argv);
var src = args._.shift() || process.cwd();

if (args.h || args.help) {
  console.log(usage);
  process.exit(0);
}


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
    return resolveTree(src, args)
      .then(function (res) {
        if (args.json) {
          return echo(res);
        }

        if (args.count) {
          var match = toObject(args.count);
          var count = [];
          walk(res, function (dep) {
            if (dep.name === match.name) {
              if (semver.satisfies(dep.version, match.version)) {
                count.push(dep);
              }
            }
          });
          console.log('%s %s@%s', count.length, match.name, match.version);
          count.forEach(function (dep) {
            console.log(' - %s - %s', dep.full, (dep.from || []).join(' > '));
          });
          return;
        }

        console.log(tree(res));
        if (res.problems && res.problems.length) {
          console.log(res.problems.join('\n'));
        }
      });
  }

  throw new Error('Can\'t load ' + src);
}).catch(exit);

function exit(error) {
  console.log(error.stack);
  // process.exit(1);
}