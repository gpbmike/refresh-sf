module.exports = {
  dev: {
    files: {
      './dev/css/app.css': './app/scss/app.scss'
    }
  },
  dist: {
    files: {
      './tmp/css/app.css': './app/scss/app.scss'
    }
  }
};
