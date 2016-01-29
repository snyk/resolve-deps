module.exports = tryRequire;

var fs = require('then-fs');
var path = require('path');
var debug = require('debug')('snyk:resolve:try-require');
var cloneDeep = require('lodash').cloneDeep;
var Promise = require('es6-promise').Promise; // jshint ignore:line
var lru = require('lru-cache');
var options = { max: 100, maxAge: 1000 * 60 * 60 };
var cache = lru(options);

function tryRequire(filename) {
  var cached = cache.get(filename);
  // debug('loading %s (cached? %s)',
  if (cached) {
    return Promise.resolve(cloneDeep(cached));
  }
  return fs.readFile(filename, 'utf8')
    .then(JSON.parse)
    .catch(function (e) {
      debug('tryRequire silently failing on %s', e.message);
      return null;
    })
    .then(function (pkg) {
      if (!pkg) {
        return pkg;
      }

      // also try to find a .snyk policy file whilst we're at it
      var dir = path.dirname(filename);
      if (!pkg.snyk) {
        pkg.snyk = fs.existsSync(path.resolve(dir, '.snyk'));
      }
      if (pkg.snyk) {
        pkg.snyk = dir;
      }

      // fixes potential issues later on
      if (!pkg.devDependencies) {
        pkg.devDependencies = {};
      }

      if (!pkg.dependencies) {
        pkg.dependencies = {};
      }

      pkg.__filename = filename;

      return pkg;
    })
    .then(function (pkg) {
      cache.set(filename, pkg);
      return cloneDeep(pkg);
    });
}