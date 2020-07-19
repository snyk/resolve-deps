let walk = require('../lib/walk');

test('walk (search for semver)', function () {
  let fixture = require('./fixtures/out.json');
  let names = [];

  walk(fixture, function (dep) {
    names.push(dep.name);
  });

  expect(count(names, 'semver')).toEqual(2);
  expect(count(names, 'uglify-js')).toEqual(2);
});

function count(array, name) {
  return array.filter(function (f) {
    return f === name;
  }).length;
}
