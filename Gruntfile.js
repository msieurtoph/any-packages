'use strict';

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Define the configuration for all the tasks
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        'cli.js',
        'lib/**/*.js',
        'bin/**/*.js',
        'spec/**/*.js'
      ]
    },

    watch: {
      js: {
        files: [
          'Gruntfile.js',
          'cli.js',
          'lib/**/*.js',
          'bin/**/*.js',
          'spec/**/*.spec.js'
        ],
        tasks: [
          'newer:jshint:all',
          'jasmine_nodejs'
        ],
      }
    },

    'jasmine_nodejs': {
      options: {
            useHelpers: false,
            stopOnFailure: false,
            // configure one or more built-in reporters
            // reporters: {
            //     console: {
            //         colors: true,
            //         cleanStack: 3,       // (0|false)|(1|true)|2|3
            //         verbosity: 3,        // (0|false)|1|2|(3|true)
            //         listStyle: 'indent', // "flat"|"indent"
            //         activity: true
            //     }
            // }
      },
      all: {
        specs: [
          'spec/**'
        ]
      }
    }

  });

  grunt.registerTask('default', [
    'jshint:all',
    'test'
  ]);

  grunt.registerTask('test', [
    'jasmine_nodejs'
  ]);


};