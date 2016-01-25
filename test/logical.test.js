var test = require('tap-only');
var deps = require('../lib/deps');
var logical = require('../lib/logical');
var path = require('path');
var walk = require('../lib/walk');
var tree = require('@remy/npm-tree');
var npm3fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures');
var rootfixtures = path.resolve(__dirname, '..');

test('logical (dev:false)', function (t) {
  deps(npm3fixture).then(logical).then(function () {
    t.pass('worked');
  }).catch(t.fail).then(t.end);
});

test('logical (deep test, find scoped)', function (t) {
  t.plan(1);

  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  deps(npm3fixture).then(logical).then(function (res) {
    // console.log(tree(res));
    walk(res.dependencies, function (dep) {
      if (dep.name === '@remy/vuln-test') {
        t.pass('found scopped dependency');
      }
    });
  }).catch(t.fail);
});

test('logical (deep test, expecting 1 extraneous)', function (t) {
  t.plan(1);

  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  deps(rootfixtures).then(logical).then(function (res) {
    // console.log(tree(res));
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
  }).catch(t.fail);
});

test('logical (find semver multiple times)', function (t) {
  deps(npm3fixture).then(logical).then(function (res) {
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