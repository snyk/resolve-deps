var test = require('tap').test;
var deps = require('../lib/deps');
var path = require('path');
var npm2fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package');
var npm3fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules');

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

test('deps - dev:true (with uglify-package)', function (t) {
  deps(npm2fixture, { dev: true }).then(function (res) {
    var ugdeep = res.dependencies['ug-deep'];
    t.deepEqual(Object.keys(ugdeep.dependencies), ['undefsafe'], 'found dev dep');
  }).catch(t.fail).then(t.end);

});