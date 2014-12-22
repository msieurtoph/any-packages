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
      all: ['spec/'],
      coverage: {
        options : {
          failTask: false,
          branches : 100 ,
          functions: 100,
          statements:100,
          lines:100
        }
      }
    }

  });

  grunt.registerTask('default', [
    'jshint:all',
    'test',
    //'build',
  ]);

  grunt.registerTask('test', [
    'jasmine_node'
  ]);


};