var test = require('tap-only');
var walk = require('../lib/walk');

test('walk (search for semver)', function (t) {
  var fixture = require('./fixtures/out.json');
  var names = [];

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