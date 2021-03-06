// Load plugins
const autoprefixer = require('autoprefixer');
const browsersync = require('browser-sync').create();
const cssnano = require('cssnano');
const del = require('del');
const discard = require('postcss-discard-comments');
const eslint = require('gulp-eslint');
const concat = require('gulp-concat');
const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const maps = require('gulp-sourcemaps');
const newer = require('gulp-newer');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');

// Configuration
const configuration = {
  paths: {
    src: {
      root: './src/',
      html: './src/*.html',
      scss: './src/assets/scss/**/*.scss',
      js: './src/assets/js/',
      img: './src/assets/img/'
    },
    dist: {
      root: './dist',
      css: './dist/assets/css/',
      img: './dist/assets/img'
    }
  }
};

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: configuration.paths.dist.root
    },
    port: 3000
  });
  done();
}

// BrowserSync Reload
function browserSyncReload(done) {
  browsersync.reload();
  done();
}

// Clean assets
function clean() {
  return del(configuration.paths.dist.root);
}

// Optimize Images
function images() {
  return gulp
    .src('./src/assets/img/**/*')
    .pipe(newer(configuration.paths.dist.img))
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.mozjpeg({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [
            {
              removeViewBox: false,
              collapseGroups: true
            }
          ]
        })
      ])
    )
    .pipe(gulp.dest(configuration.paths.dist.img));
}

// CSS task
function css() {
  return gulp
    .src(configuration.paths.src.scss)
    .pipe(plumber())
    .pipe(
      sass({
        includePaths: [
          'node_modules/normalize.css/',
          'node_modules/sass-mq/',
          'node_modules/sass-burger/'
        ],
        outputStyle: 'expanded'
      })
    )
    .pipe(gulp.dest(configuration.paths.dist.css))
    .pipe(rename({ suffix: '.min' }))
    .pipe(maps.init())
    .pipe(postcss([autoprefixer(), cssnano(), discard()]))
    .pipe(maps.write('.'))
    .pipe(gulp.dest(configuration.paths.dist.css))
    .pipe(browsersync.stream());
}

// SCRIPTS
// Concatenate all js first
const scriptsList = [
  './node_modules/jquery/dist/jquery.min.js',
  './src/assets/js/init.js'
];

// Lint scripts
function scriptsLint() {
  return gulp
    .src(['./src/assets/js/**/*', './gulpfile.js'])
    .pipe(plumber())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

function scripts() {
  return gulp
    .src(scriptsList)
    .pipe(plumber())
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('./dist/assets/js/'))
    .pipe(uglify({ compress: { drop_console: false } }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./dist/assets/js/'));
}

function scriptsMap() {
  return gulp
    .src(scriptsList)
    .pipe(plumber())
    .pipe(maps.init())
    .pipe(concat('scripts.js'))
    .pipe(maps.write('./'))
    .pipe(gulp.dest('./dist/assets/js/'));
}

// Copy HTML files to output directory
function html() {
  return gulp
    .src(configuration.paths.src.html)
    .pipe(gulp.dest(configuration.paths.dist.root));
}

// Watch files
function watchFiles() {
  gulp.watch('./src/assets/scss/**/*', css, browserSyncReload);
  gulp.watch(
    './src/assets/js/**/*',
    gulp.series(scriptsLint, scripts, scriptsMap, browserSyncReload)
  );
  gulp.watch(['./src/**/*.html'], gulp.series(html, browserSyncReload));
  gulp.watch('./src/assets/img/**/*', gulp.series(images, browserSyncReload));
}

// define complex tasks
const js = gulp.series(scriptsLint, scripts, scriptsMap);
const build = gulp.series(clean, gulp.parallel(css, images, js, html));
const watch = gulp.parallel(watchFiles, browserSync);

// export tasks
exports.images = images;
exports.css = css;
exports.js = js;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.default = build;
