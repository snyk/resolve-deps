// Imported from abandoned repo https://github.com/snyk/try-require.
import * as fs from 'then-fs';
import * as path from 'path';
import * as debugModule from 'debug';
import { cloneDeep } from 'lodash';
import * as LRU from 'lru-cache';
import {PackageJsonEnriched} from "./types";

const debug = debugModule('snyk:resolve:try-require');

const options = { max: 100, maxAge: 1000 * 60 * 60 };
export const cache = LRU(options);

export async function tryRequirePackageJson(filename: string): Promise<PackageJsonEnriched | null> {
  const cached = cache.get(filename);
  if (cached) {
    const res = cloneDeep(cached);
    return Promise.resolve(res);
  }
  return fs
    .readFile(filename, 'utf8')
    .then(function (pkgStr) {
      let leadingBOM = '';
      if (pkgStr && pkgStr[0] === '\ufeff') {
        // String starts with UTF BOM. Remove it so that JSON.parse doesn't
        // stumble, but remember it for later use.
        pkgStr = pkgStr.slice(1);
        leadingBOM = '\ufeff';
      }

      const pkg = JSON.parse(pkgStr);
      pkg.leading = leadingBOM + pkgStr.match(/^(\s*){/)[1];
      pkg.trailing = pkgStr.match(/}(\s*)$/)[1];
      return pkg;
    })
    .catch(function (e) {
      debug('tryRequire silently failing on %s', e.message);
      return null;
    })
    .then(function (pkg) {
      if (!pkg) {
        return pkg;
      }

      // fixes potential issues later on
      if (!pkg.devDependencies) {
        pkg.devDependencies = {};
      }

      if (!pkg.dependencies) {
        pkg.dependencies = {};
      }

      if (!pkg.name) {
        pkg.name = path.basename(path.dirname(filename));
      }

      pkg.__filename = filename;

      // test for npm-shrinkwrap and find a .snyk policy file whilst we're at it
      const dir = path.dirname(filename);
      const promises = [
        fs.stat(path.resolve(dir, '.snyk')).catch(pass),
        fs.stat(path.resolve(dir, 'npm-shrinkwrap.json')).catch(pass),
      ];

      return Promise.all(promises).then(function (res) {
        if (!pkg.snyk) {
          pkg.snyk = res[0].isFile();
        }
        if (pkg.snyk) {
          pkg.snyk = dir;
        }

        if (res[1].isFile()) {
          pkg.shrinkwrap = true;
        }

        return pkg;
      });
    })
    .then(function (pkg) {
      cache.set(filename, pkg);
      return cloneDeep(pkg);
    });
}

const pass = function () {
  return {
    isFile: function () {
      return false;
    },
  };
};
