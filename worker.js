const amqp = require('amqplib/callback_api');
const config_generator = require('./wdio_generator/generator');
const fs = require('fs');
const git = require('nodegit');
const Launcher = require('webdriverio').Launcher;
const resemble = require('resemblejs');
const sgMail = require('@sendgrid/mail');

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'amqp://localhost';
const REQUEST_QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'testing-request';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';

const WebTask = {
    HEADLESS: 'headless-web',
    RANDOM: 'random-web',
    BDT: 'bdt-web',
    VRT: 'vrt'
};

const WebPath = {
    RANDOM: './random',
    VRT: './vrt',
    GIT: './gitRepos',
};

const WebAssets = {
    VRT: './vrtShots'
};

function init() {
    createMissingFolders(WebPath);
    createMissingFolders(WebAssets);

    sgMail.setApiKey(SENDGRID_API_KEY);
    amqp.connect(RABBITMQ_HOST, (_, conn) => {
        conn.createChannel((_, channel) => {
            channel.assertQueue(REQUEST_QUEUE_NAME, { durable: false });
            console.log(' [*] Connected to the request queue');
            processNextQueueMessage(channel);
        });
    });
}

function createMissingFolders(keyValue) {
    for (key in keyValue) {
        const path = keyValue[key];
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }
}

function processNextQueueMessage(requestQueue) {
    requestQueue.consume(REQUEST_QUEUE_NAME, (queueMessage) => {
        const request = JSON.parse(queueMessage.content.toString());
        console.log(' [x] Received message id=%s', request.id);
        processRequest(request);
    }, { noAck: true });
}

function processRequest(request) {
    const timestamp = new Date().getTime();

    return downloadGitRepository(request, timestamp)
        .then(() => runTests(request, timestamp))
        .then((results) => sendResults(request, results))
        .then(() => console.log(' [x] Finished processing message id=%s', request.id))
        .catch((err) => console.log(' [x] An error occured processing message id=%s: %s', request.id, err))
}

function runTests(request, timestamp) {
    console.log(' [*] Running test of type: ' + request.type);

    const wdioGenerator = new config_generator();
    const projectPath = getProjectPath(request, timestamp, true);
    wdioGenerator.generate(request, projectPath);

    switch (request.type) {
        case WebTask.VRT:
            return runVrtTest(request, timestamp);
        case WebTask.RANDOM:
            return runRandomWebTest(request, timestamp);
        case WebTask.HEADLESS:
        case WebTask.BDT:
            return runWebTests(request, timestamp);
    }
}

function runVrtTest(request, timestamp) {
    replaceTemplateTask(request, './vrt/test/specs/vrt');
    return runWebTests(request, timestamp).then(() => {
      var imgPath1 = './vrtShots/' + request.id + '_snapshot_1.png';
      var imgPath2 = './vrtShots/' + request.id + '_snapshot_2.png';
      var outputFile = './vrtShots/' + request.id + '_output.png';
      return regression(imgPath1, imgPath2, outputFile);
    });
}

function regression(imgPath1, imgPath2, outputFile) {
    return resemble(imgPath1).compareTo(imgPath2).onComplete((data) => {
        fs.writeFileSync(outputFile, data.getBuffer());
    });
}  

function runRandomWebTest(request, timestamp) {
    replaceTemplateTask(request, './random/test/specs/gremlins');
    return runWebTests(request, timestamp);
}

function replaceTemplateTask(request, path) {
    data = fs.readFileSync(path + '.template', 'utf8');

    for (key in request) {
        var pattern = '<<<' + key + '>>>'
        var re = new RegExp(pattern, "g");
        data = data.replace(re, request[key]);
    }

    fs.writeFileSync(path + '.js', data, 'utf8');
    console.log(' [x] ' + path + ' template generated sucessfully');
}

function downloadGitRepository(request, timestamp) {
    if (request.type !== WEB_RANDOM_KEY && request.gitUrl) {
        console.log(' [*] Downloading Git repository: ' + request.gitUrl);

        createMissingFolderIfRequired(DEFAULT_GIT_REPOS_FOLDER);

        const projectPath = getProjectPath(request, timestamp);
        return git.Clone(request.gitUrl, projectPath);
    } else {
        return Promise.resolve();
    }
}

function parseFolderName(gitUrl) {
    if (!gitUrl) {
      return "";
    }
    var n = gitUrl.length;
    gitUrl = gitUrl.endsWith('/') ? gitUrl.substring(0, n-1) : gitUrl;
    var index = gitUrl.lastIndexOf('/');
    return gitUrl.substring(index + 1);
}

function getProjectPath(request, timestamp, useBasePath = false) {
    if (request.type !== WEB_RANDOM_KEY && request.type !== WEB_VRT_KEY) {
        const basePath = useBasePath && request.basePath ? '/' + request.basePath : '';
        return DEFAULT_GIT_REPOS_FOLDER + parseFolderName(request.gitUrl) + '_' + request.environmentId + '_' + timestamp + basePath;
    } else {
        return request.type === WEB_RANDOM_KEY ? WEB_RANDOM_PATH : WEB_VRT_PATH;
    }
}

function runWebTests(request, timestamp) {
    console.log(' [*] Running a web test with wdio');

    const projectPath = getProjectPath(request, timestamp, true);
    console.log(' [*] Project path: ' + projectPath);

    var wdio = new Launcher(projectPath + '/wdio.conf.js');
    return wdio.run();
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

init();
