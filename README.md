any-packages
============

[![Build Status](http://img.shields.io/travis/msieurtoph/any-packages.svg)](https://travis-ci.org/msieurtoph/any-packages)

Makes npm install any kind of archives into the `node_modules/` folder. Works also with github repos.

### What is any-packages?

Sometimes usefull github repos have no package.json. So NPM cannot install them. 
For instance, https://github.com/angular-ui/bootstrap-bower only provides a bower.json and no package.json. If you do not use bower, you are stuck.

Inspired by the really good **[shama/napa](https://github.com/shama/napa)** package, [any-packages](https://github.com/msieurtoph/any-packages) lets NPM install any package, from any given url (or any github  repo), without needing a distant package.json. The package will be available in the `node_modules/` folder.

Note: It also works if the distant package has a package.json. But doing that does not really make sense.

### Usage

#### package.json mode (recommended)

Add this to your package.json and run `npm install`: 
```javascript
"scripts": {
    "install": "any-package [options] <package_archive_url>:<package_name> <package_archive_url2>:<package_name2> [...]"
}
```
or better : 
````javascript
"scripts": {
    "install": "any-package [options]"
},
"any-package": {
    "<package_name>": "<package_archive_url>",
    "<package_name2>": "<package_archive_url2>",
    "<package_name3>": "<package_archive_url3>",
    ...
}
```

Supported urls:
````javascript
"any-package": {
    // URLS
    "name": "http://domain.com/path/to/archive",
    "name": "http://domain.com:1234/path/to/archive",
    "name": "https://domain.com/path/to/archive",
    "name": "https://domain.com:1234/path/to/archive",
    ...
    // github repos
    "repo": "user/repo",
    "repo": "user/repo#0.1.2",
    "repo": "https://github.com/user/repo",
    "repo": "https://github.com/user/repo/archive/0.1.2.zip",
    "repo": "https://github.com/user/repo/archive/0.1.2.tgz"
    ...
}
```

#### command-line mode

`bin/any-package [options] <package_archive_url>:<package_name> <package_archive_url2>:<package_name2> ...`

#### scripting mode

```javascript
var any = require('any-packages'),
    args = [
        'user/repo:name',
        'user/repo', // if name is not provided: name = repo
        'http://domain.com/path/to/archive:package_name',
        ...
    ],
    opts = {
        pkg: false, // set this one to false in scripting mode
        ...
    },
    callback = function(pkgList){
      // this function is executed when everything is done.
      // See Callback function section for more information
    }
;
any.run(args, opts, callback);
// if args is not provided (or is null), local package.json configuration will be used.
// if opts is not provided (or is null), default options are used.
// callback is also optional.
```

### Options

* `--cache / --no-cache` : use cache (if present) or not. _Default: `--cache / true`_
* `--force / --no-force` : force download or not, even if the package is already present in cache. _Default: `--no-force / false`_
* `--pkg / --no-pkg` : use the package.json configuration or not. Useless in package.json usage, but usefull in scripting mode or in command-line. If `false`, the `any-packages` property of the package.json is ignored and the only the passed arguments will be used. _Default: `--pkg / true`_
* `--test / --no-test` : really download and write to disk or not. By-pass the download phase during test. _Default: `--no-test / false`_

In scripting mode:
```javascript
{
    cache: true,
    force: false,
    pkg: false, 
    test: false
}
```

### The callback function

The callback function could only be used in the scripting mode. It has only one parameter : an array of Package objects.

Package object provides this API : 

* `name`: name of the package,
* `url`: url used,
* `version`: version or the package (if provided),
* `opts`: options used during the installation,
* `installMethod`: `download` or `cache`, method used to install the package,
* `installTo`: path where the package should be installed to,
* `cacheTo`: path where the package should be cached to,
* `installed`: is the package installed or not in `installTo` path,
* `cached`: is the package cached or not in `cacheTo` path (always `false` if `opts.cache=false`),

See this full example:
```javascript
var any = require('any-packages'),
    args = [
        'angular-ui/bootstrap-bower:angular-bootstrap',
        'http://github.com/unshiftio/url-parse/archive/0.2.2.zip:url-parse',
        'http://invalid.url/package:invalid_package'
    ],
    opts = {
        pkg: false 
    }
;

function callback(pkgList){
  pkgList.forEach(function(pkg){
    console.log('-------------');
    console.log('The package', pkg.name, 'has been processed.');
    console.log('Url: ', pkg.url);
    console.log('Version:', pkg.version);
    console.log('Installed in', pkg.installTo, ':', pkg.installed);
    console.log('Cached in', pkg.cacheTo, ':', pkg.cached);
    console.log('Installation method:', pkg.installMethod);
  })
}

any.run(args, opts, callback);
```
This should give:
```
info downloading http://invalid.url/package into invalid_package
ERR! Specify a valid URL
ERR! failed invalid_package
info downloading http://github.com/unshiftio/url-parse/archive/0.2.2.zip into url-parse
info downloading https://github.com/angular-ui/bootstrap-bower/archive/master.zip into angular-bootstrap
info done http://github.com/unshiftio/url-parse/archive/0.2.2.zip
info done https://github.com/angular-ui/bootstrap-bower/archive/master.zip
-------------
The package angular-bootstrap has been processing.
Url:  https://github.com/angular-ui/bootstrap-bower/archive/master.zip
Version: undefined
Installed in <fullpath_to>\node_modules\angular-bootstrap : true
Cached in <fullpath_to>\cache\github.com\angular-ui\bootstrap-bower\archive\master.zip : true
Installation method: download
-------------
The package url-parse has been processing.
Url:  http://github.com/unshiftio/url-parse/archive/0.2.2.zip
Version: undefined
Installed in <fullpath_to>\node_modules\url-parse : true
Cached in <fullpath_to>\cache\github.com\unshiftio\url-parse\archive\0.2.2.zip : true
Installation method: download
-------------
The package invalid_package has been processing.
Url:  http://invalid.url/package
Version: undefined
Installed in <fullpath_to>\node_modules\invalid_package : false
Cached in <fullpath_to>\cache\invalid.url\package : false
Installation method: download
```
