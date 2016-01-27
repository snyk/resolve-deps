module.exports = pluck;

var semver = require('semver');
var debug = require('debug')('snyk:resolve:pluck');

function pluck(root, path, name, range) {
  debug('plucking %s@%s', name, range);

  // Cycle through the tree path via the root tree object **ala node require**.
  // note that we don't need the first item in the path (which is the root
  // package name).
if (name === '@remy/npm-tree') debugger;
  var rootPath = path[0];
  if (rootPath.indexOf('@') > 0) {
    rootPath = rootPath.split('@')[0];
  }

  var from = path.map(function (path) {
    if (path.indexOf('@') > 0) { // support passing the path as the vuln.from
      return path.split('@')[0];
    }

    return path;
  }).slice(1); // make a copy (in case it's an important ref)
  var leaf = false;

  do {
    if (from.length === 0) {
      leaf = root.name === rootPath ? root : {};
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
        if (!dep.dep) {
          dep.dep = range;
        }
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