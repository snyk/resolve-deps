var test = require('tap-only');
var unique = require('../lib/unique');
var walk = require('../lib/walk');

test('unique', function (t) {
  var fixture = require('./fixtures/out.json');
  var names = [];

  var res = unique(fixture);

  walk(res, function (dep) {
    names.push(dep.full);
  });

  t.equal(count(names, 'semver'), 1, 'expect semver once (previously twice)');
  t.equal(count(names, 'uglify-js'), 1, 'expect uglify-js once (previously twice)');

  t.end();
});

function count(array, name) {
  return array.filter(function (f) {
    return f.indexOf(name + '@') === 0;
  }).length;
}
