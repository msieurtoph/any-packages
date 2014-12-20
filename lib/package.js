'use strict';

var path = require('path'),
    cwd = process.cwd(),
    fs = require('fs'),
    rimraf = require('rimraf'),
    log = require('npmlog'),
    Download = require('download'),
    cache = require('npm-cache-filename'),
    tmp = path.join(require('os').tmpdir(), 'cache'),
    mkdirp = require('mkdirp'),
    tarpack = require('tar-pack')
;

function Package(name, url, version){
    var self = this;

    if (!(this instanceof Package)) {
        return new Package(name, url, version);
    }
    this.name = name;
    this.url = url;
    this.version = version;

    this.log = log;

    this.resolvedKey = '_anyPackages';
    this.opts = {};

    this.installMethod = undefined;

    Object.defineProperty(self, 'installTo', {
        get: function(){
            return path.join(cwd, 'node_modules', this.name);
        }
    });

    Object.defineProperty(self, 'cacheTo', {
        get: function(){
            return cache(tmp, this.url);
        }
    });

    Object.defineProperty(self, 'installed', {
        get: function() {
            var existing = path.join(self.installTo, 'package.json');
            return (fs.existsSync(existing) && require(existing)[self.resolvedKey] === self.url);
        }
    });

    Object.defineProperty(self, 'cached', {
        get: function() {
            return !!self.opts.cache && fs.existsSync(self.cacheTo);
        }
    });
}

Package.prototype.install = function(callback, opts){
    if ('function' !== typeof callback){
        callback = function(){};
    }

    var self = this;
    this.opts = opts || {};

    function installCallback(err){
        if (err) {
            self.log.error('failed', self.name);
            callback(err.message);
        } else {
            self.log.info('done', self.url);
            self.writePackageJson(function(err){
                if (err) {
                    callback(err.message);
                } else {
                    self.cacheSave(callback);
                }
            });
        }
    }

    rimraf(self.installTo, function(err) {
        if (err) {
            self.log.error(err.message);
            installCallback(err);
        } else if (self.cached && self.opts.cache && !self.opts.force) {
            self.cacheInstall(installCallback);
        } else {
            self.downloadInstall(installCallback);
        }
    });
};

Package.prototype.cacheInstall = function(callback){
    if ('function' !== typeof callback){
        callback = function(){};
    }

    this.installMethod = 'cache';

    this.log.info('cache', '%s into %s', this.url, this.name);
    if (this.opts.test) {
        this.log.info('by-passed', 'for', this.name);
        callback();
    } else {
        fs.createReadStream(this.cacheTo)
          .pipe(tarpack.unpack(this.installTo, callback));
    }
};

Package.prototype.downloadInstall = function(callback){
    if ('function' !== typeof callback){
        callback = function(){};
    }

    var self = this;

    this.installMethod = 'download';

    this.log.info('downloading', this.url, 'into', this.name);
    if (this.opts.test) {
        this.log.info('by-passed', 'for', this.name);
        callback();
    } else {
        new Download({extract: true, strip: 1})
            .get(this.url)
            .dest(this.installTo)
            .run(function(err){
                if (err) {
                    self.log.error(err.message);
                }
                callback(err);
            });
    }
};

Package.prototype.cacheSave = function(callback) {
    if ('function' !== typeof callback){
        callback = function(){};
    }

    var self = this;

    if (!this.installed || !this.opts.cache || self.opts.test) {
        callback();
    } else {
        mkdirp(path.dirname(self.cacheTo), function(err) {
            if (err) {
                callback(err);
            } else {
                var dest = fs.createWriteStream(self.cacheTo);
                tarpack.pack(self.installTo)
                    .pipe(dest)
                    .on('close', callback);
            }
        });
    }
};

Package.prototype.writePackageJson = function(callback) {
    if ('function' !== typeof callback){
        callback = function(){};
    }

    var filepath = path.join(this.installTo, 'package.json'),
        pkg = null
    ;

    if (!fs.existsSync(filepath)) {
        pkg = {
            name: this.name,
            version: this.version || '0.0.0',
            description: this.name + ', added with love by any-packages'
        };
    } else {
        pkg = require(filepath);
    }
    pkg[this.resolvedKey] = this.url;
    fs.writeFile(filepath, JSON.stringify(pkg, null, 2), callback);
};

module.exports = Package;