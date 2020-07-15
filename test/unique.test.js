let unique = require('../lib/unique');
let walk = require('../lib/walk');

test('unique', function () {
  let fixture = require('./fixtures/out.json');
  let names = [];

  let res = unique(fixture);

  walk(res, function (dep) {
    names.push(dep.full);
  });

  expect(count(names, 'semver')).toEqual(1);
  expect(count(names, 'uglify-js')).toEqual(1);

});

function count(array, name) {
  return array.filter(function (f) {
    return f.indexOf(name + '@') === 0;
  }).length;
}
