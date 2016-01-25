module.exports = logicalTree;

var Promise = require('es6-promise').Promise; // jshint ignore:line
var pluck = require('./pluck');
var walk = require('./walk');
var depTypes = require('./consts');
var colour = require('ansicolors');
var resolve = require('snyk-resolve');
var path = require('path');
var tryRequire = require('./try-require');
var debug = require('debug')('snyk:resolve');
var ext = colour.bgBlack(colour.green('extraneous'));
var semver = require('semver');

/**
 * This code will build up the logical tree representation of a node package
 * and it's dependencies. This is based initially on reading the directory
 * structure and the package.json files found in each directory.
 *
 * After which, we parse the tree and read the `__dependencies` looking for
 * their actual location on disk (or if it's missing, etc) - marking as we
 * go along that the leaf has been used.
 *
 * After that, we need to search for the original tree for unused leafs, and
 * these will be marked as extraneous and carried through to the logical
 * tree at the same depth.
 *
 * Important: some extraneous modules will actually be from devDependencies
 * from the root level, so we need to handle these carefully.
 */


function logicalTree(fileTree) {
  pluck.reset();
  var logicalRoot = copy(fileTree);
  logicalRoot.dependencies = walkDeps(fileTree, fileTree);
  if (fileTree.problems && fileTree.problems.length) {
    logicalRoot.problems = fileTree.problems.slice(0);
  }

  var rootDir = path.dirname(fileTree.__filename);
  var devDeps = [Promise.resolve()];

  // TODO decide whether I need this still as devDeps are read no matter what
  // in the initial tree walk
  if (fileTree.__devDependencies) {
    devDeps = Object.keys(fileTree.__devDependencies).map(function (name) {
      return resolve(name, rootDir).then(function (dir) {
        return tryRequire(dir + '/package.json');
      });
    });
  }

  return Promise.all(devDeps).then(function (res) {
    // remove dev deps deps (yes) where the dev dep doesn't appear in the deps.
    // this is a bit confusing, but say `debug` were a dev dep, it includes
    // `ms` package, which would look extraneous, but infact it's not.
    var potentialDevDeps = {};
    res.forEach(function (pkg) {
      if (!logicalRoot.dependencies[pkg.name]) {
        Object.keys(pkg.dependencies).forEach(function (name) {
          debug('potentialDevDeps: %s', name);
          potentialDevDeps[name] = pkg.dependencies[name];
        });
      }
    });

    walk(fileTree.dependencies, function (dep, name, tree) {
      if (!dep.__used) {

        if (potentialDevDeps[name] &&
            semver.satisfies(dep.version, potentialDevDeps[name])) {
          delete tree[name];
          return;
        }

        dep.extraneous = true;
        dep.version += ' ' + dep.dep;
        dep.depType = depTypes.EXTRANEOUS;
        var issue = ext + ': ' + dep.__from.join(' > ') + ' > ' + dep.full;
        dep.problems = [issue];
        problem(logicalRoot, issue);
        insertLeaf(logicalRoot, dep);
      }
    });
    return logicalRoot;
  });
}

function insertLeaf(tree, leaf) {
  var path = leaf.__from.slice(1, -1); // remove the root of the path
  var entry = tree.dependencies;
  for (var i = 0; i < path.length; i++) {
    entry = entry[path[i]].dependencies;
  }
  entry[leaf.name] = leaf;
}

function problem(root, issue) {
  if (!root.problems) {
    root.problems = [];
  }
  root.problems.push(issue);
}

function walkDeps(root, tree) {
  var deps = tree.__dependencies;
  if (!deps) {
    debug('no deps');
    return false;
  }

  return Object.keys(deps).reduce(function walkDepsPicker(acc, curr) {
    var version = deps[curr];
    var depsPlucked = pluck(root, curr, version);
    debug('plucked (%s) => %s@%s from %s',
      depsPlucked.length, curr, version, tree.__from);
    var dep = bestMatch(depsPlucked, tree.__from.concat(curr));
    if (!dep) {
      problem(root, 'missing: ' + curr + '@' + version +
              ', required by ' + tree.name + '@' + tree.version);
      return acc;
    }

    var pkg = acc[dep.name] = copy(dep);
    if (!dep.__used) {
      dep.__used = true;
      pkg.dependencies = walkDeps(root, dep);
    }

    return acc;
  }, {});
}

function bestMatch(matches, path) {
  debug('bestMatch on %s', path);
  if ((!path || path.length === 0) && matches.length <= 1) {
    debug('bestMatch defaulting to first');
    return matches[0];
  }
  var best = null;
  var last = [].slice.call(matches, 0);
  for (var i = 0; i < path.length; i++) {
    var remains = matches.filter(function bestMatchFilter(part) {
      // debug(part.__from[i] === path[i], part.__from[i], path[i]);

      return part.__from[i] === path[i] && !part.__used;
    }); // jshint ignore:line

    if (remains.length === 1) {
      best = remains.pop();
      break;
    }

    if (remains.length === 0) {
      best = last.pop();
      break;
    }

    last = remains;
  }

  if (!best) {
    best = last.pop();
  }

  return best;
}

function copy(leaf) {
  return Object.keys(leaf).reduce(function copyIterator(acc, curr) {
    if (leaf[curr] !== undefined && curr.indexOf('__') !== 0) {
      acc[curr] = leaf[curr];
    }
    return acc;
  }, {});

}