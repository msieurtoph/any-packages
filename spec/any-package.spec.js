'use strict';

var any = require('../cli.js'),
    defaultOpts = require('../config.js'),
    pkg = require('../lib/package.js'),
    rimraf = require('rimraf')
;

describe('any.readDefaultOptions function', function(){
    var opts;

    it('should match default options if no option is passed', function(){
        opts = any.readDefaultOptions();
        expect(opts).toEqual(defaultOpts);
    });

    it('should merge additional options', function(){
        opts = any.readDefaultOptions({pkg:false});
        expect(opts).not.toEqual(defaultOpts);
        expect(opts.pkg).toBe(false);
    });

});

describe('any.readPackageJSON function', function(){

    it('should read and parse package.json', function(){
        var pkg = any.readPackageJSON();
        expect(pkg).toEqual([
            'user/repo:invalid',
            'http://domain.com/invalid/package:invalid2',
            'unshiftio/url-parse:url-parse2',
            'unshiftio/url-parse#0.2.1:url-parse3',
            'http://github.com/unshiftio/url-parse/archive/0.2.2.zip:url-parse4',
            'http://github.com/unshiftio/url-parse/archive/0.2.2.zip?foo=bar:url-parse5',
            'unshiftio/url-parse?foo=bar#0.2.1:url-parse6',
            'angular-ui/bootstrap-bower:angular-bootstrap'
        ]);
    });

});

describe('any.parseArg function', function(){
    var pkg;

    it('should return an object', function(){
        pkg = any.parseArg('user/repo');
        expect(typeof pkg).toBe('object');
    });

    var extension = ((process.platform === 'win32') ? 'zip' : 'tar.gz'),
        tests = [
            {
                arg: 'user/repo',
                name:'repo',
                url:'https://github.com/user/repo/archive/master.' + extension,
                version: undefined
            },
            {
                arg: 'user/repo:custom',
                name:'custom',
                url:'https://github.com/user/repo/archive/master.' + extension,
                version: undefined
            },
            {
                arg: 'user/repo#version',
                name:'repo',
                url:'https://github.com/user/repo/archive/version.' + extension,
                version: 'version'
            },
            {
                arg: 'user/repo#version:custom',
                name:'custom',
                url:'https://github.com/user/repo/archive/version.' + extension,
                version: 'version'
            },
            {
                arg: 'https://github.com/user/repo',
                name:'repo',
                url:'https://github.com/user/repo',
                version: undefined
            },
            {
                arg: 'https://github.com/user/repo/archive/master.zip:custom',
                name:'custom',
                url:'https://github.com/user/repo/archive/master.zip',
                version: undefined
            },
            {
                arg: 'http://test.com/my/complex/path/archive.zip:custom',
                name:'custom',
                url:'http://test.com/my/complex/path/archive.zip',
                version: undefined
            },
            {
                arg: 'http://test.com:1234/my/complex/path/archive.zip:custom',
                name:'custom',
                url:'http://test.com:1234/my/complex/path/archive.zip',
                version: undefined
            },
            {
                arg: 'http://test.com:1234/my/complex/path/archive.zip?args=values:custom',
                name:'custom',
                url:'http://test.com:1234/my/complex/path/archive.zip?args=values',
                version: undefined
            },
            {
                arg: 'user/repo?args=value#version:custom',
                name:'custom',
                url:'https://github.com/user/repo/archive/version.' + extension + '?args=value',
                version: 'version'
            }
        ]
    ;

    it ('should give right name to the Package library', function(){
        tests.forEach(function(item){
            pkg = any.parseArg(item.arg);
            expect(pkg.name).toBe(item.name);
        });
    });

    it ('should give right url to the Package library', function(){
        tests.forEach(function(item){
            pkg = any.parseArg(item.arg);
            expect(pkg.url).toBe(item.url);
        });
    });

    it ('should give right version to the Package library', function(){
        tests.forEach(function(item){
            pkg = any.parseArg(item.arg);
            expect(pkg.version).toBe(item.version);
        });
    });

});

describe('any.run function', function(){

    var pkgCount = 8;

    it('should not read package.json', function(done){
        any.run(null, {pkg:false}, function(pkgList){
            expect(pkgList.length).toBe(0);
            done();
        });
    });

    it('should parse string\'ed packages', function(done){
        any.run('unshiftio/url-parse:foo unshiftio/url-parse#0.2.1:bar', {pkg:false}, function(pkgList){
            expect(pkgList.length).toBe(2);
            pkgList.map(function(pkg){
                expect(pkg.valid).toBe(true);
            });
            done();
        });
    });

    it('should not try to install args', function(done){
        any.run('foo bar baz', {pkg:false}, function(pkgList){
            expect(pkgList.length).toBe(3);
            pkgList.map(function(pkg){
                expect(pkg.valid).toBe(false);
            });
            done();
        });
    });

    pkg.clearCache();

    it('should run in test mode', function(done){
        any.run(null, {test:true}, function(pkgList){
            expect(pkgList.length).toBe(pkgCount);
            pkgList.map(function(pkg){
                expect(pkg.valid).toBe(true);
                expect(pkg.installed).toBe(false);
            });
            done();
        });
    });

    pkg.clearCache();

    it('should run in prod mode (timeout = 5s)', function(done){

        // in case of proxy, downloading could be damned long...
        var timer = setTimeout(function(){
            console.log('timeout');
            done();
        }, jasmine.DEFAULT_TIMEOUT_INTERVAL - 100);

        any.run(null, null, function(pkgList){
            expect(pkgList.length).toBe(pkgCount);
            pkgList.map(function(pkg){
                expect(pkg.valid).toBe(true);
                expect(pkg.installed).toBe(-1 === pkg.name.indexOf('invalid'));
            });
            clearTimeout(timer);
            done();
        });
    });

    it('should run in test mode (with previously cached pkg)', function(done){
        any.run(null, {test:true}, function(pkgList){
            expect(pkgList.length).toBe(pkgCount);
            pkgList.map(function(pkg){
                expect(pkg.valid).toBe(true);
                expect(pkg.installed).toBe(false);
            });
            done();
        });
    });

});



describe('Package library', function(){

    var url1 = 'https://github.com/unshiftio/url-parse/archive/master.zip',
        url2 = 'https://github.com/unshiftio/url-parse/archive/0.2.1.zip',
        myPkg
    ;

    function clean(pkg, done){
        if (!done) {
            done = function(){};
        }
        rimraf(pkg.installTo, function(){
            rimraf(pkg.cacheTo, done);
        });
    }


    it('should clear cache', function(done){
            myPkg = {
            name: 'any-packages-package-object-test',
            url: url1,
            version: undefined
        };
        pkg.setPkg(myPkg);

        pkg.clearCache();

        myPkg.url = url2;
        expect(myPkg.installed).toBe(false);
        expect(myPkg.cached).toBe(false);

        myPkg.url = url1;
        expect(myPkg.installed).toBe(false);
        expect(myPkg.cached).toBe(false);

        done();
    });

    pkg.clearCache();

    it('should use default options', function(done){
        pkg.install({
            name: 'any-packages-package-object-test',
            url: url1,
            version: undefined
        }).then(function(pkg){
            expect(pkg.installed).toBe(true);
            expect(pkg.cached).toBe(false);
            expect(pkg.installMethod).toBe('download');
            done();
        }, function(err){
            // automatically make the test fail (error cannot be undefined)
            expect(err).toBeUndefined();
            done();
        });
    });

    pkg.clearCache();

    it('should save to cache', function(done){
        pkg.install({
            name: 'any-packages-package-object-test',
            url: url1,
            version: undefined
        },{
            cache: true
        }).then(function(pkg){
            expect(pkg.installed).toBe(true);
            expect(pkg.cached).toBe(true);
            expect(pkg.installMethod).toBe('download');
            done();
        }, function(err){
            // automatically make the test fail (error cannot be undefined)
            expect(err).toBeUndefined();
            done();
        });
    });

    it('should use cache', function(done){
        pkg.install({
            name: 'any-packages-package-object-test',
            url: url1,
            version: undefined
        },{
            cache: true
        }).then(function(pkg){
            expect(pkg.installed).toBe(true);
            expect(pkg.cached).toBe(true);
            expect(pkg.installMethod).toBe('cache');
            done();
        }, function(err){
            // automatically make the test fail (error cannot be undefined)
            expect(err).toBeUndefined();
            done();
        });
    });

    it('should not use cache if asked', function(done){
        pkg.install({
            name: 'any-packages-package-object-test',
            url: url1,
            version: undefined
        },{
            cache: false
        }).then(function(pkg){
            expect(pkg.installed).toBe(true);
            expect(pkg.cached).toBe(false);
            expect(pkg.installMethod).toBe('download');
            done();
        }, function(err){
            // automatically make the test fail (error cannot be undefined)
            expect(err).toBeUndefined();
            done();
        });
    });

    it('should force download if asked', function(done){
        pkg.install({
            name: 'any-packages-package-object-test',
            url: url1,
            version: undefined
        },{
            cache: true,
            force: true
        }).then(function(pkg){
            expect(pkg.installed).toBe(true);
            expect(pkg.cached).toBe(true);
            expect(pkg.installMethod).toBe('download');
            done();
        }, function(err){
            // automatically make the test fail (error cannot be undefined)
            expect(err).toBeUndefined();
            done();
        });
    });

    it('should download if url differs', function(done){
        pkg.install({
            name: 'any-packages-package-object-test',
            url: url2,
            version: undefined
        },{
            cache: true
        }).then(function(pkg){
            expect(pkg.installed).toBe(true);
            expect(pkg.cached).toBe(true);
            expect(pkg.installMethod).toBe('download');
            done();
        }, function(err){
            // automatically make the test fail (error cannot be undefined)
            expect(err).toBeUndefined();
            done();
        });
    });

    myPkg = {
        name: 'any-packages-package-object-test',
        url: url1,
        version: undefined
    };
    pkg.setPkg(myPkg);
    clean(myPkg);

});

