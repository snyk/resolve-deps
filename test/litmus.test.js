let test = require('tap').test;

test('litmus test', function (t) {
  let lib = require('../lib');
  t.ok(!!lib, 'module loaded');
  t.end();
});
