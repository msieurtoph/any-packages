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
          'jasmine_node'
        ],
      }
    },

    'jasmine_node': {
      all: {
        options: {
          showColors: true,
          useHelpers: true,
          coverage: {
            report: [
              'lcov'
            ],
          },
          forceExit: true,
          match: '.',
          matchAll: true,
          specFolders: ['spec'],
          extensions: 'js',
          specNameMatcher: 'spec',
          captureExceptions: true
        },
        src: [
          'cli.js',
          'lib/**/*.js',
          'bin/**/*.js'
        ]
      }
    }

  });

  grunt.registerTask('default', [
    'test'
  ]);

  grunt.registerTask('test', [
    'jshint:all',
    'jasmine_node',
  ]);


};