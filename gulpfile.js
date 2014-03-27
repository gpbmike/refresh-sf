// Load plugins
var gulp       = require('gulp'),
    sass       = require('gulp-sass'),
    preprocess = require('gulp-preprocess'),
    usemin     = require('gulp-usemin'),
    rev        = require('gulp-rev'),
    minifycss  = require('gulp-minify-css'),
    minifyhtml = require('gulp-minify-html'),
    jshint     = require('gulp-jshint'),
    uglify     = require('gulp-uglify'),
    clean      = require('gulp-clean'),
    notify     = require('gulp-notify'),
    serve      = require('gulp-serve'),
    spawn      = require('child_process').spawn,
    http       = require('http'),
    ecstatic   = require('ecstatic'),
    refresh    = require('gulp-livereload'),
    lrserver   = require('tiny-lr')(),
    node;

var livereloadport = 35729,
    serverport = 3000;

// Hinting
gulp.task('jshint', function() {
  gulp.src('./app/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('live-reload', function () {
  // Set up your livereload server
  lrserver.listen(livereloadport);
});

// Build Dist
gulp.task('process-as-dist', function () {
  return gulp.src('./app/*.html')
    .pipe(preprocess({ context: { dist: true } }))
    .pipe(usemin({
      css : [minifycss(), rev()],
      html: [minifyhtml({ empty: true })],
      js  : [uglify(), rev()]
    }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('copy-bootstrap-to-dist', function () {
  return gulp.src('./bower_components/bootstrap/dist/fonts/*.*')
    .pipe(gulp.dest('./dist/fonts'));
});

gulp.task('dist', ['process-as-dist', 'copy-bootstrap-to-dist'], function () {
  return gulp.src('./dist')
    .pipe(refresh(lrserver));
});

gulp.task('serve-dist', ['live-reload'], function () {
  // Set up your static fileserver, which serves files in the build dir
  http.createServer(ecstatic({ root: __dirname + '/dist' })).listen(serverport);
});

gulp.task('sass', function () {
  return gulp.src('./src/scss/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('./app/css'));
});

// Build dev
gulp.task('process-as-dev', function () {
  return gulp.src('./app/*.html')
    .pipe(preprocess({ context: { dist: false } }))
    .pipe(gulp.dest('./dev'))
    .pipe(gulp.src('./app/scss/*.scss'))
    .pipe(sass())
    .pipe(gulp.dest('./dev/css'));
});

gulp.task('copy-bootstrap-to-dev', function () {
  return gulp.src('./bower_components/bootstrap/dist/fonts/*.*')
    .pipe(gulp.dest('./dev/fonts'));
});

gulp.task('dev', ['process-as-dev', 'copy-bootstrap-to-dev']);

gulp.task('serve-dev', ['live-reload'], function () {
  //Set up your static fileserver, which serves files in the build dir
  http.createServer(ecstatic({ root: __dirname + '/dev' })).listen(serverport);
});


/**
 * $ gulp server
 * description: launch the server. If there's a server already running, kill it.
 */
gulp.task('api-server', function() {
  if (node) {
    node.kill();
  }
  node = spawn('node', ['api/index.js'], { stdio: 'inherit' });
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('watch', function () {
  gulp.watch('./app/**', ['process-as-dev']);
  gulp.watch('./api/**', ['api-server']);
  gulp.watch('./src/scss/*', ['sass']);
});

gulp.task('default', ['sass', 'dev', 'serve-dev', 'api-server', 'watch']);

// clean up if an error goes unhandled.
process.on('exit', function() {
  if (node) {
    node.kill();
  }
});
