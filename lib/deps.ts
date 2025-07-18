// TODO(kyegupov): avoid default exports
export = loadModules;

import * as depTypes from './dep-types';
import * as fs from 'then-fs';
import { get as _get } from 'lodash';
import { set as _set } from 'lodash';
import { clone as _clone } from 'lodash';
import { assign as _assign } from 'lodash';
import { flatten as _flatten } from 'lodash';
import * as debugModule from 'debug';
import * as path from 'path';
import * as semver from 'semver';
import * as resolve from 'snyk-resolve';
import { tryRequirePackageJson, cache as tryRequireCache } from './try-require';
import { AbbreviatedVersion, PackageExpanded, PackageJsonEnriched } from './types';

const debug = debugModule('snyk:resolve:deps');

function applyExtraFields(src, dest, extraFields) {
  if (!extraFields || !extraFields.length) {
    return;
  }
  extraFields.forEach(function applyExtraField(field) {
    _set(dest, field, _get(src, field) || null);
  });
}

// FIXME: only supports dependencies & dev deps not opt-deps
async function loadModules(root: string, depType: string | null, options) {
  tryRequireCache.reset(); // reset the package cache on re-run

  let opt = _clone(options || {});
  let pkgRoot = root;

  if (opt.file) {
    const pathInfo = path.parse(opt.file);
    pkgRoot = path.resolve(pkgRoot, pathInfo.dir);
    opt.file = pathInfo.base;
  }

  const tree = await loadModulesInternal(
    pkgRoot,
    depType || null,
    null,
    opt,
  );
  // ensure there's no missing packages our known root deps
  let missing: Promise<PackageExpanded>[] = [];
  if (tree.__dependencies) {
    Object.keys(tree.__dependencies).forEach(function (name) {
      if (!tree.dependencies[name]) {
        missing.push(resolve(name, pkgRoot).then(function (dir) {
          return loadModulesInternal(dir, depTypes.PROD, {
            __from: [tree.name + '@' + tree.version, name],
          });
        }).catch(function (e) {
          if (e.code === 'NO_PACKAGE_FOUND') {
            return false;
          }
        }));
      }
    });
  }

  if (missing.length) {
    return Promise.all(missing).then(function (packages) {
      packages.filter(Boolean).forEach(function (pkg) {
        pkg.dep = tree.__dependencies[pkg.name];
        tree.dependencies[pkg.name] = pkg;
      });
      return tree;
    });
  }

  return tree;
}

function loadModulesInternal(root, rootDepType, parent, options?): Promise<PackageExpanded> {
  options = options || {};
  if (!rootDepType) {
    rootDepType = depTypes.EXTRANEOUS;
  }

  if (typeof root !== 'string') {
    return Promise.reject(new Error('module path must be a string'));
  }

  let modules = {} as PackageExpanded;
  let dir = path.resolve(root, options.file || 'package.json');
  // 1. read package.json for written deps
  let promise = tryRequirePackageJson(dir).then(function (pkg) {
    // if there's a package found, collect this information too
    if (pkg) {
      let full = pkg.name + '@' + (pkg.version || '0.0.0');
      modules = {} as PackageExpanded;
      applyExtraFields(pkg, modules, options.extraFields);
      _assign(modules, {
        name: pkg.name,
        version: pkg.version || null,
        license: pkg.license || 'none',
        depType: rootDepType,
        hasDevDependencies: !!pkg.devDependencies,
        full: full,
        __from: (parent || { __from: [] }).__from,
        __devDependencies: pkg.devDependencies,
        __dependencies: pkg.dependencies,
        __optionalDependencies: pkg.optionalDependencies,
        __bundleDependencies: pkg.bundleDependencies,
        __filename: pkg.__filename,
      });

      // allows us to add to work out the full path that the package was
      // introduced via
      pkg.__from = modules.__from.concat(full);
      pkg.full = modules.full;

      // flag and track where a shrinkwrapped package comes from
      if (!pkg.shrinkwrap && parent && parent.shrinkwrap) {
        pkg.shrinkwrap = parent.shrinkwrap;
      } else if (pkg.shrinkwrap) {
        pkg.shrinkwrap = pkg.full;
      }

      // this is a special case for the root package to get a consistent
      // __from path, so that the complete path (including it's own pkg name)
      if (modules.__from.length === 0) {
        modules.__from.push(full);
      }
    } else {
      throw new Error(dir + ' is not a node project');
    }
    modules.dependencies = {};

    // 2. check actual installed deps
    return fs.readdir(path.resolve(root, 'node_modules')).then(function (dirs) {
      let res: AbbreviatedVersion[] = dirs.map(function (directory) {
        // completely ignore `.bin` npm helper dir
        // ~ can be a symlink to node_modules itself
        // (https://www.npmjs.com/package/link-tilde)
        if (['.bin', '.DS_Store', '~'].indexOf(directory) >= 0) {
          return null;
        }

        // this is a scoped namespace, and we'd expect to find directories
        // inside *this* `dir`, so treat differently
        if (directory.indexOf('@') === 0) {
          debug('scoped reset on %s', directory);
          directory = path.resolve(root, 'node_modules', directory);
          return fs.readdir(directory).then(function (directories) {
            return Promise.all(directories.map(function (scopedDir) {
              return tryRequirePackageJson(path.resolve(directory, scopedDir, 'package.json'));
            }));
          });
        }

        // otherwise try to load a package.json from this node_module dir
        directory = path.resolve(root, 'node_modules', directory);
        return fs.realpath(directory).then(function (realDirectory) {
          if (realDirectory === root) {
            return null;
          } else {
            return tryRequirePackageJson(path.resolve(directory, 'package.json'));
          }
        });
      });

      return Promise.all(res).then(function (response) {
        response = _flatten(response).filter(Boolean);

        // if res.length === 0 we used to throw MISSING_NODE_MODULES but we're
        // not doing that now, and I think it's okay.

        // TODO: convert reduces to more readable code throughout
        response.reduce(function (acc, curr) {
          let license;
          let licenses = curr.license as any || curr.licenses as any;

          if (Array.isArray(licenses)) {
            license = licenses.reduce(function (accumulator, current) {
              accumulator.push((current || {}).type || current);
              return accumulator;
            }, []).join('/');
          } else {
            license = (licenses || {}).type || licenses;
          }

          let depInfo = depTypes(curr.name!, pkg);
          let depType = depInfo.type || rootDepType;
          let depFrom = depInfo.from;

          let valid = false;
          if (depFrom) {
            valid = semver.satisfies(curr.version as string, depFrom);
          }

          let full = curr.name + '@' + (curr.version || '0.0.0');
          acc[curr.name!] = {} as PackageExpanded;
          applyExtraFields(curr, acc[curr.name!], options.extraFields);
          _assign(acc[curr.name!], {
            name: curr.name,
            version: curr.version || null,
            full: full,
            valid: valid,
            depType: depType,
            snyk: curr.snyk,
            license: license || 'none',
            dep: depFrom || null,
            __from: pkg.__from.concat(full),
            __devDependencies: curr.devDependencies,
            __dependencies: curr.dependencies,
            __optionalDependencies: curr.optionalDependencies,
            __bundleDependencies: curr.bundleDependencies,
            __filename: curr.__filename,
          });

          if (depInfo.bundled) {
            acc[curr.name!].bundled = acc[curr.name!].__from.slice(0);
          }

          if (pkg.shrinkwrap) {
            acc[curr.name!].shrinkwrap = pkg.shrinkwrap;
          }

          return acc;
        }, modules.dependencies);

        return modules;
      });
    }).then(function (mods) {
      let deps = Object.keys(mods.dependencies);

      let promises = deps.map(function (dep) {
        let depType = mods.dependencies[dep].depType;
        let directory = path.dirname(mods.dependencies[dep].__filename);
        return loadModulesInternal(directory, depType, pkg);
      });

      return Promise.all(promises).then(function (res) {
        res.forEach(function (mod) {
          mods.dependencies[mod.name].dependencies = mod.dependencies;
        });

        return mods;
      });
    }).catch(function (error) {
      // TODO decide whether it's okay that we keep throwing errors
      // will this process get faster without it? (possibly...)
      /* istanbul ignore else  */
      if (error.code === 'ENOENT') {
        // there's no node_modules directory, that's fine, there's no deps
        modules.dependencies = {};
        return modules;
      }

      /* istanbul ignore next */
      throw error;
    });
  });

  return promise;
}
