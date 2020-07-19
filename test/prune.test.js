let prune = require('../lib/prune');
let walk = require('../lib/walk');

test('prune (search for hawk)', function () {
  let fixture = require('./fixtures/prune.json');

  prune(fixture, function (dep) {
    return dep.name !== 'request';
  });

  let count = 0;
  walk(fixture, function (dep) {
    if (!Object.keys(dep.dependencies).length) {
      count++;
    }
  });

  expect(count).toEqual(5);
});
