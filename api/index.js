var express      = require('express');
var morgan       = require('morgan');
var compress     = require('compression')();
var bodyParser   = require('body-parser');
var UglifyJS     = require('uglify-js');
var CleanCSS     = require('clean-css');
var hljs         = require('highlight.js');
var errorhandler = require('errorhandler');
var api          = express();

api.use(morgan('dev'));
// api.use(compress);
api.use(bodyParser({ limit: '1mb' }));
api.use(errorhandler());

/**
 * CORS support.
 */

api.all('*', function(req, res, next){
  if (!req.get('Origin')) {
    return next();
  }

  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

  if ('OPTIONS' === req.method) {
    return res.send(200);
  }
  next();
});


api.post('/', function(req, res){

  if (!req.param('code')) {
    res.send(404, ':(');
  }

  var highlighted = hljs.highlightAuto(req.param('code'), ['javascript', 'css']);
  var output = { language: highlighted.language };

  switch (output.language) {
  case 'javascript':
    try {
      var minified = UglifyJS.minify(req.param('code'), {
        fromString: true,
        warnings: true,
        compress: {
          warnings: true
        }
      });
      output.code = minified.code;
      output.map = minified.map;
    } catch (error) {
      delete error.stack;
      res.json(500, error);
    }
    res.send(output);
    break;

  case 'css':
    output.code = new CleanCSS().minify(req.param('code'));
    res.send(output);
    break;

  default:
    res.json(500, 'Sorry, we could not figure out what language you are trying to compress.');
  }
});

api.post('/:fileName', function (req, res) {
  compress(req, res, function (error) {
    if (error) {
      res.json(error);
    }

    res.attachment(req.param('fileName'));
    res.end(req.param('code'), 'utf8');
  });
});

api.all('*', function (req, res) {
  res.send(404);
});

api.listen(3001);
