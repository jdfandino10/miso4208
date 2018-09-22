var express = require('express');
var bb = require('express-busboy');
var cypress = require('cypress');
var app = express();

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
    console.log(message);
    message.id = new Date().getTime();
    if (!Array.isArray(message.env)) message.env = [message.env];
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

app.get('/random/web', function(req,res)
{
    var resolution = req.header("resolution");
    var resSplit = resolution.split('x');
    var width = resSplit[0];
    var height = resSplit[1];
    var url=req.header("url");
    var browser=req.header("browser");
    var id = new Date().getTime();
    var email=req.header("email");
    var number=req.header("number");
    var type="random-web"
    var seed=req.header("seed");
    var m = {
        type: type,
        id: id,
        email: email,
        width: width,
        height: height,
        browser:browser,
        seed:seed,
        number:number
      };
    producer.sendMessage(m);
})

//worker.init();
app.listen(3000);
