const amqp = require('amqplib/callback_api');

const REQUEST_QUEUE_NAME = 'cypress-request';

var rabbitChannel;

function init() {
    return new Promise(function (resolve, reject) {
        amqp.connect('amqp://localhost', function(_, conn) {
            conn.createChannel(function (_, channel) {
                rabbitChannel = channel;
                rabbitChannel.assertQueue(REQUEST_QUEUE_NAME, { durable: false });
                console.log(' [*] Connected to the request queue');
                resolve();
            });
        });
    });
}

function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    rabbitChannel.sendToQueue(REQUEST_QUEUE_NAME, Buffer.from(jsonMessage));
}

init()
.then(function () {
    sendMessage({
        id: 1,
        email: 'jd.fandino10@uniandes.edu.co',
        gitUrl: 'https://github.com/jcbages/cypress-hello-world',
        environments: [
            //{ browser: 'chrome', viewport: '1000' },
            { browser: 'electron', viewport: '600' }
        ]
    });
    console.log(' [*] Message sent');
});

// The then part is just for debugging
