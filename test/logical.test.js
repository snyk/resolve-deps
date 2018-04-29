var test = require('tap-only');
var resolveTree = require('../lib');
var logicalTree = require('../lib/logical');
var path = require('path');
var walk = require('../lib/walk');
var depTypes = require('../lib/dep-types');
var tree = require('snyk-tree');
var uglifyfixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/node_modules/uglify-package');
var npm3fixture = path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures');
var rootfixtures = path.resolve(__dirname, '..');
var missingfixtures = path.resolve(__dirname, 'fixtures/pkg-missing-deps');
var hawkpkg = require(path.resolve(__dirname, '..',
    'node_modules/snyk-resolve-deps-fixtures/snyk-vuln-tree.json'));

test('logical', function (t) {
  resolveTree(npm3fixture).then(function () {
    t.pass('worked');
  }).catch(t.threw).then(t.end);
});

test('logical (flags missing module)', function (t) {
  resolveTree(missingfixtures).then(function (res) {
    var problem = (res.problems || []).some(function (issue) {
      return issue.indexOf('missing') === 0;
    });
    t.ok(problem, 'The missing package was flagged');
  }).catch(t.threw).then(t.end);
});

test('logical (find devDeps)', function (t) {
  var devDeps = Object.keys(require('../package.json').devDependencies);
  var expect = devDeps.length;
  resolveTree(rootfixtures, { dev: true }).then(function (res) {
    var names = [];
    // console.log(res.dependencies['snyk-resolve-deps-fixtures'].dependencies['snyk-tree']);
    walk(res, function (dep) {
      if (dep.depType === depTypes.DEV) {
        names.push(dep.name);
      }
    });


    t.deepEqual(names, devDeps, 'found the right number of devDeps');
  }).catch(t.threw).then(t.end);
});

test('logical (dont include from arrays)', function (t) {
  resolveTree(rootfixtures, { dontIncludeFromArrays: true }).then(function (res) {
    var names = [];
    walk(res, function (dep) {
      if (dep.from) {
        t.fail('from array found on node ', dep);
      }
      if (dep.depType === depTypes.DEV) {
        names.push(dep.name);
      }
    });

  }).catch(t.threw).then(t.end);
});

test('logical (deep test, find scoped)', function (t) {
  t.plan(1);

  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  resolveTree(npm3fixture).then(function (res) {
    // console.log(tree(res));
    walk(res.dependencies, function (dep) {
      if (dep.name === '@remy/vuln-test') {
        t.pass('found scopped dependency');
      }
    });
  }).catch(t.threw);
});

// fixture uglify-package does not exist, and newer versions of npm care
const legacyNpm = Number(
  require('child_process').execSync('npm -v').toString().split('.', 1)[0]
) < 5;

legacyNpm && test('deps - with uglify-package', function (t) {
  resolveTree(uglifyfixture).then(function (res) {
    t.equal(res.name, 'uglify-package', 'package name matches');
    t.type(res.dependencies, 'object', 'has dependencies');
    t.equal(Object.keys(res.dependencies).length, 2, 'has right dependencies');

    var ugdeep = res.dependencies['ug-deep'];
    t.equal(ugdeep.name, 'ug-deep', 'ug-deep exists');
  }).catch(t.threw).then(t.end);

});

test('logical (deep test, expecting extraneous)', function (t) {
  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  resolveTree(rootfixtures, { dev: true }).then(function (res) {
    var count = 0;
    walk(res.dependencies, function (dep) {
      if (dep.extraneous) {
        count++;
      }
    });

    // FIXME the original count was 3, but because snyk-tree has been
    // moved to optionalDeps, it's not being counted - that should be fixed.

    // debug, ms and undefsafe should be extraneous from inside the fixtures
    // package. undefsafe + debug are manually installed, but ms comes in via
    // debug, and because it's unknown to us, it's also extraneous.
    t.ok(count === 3 || count === 5, 'found ' + count + ' extraneous packages');
  }).catch(t.threw).then(t.end);
});

test('logical (find semver multiple times)', function (t) {
  resolveTree(npm3fixture).then(function (res) {
    var names = [];
    walk(res.dependencies, function (dep) {
      names.push(dep.name);
    });
    var count = names.filter(function (f) {
      return f === 'semver';
    }).length;
    t.equal(count, 2, 'expecting 2 semvers');
  }).catch(t.threw).then(t.end);
});

test('logical (deep copies)', function (t) {
  var res = logicalTree(hawkpkg);
  var deps = [];
  var paths = {};
  walk(res, function (dep) {
    if (dep.name === 'hawk') {
      deps.push(dep);
      paths[dep.from] = 1;
    }
  });

  t.equal(deps.length, 5, 'found 5 instance');
  t.equal(Object.keys(paths).length, 5, 'in 5 different paths');

  t.end();
});
