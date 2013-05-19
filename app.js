/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , AWS = require('aws-sdk')
  //, mqc = require('amqp').createConnection({host:'localhost'})
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
  , util = require('util')
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var s = null
  , ready = {}
  , mc = {
    heartBeatId: null,
    heartBeat: null
  };

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

AWS.config.update(conf.get('aws'));
var sqs = new AWS.SQS(conf.get('aws'));

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

app.get('/dashboard', function(req, res) {
  themeVals = _.extend({
    minecraft: {
      serverName: 'asd',
      serverPort: 'qwe'
    }},
    themeVals
  );
  res.render('dashboard', {values: themeVals});
});

app.get('/', function(req, res) {
  h4e.ract('.');
  res.render('index', {values: themeVals});
});


//Set up our queues
var mq = conf.get('aws')['mq'];
var mc_stdIn = sqs.client.createQueue({QueueName: [mq['prefix'], mq['queues']['mc_stdIn']].join('')});

//Set up our sockets
io.sockets.on('connection', function(socket) {
  var mc_stdOut = sqs.client.createQueue({QueueName: [mq['prefix'], mq['queues']['mc_stdOut']].join('')}, function(err, data) {
    setInterval(function() {
      queueUrl = data.QueueUrl;
      sqs.client.recevieMessage({QueueUrl: queueUrl}, function(err, data) {
        socket.emit('mc_stdOut', data);
        sqs.client.deleteMessage({QueueUrl: queueUrl, ReceiptHandel: data.ReceiptHandle});
      });
    },
    2000)

  });
  socket.on('mc_stdin', function(d) {
  });
  /*laci.getAllImgs(function(b_imgs) {
    socket.emit('b_imgs', b_imgs);
  });*/
});




//Check if necessary queues exit
/*sqs.client.listQueues({QueueNamePrefix: conf.get('queuePrefix')}, function(err, d) {
  if (err) {
    console.log(err);
  }
  else {
    for (q in d.QueuesUrls) {
      availQueues.push((d.QueueUrls[q].substring(d.QueueUrls[q].lastIndexOf('/')+1, d.QueueUrls[q].length)));
    }
    //Get the queues defined in the conf
    var defQueues = conf.get('queues').queueNames;
    //If there is a diff, lets figure out what
    console.log(d.QueueUrls);
    console.log(defQueues);
    if (defQueues.length - d.QueueUrls.length) {
      //Container for the queues that AWS has
      var availQueues = [];
      console.log(availQueues);
      console.log(_.difference(defQueues, availQueues));
      //console.log(conf.get('queusRequired'));
    }
      //console.log(util.inspect(d))
  }
});*/

/*mqc.on('ready',function() {
  //main_queue_ready is need as other async events do not require it but will use it
  main_queue_ready = true;

  //Heartbeat messages from the MC server
  mqc.queue('mc_heartbeat', function(q) {
    q.subscribe(function(d) {
      //Set up the heartbeat checker once we have the first one
      mc.heartBeat = d.heartBeat;
      if (null === mc.heartBeatId) {
        //If a new heartbeat is not received within heartBeatCheckInt+1 then
        mc.heartBeatId = setInterval(function() {
          if ((Date.now() - mc.heartBeat) > conf.get('mc').heartBeatCheckInt) {
            if (null !== s) {
              s.emit('mc_dead', Date.now() - mc.heartBeat);
            }
            mc.alive = false;
          }
          else {
            mc.alive = true;
          }
        }, conf.get('mc').heartBeatCheckInt+1000);
      }
      if (null !== s && 'object' === typeof(s)) {
        s.emit('mc_heartbeat', d.heartBeat);
      }
    });
  });

  mqc.queue('mc_stdout', function(q) {
    q.subscribe(function(d){
      if (null !== s)  {
        s.emit('mc_stdout', d.data.toString());
      }
      console.log(d.data.toString());
    });
  });
  mqc.queue('mc_stderr', function(q) {
    q.subscribe(function(d){
      if (null !== s)  {
        s.emit('mc_stderr', d.data.toString());
      }
      console.log(d.data.toString());
    });
  });
});
*/

/*
 * MAIN
 */
db.connect(['mongodb://', conf.get('db').host, conf.get('db').name].join(''));

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

