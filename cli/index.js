#!/usr/bin/env node

var fs = require('then-fs');
var resolveTree = require('../lib/');
var filter = require('./filter');
var print = require('./print');
var count = require('./count');

var args = require('./args')(
  process.argv,
  ['filter', 'count'],
  ['help', 'disk', 'json', 'errors', 'dev', 'production', 'optional']
  .concat(filter.flags)
);

var src = args._[2] || process.cwd();

var echo = function (res) {
  console.log(JSON.stringify(res, '', 2));
  return res;
};

Promise.resolve().then(function () {
  if (!src || args.help) {
    return fs.readFile(__dirname + '/../usage.txt', 'utf8')
             .then(console.log)
             .then(process.exit);
  }

  return fs.stat(src);
}).then(function (found) {
  if (found) {
    return resolveTree.physicalTree(src)
      .then(function (res) {
        if (args.disk) {
          return res;
        }

        return resolveTree.logicalTree(res, args);
      })
      .then(function (res) {
        filter(args, res);

        if (args.count) {
          if (typeof args.count === 'boolean' && args.filter) {
            args.count = args.filter;
          }
          return count(args, res);
        }

        if (args.json) {
          return echo(res);
        }

        print(args, res);
      });
  }

  throw new Error('Can\'t load ' + src);
}).catch(exit);

function exit(error) {
  console.log(error.stack);
  process.exit(1);
}