var express      = require('express');
var morgan       = require('morgan');
var compression  = require('compression');
var bodyParser   = require('body-parser');
var UglifyJS     = require('uglify-js');
var CleanCSS     = require('clean-css');
var YUI          = require('yuicompressor');
var HTMLMinifier = require('html-minifier');
var errorhandler = require('errorhandler');
var zlib         = require('zlib');
var api          = express();

if (process.env.NODE_ENV === 'development') {
  api.use(errorhandler());
}

api.use(morgan('dev'));
api.use(compression());

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

api.use(bodyParser.urlencoded({
  extended: true,
  limit: '1mb'
}));

api.post('/javascript/', function (req, res) {

  if (!req.body.code) {
    return res.status(500).json('No code. :(');
  }

  var options = {};

  Object.keys(req.body.options).forEach(function (key) {
    var value = req.body.options[key];
    if (value === 'true') {
      value = true;
    }
    if (value === 'false') {
      value = false;
    }
    if (value === '') {
      value = null;
    }
    options[key] = value;
  });

  try {
    return res.send(UglifyJS.minify(req.body.code, {
      fromString: true,
      warnings: true,
      compress: options
    }));
  } catch (error) {
    // users don't need to see filestructure of server
    delete error.stack;
    return res.status(500).json(error);
  }

});

api.post('/css/', function (req, res) {

  if (!req.body.code) {
    return res.status(500).json('No code. :(');
  }

  var options = {};

  Object.keys(req.body.options).forEach(function (key) {
    var value = req.body.options[key];
    if (value === 'true') {
      value = true;
    }
    if (value === 'false') {
      value = false;
    }
    if (value === '') {
      value = null;
    }
    if (key === 'roundingPrecision') {
      value = parseInt(value, 10) || 2;
    }
    options[key] = value;
  });

  var output = {
    code: new CleanCSS(options).minify(req.body.code)
  };

  return res.send(output);

});

api.post('/html/', function (req, res) {

  if (!req.body.code) {
    return res.status(500).json('No code. :(');
  }

  var options = {};

  Object.keys(req.body.options).forEach(function (key) {

    var value = req.body.options[key];

    if (!value) {
      return;
    }

    switch (key) {
      case 'processScripts':
        options[key] = value.split(',');
        break;
      case 'ignoreCustomComments':
      case 'customAttrAssign':
      case 'customAttrSurround':
        options[key] = value.split(',').map(function (re) {
          return new RegExp(re);
        });
        break;
      case 'customAttrCollapse':
        options[key] = new RegExp(value);
        break;
      case 'maxLineLength':
        options[key] = parseInt(value, 10);
        break;
      default:
        options[key] = value === 'true';
        break;
    }

  });

  try {
    output = HTMLMinifier.minify(req.body.code, options);
    return res.send({ code: output });
  } catch (error) {
    return res.status(500).json('HTML Minify does not report any useful errors, but there was an error. :(');
  }

});

api.post('/yui/', function (req, res) {

  if (!req.body.code) {
    return res.status(500).json('No code. :(');
  }

  var options = {
    type: req.body.type === 'javascript' ? 'js' : 'css'
  };

  Object.keys(req.body.options).forEach(function (key) {

    var value = req.body.options[key];

    if (!value) {
      return;
    }

    switch (key) {
      case 'verbose':
      case 'nomunge':
      case 'preserve-semi':
      case 'disable-optimizations':
        if (value === 'true') {
          options[key] = true;
        }
        break;
      case 'line-break':
        value = parseInt(value, 10);
        if (value) {
          options[key] = value;
        }
    }

  });

  YUI.compress(req.body.code, options, function(err, data, extra) {
    //err   If compressor encounters an error, it's stderr will be here
    //data  The compressed string, you write it out where you want it
    //extra The stderr (warnings are printed here in case you want to echo them
    if (err) {
      return res.send(500, { yuiError: err });
    } else {
      return res.send({ code: data });
    }
  });

});

api.post('/gz/:fileName', function (req, res) {
  zlib.gzip(req.body.code, function (_, result) {
    return res.end(result);
  });
});

api.all('*', function (req, res) {
  return res.send(404);
});

port = Number(process.env.PORT || 3000);

api.listen(port, function() {
  console.log('Server listening on port ' + port);
});
