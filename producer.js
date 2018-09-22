const amqp = require('amqplib/callback_api');

const REQUEST_QUEUE_NAME = 'testing-request';

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

module.exports = {
    init: init,
    sendMessage: sendMessage
};