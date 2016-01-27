var test = require('tap-only');
var pluck = require('../lib/pluck');
var path = require('path');

test('pluck (with all modules)', function (t) {
  var res = require('./fixtures/walk.json');
  var plucked = null;
  var name = 'lodash';
  plucked = pluck(res, ['snyk-resolve-deps', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');
  plucked = pluck(res, ['snyk-resolve-deps','snyk','inquirer', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found in deduped path');

  plucked = pluck(res, ['__noop__','inquirer'], name, '*');
  t.equal(plucked, false, 'not found');

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