var test = require('tap-only');
var lib = require('../lib');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var spy = sinon.spy();

test('cache cleared on re-run', function (t) {
  spy = sinon.stub();
  spy.returns(JSON.stringify({
    name: 'foo'
  }));

  var lib = proxyquire('../lib', {
    './deps': proxyquire('../lib/deps', {
      'snyk-try-require': proxyquire('snyk-try-require', {
        'then-fs': {
          readFile: function (filename) {
            return Promise.resolve(spy(filename));
          }
        },
      })
    })
  });

  var dirname = 'doesnt-exist';

  return lib(dirname).then(function () {
    t.pass('first run complete');
  }).then(function () {
    spy.returns(JSON.stringify({
      name: 'bar'
    }));
    return lib(dirname).then(function (res) {
      t.equal(res.name, 'bar', 'cache cleared');
    });
  });
});

test('end to end (no deps)', function (t) {
  lib(__dirname + '/fixtures/pkg-undef-deps')
  .then(function (res) {
    t.ok(!!res, 'we have a result for package without deps');
  })
  .catch(t.threw)
  .then(t.end);
});

test('end to end (sub-pluck finds correctly)', function (t) {
  var res = lib.logicalTree(require(__dirname + '/fixtures/oui.json'));
  var from = [ 'foo@1.0.0',
    'chokidar@1.4.1',
    'fsevents@1.0.7',
    'node-pre-gyp@0.6.19',
    'request@2.67.0',
    'hawk@3.1.2' ];

  var plucked = res.pluck(from, 'hawk', '3.1.2');

  t.notEqual(plucked, false, 'managed to pluck');
  t.equal(plucked.name, 'hawk', 'found hawk');
  t.deepEqual(plucked.bundled, from.slice(0, 4), 'bundled path is correct');
  t.end();
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
    t.equal(fixtures.dependencies.undefsafe.extraneous, true, 'is extraneous');

    plucked = res.pluck(['snyk-resolve-deps@1', 'snyk-resolve-deps-fixtures@1', 'snyk-tree'], 'snyk-tree', '*');
    t.equal(plucked.name, 'snyk-tree');
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

    var unique = res.unique();
    var counter = {};
    lib.walk(unique, function (dep) {
      if (counter[dep.full]) {
        counter[dep.full]++;
        t.fail('found ' + dep.full + ' ' + counter[dep.full] + ' times in unique list');
      }
      counter[dep.full] = 1;
    });
  })
  .catch(t.threw)
  .then(t.end);
});

test('end to end (this package wihtout from arrays)', function (t) {
  lib(__dirname + '/../', {noFromArrays: true})
  .then(function (res) {
    var from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul', 'handlebars', 'uglify-js', 'source-map'];
    var plucked = res.pluck(from, 'source-map', '~0.5.1');
    t.ok(plucked.name, 'source-map');

    var unique = res.unique();
    var counter = {};
    lib.walk(unique, function (dep) {
      if (dep.from) {
        t.fail('from array found on node', dep);
      }
      if (counter[dep.full]) {
        counter[dep.full]++;
        t.fail('found ' + dep.full + ' ' + counter[dep.full] + ' times in unique list');
      }
      counter[dep.full] = 1;
    });
  })
  .catch(t.threw)
  .then(t.end);
});
