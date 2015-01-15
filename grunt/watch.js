module.exports = {
  options: {
    livereload: true,
  },
  css: {
    files: './app/**/*.scss',
    tasks: ['sass']
  },
  scripts: {
    files: './app/**/*.js',
    tasks: ['jshint', 'copy:dev']
  },
  html: {
    files: './app/**/*.html',
    tasks: ['preprocess:dev', 'copy:dev']
  },
  templates: {
    files: './app/**/*.hbs',
    tasks: ['emberTemplates:dev']
  },
  express: {
    files: './api/**',
    tasks: ['express'],
    options: {
      nospawn: true,
      atBegin: true
    }
  }
};
