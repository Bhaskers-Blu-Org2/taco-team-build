/*
  Copyright (c) Microsoft. All rights reserved.  
  Licensed under the MIT license. See LICENSE file in the project root for full license information.
*/
// Module dependencies
var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    semver = require('semver'),
    exec = Q.nfbind(require('child_process').exec);

var moduleCache;

// Utility method to handle the return of exec calls - namely to send output to stdout / stderr
function handleExecReturn(result) {
    console.log('Exec complete.');
    console.log(result[0]);
    if (result[1] && result[1] !== '') {
        console.error(result[1]);
    }
    return result;
}

function joinAndCreatePath(pathList) {
    var outPath;
    pathList.forEach(function (relPath) {
        if (relPath === '') relPath = path.sep;
        if (!outPath) {
            outPath = relPath;
        } else {
            outPath = path.resolve(outPath, relPath);
        }
        if (!fileExistsSync(outPath)) fs.mkdirSync(outPath);
    });
    return outPath;
}

function fileExistsSync(path) {
    try {
        fs.accessSync(path);
        return true;
    } catch (e) {
        return false;
    }
}

// Utility method that coverts args into a consistant input understood by cordova-lib
function getCallArgs(platforms, args) {
    // Processes single platform string (or array of length 1) and an array of args or an object of args per platform
    args = args || [];
    if (typeof (platforms) == 'string') {
        platforms = [platforms];
    }
    // If only one platform is specified, check if the args is an object and use the args for this platform if so
    if (platforms.length == 1) {
        if (args instanceof Array) {
            return { platforms: platforms, options: args };
        } else {
            return { platforms: platforms, options: args[platforms[0]] };
        }
    }
}

// Returns a promise that contains the installed platform version (vs the CLI version). Works in both new and old versions of the Cordova. (No cordova-lib API exists.)
function getInstalledPlatformVersion(projectPath, platform) {
    var platformJsonPath = path.join(projectPath, 'platforms', 'platforms.json')
    if (fileExistsSync(platformJsonPath)) {
        var platformsJson = require(path.join(projectPath, 'platforms', 'platforms.json'));
        return Q(platformsJson[platform]);
    } else {
        return exec(path.join(projectPath, 'platforms', platform, 'cordova', 'version')).then(function (result) {
            return result[0].replace(/\r?\n|\r/g, '');
        });
    }
}

// Returns a promise that contains the latest version of an npm package
function getVersionForNpmPackage(pkgName) {
    return exec('npm view ' + pkgName + ' version').then(function (result) {
        return result[0].replace(/\r?\n|\r/g, '');
    });
}

// Gets the currently installed version of npm
function getInstalledNpmVersion() {
    return exec('npm --version').then(function (result) {
       return result[0].replace(/\r?\n|\r/g, ''); 
    });
}

// Returns a promise that resolves to whether or not the currently installed
// version of npm is compatible with the requested version of cordova. 
function isCompatibleNpmPackage(pkgName) {
    if (pkgName !== 'cordova' && pkgName.indexOf('cordova@') !== 0) {
        return Q(true);
    }
    
    // Get the version of npm and the version of cordova requested. If the
    // cordova version <= 5.3.3, and the npm version is 3.3.8, the build
    // is going to fail, but silently, so we need to be loud now.
    return getVersionForNpmPackage(pkgName).then(function (cordovaVersion) {
        if (!semver.valid(cordovaVersion)) {
            // Assume true, since we don't know what version this is and the npm install will probably fail anyway
            return Q(true);
        }
        
        return getInstalledNpmVersion().then(function (npmVersion) {
            if (!semver.valid(npmVersion)) {
                return Q(true);
            }
            
            if (semver.lte(cordovaVersion, '5.3.3') && semver.eq(npmVersion, '3.3.8')) {
                console.error('npm 3.3.8 is not compatible with cordova versions 5.3.3 or earlier.');
                return Q(false);
            } else {
                return Q(true);
            }
        });
    });
}

function parseConfig(newCfg, currentCfg) {
    if (!currentCfg) currentCfg = {};
    if (!newCfg) return (currentCfg);
    
    // Path to module cache
    if (newCfg.moduleCache) {
        setCachePath(joinAndCreatePath(path.resolve(newCfg.moduleCache)));
    }
    
    // Version of node module to use
    if (newCfg.moduleVersion) currentCfg.moduleVersion = newCfg.moduleVersion;

    // Inidcates whether the cordova node module should be loaded after its cached - must be false to use buldProject
    if (newCfg.loadCordovaModule) currentCfg.loadCordovaModule = newCfg.loadCordovaModule;
    
    // Inidcates whether support plugin should be installed
    if (newCfg.addSupportPlugin) currentCfg.addSupportPlugin = newCfg.addSupportPlugin;

    // Allows use of other Cordova CLI style modules when caching only
    if (newCfg.nodePackageName) currentCfg.nodePackageName = newCfg.nodePackageName;

    // Project path if not cwd
    if (newCfg.projectPath) {
        currentCfg.projectPath = path.resolve(newCfg.projectPath);
        if (!fileExistsSync(currentCfg.projectPath)) {
            throw 'Specified project path does not exist: "' + currentCfg.projectPath + '"';
        }
    }
    return currentCfg;
}

function setCachePath(newPath) {
    moduleCache = joinAndCreatePath(newPath.split(path.sep));
    process.env['CORDOVA_HOME'] = path.join(moduleCache, '_cordova'); // Set platforms to cache in cache location to avoid unexpected results
    process.env['PLUGMAN_HOME'] = path.join(moduleCache, '_plugman'); // Set plugin cache in cache location to avoid unexpected results
}

function getCachePath() {
    return moduleCache;
}

module.exports = {
    handleExecReturn: handleExecReturn,
    joinAndCreatePath: joinAndCreatePath,
    getCallArgs: getCallArgs,
    getInstalledPlatformVersion: getInstalledPlatformVersion,
    getVersionForNpmPackage: getVersionForNpmPackage,
    parseConfig: parseConfig,
    getCachePath: getCachePath,
    setCachePath: setCachePath,
    fileExistsSync: fileExistsSync,
    isCompatibleNpmPackage: isCompatibleNpmPackage
}