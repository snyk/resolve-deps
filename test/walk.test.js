let test = require('tap-only');
let walk = require('../lib/walk');

test('walk (search for semver)', function (t) {
  let fixture = require('./fixtures/out.json');
  let names = [];

  walk(fixture, function (dep) {
    names.push(dep.name);
  });

  t.equal(count(names, 'semver'), 2, 'expect semver twice');
  t.equal(count(names, 'uglify-js'), 2, 'expect uglify-js twice');

  t.end();
});

function count(array, name) {
  return array.filter(function (f) {
    return f === name;
  }).length;
}
