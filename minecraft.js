var proc = require('child_process')
  , path = require('path')
  , conf = require('nconf')
  , AWS = require('aws-sdk')
  , sqs = new AWS.SQS();

/*
 * CONFIG
 */
conf.argv().env();

conf.file('config.json');

AWS.config.update(conf.get('aws'));
var sqs = new AWS.SQS();

//Start the Minecraft Server
var mc_server = proc.spawn(
  // Uses Java to run the server from a command line child process. The command prompt will not be visible.
  "java",
  ['-Xms1024M', '-Xmx1024M', '-jar', path.basename(conf.get('mc').binLoc), 'nogui'],
  {cwd: path.dirname(conf.get('mc').binLoc)}
);

mc_server.stderr.on('data', function(d) {
  sqs.client.createQueue({QueueName: [conf.get('aws')['mqPrefix'], 'mc_stdErr'].join('')}, function(err, qd) {
    sqs.client.sendMessage({QueueUrl: qd.QueueUrl, MessageBody: d.toString()}, function(err, response) {
      if (err) {
        console.log(err);
      }
    });
  });
  console.log(d.toString());
});

mc_server.stdout.on('data', function(d) {
  sqs.client.createQueue({QueueName: [conf.get('aws')['mqPrefix'], 'mc_stdOut'].join('')}, function(err, qd) {
    sqs.client.sendMessage({QueueUrl: qd.QueueUrl, MessageBody: d.toString()}, function(err, response) {
      if (err) {
        console.log(err);
      }
    });
  });
  console.log(d.toString());
});

sqs.client.createQueue({QueueName: [conf.get('aws')['mqPrefix'], 'mc_heartBeat'].join('')}, function(err, qd) {
  setInterval(function(queueUrl) {
    sqs.client.sendMessage({QueueUrl: queueUrl, MessageBody: JSON.stringify({heartBeat: Date.now()})}, function(err, response) {
      if (err) {
        console.log(err);
      }
    });
  },
  10000, qd.QueueUrl);
});

sqs.client.createQueue({QueueName: [conf.get('aws')['mqPrefix'], 'mc_stdIn'].join('')}, function(err, qd) {
  setInterval(function(queueUrl) {
    sqs.client.receiveMessage({QueueUrl: queueUrl}, function(err, msg) {
      if (typeof msg !== 'null' && typeof msg !== 'undefined' && typeof msg.Messages !== 'undefined') {
        for (var i = 0; i < msg.Messages.length; i++) {
          var currentMsg = msg.Messages[i];
          mc_server.stdin.write([currentMsg.Body, "\n"].join(''));
          console.log(currentMsg.Body);
          sqs.client.deleteMessage({QueueUrl: queueUrl, ReceiptHandle: currentMsg.ReceiptHandle}, function(err, d) {
            if(err) {
              console.log(err);
            }
          });
        }
      }
    });
  }, 2000, qd.QueueUrl);
});