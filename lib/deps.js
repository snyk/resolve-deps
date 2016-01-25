module.exports = loadModules;

var depTypes = require('./consts');
var fs = require('then-fs');
var _ = require('lodash');
var debug = require('debug')('snyk:resolve:deps');
var Promise = require('es6-promise').Promise; // jshint ignore:line
var path = require('path');
var semver = require('semver');
var resolve = require('snyk-resolve');
var tryRequire = require('./try-require');

// FIXME only supports dependancies & dev deps not opt-deps
function loadModules(root) {
  var options = { dev: true };
  return loadModulesInternal(root, null, options).then(function (tree) {
    // ensure there's no missing packages our known root deps
    var missing = [];
    if (tree.__dependencies) {
      Object.keys(tree.__dependencies).forEach(function (name) {
        if (!tree.dependencies[name]) {
          missing.push(resolve(name, root).then(function (dir) {
            return loadModulesInternal(dir, depTypes.PROD, options);
          }));
        }
      });
    }

    if (missing.length) {
      return Promise.all(missing).then(function (packages) {
        packages.forEach(function (pkg) {
          pkg.dep = tree.__dependencies[pkg.name];
          tree.dependencies[pkg.name] = pkg;
        });
        return tree;
      });
    }

    return tree;
  });

}

function loadModulesInternal(root, rootDepType, options, parent) {
  if (!rootDepType) {
    rootDepType = depTypes.EXTRANEOUS;
  }

  if (typeof root !== 'string') {
    return Promise.reject(new Error('module path must be a string'));
  }

  var modules = {};
  var dir = path.resolve(root, 'package.json');
  // 1. read package.json for written deps
  var promise = tryRequire(dir).then(function (pkg) {
    // if there's a package found, collect this information too
    if (pkg) {
      modules = {
        name: pkg.name,
        version: pkg.version || null,
        license: pkg.license || 'none',
        depType: rootDepType,
        hasDevDependencies: !!pkg.devDependencies,
        full: pkg.name + '@' + (pkg.version || '0.0.0'),
        __from: (parent || { __from: [] }).__from,
        __devDependencies: pkg.devDependencies,
        __dependencies: pkg.dependencies,
        __filename: pkg.__filename,
      };

      // allows us to add to work out the full path that the package was
      // introduced via
      pkg.__from = modules.__from.concat(pkg.name);

      // this is a special case for the root package to get a consistent
      // __from path, so that the complete path (including it's own pkg name)
      if (modules.__from.length === 0) {
        modules.__from.push(pkg.name);
      }
    } else {
      throw new Error(dir + ' is not a node project');
    }
    modules.dependencies = {};

    // only read the dev deps on the first pass, don't go any further (which is
    // why we set `options.dev = false`), and we merge them into the
    // pkg.dependencies property.
    if (options.dev) {
      // _.merge(modules.__dependencies, pkg.devDependencies || {});
    }

    options.dev = false;


    // 2. check actual installed deps
    return fs.readdir(path.resolve(root, 'node_modules')).then(function (dirs) {
      var res = dirs.map(function (dir) {
        // completely ignore `.bin` npm helper dir
        if (dir === '.bin' || dir === '.DS_Store') {
          return null;
        }

        // this is a scoped namespace, and we'd expect to find directories
        // inside *this* `dir`, so treat differently
        if (dir.indexOf('@') === 0) {
          debug('scoped reset on %s', dir);
          dir = path.resolve(root, 'node_modules', dir);
          return fs.readdir(dir).then(function (dirs) {
            return Promise.all(dirs.map(function (scopedDir) {
              return tryRequire(path.resolve(dir, scopedDir, 'package.json'));
            }));
          });
        }

        // otherwise try to load a package.json from this node_module dir
        dir = path.resolve(root, 'node_modules', dir, 'package.json');
        return tryRequire(dir);
      });

      return Promise.all(res).then(function (res) {
        res = _.flatten(res).filter(Boolean);

        // if res.length === 0 we used to throw MISSING_NODE_MODULES but we're
        // not doing that now, and I think it's okay.

        res.reduce(function (acc, curr) {
          var license;
          var licenses = curr.license || curr.licenses;

          if (Array.isArray(licenses)) {
            license = licenses.reduce(function (acc, curr) {
              acc.push((curr || {}).type || curr);
              return acc;
            }, []).join('/');
          } else {
            license = (licenses || {}).type || licenses;
          }

          var depType = rootDepType;
          if (pkg.dependencies && pkg.dependencies[curr.name]) {
            depType = depTypes.PROD;
          } else if (pkg.devDependencies && pkg.devDependencies[curr.name]) {
            depType = depTypes.DEV;
          }

          var valid = false;
          if (pkg.dependencies) {
            valid = semver.satisfies(curr.version, pkg.dependencies[curr.name]);
          }

          var depFrom = depType === depTypes.DEV ?
            pkg.devDependencies[curr.name] :
            pkg.dependencies[curr.name];

          acc[curr.name] = {
            name: curr.name,
            version: curr.version || null,
            full: curr.name + '@' + (curr.version || '0.0.0'),
            valid: valid,
            depType: depType,
            snyk: curr.snyk,
            license: license || 'none',
            dep: depFrom || null,
            __from: pkg.__from.concat(curr.name),
            __devDependencies: curr.devDependencies,
            __dependencies: curr.dependencies,
            __filename: curr.__filename,
          };
          return acc;
        }, modules.dependencies);

        return modules;
      });
    }).then(function (modules) {
      var deps = Object.keys(modules.dependencies);

      // TODO decide if we can really remove this - I can't see how it's ever
      // called in real life...
      // if (deps.length === 0) {
      //   modules.dependencies = false;
      //   return modules;
      // }

      var promises = deps.map(function (dep) {
        var depType = modules.dependencies[dep].depType;
        var dir = path.resolve(root, 'node_modules', dep);
        return loadModulesInternal(dir, depType, options, pkg);
      });

      return Promise.all(promises).then(function (res) {
        res.forEach(function (mod) {
          modules.dependencies[mod.name].dependencies = mod.dependencies;
        });

        return modules;
      });
    }).catch(function (error) {
      // TODO decide whether it's okay that we keep throwing errors
      // will this process get faster without it? (possibly...)
      /* istanbul ignore else  */
      if (error.code === 'ENOENT') {
        // there's no node_modules directory, that's fine, there's no deps
        modules.dependencies = false;
        return modules;
      }

      /* istanbul ignore next */
      throw error;
    });
  });

  return promise;
}