'use strict';

//载入外挂(导入需要的插件)
var gulp = require('gulp');
//文件地址
var path = require('path');
//图片压缩
var imagemin=require('gulp-imagemin');
//指定压缩图片大小
var imageResize=require('gulp-image-resize');
//压缩图片类型 png,jpg
var pngquant=require('imagemin-pngquant');
var mozjpeg=require('imagemin-mozjpeg');
//bower依赖流
var wiredep = require('wiredep').stream;
//记录错误日志
var gutil = require('gulp-util');
//同步浏览器测试工具以及服务
var browserSync = require('browser-sync');
//更好的支持单页面应用
var browserSyncSpa = require('browser-sync-spa');
//提供常用函数的集合
var util = require('util');
//模块化
var _ = require('lodash');
//代理插件
var proxyMiddleware = require('http-proxy-middleware');
//启用node_modules文件下所有的需要的插件，不需要一个个重新载入
var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

//引入外部sass文件时候需重新导入编译
var wiredepFile={
	exclude: [/jquery/],
	directory: 'bower_components'
}
//文件改变后是否重新加载
function isOnlyChange(event) {
  return event.type === 'changed';
}
//错误日志信息
function errorHandler(title){
	return function(err) {
		gutil.log(gutil.colors.red('[' + title + ']'), err.toString());
		this.emit('end');
	};
  }

//编译sass文件
gulp.task('styles',function(){
	//获取需要加载的sass文件
	var injectFiles = gulp.src([
		path.join('app', '/styles/*.scss'),
		path.join('!app', '/styles/*.scss')
	  ], { read: false });
  //需要编译的文件地址,以及导入到页面的地址
  var injectOptions = {
		transform: function(filePath) {
		  filePath = filePath.replace('app' + '/', '');
		  return '@import "' + filePath + '";';
		},
		starttag: '// injector',
		endtag: '// endinjector',
		addRootSlash: false
  };
  return gulp.src('app/styles/*.scss')
		   .pipe($.inject(injectFiles, injectOptions))
		   .pipe(wiredep(_.extend({},wiredepFile)))
		   .pipe($.sass({style: 'expanded'}))
		   .pipe($.autoprefixer())
		   .pipe($.sourcemaps.write())
		   .pipe(gulp.dest('.tmp/styles'))
           .pipe(browserSync.reload({ stream: true }));
});
//js文件检测或加载js文件
gulp.task('scripts', function () {
  return gulp.src('app/**/*.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe(browserSync.reload({ stream: true }))
    .pipe($.size())
});
//加载js，css等文件导入到index页面之中
gulp.task('inject',['scripts', 'styles'],function(){
	//需要导入的css文件
  var injectStyles = gulp.src([
		path.join('.tmp', '/styles/*.css')
	  ], { read: false });
  //需要导入的js文件
  var injectScripts = gulp.src([
		path.join('app', '/**/*.js')
  ]).pipe($.angularFilesort()).on('error',errorHandler('AngularFilesort'));//连接注入angular脚本
  //导入js文件到指定文件目录
  var injectOptions = {
    ignorePath: ['app', path.join('.tmp', '/')],
    addRootSlash: false
  };
  return gulp.src('app/**/*.html')
    .pipe($.inject(injectStyles, injectOptions))
    .pipe($.inject(injectScripts, injectOptions))
    .pipe(wiredep(_.extend({},wiredepFile)))
    .pipe(gulp.dest(path.join('.tmp', '/')));
});
//监听文件变化
gulp.task('watch',['inject'],function(){
	//监听html，bower.json文件是否发生变化，若bower.json发生变化则重新加载文件到
	gulp.watch([path.join('app', '/**/*.html'), 'bower.json'], ['inject']);
	//监听sass文件
	gulp.watch([
		path.join('app', '/styles/*.css'),
		path.join('app', '/styles/*.scss')
	  ], function(event) {
			if(isOnlyChange(event)) {
			  gulp.start('styles');
			} else {
			  gulp.start('inject');
			}
  });
  //监听js文件
  gulp.watch(path.join('app', '/**/*.js'), function(event) {
    if(isOnlyChange(event)) {
      gulp.start('scripts');
    } else {
      gulp.start('inject');
    }
  });
  //监听html文件
  gulp.watch(path.join('app', '/**/*.html'), function(event) {
    browserSync.reload(event.path);
  });
});

//启动服务
/***
   配置加载browserSync
   启动驱动
*/
function browserSyncInit(baseDir, browser) {
  browser = browser === undefined ? 'default' : browser;

  var routes = null;
  //判断是否需要加载bower文件
  if(baseDir === 'app' || (util.isArray(baseDir) && baseDir.indexOf('app') !== -1)) {
    routes = {
      '/bower_components': 'bower_components'
    };
  }

  var server = {
    baseDir: baseDir,//服务启动目录
    routes: routes	//服务启动需加载目录bower
  };
  /*
   * You can add a proxy to your backend by uncommenting the line bellow.
   * You just have to configure a context which will we redirected and the target url.
   * Example: $http.get('/users') requests will be automatically proxified.
   *
   * For more details and option, https://github.com/chimurai/http-proxy-middleware/blob/v0.0.5/README.md
   */
   var context='/monitor';//请求地址api
   var options={
		target: 'http://127.0.0.1:19000',//代理服务器
   };
   server.middleware =proxyMiddleware(context,options);//连接代理服务器

  browserSync.instance = browserSync.init({
    startPath: '/',//地址
    server: server,//服务
    browser: browser//解析bower文件
  });
}
browserSync.use(browserSyncSpa({
  selector: '[ng-app]'// Only needed for angular apps
}));
//启动服务
gulp.task('serve', ['watch'], function () {
  browserSyncInit([path.join('.tmp', '/'),'app']);//服务启动，通过临时目录.tmp
});


//打包压缩文件

/**
	测试
*/
gulp.task('partials', function () {
  return gulp.src([
    path.join('app', '/**/*.html'),
    path.join('.tmp', '/**/*.html')
  ])
    .pipe($.minifyHtml({
      empty: true,
      spare: true,
      quotes: true
    }))
    .pipe($.angularTemplatecache('templateCacheHtml.js', {//主要用来处理频繁的工作
      module: 'cmsApp',
      root: 'app'
    }))
    .pipe(gulp.dest('.tmp' + '/partials/'));
});
//压缩图片
gulp.task('imageMin',function(){
	 return gulp.src('app/images/*.*')
		    .pipe(imagemin({
				progressive: true,
				use: [pngquant()]
            }))
			.pipe(gulp.dest('dist/images'))
});
/*开始压缩文件*/
gulp.task('html', ['inject', 'partials'], function () {
	//测试文件导入
  var partialsInjectFile = gulp.src(path.join('.tmp', '/partials/templateCacheHtml.js'), { read: false });
  var partialsInjectOptions = {
    starttag: '<!-- inject:partials -->',
    ignorePath: path.join('.tmp', '/partials'),
    addRootSlash: false
  };
  //需要压缩的js，html，css等文件地址
  var htmlFilter = $.filter('**/*.html');
  var jsFilter = $.filter('**/*.js');
  var cssFilter = $.filter('**/*.css');
  var assets;

  return gulp.src(path.join('.tmp', '/**/*.html'))
    .pipe($.inject(partialsInjectFile, partialsInjectOptions))//导入测试文件
    .pipe(assets = $.useref.assets())//定义一个解析html中build:{type}模块解析器
    .pipe($.rev())//重命名文件
    .pipe(jsFilter)//需要压缩的js文件地址
    .pipe($.ngAnnotate())//压缩angular代码
    .pipe($.uglify({ preserveComments: $.uglifySaveLicense })).on('error', errorHandler('Uglify'))//压缩文件，使文件变小
    .pipe(jsFilter.restore())//文件修复，并新建压缩后的文件
    .pipe(cssFilter) //需要压缩的css文件地址
    .pipe($.csso())//css追踪器，压缩css文件
    .pipe(cssFilter.restore())//文件修复，并新建压缩后的文件
    .pipe(assets.restore())//解析html文件中有(build:{type})的模块,并将里面的文件合并起来
    .pipe($.useref())//将html中的模块文件关连起来
    .pipe($.revReplace())//重写已经重新命名的文件
    .pipe(htmlFilter) //需要压缩的html文件地址
    .pipe($.minifyHtml({
      empty: true,//不删除空属性
      spare: true,//不删除冗余属性
      quotes: true,//不删除任意引号
      conditionals: true//不删除ie引导的条件属性
    }))
    .pipe(htmlFilter.restore())//文件修复，并新建压缩后的文件
    .pipe(gulp.dest(path.join('dist', '/')))//输出文件地址
    .pipe($.size({ title: path.join('dist', '/'), showFiles: true }));//显示压缩后的文件大小
});

// Only applies for fonts from bower dependencies
// Custom fonts are handled by the "other" task
gulp.task('fonts', function () {
  return gulp.src($.mainBowerFiles())//以bower.json为源解析
    .pipe($.filter('**/*.{eot,svg,ttf,woff,woff2}'))
    .pipe($.flatten())//递归
    .pipe(gulp.dest(path.join('dist', '/fonts/')));
});
//文件注入
gulp.task('other', function () {
  var fileFilter = $.filter(function (file) {
    return file.stat.isFile();
  });

  return gulp.src([
    path.join('app', '/**/*'),
    path.join('!app', '/**/*.{html,css,js,scss}')
  ])
    .pipe(fileFilter)
    .pipe(gulp.dest(path.join('dist', '/')));
});
//清空临时文件
gulp.task('clean', function (done) {
  $.del([path.join('dist', '/'), path.join('.tmp', '/')], done);
});
//启动压缩
gulp.task('build', ['html','fonts','other','imageMin']);