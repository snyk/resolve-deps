module.exports = loadModules;

var depTypes = require('./consts');
var fs = require('then-fs');
var _ = require('lodash');
var Promise = require('es6-promise').Promise; // jshint ignore:line
var path = require('path');
var semver = require('semver');
var tryRequire = require('./try-require');

// FIXME only supports dependancies & dev deps not opt-deps
function loadModules(root, options) {
  if (!options) {
    options = {};
  }

  return loadModulesInternal(root, null, options);
}

function loadModulesInternal(root, rootDepType, options, parent) {
  if (!rootDepType) {
    rootDepType = depTypes.EXTRANEOUS;
  }

  if (typeof root !== 'string') {
    throw new Error('module path must be a string');
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

      // FIXME remove
      // this is a special case for the root package to get a consistent
      // __from path, so that the complete path (including it's own pkg name)
      if (modules.__from.length === 0) {
        modules.__from.push(pkg.name);
      }
    } else {
      throw new Error(root + ' is not a node project');
    }
    modules.dependencies = {};

    // only read the dev deps on the first pass, don't go any further (which is
    // why we set `options.dev = false`), and we merge them into the
    // pkg.dependencies property.
    if (options.dev) {
      _.merge(modules.__dependencies, pkg.devDependencies || {});
    }

    options.dev = false;


    // 2. check actual installed deps
    return fs.readdir(path.resolve(root, 'node_modules')).then(function (dirs) {
      var res = dirs.map(function (dir) {
        // completely ignore `.bin` npm helper dir
        if (dir === '.bin') {
          return null;
        }

        // this is a scoped namespace, and we'd expect to find directories
        // inside *this* `dir`, so treat differently
        if (dir.indexOf('@') === 0) {
          dir = path.resolve(root, 'node_modules', dir);
          return fs.readdir(dir).then(function (dirs) {
            return Promise.all(dirs.map(function (scopedDir) {
              dir = path.resolve(dir, scopedDir, 'package.json');
              return tryRequire(dir);
            }));
          });
        }


        // otherwise try to load a package.json from this node_module dir
        dir = path.resolve(root, 'node_modules', dir, 'package.json');
        return tryRequire(dir);
      });

      return Promise.all(res).then(function (res) {
        res = _.flatten(res).filter(Boolean);

        if (res.length === 0) {
          // effectively not a node module
          var e = new Error('missing node_modules');
          e.code = 'MISSING_NODE_MODULES';
          throw e;
        }

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
          if (depType !== depTypes.DEV) {
            if (pkg.dependencies && pkg.dependencies[curr.name]) {
              depType = depTypes.PROD;
            } else if (pkg.devDependencies && pkg.devDependencies[curr.name]) {
              depType = depTypes.DEV;
            }
          }

          // By default include all modules, but optionally skip devDeps
          if (depType === depTypes.DEV && !options.dev) {
            return acc;
          }

          var valid = false;
          if (pkg.dependencies) {
            valid = semver.satisfies(curr.version, pkg.dependencies[curr.name]);
          }

          acc[curr.name] = {
            name: curr.name,
            version: curr.version || null,
            full: curr.name + '@' + (curr.version || '0.0.0'),
            valid: valid,
            depType: depType,
            snyk: curr.snyk,
            license: license || 'none',
            dep: pkg.dependencies ? pkg.dependencies[curr.name] || null : null,
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

      if (deps.length === 0) {
        modules.dependencies = false;
        return modules;
      }

      var promises = deps.map(function (dep) {
        var depType = modules.dependencies[dep].depType;
        var dir = path.resolve(root, 'node_modules', dep);
        return loadModulesInternal(dir, depType, options, pkg);
      });

      return Promise.all(promises).then(function (res) {
        res.forEach(function (mod) {
          // console.log(modules.dependencies[mod.name], mod.name, mod);
          modules.dependencies[mod.name].dependencies = mod.dependencies;
        });

        return modules;
      });
    }).catch(function (error) {
      // TODO decide whether it's okay that we keep throwing errors
      // will this process get faster without it? (possibly...)
      if (error.code === 'ENOENT') {
        // there's no node_modules directory, that's fine, there's no deps
        modules.dependencies = false;
        return modules;
      }

      throw error;
    });
  });

  return promise;
}