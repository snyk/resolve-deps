var test = require('tap-only');
var prune = require('../lib/prune');
var walk = require('../lib/walk');

test('prune (search for hawk)', function (t) {
  var fixture = require('./fixtures/prune.json');

  prune(fixture, function (dep) {
    return dep.name !== 'request';
  });

  var count = 0;
  walk(fixture, function (dep) {
    if (!Object.keys(dep.dependencies).length) {
      count++;
    }
  });

  t.equal(count, 5, 'tree has been pruned');
  t.end();
});