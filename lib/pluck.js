
var semver = require('semver');
var debug = require('debug')('snyk:resolve:pluck');
var lru = require('lru-cache');
var options = { max: 100, maxAge: 1000 * 60 * 60 };
var cache = lru(options);

module.exports = function (tree, name, version) {
  var pkg = name + '@' + version;
  var res = cache.get(pkg);
  if (res) {
    debug('pluck %s returned from cache', pkg);
    return res;
  }

  debug('plucking %s@%s', name, version);
  res = pluck(tree, name, version);
  cache.set(pkg, res);
  return res;
};

function pluck(tree, name, version) {

  if (tree.dependencies === false) {
    return false;
  }

  var matches = [];

  if (tree.dependencies[name]) {
    debug('pluck match on name...checking version: %s ~= %s',
      tree.dependencies[name].version, version);
    if (semver.satisfies(tree.dependencies[name].version, version)) {
      debug('pluck match');
      matches.push(tree.dependencies[name]);
    }
  }

  if (matches.length) {
    return matches;
  }

  var keys = Object.keys(tree.dependencies);
  var match = false;

  for (var i = 0; i < keys.length; i++) {
    match = pluck(tree.dependencies[keys[i]], name, version);
    if (match) {
      matches = matches.concat(match);
    }
  }

  return matches;
}