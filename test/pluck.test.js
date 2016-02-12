var test = require('tap-only');
var pluck = require('../lib/pluck');
var path = require('path');
var npm2fixtures = require(path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/snyk-resolve-deps-npm2.json'));
var npm3fixtures = require(path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/snyk-resolve-deps-npm3.json'));


test('pluck (with npm@2 modules)', function (t) {
  var res = npm2fixtures;
  res.npm = 2;
  pluckTests(t, res);
});

test('pluck (with npm@3 modules)', function (t) {
  var res = npm3fixtures;
  res.npm = 3;
  pluckTests(t, res);
});

test('pluck (try github as version)', function (t) {
  var res = require(path.resolve(__dirname, '..', 'node_modules', 'snyk-resolve-deps-fixtures', 'jsbin-file-tree.json'));
  var plucked = null;
  var name = 'memcached';

  plucked = pluck(res, ['jsbin', 'memcached'], name, 'git://github.com/3rd-Eden/node-memcached#10733b0e487793dde1d3a4f9201b1ec41c0be0c6');
  t.equal(plucked.name, 'memcached', 'memcached found with git version');
  t.end();
});

function pluckTests(t, res) {
  var plucked = null;
  var name = 'lodash';
  plucked = pluck(res, ['snyk-resolve-deps', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');
  plucked = pluck(res, ['snyk-resolve-deps','snyk','inquirer', 'lodash'], name, '*');
  t.equal(plucked.name, name, 'found in deduped path');

  plucked = pluck(res, ['this-module-does-not-exist','inquirer'], name, '*');
  t.equal(plucked, false, 'should not find a package with invalid path');

  plucked = pluck(res, ['snyk-resolve-deps'], name, '*');
  t.equal(plucked.name, name, 'found lodash in direct dep');

  plucked = pluck(res, ['snyk-resolve-deps'], name, 'latest');
  t.equal(plucked.name, name, 'found lodash in direct dep');

  var from = [
    'snyk-resolve-deps@1.1.0',
    'tap@5.2.0',
    'codecov.io@0.1.6',
    'request@2.42.0',
    'hawk@1.1.1'
  ];
  plucked = pluck(res, from, 'hawk', '1.1.1');
  t.equal(plucked.name, 'hawk', 'found with more complex path');

  from = [
    'snyk-resolve-deps@1.1.2',
    'snyk-resolve-deps-fixtures@1.1.2',
    '@remy/vuln-test@1.0.1',
    'semver@2.3.2'
  ];

  plucked = pluck(res, from, 'semver', '2.3.2');
  t.equal(plucked.name, 'semver', 'found with more complex path');

  // skip this test in npm2 because ansicolors
  // got deduped (into the root).
  if (res.npm === 3) {
    from = [
      'snyk-resolve-deps-fixtures',
      'snyk-tree'
    ];

    plucked = pluck(res.dependencies['snyk-resolve-deps-fixtures'], from, 'ansicolors', '^0.3.2');
    t.equal(plucked.name, 'ansicolors', 'found on a shallow path');

    from = [
      'snyk-resolve-deps',
      '@remy/vuln-test'
    ];

    plucked = pluck(res, from, 'semver', '2.3.2');
    t.equal(plucked.name, 'semver', 'found on a straight path');
  }

  if (res.npm === 2) {
    from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul', 'handlebars', 'uglify-js', 'source-map'];
    plucked = pluck(res, from, 'source-map', '~0.5.1');
    t.equal(plucked.name, 'source-map', 'found on a straight path');
    t.notOk(plucked.extraneous, 'not extraneous');
  }

  from = [
    'snyk-resolve-deps',
    'snyk-resolve-deps-fixtures',
    'semver-rs-demo',
    'semver'
  ];

  plucked = pluck(res, from, 'semver', '*');
  t.equal(plucked.name, 'semver', 'found correct package on deep path (where package also appears higher up');
  t.equal(plucked.version[0], '2', 'semver is at 2');

  plucked = pluck(res, from, 'semver', '0.0.0');
  t.equal(plucked, false, 'unable to find correct semver');

  t.end();
}