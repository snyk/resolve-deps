let deps = require('../lib/deps');
let path = require('path');
let npm2fixture = path.resolve(__dirname,
    'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures',
    'node_modules/uglify-package');
let npm3fixture = path.resolve(__dirname,
    'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures');
describe('deps.test.js', () => {

    test('deps - not a node project', function (done) {
        deps(__dirname).then(function (res) {
            throw new Error();
        }).catch(function (e) {
            expect(e.message.includes(' is not a node project')).toBeTruthy();
        }).then(done);
    });

    test('deps - npm@3', function (done) {
        deps(npm3fixture).then(function (res) {
            expect(res).toBeTruthy();
        }).catch(throw new Error()).then(done);
    });

// fixture uglify-package does not exist, and newer versions of npm care
    const legacyNpm = Number(
        require('child_process').execSync('npm -v').toString().split('.', 1)[0]
    ) < 5;

    if (legacyNpm) {
        test('deps - with uglify-package', function (done) {
            deps(npm2fixture).then(function (res) {
                expect(res.name).toEqual('uglify-package');
                expect(Object.keys(res.dependencies).length).toEqual(3);
                let ugdeep = res.dependencies['ug-deep'];
                expect(ugdeep.name).toEqual('ug-deep');
            }).catch(function (e) {
                throw new Error(e.stack);
            }).then(done);
        });

        test('deps - with extraFields', function (done) {
            deps(npm2fixture, null, {extraFields: ['main', 'super-bogus-field']}).then(function (res) {
                expect(res.main).toEqual('index.js');
                expect(res['super-bogus-field']).toEqual(null);
            }).catch(function (e) {
                throw new Error(e.stack)
            }).then(done);
        });
    }

    test('deps - throws without path', function (done) {
        deps().then(function () {
            throw new Error('without a path deps should not succeed');
        }).catch(function (e) {
            expect(e.message).toEqual('module path must be a string');
        }).then(done);
    });

    test('deps - with relative "file" option', function (done) {
        deps(__dirname, null, {
            dev: true,
            file: 'fixtures/pkg-undef-deps-with-modules/package.json',
        })
            .then(function (res) {
                expect(res.dependencies.debug.depType).toEqual('dev');
                expect(res.dependencies.undefsafe.depType).toEqual('extraneous');
            })
            .catch(e => throw new Error(e))
            .then(done);
    });

// See test/fixtures/pkg-yarn-renamed-deps/README.md
    test('deps - yarn with renamed dep', function (done) {
        deps('test/fixtures/pkg-yarn-renamed-deps').then(function (res) {
            expect(res.name).toEqual('pkg-renamed-dep');
            expect(Object.keys(res.dependencies).length).toEqual(2);
        }).catch(function (e) {
            throw new Error(e.stack)
        }).then(done);
    });

// See test/fixtures/yarn-link-deps/README.md
    test('deps - yarn with linked deps', function (done) {
        deps('test/fixtures/yarn-link-deps').then(function (res) {
            expect(res.name).toEqual('yarn-link-deps');
            expect(Object.keys(res.dependencies).length).toEqual(3);
        }).catch(function (e) {
            throw new Error(e.stack)
        }).then(done);
    });
});
