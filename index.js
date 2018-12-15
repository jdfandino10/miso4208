const express = require('express');
const producer = require('./producer');
const uuidv4 = require('uuid/v4');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.get('/', (_, res) => {
    res.json({ msg: 'Up and running :D' });
});

app.post('/random-android', (req, res) => {
    return startTest('random-android', req, res);
});

app.post('/chaos', (req, res) => {
    return startTest('chaos', req, res);
});

app.post('/vrt/ids', (req, res) => {
    return startTest('vrt-ids', req, res);
});

app.post('/vrt/urls', (req, res) => {
    return startTest('vrt-urls', req, res);
});

app.post('headless-web', (req, res) => {
    return startTest('headless-web', req, res);
});

app.post('bdt-web', (req, res) => {
    return startTest('bdt-web', req, res);
});

app.post('random-web', (req, res) => {
    return startTest('random-web', req, res);
});

function startTest(messageType, req, res) {
    let message = req.body;
    message.id = uuidv4();
    message.type = messageType;
    producer.sendMessage(message);
    return res.json({
        id: message.id,
        msg: 'Tests are running. Check your email with the results as soon as they are ready.'
    });
}

app.post('/plan', (req, res) => {
    /**
     * {
     *   email: <string>, // for all types
     *   url: <string>,
     *   baseId: <string>, // only for 'vrt'
     *   compareUrl: <string>, // only for 'vrt'
     *   gitUrl: <string>, // for  headless, randomweb, bdt
     *   type: {'headless-web' | 'random-web' | 'random-android' | 'bdt-web' | 'vrt' | 'mutation-web' | 'chaos'},
     *   randomSeed: <number>,
     *   basePath: <string>,
     *   gremlinsTTL: <number>, // only for 'random-web'
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
     *   accessKey: <string>,
     *   accessSecret: <string>,
     *   regionName: <string>,
     * }
     */
    var message = req.body;
    var nTests = message.tests.length;
    var i = 1;
    message.tests.forEach(testMessage => {
        testMessage.id = uuidv4();
        testMessage.plan = message.name;
        testMessage.totalTests=nTests;
        testMessage.currentTest=i;
        producer.sendMessage(testMessage);
        i++;
    });
    

    res.json({ msg: 'Plan is running. Check your email with the results as soon as they are ready.' });
});

app.post('/other', function(req, res) {
    /**
     * {
     *   email: <string>,
     *   compareUrl: <string>,
     *   gitUrl: <string>,
     *   type: {'headless-web' | 'random-web' | 'random-android' | 'bdt-web' | 'vrt' | 'mutation-web'},
     *   testPath: <string>,
     *   mutatePath: <string>,
     * }
     */
    var message = req.body;

    message.id = uuidv4();
    producer.sendMessage(message);

    res.json({ msg: 'Test is running. Check your email with the results as soon as they are ready' });
});

producer.init().then(() => {
    app.listen(3000);
});
