const amqp = require('amqplib/callback_api');
const fs = require('fs');
const git = require('nodegit');
const sgMail = require('@sendgrid/mail');
const config_generator = require('./wdio_generator/generator');
const Launcher = require('webdriverio').Launcher;

const WEB_TEST_KEY = '-web';
const WEB_RANDOM_KEY = 'random-web';
const WEB_RANDOM_PATH = './random';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const REQUEST_QUEUE_NAME = 'testing-request';
const DEFAULT_GIT_REPOS_FOLDER = './gitRepos/';
const DEFAULT_RESULTS_FOLDER = './results/'
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';


function init() {
    sgMail.setApiKey(SENDGRID_API_KEY);

    amqp.connect('amqp://localhost', function(_, conn) {
        conn.createChannel(function (_, channel) {
            channel.assertQueue(REQUEST_QUEUE_NAME, { durable: false });
            console.log(' [*] Connected to the request queue');
            processNextQueueMessage(channel);
        });
    });
}

function createMissingFolderIfRequired(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

function processNextQueueMessage(requestQueue) {
    requestQueue.consume(REQUEST_QUEUE_NAME, function(queueMessage) {
        var request = JSON.parse(queueMessage.content.toString());
        console.log(' [x] Received message id=%s', request.id);
        processRequest(request);
    }, { noAck: true });
}

function processRequest(request) {
    console.log(' [*] processRequest for request');
    console.log(request);

    var timestamp = new Date().getTime();

    return downloadGitRepository(request, timestamp)
        .then(function () { return runTests(request, timestamp); })
        .then(function (results) { return sendResults(request, results); })
        .then(function () {
            // cleanRepository(request, timestamp);
            console.log(' [x] Finished processing message id=%s', request.id);
        })
        .catch(function (err) {
            // cleanRepository(request, timestamp);
            console.log(' [x] An error occured processing message id=%s: %s', request.id, err);
        });
}

function runTests(request, timestamp) {
    console.log(' [*] Running test of type: ' + request.type);

    const wdioGenerator = new config_generator();
    const projectPath = getProjectPath(request, timestamp, true);
    wdioGenerator.generate(request, projectPath);

    console.log('generated!');

    if (request.type === WEB_RANDOM_KEY) {
        return runRandomWebTest(request, timestamp);
    } else if (request.type.endsWith(WEB_TEST_KEY)) {
        return runWebTests(request, timestamp);
    } else {
        return runAndroidTest(request, timestamp);
    }
}

function runRandomWebTest(request, timestamp) {
    replaceTemplateTask(request, './random/test/specs/gremlins');
    return runWebTests(request, timestamp);
}

function replaceTemplateTask(request, path) {
    data = fs.readFileSync(path + '.template', 'utf8');

    for (key in request) {
        data = data.replace('<<<' + key + '>>>', request[key]);
    }

    fs.writeFileSync(path + '.js', data, 'utf8');
    console.log(' [x] Gremlins template generated sucessfully');
}

function downloadGitRepository(request, timestamp) {
    if (request.type !== WEB_RANDOM_KEY) {    
        console.log(' [*] Downloading Git repository: ' + request.gitUrl);

        createMissingFolderIfRequired(DEFAULT_GIT_REPOS_FOLDER);

        const projectPath = getProjectPath(request, timestamp);
        return git.Clone(request.gitUrl, projectPath);
    } else {
        return Promise.resolve();
    }
}

function parseFolderName(gitUrl) {
    var n = gitUrl.length;
    gitUrl = gitUrl.endsWith('/') ? gitUrl.substring(0, n-1) : gitUrl;
    var index = gitUrl.lastIndexOf('/');
    return gitUrl.substring(index + 1);
}

function getProjectPath(request, timestamp, useBasePath = false) {
    if (request.type !== WEB_RANDOM_KEY) {
        const basePath = useBasePath && request.basePath ? '/' + request.basePath : '';
        return DEFAULT_GIT_REPOS_FOLDER + parseFolderName(request.gitUrl) + '_' + request.environmentId + '_' + timestamp + basePath;
    } else {
        return WEB_RANDOM_PATH;
    }
}

function cleanRepository(request, timestamp) {
    console.log(' [*] Cleaning repository');

    const projectPath = getProjectPath(request, timestamp);
    deleteFolderRecursive(projectPath);
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

function runWebTests(request, timestamp) {
    console.log(' [*] Running a web test with wdio');

    const projectPath = getProjectPath(request, timestamp, true);
    console.log(' [*] Project path: ' + projectPath);

    var wdio = new Launcher(projectPath + '/wdio.conf.js');
    return wdio.run();
}

function runAndroidTest(request, timestamp) {
    console.log(' [x] Android not supported, skipping test');
}

function sendResults(request, results) {
    console.log(' [*] Sending Results to email: ' + request.email);

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

    createMissingFolderIfRequired(DEFAULT_RESULTS_FOLDER);
    fs.writeFileSync(DEFAULT_RESULTS_FOLDER + fileName + '.json', jsonResults);
}

init();