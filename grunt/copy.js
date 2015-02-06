module.exports = {
  dev: {
    files: [
      {
        expand: true,
        cwd: './app/',
        src: ['scripts/**/*'],
        dest: './dev/'
      },
      {
        expand: true,
        cwd: './app/yui/',
        src: ['**/*'],
        dest: './dev/yui/'
      }
    ]
  },
  dist: {
    files: [
      {
        expand: true,
        cwd: './app/',
        src: ['scripts/**/*'],
        dest: './tmp/'
      },
      {
        expand: true,
        cwd: './app/yui/',
        src: ['**/*'],
        dest: './dist/yui/'
      },
      {
        expand: true,
        cwd: './bower_components/bootstrap/dist/fonts/',
        src: ['**/*'],
        dest: './dist/fonts/'
      },
      {
        src: './app/CNAME',
        dest: './dist/CNAME'
      }
    ]
  }
};
