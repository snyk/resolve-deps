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
        }).catch(fail).then(done);
    });

    test('logical (flags missing module)', function (done) {
        resolveTree(missingfixtures).then(function (res) {
            let problem = (res.problems || []).some(function (issue) {
                return issue.indexOf('missing') === 0;
            });
            expect(problem).toBeTruthy();
        }).catch(fail).then(done);
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
        }).catch(fail).then(done);
    });

    test('logical (dont include from arrays)', function (done) {
        resolveTree(bundleFixture, {noFromArrays: true}).then(function (res) {
            let names = [];
            walk(res, function (dep) {
                if (dep.from) {
                    fail('from array found on node ' + dep);
                }
                if (dep.depType === depTypes.DEV) {
                    names.push(dep.name);
                }
            });

        }).catch(fail).then(done);
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
            }).catch(fail);
        });


        test('deps - with uglify-package', function (done) {
            resolveTree(uglifyfixture).then(function (res) {
                expect(res.name).toEqual('uglify-package');
                expect(Object.keys(res.dependencies).length).toEqual(2);

                let ugdeep = res.dependencies['ug-deep'];
                expect(ugdeep.name).toEqual('ug-deep');
            }).catch(fail).then(done);

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

            // Update 30-11-2022:
            // Previously the test was checking counts, which differ between NPM versions.
            // This was changed to test for particular packages being found as extraneous
            // and making sure that some of used packages are not marked as extraneous.
            // This should better express what we expect to find.
            //
            // This may still break in NPM 8.
            // I've noticed, that uglify-package was unpublished from NPM in April 2022.
            // This seems to be ignored in NPM 6. However, in NPM 8 installing partially fails
            // and the entire uglify-package dependency subtree is marked as extraneous,
            // while debug, ms and undefsafe don't seem to be marked as extraneous anymore.
            // Not sure what the purpose of extraneous is, but it seems to be breaking between NPM versions.

            // undefsafe + debug are manually installed
            expect(extraneous).toContain("undefsafe");
            expect(extraneous).toContain("debug");

            // ms comes in via debug, and because it's unknown to us, it's also extraneous.
            expect(extraneous).toContain("ms");

            // make sure not every package is extraneous
            expect(extraneous).not.toContain("snyk-resolve-deps-fixtures");
            expect(extraneous).not.toContain("@remy/snyk-shrink-test");
            expect(extraneous).not.toContain("semver");
        }).catch(fail).then(done);
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
        }).catch(fail).then(done);
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
