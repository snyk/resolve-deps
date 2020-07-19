let pluck = require('../lib/pluck');
let path = require('path');
let remoteFixtures = path.resolve(__dirname,
    'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures');
let npm2fixtures = require(remoteFixtures + '/snyk-resolve-deps-npm2.json');
let npm3fixtures = require(remoteFixtures + '/snyk-resolve-deps-npm3.json');
let pm2fixtures = require(remoteFixtures + '/pm2-disk.json');
let logicalTree = require('../lib/logical');

describe('pluck test suite', () => {

    test('pluck (with npm@2 modules)', function (done) {
        let res = npm2fixtures;
        res.npm = 2;
        pluckTests(done, res);
    });

    test('pluck (with npm@3 modules)', function (done) {
        let res = npm3fixtures;
        res.npm = 3;
        pluckTests(done, res);
    });

    test('pluck (try github as version)', function () {
        let res = require(path.resolve(__dirname,
            'fixtures/bundle/node_modules/snyk-resolve-deps-fixtures',
            'jsbin-file-tree.json'));
        let plucked = null;
        let name = 'memcached';

        plucked = pluck(res, ['jsbin', 'memcached'], name, '2.0.0');
        expect(plucked.name).toEqual('memcached');
    });

    function pluckTests(done, res) {
        let plucked = null;
        let name = 'lodash';
        plucked = pluck(res, ['snyk-resolve-deps', 'lodash'], name, '*');
        expect(plucked.name).toEqual(name);
        plucked = pluck(res, ['snyk-resolve-deps', 'snyk', 'inquirer', 'lodash'], name, '*');
        expect(plucked.name).toEqual(name);

        plucked = pluck(res, ['this-module-does-not-exist', 'inquirer'], name, '*');
        expect(plucked).toEqual(false);

        plucked = pluck(res, ['snyk-resolve-deps'], name, '*');
        expect(plucked.name).toEqual(name);

        plucked = pluck(res, ['snyk-resolve-deps'], name, 'latest');
        expect(plucked.name).toEqual(name);

        let from = [
            'snyk-resolve-deps@1.1.0',
            'tap@5.2.0',
            'codecov.io@0.1.6',
            'request@2.42.0',
            'hawk@1.1.1'
        ];
        plucked = pluck(res, from, 'hawk', '1.1.1');
        expect(plucked.name).toEqual('hawk');

        from = [
            'snyk-resolve-deps@1.1.2',
            'snyk-resolve-deps-fixtures@1.1.1',
            '@remy/vuln-test@1.0.1',
            'semver@2.3.2'
        ];

        plucked = pluck(res, from, 'semver', '2.3.2');
        expect(plucked.name).toEqual('semver');

        // skip this test in npm2 because ansicolors
        // got deduped (into the root).
        if (res.npm === 3) {
            from = [
                'snyk-resolve-deps-fixtures',
                '@remy/npm-tree'
            ];

            plucked = pluck(res.dependencies['snyk-resolve-deps-fixtures'], from, 'ansicolors', '^0.3.2');
            expect(plucked.name).toEqual('ansicolors');

            from = [
                'snyk-resolve-deps',
                '@remy/vuln-test'
            ];

            plucked = pluck(res, from, 'semver', '2.3.2');
            expect(plucked.name).toEqual('semver');
        }

        if (res.npm === 2) {
            from = ['snyk-resolve-deps', 'tap', 'nyc', 'istanbul', 'handlebars', 'uglify-js', 'source-map'];
            plucked = pluck(res, from, 'source-map', '~0.5.1');
            expect(plucked.name).toEqual('source-map');
            expect(plucked.extraneous).toBeFalsy();
        }

        from = [
            'snyk-resolve-deps',
            'snyk-resolve-deps-fixtures',
            'semver-rs-demo',
            'semver'
        ];

        plucked = pluck(res, from, 'semver', '*');
        expect(plucked.name).toEqual('semver');
        expect(plucked.version[0]).toEqual('2');

        plucked = pluck(res, from, 'semver', '0.0.0');
        expect(plucked).toEqual(false);

        done();
    }

    test('forward pluck', function () {
        let from = [
            'foo@0',
            'glue@3.2.0',
            'hapi@13.0.0',
            'statehood@4.0.0',
            'joi@7.1.0',
            'moment@2.11.0'
        ];

        let plucked = pluck(require(__dirname + '/fixtures/not-found.json'), from, 'moment', '2.11.0');
        expect(plucked).toBeTruthy();
    });

    test('shrinkwrap compatible', function () {
        let fixture = require('./fixtures/glue-npm-shrinkwrap.json');

        let from = [
            'foo@1.0.0',
            'glue@3.2.0',
            'hapi@13.0.0',
            'heavy@4.0.0',
            'joi@7.1.0',
            'moment@2.11.0'
        ];

        let plucked;
        plucked = pluck(fixture, from, 'moment', '2.11.0');
        expect(plucked.version).toEqual('2.11.0');
    });

    test('shrinkwrap compatible (finds all vuln shrinkwrap)', function () {
        let vulns = require(__dirname + '/fixtures/glue-npm-shrinkwrap-vulns.json').vulnerabilities;
        let fixture = require(__dirname + '/fixtures/glue-npm-shrinkwrap.json');

        vulns.forEach(function (vuln) {
            let plucked = pluck(fixture, vuln.from, 'moment', '2.11.0');

            expect(plucked.version).toEqual('2.11.0');
            expect(plucked.shrinkwrap).toEqual('hapi@13.0.0');
        });
    });

    test('handles unsupported git urls', function () {
        let from = ['pm2-demo@1.0.0', 'pm2@1.0.1'];

        let plucked;
        plucked = pluck(pm2fixtures, from, 'ikt', 'git+http://ikt.pm2.io/ikt.git#master');
        expect(plucked.name).toEqual('ikt');
    });
});

