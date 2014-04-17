var express      = require('express');
var morgan       = require('morgan');
var compress     = require('compression')();
var bodyParser   = require('body-parser');
var UglifyJS     = require('uglify-js');
var CleanCSS     = require('clean-css');
var errorhandler = require('errorhandler');
var api          = express();

api.use(morgan('dev'));
api.use(compress);
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

api.post('/javascript/', function (req, res) {

  if (!req.param('code')) {
    res.send(404, ':(');
  }

  try {
    output = UglifyJS.minify(req.param('code'), {
      fromString: true,
      warnings: true,
      compress: {
        warnings: true
      }
    });
  } catch (error) {
    // users don't need to see filestructure of server
    delete error.stack;
    res.json(500, error);
  }
  res.send(output);

});

api.post('/css/', function (req, res) {

  if (!req.param('code')) {
    res.send(404, ':(');
  }

  var output = {
    code: new CleanCSS().minify(req.param('code'))
  };

  res.send(output);

});

api.post('/gz/:fileName', function (req, res) {
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

port = Number(process.env.PORT || 3000)

api.listen(port, function() {
  console.log('Server listening on port ' + port);
});
