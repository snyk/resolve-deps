let test = require('tap-only');
let resolveTree = require('../lib');
let logicalTree = require('../lib/logical');
let path = require('path');
let walk = require('../lib/walk');
let depTypes = require('../lib/dep-types');
let uglifyfixture = path.resolve(__dirname,
  'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures',
  'node_modules/uglify-package');
let npm3fixture = path.resolve(__dirname,
  'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures');
let bundleFixture = path.resolve(__dirname, 'fixtures/bundle');
let missingfixtures = path.resolve(__dirname, 'fixtures/pkg-missing-deps');
let hawkpkg = require(path.resolve(bundleFixture,
  'node_modules/snyk-resolve-deps-fixtures',
  'snyk-vuln-tree.json'));

test('logical', function (t) {
  resolveTree(npm3fixture).then(function () {
    t.pass('worked');
  }).catch(t.threw).then(t.end);
});

test('logical (flags missing module)', function (t) {
  resolveTree(missingfixtures).then(function (res) {
    let problem = (res.problems || []).some(function (issue) {
      return issue.indexOf('missing') === 0;
    });
    t.ok(problem, 'The missing package was flagged');
  }).catch(t.threw).then(t.end);
});

test('logical (find devDeps)', function (t) {
  let devDeps = Object.keys(require(path.resolve(bundleFixture, 'package.json')).devDependencies);
  resolveTree(bundleFixture, { dev: true }).then(function (res) {
    let names = [];
    walk(res, function (dep) {
      if (dep.depType === depTypes.DEV) {
        names.push(dep.name);
      }
    });
    t.deepEqual(names, devDeps, 'found the right devDeps');
  }).catch(t.threw).then(t.end);
});

test('logical (dont include from arrays)', function (t) {
  resolveTree(bundleFixture, { noFromArrays: true }).then(function (res) {
    let names = [];
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

    let ugdeep = res.dependencies['ug-deep'];
    t.equal(ugdeep.name, 'ug-deep', 'ug-deep exists');
  }).catch(t.threw).then(t.end);

});

test('logical (deep test, expecting extraneous)', function (t) {
  // note: the @remy/vuln-test is actually found in the parent directory
  // when running in npm@3, so this is the real test
  resolveTree(bundleFixture, { dev: true }).then(function (res) {
    let extraneous = [];
    walk(res.dependencies, function (dep) {
      if (dep.extraneous) {
        extraneous.push(dep.name);
      }
    });

    // FIXME the original count was 3, but because snyk-tree has been
    // moved to optionalDeps, it's not being counted - that should be fixed.

    // debug, ms and undefsafe should be extraneous from inside the fixtures
    // package. undefsafe + debug are manually installed, but ms comes in via
    // debug, and because it's unknown to us, it's also extraneous.

    // today, we detect debug, ms, undefsafe, debug, ms, ansicolors
    // ansicolors makes no sense. npm 6.13.0 is hoisting it to the top level,
    // but I don't understand why; it is not deduping it, it is only referenced once
    const count = extraneous.length;
    t.ok(count === 6 || count === 5,
      'found ' + count + ' extraneous packages: ' + extraneous.join(', '));
  }).catch(t.threw).then(t.end);
});

test('logical (find semver multiple times)', function (t) {
  resolveTree(npm3fixture).then(function (res) {
    let names = [];
    walk(res.dependencies, function (dep) {
      names.push(dep.name);
    });
    let count = names.filter(function (f) {
      return f === 'semver';
    }).length;
    // npm 6.13.0 hoists some of the deps out of the subdir that we're poking
    // around in, so the dependency is missing. It's not a good way to run this
    // test.
    t.ok(1 === count || 2 === count, 'expecting 1 or 2 semvers, not ' + count);
  }).catch(t.threw).then(t.end);
});

test('logical (deep copies)', function (t) {
  let res = logicalTree(hawkpkg);
  let deps = [];
  let paths = {};
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
