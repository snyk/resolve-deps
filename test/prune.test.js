let test = require('tap-only');
let prune = require('../lib/prune');
let walk = require('../lib/walk');

test('prune (search for hawk)', async (t) => {
  let fixture = require('./fixtures/prune.json');

  prune(fixture, function (dep) {
    return dep.name !== 'request';
  });

  let count = 0;
  await walk(fixture, function (dep) {
    if (!Object.keys(dep.dependencies).length) {
      count++;
    }
  });

  t.equal(count, 5, 'tree has been pruned');
  t.end();
});
