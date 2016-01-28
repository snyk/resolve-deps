module.exports = pluck;

var semver = require('semver');
var moduleToObject = require('snyk-module');
var debug = require('debug')('snyk:resolve:pluck');

function pluck(root, path, name, range) {
  debug('plucking %s@%s', name, range);

  // Cycle through the tree path via the root tree object **ala node require**.
  // note that we don't need the first item in the path (which is the root
  // package name).
  var rootPath = moduleToObject(path[0]).name;

  if (rootPath !== root.name) {
    return false;
  }

  // make a copy (in case it's an important ref)
  var from = path.map(stripVersion).slice(1);
  var deps = false;
  var leaf = false;
  var match = false;

  leaf = root;
  var position = 0;
  var leafStack = [root];

  if (from.length === 0) {
    return getMatch(getDependency(root, name), range);
  }

  do {
    deps = getDependency(leaf, from[position]);

    if (deps) {
      match = getMatch(getDependency(deps, name), range);
      if (match) {
        return match; // break
      }

      // store the old leaf
      leafStack.push(leaf);

      // and move forward
      leaf = deps;
    } else {
      // rewind back through the leaves
      position--;
      leaf = leafStack.pop();
    }

    position++;
  } while (position < from.length);

  // handle the case where the found package is at the very root
  if (getDependency(root, name)) {
    return getMatch(root.dependencies[name], range);
  }

  return false;
}

function stripVersion(value) {
  // support passing the value as the vuln.from
  return moduleToObject(value).name;
}

function getMatch(dep, range) {
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

function getDependency(leaf, name) {
  if (!leaf || !leaf.dependencies) {
    return null;
  }

  return leaf.dependencies[name] || null;
}