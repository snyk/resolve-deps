var test = require('tap-only');
var lib = require('../lib');
var tree = require('@remy/npm-tree');

Error.prototype.toString = function() { return this.stack; };
test('end to end (no deps)', function (t) {
  lib(__dirname + '/fixtures/pkg-undef-deps')
  .then(lib.logicalTree)
  .then(function (res) {
    t.ok(!!res, 'we have a result for package without deps');
  })
  .catch(t.fail)
  .then(t.end);
});

test('end to end (no deps but has node_modules)', function (t) {
  lib(__dirname + '/fixtures/pkg-undef-deps-with-modules')
  .then(lib.logicalTree)
  .then(function (res) {
    t.equal(res.dependencies.debug.extraneous, undefined, 'debug is valid');
    t.equal(res.dependencies.undefsafe.extraneous, true, 'undefsafe is extraneous');
    t.ok(!!res, 'we have a result for package without deps');
  })
  .catch(t.fail)
  .then(t.end);
});