var test = require('tap').test;
var tryRequire = require('../lib/try-require');
var path = require('path');
var fs = require('fs');

test('try failure require', function (t) {
  t.plan(1);
  tryRequire('./unknown').then(function (res) {
    t.equal(res, null, 'unknown require does not throw');
  });
});

test('try npm-shrinkwrap detect', function (t) {
  var location = 'node_modules/@remy/snyk-shrink-test';

  try {
    fs.stat(location);
  } catch (e) {
    location = 'node_modules/snyk-resolve-deps-fixtures/node_modules/@remy/snyk-shrink-test';
  }

  var filename = path.resolve(__dirname, '..', location, 'package.json');
  tryRequire(filename).then(function (res) {
    t.notEqual(res, null, 'package was found');
    t.equal(res.shrinkwrap, true, 'has and knows about shrinkwrap');
  }).catch(t.threw).then(t.end);
});


test('try successful require', function (t) {
  var filename = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package/package.json');
  tryRequire(filename).then(function (pkg) {
    t.ok(pkg, 'package loaded');
    t.ok(pkg.snyk, 'detected policy file');
  }).catch(t.fail).then(t.end);
});