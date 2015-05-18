'use strict';

var path = require('path'),
    cwd = process.cwd(),
    fs = require('fs'),
    deferred = require('deferred'),
    rimraf = deferred.promisify(require('rimraf')),
    mkdirp = deferred.promisify(require('mkdirp')),
    log = require('npmlog'),
    Download = require('download'),
    cache = require('npm-cache-filename'),
    slash = require('slash'),
    tmp = slash(path.join(require('os').tmpdir(), 'cache')),
    tarpack = require('tar-pack')
;

function setPkg(pkg){

    pkg.resolvedKey = '_anyPackages';
    pkg.opts = {};

    pkg.installMethod = undefined;

    Object.defineProperty(pkg, 'installTo', {
        get: function(){
            return slash(path.join(cwd, 'node_modules', this.name));
        }
    });

    Object.defineProperty(pkg, 'cacheTo', {
        get: function(){
            return cache(tmp, this.url);
        }
    });

    Object.defineProperty(pkg, 'installed', {
        get: function() {
            var existing = slash(path.join(this.installTo, 'package.json'));
            return (fs.existsSync(existing) && (!require(existing)[this.resolvedKey] || require(existing)[this.resolvedKey] === this.url));
        }
    });

    Object.defineProperty(pkg, 'cached', {
        get: function() {
            return !!this.opts.cache && fs.existsSync(this.cacheTo);
        }
    });

}

function cacheInstall(pkg){

    pkg.installMethod = 'cache';

    log.info('cache', pkg.url, ' into ', pkg.name);
    if (pkg.opts.test) {

        log.info('by-passed', 'for', pkg.name);
        return deferred.resolve(pkg);

    } else {

        var unpacking = deferred();

        fs
        .createReadStream(pkg.cacheTo)
        .pipe(tarpack.unpack(pkg.installTo, function(err){
            if (err){
                unpacking.reject(err);
            } else {
                unpacking.resolve(pkg);
            }
        }));

        return unpacking;
    }
}

function downloadInstall(pkg){

    pkg.installMethod = 'download';

    log.info('downloading', pkg.url, ' into ', pkg.name);

    if (pkg.opts.test) {
        log.info('by-passed', 'for', pkg.name);
        return deferred.resolve(pkg);
    } else {
        var downloading = deferred();
        new Download({extract: true, strip: 1})
            .get(pkg.url)
            .dest(pkg.installTo)
            .run(function(err){
                if (err){
                    downloading.reject(err);
                } else {
                    downloading.resolve(pkg);
                }
            });

        return downloading.promise;
    }
}

function cacheSave(pkg) {

    if (!pkg.installed || !pkg.opts.cache || pkg.opts.test) {

        return deferred.resolve(pkg);

    }

    return mkdirp(path.dirname(pkg.cacheTo)).then(function(){
        var dest = fs.createWriteStream(pkg.cacheTo),
            caching = deferred()
        ;

        tarpack.pack(pkg.installTo)
            .pipe(dest)
            .on('close', function(){
                caching.resolve(pkg);
            })
            .on('error', function(err){
                caching.reject(err);
            });

        return caching.promise;
    });

}

function writePackageJson(pkg) {

    var filepath = slash(path.join(pkg.installTo, 'package.json')),
        writeFile = deferred.promisify(fs.writeFile),
        pkgJson = null
    ;

    if (!pkg.installed || pkg.opts.test) {

        return deferred.resolve(pkg);

    }

    if (!fs.existsSync(filepath)) {
        pkgJson = {
            name: pkg.name,
            version: pkg.version || '0.0.0',
            description: pkg.name + ', added with love by any-packages'
        };
    } else {
        pkgJson = require(filepath);
    }
    pkgJson[pkg.resolvedKey] = pkg.url;

    return writeFile(filepath, JSON.stringify(pkgJson, null, 2)).then(function(){
        return pkg;
    });

}

function install(pkg, opts){

    // var self = this;
    // this.opts = opts || {};

    // function installCallback(err){
    //     if (err) {
    //         self.log.error('failed', self.name);
    //         callback(err.message);
    //     } else {
    //         self.log.info('done', self.url);
    //         self.writePackageJson(function(err){
    //             if (err) {
    //                 callback(err.message);
    //             } else {
    //                 self.cacheSave(callback);
    //             }
    //         });
    //     }
    // }

    setPkg(pkg);
    pkg.opts = opts || {};

    var def = deferred(),
        action
    ;
    rimraf(pkg.installTo).then(function(){

        if (pkg.cached && pkg.opts.cache && !pkg.opts.force) {
            action = cacheInstall(pkg);
        } else {
            action = downloadInstall(pkg);
        }

        return action.then(

            writePackageJson

        ).then(

            cacheSave

        ).then(function(pkg){

            log.info('done', pkg.name);
            def.resolve(pkg);

        }, function(err){

            log.error('failed', pkg.name, ':', err.message);
            def.resolve(pkg);

        });

    }, function(err) {
        log.error('cannot remove ', pkg.installTo);
        return def.resolve(pkg);
    });

    return def.promise;

}


module.exports = {
    setPkg: setPkg,
    install: install
};