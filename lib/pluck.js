module.exports = pluck;

var semver = require('semver');
var debug = require('debug')('snyk:resolve:pluck');

function pluck(root, path, name, range) {
  debug('plucking %s@%s', name, range);

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

    var dep = getDependency(leaf, name);

    if (dep) {
      var version = dep.version;
      debug('pluck match on name...checking version: %s ~= %s', version, range);
      // make sure it matches our range
      var semverMatch = semver.validRange(range) &&
        semver.valid(version) &&
        semver.satisfies(version, range);

      var externalPackage = !semver.validRange(version) &&
        version.indexOf(':/') !== -1;

      if (semverMatch || externalPackage) {
        debug('pluck match');
        dep.dep = range;
        return dep;
      }
    }
  } while (from.pop());

  return false;
}

function getDependency(leaf, name) {
  if (!leaf || !leaf.dependencies) {
    return null;
  }
  return leaf.dependencies[name] || null;
}

function findDependencyLeaf(acc, curr) {
  if (acc.dependencies[curr]) {
    return acc.dependencies[curr];
  }
  return false;
}