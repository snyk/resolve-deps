var test = require('tap-only');
var lib = require('../lib');
var tree = require('@remy/npm-tree');

test('end to end (no deps)', function (t) {
  lib(__dirname + '/fixtures/pkg-undef-deps')
  .then(function (res) {
    t.ok(!!res, 'we have a result for package without deps');
  })
  .catch(t.threw)
  .then(t.end);
});

test('end to end (no name on root pkg)', function (t) {
  lib(__dirname + '/fixtures/pkg-missing-name')
  .then(function (res) {
    t.ok(!!res, 'we have a result for package without deps');
  })
  .catch(t.threw)
  .then(t.end);
});

test('end to end (no deps but has node_modules)', function (t) {
  lib(__dirname + '/fixtures/pkg-undef-deps-with-modules', { dev: true })
  .then(function (res) {
    t.equal(res.dependencies.debug.extraneous, undefined, 'debug is valid');
    t.equal(res.dependencies.undefsafe.extraneous, true, 'undefsafe is extraneous');
    t.ok(!!res, 'we have a result for package without deps');
  })
  .catch(t.threw)
  .then(t.end);
});

test('end to end (this package with dev)', function (t) {
  lib(__dirname + '/../', { dev: true })
  .then(function (res) {
    var fixtures = res.dependencies['snyk-resolve-deps-fixtures'];
    var from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul', 'handlebars', 'uglify-js', 'source-map'];
    var plucked = res.pluck(from, 'source-map', '~0.5.1');

    t.notOk(res.dependencies.tap.dependencies.nyc.dependencies.istanbul.dependencies.handlebars.dependencies['uglify-js'].dependencies['source-map'].extraneous, 'source-map is not extraneous');

    t.ok(fixtures, 'has the fixtures dep');
    t.equal(fixtures.dependencies['@remy/npm-tree'].name, '@remy/npm-tree', 'has npm-tree');
    t.equal(fixtures.dependencies['@remy/vuln-test'].name, '@remy/vuln-test', 'has vuln-test');
    t.equal(res.dependencies['snyk-resolve-deps-fixtures'].dependencies.undefsafe.extraneous, true, 'is extraneous');

    var plucked = res.pluck(['snyk-resolve-deps@1', 'snyk-resolve-deps-fixtures@1', '@remy/npm-tree'], '@remy/npm-tree', '*');
    t.equal(plucked.name, '@remy/npm-tree');
    t.ok(plucked.__filename, 'got __filename');
  })
  .catch(t.threw)
  .then(t.end);
});

test('end to end (this package __without__ dev)', function (t) {
  lib(__dirname + '/../')
  .then(function (res) {
    var from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul', 'handlebars', 'uglify-js', 'source-map'];
    var plucked = res.pluck(from, 'source-map', '~0.5.1');
    t.ok(plucked.name, 'source-map');
    // t.notOk(res.dependencies.tap.dependencies.nyc.dependencies.istanbul.dependencies.handlebars.dependencies['uglify-js'].dependencies['source-map'].extraneous, 'source-map is not extraneous');

  })
  .catch(t.threw)
  .then(t.end);
});