var test = require('tap').test;
var pluck = require('../lib/pluck');
var deps = require('../lib/deps');
var path = require('path');

test('walk - dev:false (with uglify-package)', function (t) {
  var fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/uglify-package');

  deps(fixture, { dev: false }).then(function (res) {

    var plucked = null;

    plucked = pluck(res, 'uglify-js', '*');
    t.equal(plucked.length, 2, 'found two instances of uglify-js');

  }).catch(t.fail).then(t.end);

});