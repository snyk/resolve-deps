module.exports = logicalTree;

var Promise = require('es6-promise').Promise; // jshint ignore:line
var pluck = require('./pluck');
var walk = require('./walk');
var depTypes = require('./consts');
var colour = require('ansicolors');
var _ = require('lodash');
var ext = colour.bgBlack(colour.green('extraneous'));

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


function logicalTree(fileTree, options) {
  if (!options) {
    options = {};
  }
  var logicalRoot = copy(fileTree);
  logicalRoot.dependencies = walkDeps(fileTree, fileTree);
  if (fileTree.problems && fileTree.problems.length) {
    logicalRoot.problems = fileTree.problems.slice(0);
  }

  var removedPaths = [];

  // do a shallow pass on the deps and strip out dev deps
  Object.keys(fileTree.dependencies).forEach(function (name) {
    var dep = fileTree.dependencies[name];
    // if we're not interested in devDeps, then strip them out
    if (!options.dev && dep.depType === depTypes.DEV) {
      // since dev deps are only ever on the root, we know we can remove it
      // directly from the logicalRoot.dependencies
      removedPaths.push(dep.__from);
      delete logicalRoot.dependencies[dep.name];
      return;
    }
  });


  walk(fileTree.dependencies, function (dep) {
    if (!dep.__used) {
      var deppath = dep.__from.slice(0, -1).toString();
      var removed = removedPaths.filter(function (path) {
        return deppath.indexOf(path) === 0;
      }).length;

      if (removed) {
        return false; // this was from a dev dep, so let's lose it
      }

      dep.extraneous = true;
      dep.depType = depTypes.EXTRANEOUS;
      var issue = ext + ': ' + dep.name + '@' + dep.version + ' (from ' +
        dep.dep + ') > ' + dep.__filename;
      dep.problems = [issue];
      problem(logicalRoot, issue);
      insertLeaf(logicalRoot, dep, fileTree);
    }
  });

  logicalRoot.pluck = pluck.bind(null, fileTree);

  return logicalRoot;
}

function insertLeaf(tree, leaf) {
  var path = (leaf.__from || []).slice(1, -1); // remove the root of the path
  var entry = tree.dependencies;
  for (var i = 0; i < path.length; i++) {
    if (entry[path[i]]) {
      entry = entry[path[i]].dependencies;
    }
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
  // only include the devDeps on the root level package
  var deps = _.extend({}, tree.__dependencies, tree.__from.length === 1 ?
    tree.__devDependencies : {});
  return Object.keys(deps).reduce(function walkDepsPicker(acc, curr) {
    var version = deps[curr];
    var dep = pluck(root, tree.__from, curr, version);

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

function copy(leaf) {
  var res = Object.keys(leaf).reduce(function copyIterator(acc, curr) {
    if (leaf[curr] !== undefined && curr.indexOf('__') !== 0) {
      acc[curr] = leaf[curr];
    }
    return acc;
  }, {});
  // res.from = leaf.__from.slice(0);
  return res;
}