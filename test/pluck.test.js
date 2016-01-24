var test = require('tap').test;
var pluck = require('../lib/pluck');
var deps = require('../lib/deps');
var path = require('path');
var npmVersion = 2;
var semver = require('semver');
var exec = require('child_process').exec;

test('determine npm version', function (t) {
  exec('npm -v', function (error, stdout) {
    if (semver.satisfies(stdout.trim(), '>= 3.0.0')) {
      npmVersion = 3;
    }
    t.pass('found npm@' + npmVersion);
    t.end();
  });
});

test('pluck (with all fixtures)', function (t) {
  var fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/');

  deps(fixture, { dev: false }).then(function (res) {

    var plucked = null;
    var name = 'semver';

    var expect = npmVersion === 2 ? 2 : 1;

    plucked = pluck(res, name, '*');
    t.equal(plucked.length, expect, 'found two instances of ' + name);
    plucked = pluck(res, name, '*');
    t.equal(plucked.length, expect, 'found two instances of ' + name);

  }).catch(t.fail).then(t.end);

});

test('pluck (search for scoped)', function (t) {
  var fixture = path.resolve(__dirname, '..');

  deps(fixture).then(function (res) {
    var plucked = null;
    var name = '@remy/vuln-test';

    plucked = pluck(res, name, '*');
    t.ok(!!plucked.length, 'found ' + name);
  }).catch(t.fail).then(t.end);

});