module.exports = pluck;

var semver = require('semver');

function pluck(tree, name, version) {
  if (tree.dependencies === false) {
    return false;
  }

  if (tree.dependencies[name]) {
    if (semver.satisfies(tree.dependencies[name].version, version)) {
      return tree.dependencies[name];
    }
  }

  return pluck(tree.dependencies, name, version);
}