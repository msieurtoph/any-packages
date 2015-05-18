'use strict';

var path = require('path'),
    merge = require('merge'),
    util = require('util'),
    url = require('url-parse'),
    slash = require('slash'),
    fs = require('fs'),
    cwd = process.cwd(),
    deferred = require('deferred'),
    pkg = require('./lib/package')
;

var options;

function readDefaultOptions(opts){
    var defaultOpts = require('./config.js');
    return merge(true, defaultOpts, opts || {});
}

function readPackageJSON(){
    var pkgJson = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgJson)) {
        return false;
    }
    pkgJson = require(pkgJson);
    if (!pkgJson.hasOwnProperty('any-packages')) {
        return false;
    }
    return Object.keys(pkgJson['any-packages']).map(function(key) {
        return pkgJson['any-packages'][key]+':'+key;
    });
}

function parseArg(arg){
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
    if ('' === parsed.protocol){
        parsed.set('pathname', slash(path.join('/', parsed.hostname, parsed.pathname, 'archive', (version || 'master') + (process.platform === 'win32' ? '.zip' : '.tar.gz' ))));
        parsed.set('host', 'github.com');
        parsed.set('hostname', 'github.com');
        parsed.set('protocol', 'https:');
    }

    return {
        name: name,
        url: parsed.href,
        version: version
    };
}

function run(packages, opts, callback){

    // params :
    if (!util.isArray(packages)) {
        packages = 'string' === typeof packages ? packages.split(' ') : [];
    }
    options = readDefaultOptions(opts);
    if ('function' !== typeof callback){
        callback = function(){};
    }

    // read package.json
    if (options.pkg) {
        var pkgJson = readPackageJSON();
        if (pkgJson) {
            packages = packages.concat(pkgJson);
        }
    }

    // install each package
    if (packages.length){
        deferred.map(packages, function(arg){
            return pkg.install(parseArg(arg), options);
        }).then(function(pkgList){
            callback(pkgList);
        }, function(err){
            callback([]);
        });
        // .cb(callback);
    } else {
        callback([]);
    }


    // set list of Package objects
    // var pkgList = args.map(setPackage);

    // var count = 0;
    // function close() {
    //     if (--count < 1) {
    //         callback(pkgList);
    //     }
    // }

    // // install each of them
    // pkgList.forEach(function(pkgJson) {
    //     ++count;
    //     pkgJson.install(close, options);
    // });

    // if (count < 1) {
    //     callback(pkgList);
    // }
}

module.exports = {
    run: run,
    readDefaultOptions: readDefaultOptions,
    readPackageJSON: readPackageJSON,
    parseArg: parseArg
};

