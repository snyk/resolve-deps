var test = require('tap-only');
var deps = require('../lib/deps');
var path = require('path');
var npm2fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package');
var npm3fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/');

test('deps - not a node project', function (t) {
  deps(__dirname, { dev: false }).then(function (res) {
    t.fail('non-node project should not succeed', res);
  }).catch(function (e) {
    t.type(e, 'Error', 'error received');
    t.notEqual(e.message.indexOf(' is not a node project'), -1, 'error is correct');
  }).then(t.end);

});

test('deps - no options works', function (t) {
  deps(npm2fixture).then(function (res) {
    t.ok(!!res, 'package loaded without opts');
  }).catch(t.fail).then(t.end);
});

test('deps - npm@3', function (t) {
  deps(npm3fixture).then(function (res) {
    t.ok(!!res, 'package loaded');
  }).catch(t.fail).then(t.end);
});

test('deps - dev:false (with uglify-package)', function (t) {
  deps(npm2fixture, { dev: false }).then(function (res) {
    t.equal(res.name, 'uglify-package', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 3, 'has 3 file dependencies');

    var ugdeep = res.dependencies['ug-deep'];

    t.equal(ugdeep.name, 'ug-deep', 'ug-deep exists');
    t.deepEqual(Object.keys(ugdeep.dependencies), [], 'zero deps on ug-deep');
  }).catch(t.fail).then(t.end);

});

test('deps - dev:true (searching for devDeps)', function (t) {
  deps(npm3fixture, { dev: true }).then(function (res) {
    var name = 'debug';
    t.notEqual(Object.keys(res.dependencies).indexOf(name), -1, 'found dev dep');
  }).catch(t.fail).then(t.end);
});

test('deps - dev:false (searching for devDeps)', function (t) {
  deps(npm3fixture, { dev: false }).then(function (res) {
    var name = 'debug';
    t.equal(Object.keys(res.dependencies).indexOf(name), -1, 'dev dep missing');
  }).catch(t.fail).then(t.end);
});

test('deps - throws without path', function (t) {
  deps().then(function () {
    t.fail('without a path deps should not succeed');
  }).catch(function (e) {
    t.type(e, 'Error', 'error received');
    t.equal(e.message, 'module path must be a string', 'error is correct');
  }).then(t.end);
});