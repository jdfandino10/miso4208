const amqp = require('amqplib/callback_api');
const cypress = require('cypress');
const Launcher = require('webdriverio').Launcher;
const fs = require('fs');
const git = require('nodegit');
const sgMail = require('@sendgrid/mail');
const config_generator = require('./wdio_generator/generator');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const REQUEST_QUEUE_NAME = 'cypress-request';
const DEFAULT_GIT_REPOS_FOLDER = './gitRepos/';
const DEFAULT_RESULTS_FOLDER = './results/'
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';


function init() {
    createMissingFolder(DEFAULT_GIT_REPOS_FOLDER);
    createMissingFolder(DEFAULT_RESULTS_FOLDER);

    sgMail.setApiKey(SENDGRID_API_KEY);

    amqp.connect('amqp://localhost', function(_, conn) {
        conn.createChannel(function (_, channel) {
            channel.assertQueue(REQUEST_QUEUE_NAME, { durable: false });
            console.log(' [*] Connected to the request queue');
            processNextQueueRequest(channel);
        });
    });
}

function createMissingFolder(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

function processNextQueueRequest(requestQueue) {
    requestQueue.consume(REQUEST_QUEUE_NAME, function(message) {
        var request = JSON.parse(message.content.toString());
        console.log(" [x] Received message id=%s", request.id);
        processRequest(request);
    }, { noAck: true });
}

function processRequest(request) {
    var timestamp = new Date().getTime();
    return downloadGitRepository(request, timestamp)
    .then(function () { return runCypressTests(request, timestamp); })
    .then(function (results) { return sendResults(request, results); })
    .then(function () { console.log('Done!') })
    .catch(function (err) { console.log(err); });
}

function downloadGitRepository(request, timestamp) {
    var projectPath = DEFAULT_GIT_REPOS_FOLDER + parseFolderName(request.gitUrl) + "_" + timestamp;
    // deleteFolderRecursive(projectPath);
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

function runCypressTests(request, timestamp) {

    var wdio = new Launcher("./wdio.conf.js",{capabilities: [{browserName: 'firefox'}]});
    var projectPath = DEFAULT_GIT_REPOS_FOLDER + parseFolderName(request.gitUrl) + "_" + timestamp;
    var cypressPromises = request.environments.map(function (environment) {
        return cypress.run({
            browser: environment.browser,
            viewport: environment.viewport,
            project: projectPath,
            reporter: 'json'
        });
    });
    return Promise.all(cypressPromises);
}

function sendResults(request, results) {
    console.log('Sending Results...');

    var jsonResults = JSON.stringify({ results: results }, null, 2);
    saveResultsSync(request, jsonResults);

    return sgMail.send({
        to: request.email,
        from: FROM_DEFAULT_EMAIL,
        subject: 'Cypress test results',
        text: 'Check your results in the attachment',
        html: '<p>Check your results in the attachment</p>'
    });
}

function saveResultsSync(request, jsonResults) {
    var currTime = new Date().getTime();
    var fileName = parseFolderName(request.gitUrl) + '-' + currTime;
    fs.writeFileSync(DEFAULT_RESULTS_FOLDER + fileName + '.json', jsonResults);
}

init();
