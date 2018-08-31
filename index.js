var express = require('express');
var app = express();
app.use(express.static(__dirname + '/view'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/script'));
//Store all JS and CSS in Scripts folder.

app.get('/', function(req, res){
   res.sendFile("index.html");
});

app.listen(3000);
