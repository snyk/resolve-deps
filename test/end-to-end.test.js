let lib = require('../lib');

describe('end-to-end.test.js', () => {
    test('end to end (no deps)', function (done) {
        lib(__dirname + '/fixtures/pkg-undef-deps')
            .then(function (res) {
                expect(res).toBeTruthy();
            })
            .catch(fail)
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
            .catch(fail)
            .then(done);
    });

    test('end to end (no deps but has node_modules)', function (done) {
        lib(__dirname + '/fixtures/pkg-undef-deps-with-modules', {dev: true})
            .then(function (res) {
                expect(res.dependencies.debug.extraneous).toBeUndefined();
                expect(res.dependencies.undefsafe.extraneous).toEqual(true);
                expect(res).toBeTruthy();
            })
            .catch(fail)
            .then(done);
    });
})
