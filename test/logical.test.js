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
            // For npm@7, count is either 3, 4 or 8 (depending on node version) since npm@6 and npm@7
            // definition of extraneous packages is different.

            // For npm@8 and npm@9, count is 11 due to dependency resolution changes in npm.
            const count = extraneous.length;
            expect(count === 3 || count === 6 || count === 5 || count === 8 || count === 4 || count === 11).toBeTruthy();
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

    test('GIVEN showNpmScope is false WHEN building logical tree THEN packages should not have labels', function (done) {
        resolveTree(bundleFixture, {showNpmScope: false, dev: true}).then(function (res) {
            let hasLabels = false;
            walk(res.dependencies, function (dep) {
                if (dep.labels) {
                    hasLabels = true;
                }
            });
            expect(hasLabels).toBeFalsy();
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is undefined WHEN building logical tree THEN packages should not have labels', function (done) {
        resolveTree(bundleFixture, {dev: true}).then(function (res) {
            let hasLabels = false;
            walk(res.dependencies, function (dep) {
                if (dep.labels) {
                    hasLabels = true;
                }
            });
            expect(hasLabels).toBeFalsy();
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is true WHEN building logical tree with dev dependencies THEN dev dependencies should have npm:scope label set to dev', function (done) {
        resolveTree(bundleFixture, {showNpmScope: true, dev: true}).then(function (res) {
            let devDepsWithLabels = [];
            walk(res.dependencies, function (dep) {
                if (dep.depType === depTypes.DEV) {
                    expect(dep.labels).toBeDefined();
                    expect(dep.labels['npm:scope']).toEqual('dev');
                    devDepsWithLabels.push(dep.name);
                }
            });
            expect(devDepsWithLabels.length).toBeGreaterThan(0);
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is true WHEN building logical tree with prod dependencies THEN prod dependencies should have npm:scope label set to prod', function (done) {
        resolveTree(bundleFixture, {showNpmScope: true}).then(function (res) {
            let prodDepsWithLabels = [];
            walk(res.dependencies, function (dep) {
                if (dep.depType === depTypes.PROD) {
                    expect(dep.labels).toBeDefined();
                    expect(dep.labels['npm:scope']).toEqual('prod');
                    prodDepsWithLabels.push(dep.name);
                }
            });
            expect(prodDepsWithLabels.length).toBeGreaterThan(0);
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is true WHEN building logical tree with optional dependencies THEN optional dependencies should have npm:scope label set to unknown', function (done) {
        resolveTree(bundleFixture, {showNpmScope: true}).then(function (res) {
            let optionalDepsWithLabels = [];
            walk(res.dependencies, function (dep) {
                if (dep.depType === depTypes.OPTIONAL) {
                    expect(dep.labels).toBeDefined();
                    expect(dep.labels['npm:scope']).toEqual('unknown');
                    optionalDepsWithLabels.push(dep.name);
                }
            });
            // Optional deps may or may not exist, so we just verify the structure if they do
            if (optionalDepsWithLabels.length > 0) {
                expect(optionalDepsWithLabels.length).toBeGreaterThan(0);
            }
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is true WHEN building logical tree with extraneous dependencies THEN extraneous dependencies should have npm:scope label set to unknown', function (done) {
        resolveTree(bundleFixture, {showNpmScope: true, dev: true}).then(function (res) {
            let extraneousDepsWithLabels = [];
            walk(res.dependencies, function (dep) {
                if (dep.extraneous && dep.depType === depTypes.EXTRANEOUS) {
                    expect(dep.labels).toBeDefined();
                    expect(dep.labels['npm:scope']).toEqual('unknown');
                    extraneousDepsWithLabels.push(dep.name);
                }
            });
            // Extraneous deps may or may not exist depending on npm version
            if (extraneousDepsWithLabels.length > 0) {
                expect(extraneousDepsWithLabels.length).toBeGreaterThan(0);
            }
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is true WHEN building logical tree THEN all dependencies should have npm:scope labels', function (done) {
        resolveTree(bundleFixture, {showNpmScope: true, dev: true}).then(function (res) {
            let depsWithoutLabels = [];
            walk(res.dependencies, function (dep) {
                if (!dep.labels || !dep.labels['npm:scope']) {
                    depsWithoutLabels.push(dep.name);
                }
            });
            expect(depsWithoutLabels.length).toEqual(0);
        }).catch(fail).then(done);
    });

    test('GIVEN showNpmScope is true WHEN building logical tree THEN nested dependencies should also have npm:scope labels', function (done) {
        resolveTree(bundleFixture, {showNpmScope: true, dev: true}).then(function (res) {
            let nestedDepsWithoutLabels = [];
            walk(res.dependencies, function (dep) {
                if (dep.dependencies) {
                    Object.keys(dep.dependencies).forEach(function (nestedDepName) {
                        let nestedDep = dep.dependencies[nestedDepName];
                        if (!nestedDep.labels || !nestedDep.labels['npm:scope']) {
                            nestedDepsWithoutLabels.push(nestedDep.name);
                        }
                    });
                }
            });
            expect(nestedDepsWithoutLabels.length).toEqual(0);
        }).catch(fail).then(done);
    });
})
