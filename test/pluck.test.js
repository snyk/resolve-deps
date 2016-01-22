var test = require('tap').test;
var pluck = require('../lib/pluck');
var deps = require('../lib/deps');
var path = require('path');

test('walk (with all fixtures)', function (t) {
  var fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/');

  deps(fixture, { dev: false }).then(function (res) {

    var plucked = null;
    var name = 'semver';

    var expect = process.env['npm_config_user_agent'].indexOf('npm/3') === -1 ? 2 : 1;

    plucked = pluck(res, name, '*');
    t.equal(plucked.length, expect, 'found two instances of ' + name);
    plucked = pluck(res, name, '*');
    t.equal(plucked.length, expect, 'found two instances of ' + name);

  }).catch(t.fail).then(t.end);

});