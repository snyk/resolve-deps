var test = require('tap-only');
var deps = require('../lib/deps');
var path = require('path');
var npm2fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package');
var npm3fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/');

test('deps - not a node project', function (t) {
  deps(__dirname).then(function (res) {
    t.fail('non-node project should not succeed', res);
  }).catch(function (e) {
    t.type(e, 'Error', 'error received');
    t.notEqual(e.message.indexOf(' is not a node project'), -1, 'error is correct');
  }).then(t.end);
});

test('deps - npm@3', function (t) {
  deps(npm3fixture).then(function (res) {
    t.ok(!!res, 'package loaded');
  }).catch(t.fail).then(t.end);
});

// fixture uglify-package does not exist, and newer versions of npm care
const legacyNpm = Number(
  require('child_process').execSync('npm -v').toString().split('.', 1)[0]
) < 5;

legacyNpm && test('deps - with uglify-package', function (t) {
  deps(npm2fixture).then(function (res) {
    t.equal(res.name, 'uglify-package', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 3, 'has 3 file dependencies');

    var ugdeep = res.dependencies['ug-deep'];
    t.equal(ugdeep.name, 'ug-deep', 'ug-deep exists');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});

legacyNpm && test('deps - with extraFields', function (t) {
  deps(npm2fixture, null, { extraFields: [ 'main', 'super-bogus-field' ]}).then(function (res) {
    t.equal(res.main, 'index.js', 'includes extraFields');
    t.equal(res['super-bogus-field'], null, 'produces null for empty extraFields fields');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});

test('deps - throws without path', function (t) {
  deps().then(function () {
    t.fail('without a path deps should not succeed');
  }).catch(function (e) {
    t.type(e, 'Error', 'error received');
    t.equal(e.message, 'module path must be a string', 'error is correct');
  }).then(t.end);
});

test('deps - with relative "file" option', function (t) {
  deps(__dirname, null, {
    dev: true,
    file: 'fixtures/pkg-undef-deps-with-modules/package.json',
  })
    .then(function (res) {
      t.equal(res.dependencies.debug.depType, 'dev', 'debug is valid');
      t.equal(res.dependencies.undefsafe.depType, 'extraneous',
          'undefsafe is extraneous');
    })
    .catch(t.threw)
    .then(t.end);
});

// See test/fixtures/pkg-yarn-renamed-deps/README.md
test('deps - yarn with renamed dep', function (t) {
  deps('test/fixtures/pkg-yarn-renamed-deps').then(function (res) {
    t.equal(res.name, 'pkg-renamed-dep', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 2, 'has 2 deps');
  }).catch(function (e) {
    t.fail(e.stack);
  }).then(t.end);
});
