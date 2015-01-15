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
        dest: './tmp/yui/'
      }
    ]
  }
};
