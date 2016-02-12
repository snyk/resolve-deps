module.exports = pluck;

var semver = require('semver');
var moduleToObject = require('snyk-module');
var debug = require('debug')('snyk:resolve:pluck');

function pluck(root, path, name, range) {
  debug('plucking %s@%s', name, range);

  if (range === 'latest') {
    range = '*';
  }

  // Cycle through the tree path via the root tree object **ala node require**.
  // note that we don't need the first item in the path (which is the root
  // package name).
  var from = path.slice(0);
  var rootPath = moduleToObject(from.shift()).name;

  // if the root of the virtual tree doesn't even match our path, bail out
  if (rootPath !== root.name) {
    return false;
  }

  // do a check to see if the last item in the path is actually the package
  // we're looking for, and if it is, drop it
  if (from.length) {
    var tip = moduleToObject(from.slice(-1).pop());
    // note: this could miss the situation when dep@2 > dep@1 ...unsure
    if (tip.name === name) {
      from.pop();
    }
  }

  // strip any extraneous data from the package names
  from = from.map(stripVersion);

  // walk the depth of `from` to find the `dependencies` property from `root`
  // if it can't be found, pop `from` and try again until `from` is empty
  do {
    var pkg = findPackage(root, from.slice(0), name, range);

    if (pkg) {
      return pkg;
    }
  } while (from.pop());

  return false;
}

function findPackage(root, from, name, range) {
  var deps;
  do {
    deps = from.reduce(findDependencyLeaf, root);
  } while (!deps && from.shift());

  var match = getMatch(deps, name, range);

  if (match) {
    return match;
  }
}

function findDependencyLeaf(acc, curr) {
  if (acc.dependencies && acc.dependencies[curr]) {
    return acc.dependencies[curr];
  }
  return false;
}

function stripVersion(value) {
  // support passing the value as the vuln.from
  return moduleToObject(value).name;
}

function getMatch(root, name, range) {
  var dep = root.dependencies && root.dependencies[name];
  if (!dep) {
    return false;
  }

  var version = dep.version;
  debug('pluck match on name...checking version: %s ~= %s', version, range);
  // make sure it matches our range
  var semverMatch = semver.validRange(range) &&
    semver.valid(version) &&
    semver.satisfies(version, range);

  var externalPackage = !semver.validRange(range) &&
    range.indexOf(':/') !== -1;

  if (semverMatch || externalPackage) {
    debug('pluck match');
    if (!dep.dep) {
      dep.dep = range;
    }
    return dep;
  }

  return false;
}