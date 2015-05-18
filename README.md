Visual Studio Tools for Apache Cordova (TACo) Team Build Helper Node Module
===============
**Note: This node module is intended for use with the Cordova CLI or Visual Studio 2015, is intended to be a sample, and is not an offically supported Microsoft product. It does not work with Visual Studio 2013 CTPs.**

License: MIT

taco-team-build is a sample node module designed to avoid common pitfalls when building Cordova apps in a Team or Continuous Integration environment. It was put together for a set of tutorials for the [Visual Studio 2015 Tools for Apache Cordova](http://aka.ms/cordova) (TACo) featureset in Visual Studio but can be used with standard cordova projects.

Specifically it helps with the following challenges:

1.  Handling multiple versions of the Cordova CLI from the same build server in a performant way on Windows
2.  Automated detection of whether a platform should be added avoid a non-zero exit code for incremental builds (the default CLI behavior)
3.  Generating an ipa for iOS
4.  Supporting Visual Studio 2015's res/native, Task Runner Explorer, and Windows packaging features (via [a plugin](http://aka.ms/vstacoplugin))

It is a generic node module so it can be used with any number of build systems including Gulp, Grunt, and Jake.

General Settings
----------------
1.  Set a **CORDOVA\_CACHE** environment variable to tell it where you want the various versions of Cordova to land.  You can also specify this using the module’s “configure” method
2.  The Cordova Version is automatically picked up from taco.json if present but can also be specified using the module's configure method

Sample Usage
---------------------
### Gulp Build Sample
1.  Install Gulp globally if you haven’t (npm install -g gulp).
2.  Copy the contents of the “samples/gulp” folder to the root of your project.
3.  Go to the command line in that folder and type “npm install”
4.  Type "gulp"

### Grunt Build Sample
1.  Install Grunt globally if you haven’t (npm install -g grunt).
2.  Copy the contents of the “samples/grunt” folder to the root of your project.
3.  Go to the command line in that folder and type “npm install”
4.  Type "grunt"

### Command Line Utility Sample
1.  npm install the taco-team-build package globally (Ex: npm install -g c:\path\to\taco-team-build)
2.  Type "taco-team-build \[platform\] \[options\]"  (Ex: taco-team-build android --release --ant)
3.  Source can be found under "samples/cli"


Module Methods
-------
### configure(config)
Allows you to programatically configure the Cordova version to use, the location that Cordova libraries should be cached, and the project path.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var build = require('taco-team-build');
build.configure({
    cordovaCache: "D:\\path\\to\\cache",
    cordovaVersion: "4.3.0",
    projectPath: "myproject"
}).done();
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-   **cordovaCache** defaults to either the **CORDOVA\_CACHE** environment variable or \_cordova relative to the project if no value is set for the variable. This will also automatically set CORDOVA\_HOME to this same location to avoid conflicting with any global instllations you may have.
-   **projectPath** defaults to the current working directory.
-   If the **cordovaVersion** is not set, the version will be pulled from **taco.json** if present and otherwise default to 4.3.0.  You can manually create a taco.json file if you are not using Visual Studio by including the following in the file:

    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    {
        "cordova-cli": "4.3.0"
    }
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

### setupCordova(config)
Downloads and installs the correct version of Cordova in the appropriate cache location.  See the configure method for defaults.  setupCordova() should always be called before executing a platform specific command. 

You can also pass in the same **config** object as the configure method to set configuration options before initalization.

The method returns a promise that is fulfilled with the appropriate cordova-lib node module once setup is completed.  Once setup has completed, you can use value from the promise to access a number of Cordova CLI functions in JavaScript. Ex:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var build = require("taco-team-build");
build.setupCordova().done(function(cordova) {
	cordova.plugin("add","org.apache.cordova.camera", function () {
		// Continue processing after camera plugin has been added
    });
});
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var build = require("taco-team-build");
build.setupCordova().done(function(cordova) {
	cordova.run({platforms:["android"], options:["--nobuild"]}, function() {
		// Continue processing after run is complete
    });
});
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you would prefer to use a promise instead of a callback syntax, you can use "cordova.raw" to access that version of the function.

### buildProject(platforms, args)
Builds the specified platform(s). Passed in **platforms** can be an array of platforms or a single platform string. Unlike cordova.raw.build, passed in **args** can be an array of arguments or an object with an array of arguments per platform name. The method returns a promise that is fulfilled once the specified platform(s) are built.

The method automatically calls setupCordova() if it has not yet been called.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var build = require('taco-team-build'),
    platforms = ["android", "windows"],
    args = { android: ["--release", "--ant"], windows: ["--release"] };
            
build.buildProject(platforms, args).done();
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**WARNING**: Unlike the Cordova CLI, you should not use the "double-double dash" when referencing platform specific argumetns. Ex: Use "--ant" not "-- --ant" for Android.

Not only will your flag not be picked up but older versions of the Cordova Android platform will error out if you specify unrecognized flags with a "TypeError: Cannot call method 'prepEnv' of undefined" error.  (This particular error is fixed Cordova 4.3.0 but your flags will still be ignored.)

### packageProject(platforms, args)
Supported platforms: ios

Runs any post-build packaging steps required for the specified platforms. The method returns a promise that is fulfilled once packaging is completed. Passed in **platforms** can be an array of platforms or a single platform string. Passed in **args** can be an array of arguments or an object with an array of arguments per platform name.

**Note:** The android, windows, and wp8 platforms automatically package on build and you can place the appropriate files for signing under res/native/android or res/native/windows. See [MSDN documentation](https://msdn.microsoft.com/en-us/library/dn757048.aspx) for details.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var build = require('taco-team-build');

build.buildProject("ios",["--device"])); })
    .then(function() { return build.packageProject("ios"); })
    .done();
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

iOS Arguments:
- **--sign**: Specifies an alternate signing identity or a path to a signing file
- **--embed**: Specifies the location of an alternate provisioning profile

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
build.packageProject("ios", ["--sign=/path/to/signing.p12" ", "--embed=/path/to/some.mobileprovision"]); 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can also add a custom **[build-debug.xcconfig](https://github.com/apache/cordova-ios/blob/master/bin/templates/scripts/cordova/build-debug.xcconfig)** or **[build-release.xcconfig](https://github.com/apache/cordova-ios/blob/master/bin/templates/scripts/cordova/build-release.xcconfig)** file in the **res/native/ios/cordova** folder in your project to set these and other iOS [build settings](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/XcodeBuildSettingRef/0-Introduction/introduction.html#//apple_ref/doc/uid/TP40003931-CH1-SW1). 

For iOS you may need to unlock the keychain to build your app depending on your build server. You can use some variant of the following shell command to do so: 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
security unlock-keychain -p ${KEYCHAIN_PWD} ${HOME}/Library/Keychains/login.keychain 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

