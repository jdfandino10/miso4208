var express = require('express');
var bb = require('express-busboy');
var app = express();

bb.extend(app, {
    upload: true,
    path: '/uploadedFiles',
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
  console.log(req.files);
  console.log(req.body);
  console.log('hello');
  res.send('test is "running" (yeah sure)');
});

app.listen(3000);
