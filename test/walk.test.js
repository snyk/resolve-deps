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