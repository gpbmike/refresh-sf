module.exports = {
  dist: {
    options: {
      removeComments: true,
      collapseWhitespace: true
    },
    files: [{
      src: './tmp/index.html',
      dest: './dist/index.html'
    }]
  }
};
