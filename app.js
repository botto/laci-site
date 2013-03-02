
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , conf = require('nconf')
  , auth = require('authom');

//Lets set up conf
conf.argv().env();

conf.file('config.json');

conf.defaults({
  'sqHost': 'localhost',
  'sqPort': '10011',
  'sqUser': 'serveradmin'
});

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'hjs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(conf.sessionSeceret));
  app.use(express.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var gconf = conf.get('google');

auth.on('auth', function(req, res, data) {
  res.send(JSON.stringify(data));
});

auth.on('error', function(req, res, data) {
  console.log(JSON.stringify(data));
  res.send('hmm');
});
var google = auth.createServer({
  'service': "google",
  'id': gconf.appId,
  'secret': gconf.seceret
});

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/auth/:service', auth.app);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
