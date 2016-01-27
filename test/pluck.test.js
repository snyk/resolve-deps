var test = require('tap-only');
var pluck = require('../lib/pluck');
var path = require('path');
var npm2fixtures = require(path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/snyk-resolve-deps-npm2.json'));
var npm3fixtures = require(path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/snyk-resolve-deps-npm3.json'));


test('pluck (with npm@2 modules)', function (t) {
  var res = npm2fixtures;
  var plucked = null;
  var name = 'lodash';
  plucked = pluck(res, ['snyk-resolve-deps', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');
  plucked = pluck(res, ['snyk-resolve-deps','snyk','inquirer', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found in deduped path');

  plucked = pluck(res, ['__noop__','inquirer'], name, '*');
  t.equal(plucked, false, 'not found');

  var from = [
    'snyk-resolve-deps@1.1.0',
    'tap@5.2.0',
    'codecov.io@0.1.6',
    'request@2.42.0',
    'hawk@1.1.1'
  ];

  plucked = pluck(res, from, 'hawk', '1.1.1');
  t.equal(plucked.name, 'hawk', 'found with more complex path');
  t.end();
});

test('pluck (with npm@3 modules)', function (t) {
  var res = npm3fixtures;
  var plucked = null;
  var name = 'lodash';
  plucked = pluck(res, ['snyk-resolve-deps', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');
  plucked = pluck(res, ['snyk-resolve-deps','snyk','inquirer', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found in deduped path');

  plucked = pluck(res, ['__noop__','inquirer'], name, '*');
  t.equal(plucked, false, 'should not find a package with invalid path');

  var from = [
    'snyk-resolve-deps@1.1.0',
    'tap@5.2.0',
    'codecov.io@0.1.6',
    'request@2.42.0',
    'hawk@1.1.1'
  ];

  plucked = pluck(res, from, 'hawk', '1.1.1');

  t.equal(plucked.name, 'hawk', 'found with more complex path');

  t.end();
});


test('pluck (try github as version)', function (t) {
  var res = require(path.resolve(__dirname, '..', 'node_modules', 'snyk-resolve-deps-fixtures', 'jsbin-file-tree.json'));
  var plucked = null;
  var name = 'memcached';

  plucked = pluck(res, ['jsbin'], name, '*');
  t.notEqual(plucked, false, 'memcached found');
  t.end();
});