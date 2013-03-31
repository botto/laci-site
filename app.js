
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , laci = require('laci')
  , _ = require('underscore')
  , h4e = require('h4e')
  , routes = require('./routes')
  , path = require('path')
  , fs = require('fs')
  , conf = require('nconf')
  , db = require('mongoose')
  , models = require('./lib/models')
  , themeVals = require('./lib/themeVals')
  , passport = require('passport')
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

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

laci.setup({
  imgFolder: 'public/images/randomImages',
  pubImgFolder: 'images/randomImages'
});

/*
 * Simple access checker. No magic
 */
var hasAccess = function(req, res, next) {
  var access = req.user.dbuser.access.web;
  if(_.contains(access[req.method.toLowerCase()], req.url) === true) {
    next();
  }
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID: conf.get('google').appId,
    clientSecret: conf.get('google').secret,
    callbackURL: conf.get('google').returnURL,
  },
  function (accessToken, tokenRefresh, profile, done) {
    models.user.findOne({gid: profile._json.id}, 
      function(err, dbuser) {
        if (err){
          console.log('oh noes');
          console.log(err);
        }
        else {
          if (null !== dbuser && profile._json.id === dbuser.gid) {
            user = profile._json;
            user.dbuser = dbuser;
            done(null, user);
          }
          else {
            var newUser = new models.user({gid: profile._json.id});
            newUser.save(function(err) {
              if (err) {
                console.log('oh noes2');
                console.log(err);
              }
              else {
                user = profile._json;
                user.dbuser = newUser;
                done(null, user);
              }
            });
          }
        }
      }
  );
  }
));



/*
 * EXPRESS
 */

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
//  app.set('views', __dirname + '/views');
//  app.set('view engine', 'hjs');
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


/*
 * H4E Setup
 */
h4e.setup({
  app: app,
  extension: 'hjs',
  baseDir: 'views',
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

/*
 * Routes
 */

app.get('/auth/google', passport.authenticate('google', { 
  scope: [
  //'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
  ] 
}));

app.get('/auth/google/return',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', hasAccess, function(req, res) {
  res.render('dashboard', {user: req.user});
});

app.get('/', function(req, res) {
  h4e.ract('.');
  res.render('index', {values: themeVals});
});


//Set up our sockets
io.sockets.on('connection', function(socket) {
  laci.getAllImgs(function(b_imgs) {
    socket.emit('b_imgs', b_imgs); 
  });
});


/*
 * MAIN
 */
db.connect(['mongodb://', conf.get('db').host, conf.get('db').name].join(''));

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

