module.exports = logicalTree;

var Promise = require('es6-promise').Promise; // jshint ignore:line

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

function logicalTree(tree) {

}

