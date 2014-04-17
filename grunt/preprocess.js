module.exports = {
  dev: {
    options: { context: { dist: false } },
    src: './app/index.html',
    dest: './dev/index.html'
  },
  dist: {
    options: { context: { dist: true } },
    src: './app/index.html',
    dest: './tmp/index.html'
  }
};
