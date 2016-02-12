module.exports = print;

var tree = require('snyk-tree');
var colour = require('ansicolors');
var path = require('path');
var ext = colour.bgBlack(colour.green('extraneous'));
var bundled = colour.bgBlack(colour.yellow('bundled'));

function print(args, res) {
  res.version += ' ' + path.dirname(res.__filename);
  console.log(tree(res, function (leaf) {
    var label = leaf.full;

    if (leaf.extraneous) {
      label += ' ' + ext;
    }

    if (leaf.bundled) {
      label += ' ' + bundled;
    }

    return label;
  }));

  if (args.errors && res.problems && res.problems.length) {
    console.log(res.problems.join('\n'));
  }
}