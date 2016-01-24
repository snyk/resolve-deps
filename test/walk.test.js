var test = require('tap').test;
var walk = require('../lib/walk');

test('walk', function (t) {
  var fixture = require('./fixtures/out.json');
  var root = Object.keys(fixture.dependencies);
  t.plan(4); // expecting fixture to have total of 4 packages
  walk(fixture.dependencies, function (dep, name) {
    var i = root.indexOf(name);
    if (i !== -1) {
      root.splice(i, 1);
      t.pass('expected module found');
    } else {
      t.pass('unknown module found');
    }
  });
});

test('walk (search for semver)', function (t) {
  var fixture = require('./fixtures/walk.json');
  var names = [];

  walk(fixture, function (dep) {
    names.push(dep.name);
  });

  // console.log(names);

  t.equal(count(names, 'semver'), 2, 'expect semver twice');
  t.equal(count(names, 'uglify-js'), 2, 'expect uglify-js twice');

  t.end();
});

function count(array, name) {
  return array.filter(function (f) {
    return f === name;
  }).length;
}