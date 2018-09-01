var express = require('express');
var bb = require('express-busboy');
var cypress = require('cypress');
var app = express();

var worker = require('./worker');
var producer = require('./producer');

bb.extend(app, {
    upload: true,
    path: './uploadedFiles',
    allowedPath: /./
});

app.use(express.static(__dirname + '/view'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/script'));
//Store all JS and CSS in Scripts folder.

app.get('/', function(req, res){
    res.sendFile('index.html');
});

app.get('/main.js', function(req, res){
    res.sendFile('main.js');
});

app.post('/testupload', function(req, res) {
    var message = req.body;
    message.id = new Date().getTime();
    message.environments = message.env.map((elem) => {
      var parts = elem.split(' ');
      var browser = parts[0];
      var viewport = parts[1];
      return {browser, viewport};
    });
    console.log(message);
    message.environments.forEach((elem) => {
      var m = {
        id: message.id,
        email: message.email,
        gitUrl: message.gitUrl,
        environments: [elem]
      };
      producer.sendMessage(m);
    });
    //producer.sendMessage(req.body);
});

//worker.init();
app.listen(3000);
