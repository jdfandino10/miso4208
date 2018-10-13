const amqp = require('amqplib/callback_api');

const REQUEST_QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'testing-request-durable';

var rabbitChannel;

function init() {
    return new Promise(function (resolve, reject) {
        amqp.connect('amqp://localhost', function(_, conn) {
            conn.createChannel(function (_, channel) {
                rabbitChannel = channel;
                rabbitChannel.assertQueue(REQUEST_QUEUE_NAME, { durable: true });
                console.log(' [*] Connected to the request queue');
                resolve();
            });
        });
    });
}

function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    rabbitChannel.sendToQueue(REQUEST_QUEUE_NAME, Buffer.from(jsonMessage), { persistent: true });
}

module.exports = {
    init: init,
    sendMessage: sendMessage
};