module.exports = {
  options: {
    templateBasePath: /app\/templates\//
  },
  dev: {
    options: {
      precompile: false
    },
    src: "app/templates/**/*.{hbs,hjs,handlebars}",
    dest: "dev/scripts/templates.js"
  },
  dist: {
    src: "<%= emberTemplates.dev.src %>",
    dest: "tmp/scripts/templates.js"
  }
};
