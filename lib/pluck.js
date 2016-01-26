module.exports = pluck;

var semver = require('semver');
var debug = require('debug')('snyk:resolve:pluck');

function pluck(root, path, name, version) {
  debug('plucking %s@%s', name, version);

  // Cycle through the tree path via the root tree object **ala node require**.
  // note that we don't need the first item in the path (which is the root
  // package name).
  var from = path.slice(1); // make a copy (just in case it's an important ref)
  var leaf = false;

  do {
    if (from.length === 0) {
      leaf = root.name === path[0] ? root : {};
    } else {
      leaf = from.reduce(findDependencyLeaf, root);
    }

    if (leaf.dependencies && leaf.dependencies[name]) {
      debug('pluck match on name...checking version: %s ~= %s',
        leaf.dependencies[name].version, version);
      // make sure it matches our range
      if (semver.satisfies(leaf.dependencies[name].version, version) ||
        // OR the version could be a github url, which is basically: * range
          (!semver.valid(version) && version.indexOf('/') !== -1)) {
        debug('pluck match');
        return leaf.dependencies[name];
      }
    }
  } while (from.pop());

  return false;
}

function findDependencyLeaf(acc, curr) {
  if (acc.dependencies[curr]) {
    return acc.dependencies[curr];
  }
  return false;
}