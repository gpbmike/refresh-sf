module.exports = {
  dist: {
    options: {
      mode: 'gzip'
    },
    expand: true,
    cwd: 'dist/',
    src: ['**/*', '!CNAME', '!**/*.woff', '!**/*.woff2'],
    dest: 'compressed/'
  }
};
