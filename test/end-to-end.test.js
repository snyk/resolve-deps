let lib = require('../lib');

describe('end-to-end.test.js', () => {

    test('end to end (no deps)', function (done) {
        lib(__dirname + '/fixtures/pkg-undef-deps')
            .then(function (res) {
                expect(res).toBeTruthy();
            })
            .catch(throw new Error())
            .then(done);
    });

    test('end to end (sub-pluck finds correctly)', function () {
        let res = lib.logicalTree(require(__dirname + '/fixtures/oui.json'));
        let from = ['foo@1.0.0',
            'chokidar@1.4.1',
            'fsevents@1.0.7',
            'node-pre-gyp@0.6.19',
            'request@2.67.0',
            'hawk@3.1.2'];

        let plucked = res.pluck(from, 'hawk', '3.1.2');

        expect(plucked === false).toBeFalsy();
        expect(plucked.name).toEqual('hawk');
        expect(plucked.bundled).toEqual(from.slice(0, 4));
    });


    test('end to end (no name on root pkg)', function (done) {
        lib(__dirname + '/fixtures/pkg-missing-name')
            .then(function (res) {
                expect(res).toBeTruthy();
            })
            .catch(throw new Error())
            .then(done);
    });

    test('end to end (no deps but has node_modules)', function (done) {
        lib(__dirname + '/fixtures/pkg-undef-deps-with-modules', {dev: true})
            .then(function (res) {
                expect(res.dependencies.debug.extraneous).toBeUndefined();
                expect(res.dependencies.undefsafe.extraneous).toEqual(true);
                expect(res).toBeTruthy();
            })
            .catch(throw new Error())
            .then(done);
    });

    test('end to end (bundle with dev)', function (done) {
        lib(__dirname + '/fixtures/bundle', {dev: true})
            .then(function (res) {
                let fixtures = res.dependencies['snyk-resolve-deps-fixtures'];
                let from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul-reports', 'handlebars', 'uglify-js', 'source-map'];
                let plucked = res.pluck(from, 'source-map', '~0.5.1');

                expect(res.dependencies.tap.dependencies.nyc.dependencies['istanbul-reports'].dependencies.handlebars.dependencies['uglify-js'].dependencies['source-map'].extraneous).toBeFalsy();
                expect(fixtures).toBeTruthy();
                expect(fixtures.dependencies['@remy/npm-tree'].name).toEqual('@remy/npm-tree');
                expect(fixtures.dependencies['@remy/vuln-test'].name).toEqual('@remy/vuln-test');
                // Differences between npm@6 and npm@7 definitions of extraneous- undefsafe is not extraneous
                // in npm@7, therefore it's undefined
                expect(!fixtures.dependencies.undefsafe || fixtures.dependencies.undefsafe.extraneous).toEqual(true);

                plucked = res.pluck(['bundle@1', 'snyk-resolve-deps-fixtures@1', 'snyk-tree'], 'snyk-tree', '*');
                expect(plucked.name).toEqual('snyk-tree');
                expect(plucked.__filename).toBeTruthy();
            })
            .catch(throw new Error())
            .then(done);
    });

    test('end to end (this package __without__ dev)', function (done) {
        lib(__dirname + '/fixtures/bundle')
            .then(function (res) {
                let from = ['bundle', 'tap', 'nyc', 'istanbul-reports', 'handlebars', 'uglify-js', 'source-map'];
                let plucked = res.pluck(from, 'source-map', '~0.6.1');
                expect(plucked.name).toBeTruthy();
                let unique = res.unique();
                let counter = {};
                lib.walk(unique, function (dep) {
                    if (counter[dep.full]) {
                        counter[dep.full]++;
                        throw new Error('found ' + dep.full + ' ' + counter[dep.full] + ' times in unique list');
                    }
                    counter[dep.full] = 1;
                });
            })
            .catch(throw new Error())
            .then(done);
    });

    test('end to end (bundle without from arrays)', function (done) {
        lib(__dirname + '/fixtures/bundle', {noFromArrays: true})
            .then(function (res) {
                let from = ['bundle', 'tap', 'nyc', 'istanbul-reports', 'handlebars', 'uglify-js', 'source-map'];
                let plucked = res.pluck(from, 'source-map', '~0.6.1');
                expect(plucked.name).toBeTruthy();

                let unique = res.unique();
                let counter = {};
                lib.walk(unique, function (dep) {
                    if (dep.from) {
                        throw new Error('from array found on node', dep);
                    }
                    if (counter[dep.full]) {
                        counter[dep.full]++;
                        throw new Error('found ' + dep.full + ' ' + counter[dep.full] + ' times in unique list');
                    }
                    counter[dep.full] = 1;
                });
            })
            .catch(throw new Error())
            .then(done);
    });
})
