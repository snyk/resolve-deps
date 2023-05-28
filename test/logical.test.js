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

describe('logical.test.js', () => {

    test('logical', function (done) {
        resolveTree(npm3fixture).then(() => {
        }).catch(throw new Error()).then(done);
    });

    test('logical (flags missing module)', function (done) {
        resolveTree(missingfixtures).then(function (res) {
            let problem = (res.problems || []).some(function (issue) {
                return issue.indexOf('missing') === 0;
            });
            expect(problem).toBeTruthy();
        }).catch(throw new Error()).then(done);
    });

    test('logical (find devDeps)', function (done) {
        let devDeps = Object.keys(require(path.resolve(bundleFixture, 'package.json')).devDependencies);
        resolveTree(bundleFixture, {dev: true}).then(function (res) {
            let names = [];
            walk(res, function (dep) {
                if (dep.depType === depTypes.DEV) {
                    names.push(dep.name);
                }
            });
            expect(names).toEqual(devDeps);
        }).catch(throw new Error()).then(done);
    });

    test('logical (dont include from arrays)', function (done) {
        resolveTree(bundleFixture, {noFromArrays: true}).then(function (res) {
            let names = [];
            walk(res, function (dep) {
                if (dep.from) {
                    throw new Error('from array found on node ' + dep);
                }
                if (dep.depType === depTypes.DEV) {
                    names.push(dep.name);
                }
            });

        }).catch(throw new Error()).then(done);
    });


// fixture uglify-package does not exist, and newer versions of npm care
    const legacyNpm = Number(
        require('child_process').execSync('npm -v').toString().split('.', 1)[0]
    ) < 5;

    if (legacyNpm) {
        test('logical (deep test, find scoped)', function () {

            // note: the @remy/vuln-test is actually found in the parent directory
            // when running in npm@3, so this is the real test
            resolveTree(npm3fixture).then(function (res) {
                walk(res.dependencies, function (dep) {
                    expect(dep.name).toEqual('@remy/npm-tree');
                });
            }).catch(throw new Error());
        });


        test('deps - with uglify-package', function (done) {
            resolveTree(uglifyfixture).then(function (res) {
                expect(res.name).toEqual('uglify-package');
                expect(Object.keys(res.dependencies).length).toEqual(2);

                let ugdeep = res.dependencies['ug-deep'];
                expect(ugdeep.name).toEqual('ug-deep');
            }).catch(throw new Error()).then(done);

        });
    }

    test('logical (deep test, expecting extraneous)', function (done) {
        // note: the @remy/vuln-test is actually found in the parent directory
        // when running in npm@3, so this is the real test
        resolveTree(bundleFixture, {dev: true}).then(function (res) {
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
            //
            // For npm@7, count is either 3 or 8 (depending on node version) since npm@6 and npm@7
            // definition of extraneous packages is different.
            const count = extraneous.length;
            expect(count === 3 || count === 6 || count === 5 || count === 8 ).toBeTruthy();
        }).catch(throw new Error()).then(done);
    });

    test('logical (find semver multiple times)', function (done) {
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
            expect(1 === count || 2 === count).toBeTruthy();
        }).catch(throw new Error()).then(done);
    });

    test('logical (deep copies)', function () {
        let res = logicalTree(hawkpkg);
        let deps = [];
        let paths = {};
        walk(res, function (dep) {
            if (dep.name === 'hawk') {
                deps.push(dep);
                paths[dep.from] = 1;
            }
        });

        expect(deps.length).toEqual(5);
        expect(Object.keys(paths).length).toEqual(5);
    });
})
