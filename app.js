
/**
 * Module dependencies.
 */

var express = require('express')
  , util = require('util')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , conf = require('nconf')
  , db = require('mongoose')
  , schemas = require('./lib/schemas')
  , passport = require('passport')
  , GoogleStrategy = require('passport-google').Strategy;

/*
 * CONFIG
 */
conf.argv().env();

conf.file('config.json');

conf.defaults({
  'sqHost': 'localhost',
  'sqPort': '10011',
  'sqUser': 'serveradmin'
});

/*
 * MODELS
 */
for (var model in schemas) {
  if (schemas.hasOwnProperty(model)) {
    db.model(model, new db.Schema(schemas[model]));
  }
}

/*
 * AUTH
 */
var loggedIn = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
    returnURL: 'http://local.lacis.org:3000/auth/google/return',
    realm: 'http://local.lacis.org:3000/'
  },
  function (ident, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

/*
 * EXPRESS
 */
var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'hjs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({secret: conf.get('sessionSecret')}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/auth/google',
  passport.authenticate('google', {failureRedirect: '/'}),
  function (req, res) {
    //res.redirect('/dashboard');
  }
);

app.get('/auth/google/return',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    var userModel = db.model('user');
    var guser = new userModel({gaccount: req.user.emails[0].value});
    guser.save(function(err) {
      if (err) {
        console.log('oh noes');
      }
    });
    //res.redirect('/dashboard');
  }
);

app.get('/dashboard', loggedIn, function(req, res) {
  res.send(req.user);
});

/*
 * MAIN
 */
db.connect(['mongodb://', conf.get('db').host, conf.get('db').name].join(''));

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

