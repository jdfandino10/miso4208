const amqp = require('amqplib/callback_api');
const cypress = require('cypress');
const fs = require('fs');
const git = require('nodegit');
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const REQUEST_QUEUE_NAME = 'cypress-request';
const DEFAULT_GIT_REPOS_FOLDER = './gitRepos/';
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';

function init() {
    sgMail.setApiKey(SENDGRID_API_KEY);

    amqp.connect('amqp://localhost', function(_, conn) {
        conn.createChannel(function (_, channel) {
            channel.assertQueue(REQUEST_QUEUE_NAME, { durable: false });
            console.log(' [*] Connected to the request queue');
            while (true) processNextQueueRequest(channel);
        });
    });
}

function processNextQueueRequest(requestQueue) {
    requestQueue.consume(REQUEST_QUEUE_NAME, function(message) {
        console.log(" [x] Received message id=%s", message.content.id);
        processRequest(message.content);
    }, { noAck: true });
}

function processRequest(request) {
    return downloadGitRepository(request)
    .then(function () { return runCypressTests(request); })
    .then(function (results) { return sendResults(request, results); });
}

function downloadGitRepository(request) {
    var projectPath = DEFAULT_GIT_REPOS_FOLDER + parseFolderName(request.gitUrl);
    deleteFolderRecursive(projectPath);
    return git.Clone(request.gitUrl, projectPath);
}

function parseFolderName(gitUrl) {
    var n = gitUrl.length; 
    gitUrl = gitUrl.endsWith('/') ? gitUrl.substring(0, n-1) : gitUrl;
    var index = gitUrl.lastIndexOf('/');
    return gitUrl.substring(index + 1);
}

function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var currentPath = path + '/' + file;
            if (fs.lstatSync(currentPath).isDirectory()) {
                deleteFolderRecursive(currentPath);
            } else {
                fs.unlinkSync(currentPath);
            }
        });
        fs.rmdirSync(path);
    }
}

function runCypressTests(request) {
    var projectPath = DEFAULT_GIT_REPOS_FOLDER + parseFolderName(request.gitUrl);
    var cypressPromises = request.environments.map(function (environment) {
        return cypress.run({
            browser: environment.browser,
            viewport: environment.viewport,
            project: projectPath
        });
    });
    return Promise.all(cypressPromises);
}

function sendResults(request, results) {
    var jsonResults = results.map(JSON.stringify);
    sgMail.send({
        to: request.email,
        from: FROM_DEFAULT_EMAIL,
        subject: 'Cypress test results',
        text: jsonResults.join('\n'),
        html: jsonResults.map(function (result) {
            return '<div>' + result + '</div>'
        }).join('\n')
    });
}

init();