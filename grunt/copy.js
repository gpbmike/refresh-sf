module.exports = {
  dev: { files: [
    { expand: true, cwd: './app/', src: ['scripts/**/*'], dest: './dev/' }
  ] },
  dist: { files: [
    { expand: true, cwd: './app/', src: ['scripts/**/*'], dest: './tmp/' }
  ] }
};
