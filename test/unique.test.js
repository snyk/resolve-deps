let test = require('tap-only');
let unique = require('../lib/unique');
let walk = require('../lib/walk');

test('unique', function (t) {
  let fixture = require('./fixtures/out.json');
  let names = [];

  let res = unique(fixture);

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
