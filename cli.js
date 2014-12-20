'use strict';

var path = require('path'),
    merge = require('merge'),
    util = require('util'),
    url = require('url-parse'),
    slash = require('slash'),
    fs = require('fs'),
    cwd = process.cwd(),
    Package = require('./lib/package')
;

var options;

function readDefaultOptions(opts){
    var defaultOpts = require('./config.js');
    return merge(true, defaultOpts, opts || {});
}

function readPackageJSON(){
    var pkg = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkg)) {
        return false;
    }
    pkg = require(pkg);
    if (!pkg.hasOwnProperty('any-packages')) {
        return false;
    }
    return Object.keys(pkg['any-packages']).map(function(key) {
        return pkg['any-packages'][key]+':'+key;
    });
}

function setPackage(arg){
    var parsed = url(arg),
        parsedTmp, name, version, type;

    //get module final name and version !
    // get name and version in parsed.hash (if version is provided)
    if ('' !== parsed.hash) {
        parsedTmp = parsed.hash.match(/(.*):(.*)/);
        if (parsedTmp) {
            name = parsedTmp[2];
            version = parsedTmp[1].slice(1);
        } else {
            version = parsed.hash.slice(1);
        }
        parsed.set('hash', '');
    // else, get name in parsed.pathname
    } else {
        parsedTmp = parsed.pathname.match(/(.*):(.*)/);
        if (parsedTmp) {
            name = parsedTmp[2];
            parsed.set('pathname', parsedTmp[1]);
        }
    }
    // if !name, get it from parsed.pathname
    if (!name){
        name = path.basename(parsed.pathname);
    }

    //set full github url if there is no parsed.hostname
    if ('' === parsed.hostname){
        parsed.set('host', 'github.com');
        parsed.set('hostname', 'github.com');
        parsed.set('protocol', 'https:');
        parsed.set('pathname', slash(path.join('/', parsed.pathname, 'archive', (version || 'master') + (process.platform === 'win32' ? '.zip' : '.tar.gz' ))));
    }

    return new Package(name, parsed.toString(), version);
}

function run(args, opts, callback){

    // params :
    if (!util.isArray(args)) {
        args = 'string' === typeof args ? args.split(' ') : [];
    }
    options = readDefaultOptions(opts);
    if ('function' !== typeof callback){
        callback = function(){};
    }

    // read package.json
    if (options.pkg) {
        var pkg = readPackageJSON();
        if (pkg) {
            args = args.concat(pkg);
        }
    }

    // set list of Package objects
    var pkgList = args.map(setPackage);

    var count = 0;
    function close() {
        if (--count < 1) {
            callback(pkgList);
        }
    }

    // install each of them
    pkgList.forEach(function(pkg) {
        ++count;
        pkg.install(close, options);
    });

    if (count < 1) {
        callback(pkgList);
    }
}

module.exports = {
    run: run,
    readDefaultOptions: readDefaultOptions,
    readPackageJSON: readPackageJSON,
    setPackage: setPackage
};

