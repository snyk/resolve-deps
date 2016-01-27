module.exports = pluck;

var semver = require('semver');
var debug = require('debug')('snyk:resolve:pluck');

function pluck(root, path, name, range) {
  debug('plucking %s@%s', name, range);

  // Cycle through the tree path via the root tree object **ala node require**.
  // note that we don't need the first item in the path (which is the root
  // package name).
  var rootPath = path[0];
  if (rootPath.indexOf('@') > 0) {
    rootPath = rootPath.split('@')[0];
  }

  if (rootPath !== root.name) {
    return false;
  }

  // make a copy (in case it's an important ref)
  var from = path.map(stripVersion).slice(1);
  var dep = false;
  var leaf = false;
  var match = false;

  do {
    if (from.length === 0) {
      leaf = root;
    } else {
      leaf = from.reduce(findDependencyLeaf, root);
    }

    dep = getDependency(leaf, name);

    if (dep) {
      match = getMatch(dep, range);
      if (match) {
        return match;
      }
    }
  } while (from.pop());

  // now cycle the path to see if we can find it hidden there
  from = path.slice(1, -1).map(stripVersion);

  do {
    leaf = root.dependencies[from.shift()];
    if (leaf && leaf.dependencies[name]) {
      dep = getDependency(leaf, name);
      if (dep) {
        match = getMatch(dep, range);
        if (match) {
          return match;
        }
      }
    }
  } while (from.length);

  return false;
}

function stripVersion(value) {
  // support passing the value as the vuln.from
  if (value.indexOf('@') > 0) {
    return value.split('@')[0];
  }

  return value;
}

function getMatch(dep, range) {
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

function getDependency(leaf, name) {
  if (!leaf || !leaf.dependencies) {
    return null;
  }
  return leaf.dependencies[name] || null;
}

function findDependencyLeaf(acc, curr) {
  if (acc.dependencies && acc.dependencies[curr]) {
    return acc.dependencies[curr];
  }
  return false;
}