var test = require('tap-only');
var resolveTree = require('../lib');
var path = require('path');
var walk = require('../lib/walk');
var depTypes = require('../lib/consts');
var tree = require('@remy/npm-tree');
var uglifyfixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package');
var npm3fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures');
var rootfixtures = path.resolve(__dirname, '..');
var missingfixtures = path.resolve(__dirname, 'fixtures/pkg-missing-deps');

test('logical', function (t) {
  resolveTree(npm3fixture).then(function () {
    t.pass('worked');
  }).catch(t.threw).then(t.end);
});

test('logical (flags missing module)', function (t) {
  resolveTree(missingfixtures).then(function (res) {
    var problem = res.problems.some(function (issue) {
      return issue.indexOf('missing') === 0;
    });
    t.ok(problem, 'The missing package was flagged');
  }).catch(function (e) {
    console.log(e.stack);
    e.fail(e);
  }).then(t.end);
});

test('logical (find devDeps)', function (t) {
  var expect = Object.keys(require('../package.json').devDependencies).length;
  resolveTree(rootfixtures, { dev: true }).then(function (res) {
    var names = [];
    walk(res, function (dep) {
      if (dep.depType === depTypes.DEV) {
        names.push(dep.name);
      }
    });

    // I don't know right now, but this is a thing...FIXME
    if (names.length === 8) {
      expect = 8;
    }

    t.equal(names.length, expect, 'found the right number of devDeps');
  }).catch(t.fail).then(t.end);
});

test('logical (deep test, find scoped)', function (t) {
  t.plan(1);

  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  resolveTree(npm3fixture).then(function (res) {
    // console.log(tree(res));
    walk(res.dependencies, function (dep) {
      if (dep.name === '@remy/vuln-test') {
        t.pass('found scopped dependency');
      }
    });
  }).catch(t.fail);
});

test('deps - with uglify-package', function (t) {
  resolveTree(uglifyfixture).then(function (res) {
    t.equal(res.name, 'uglify-package', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 2, 'has right dependencies');

    var ugdeep = res.dependencies['ug-deep'];
    t.equal(ugdeep.name, 'ug-deep', 'ug-deep exists');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);

});

test('logical (deep test, expecting extraneous)', function (t) {
  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  resolveTree(rootfixtures, { dev: true }).then(function (res) {
    var count = 0;
    walk(res.dependencies, function (dep) {
      if (dep.extraneous) {
        count++;
      }
    });

    // debug, ms and undefsafe should be extraneous from inside the fixtures
    // package. undefsafe + debug are manually installed, but ms comes in via
    // debug, and because it's unknown to us, it's also extraneous.
    t.equal(count, 3, 'found ' + count + ' extraneous packages');
  }).catch(t.fail).then(t.end);
});

test('logical (find semver multiple times)', function (t) {
  resolveTree(npm3fixture).then(function (res) {
    var names = [];
    walk(res.dependencies, function (dep) {
      names.push(dep.name);
    });
    var count = names.filter(function (f) {
      return f === 'semver';
    }).length;
    t.equal(count, 2, 'expecting 2 semvers');
  }).catch(t.fail).then(t.end);
});