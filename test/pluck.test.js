var test = require('tap-only');
var pluck = require('../lib/pluck');
var resolveTree = require('../lib/');
var path = require('path');

test.only('pluck (with all modules)', function (t) {
  var res = require('./fixtures/walk.json');
  // var fixture = path.resolve(__dirname, '..');

  // resolveTree(fixture).then(function (res) {
    var plucked = null;
    var name = 'lodash';

    plucked = pluck(res, ['snyk-resolve-deps'], name, '*');
    t.equal(plucked.name, name, 'found lodash in direct dep');
    plucked = pluck(res, ['snyk-resolve-deps','snyk','inquirer'], name, '*');
    t.equal(plucked.name, name, 'found in deduped path');

    plucked = pluck(res, ['__noop__','inquirer'], name, '*');
    t.equal(plucked, false, 'not found');

  t.end();

});

test('pluck (search for scoped)', function (t) {
  var fixture = path.resolve(__dirname, '..');

  resolveTree(fixture).then(function (res) {
    var plucked = null;
    var name = '@remy/vuln-test';

    plucked = pluck(res, ['snyk-resolve-deps', 'snyk-resolve-deps-fixtures'], name, '*');
    t.ok(!!plucked.length, 'found ' + name);
  }).catch(t.fail).then(t.end);

});