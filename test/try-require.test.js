var test = require('tap').test;
var tryRequire = require('../lib/try-require');
var path = require('path');

test('try failure require', function (t) {
  t.plan(1);
  tryRequire('./unknown').then(function (res) {
    t.equal(res, null, 'unknown require does not throw');
  });
});

test('try successful require', function (t) {
  var filename = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package/package.json');
  tryRequire(filename).then(function (pkg) {
    t.ok(pkg, 'package loaded');
    t.ok(pkg.snyk, 'detected policy file');
  }).catch(t.fail).then(t.end);
});