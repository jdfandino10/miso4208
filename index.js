const express = require('express');
const producer = require('./producer');
const uuidv4 = require('uuid/v4');

const app = express();

app.post('/test', function(req, res) {
    /**
     * {
     *   email: <string>,
     *   url: <string>,
     *   gitUrl: <string>,
     *   type: {'headless-web' | 'random-web' | 'random-android' | 'bdt-web'},
     *   randomSeed: <number>,
     *   gremlinsNumber: <number>,
     *   environments: [
     *     {
     *       browser: {'chrome' | 'firefox'},
     *       viewport: {
     *         width: <number>
     *         height: <number>
     *       }
     *     },
     *     ...
     *   ],
     * }
     */
    var message = req.body;
  
    message.id = uuidv4();

    const environments = message.environments;
    environments.forEach((environment) => {
        message.environment = environment;
        producer.sendMessage(message);
    });
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

producer.init().then(() => {
    app.listen(3000);
});