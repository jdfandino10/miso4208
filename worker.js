const amqp = require('amqplib/callback_api');
const config_generator = require('./wdio_generator/generator');
const fs = require('fs');
const git = require('nodegit');
const Launcher = require('webdriverio').Launcher;
const compare = require('resemblejs').compare;
const sgMail = require('@sendgrid/mail');

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'amqp://localhost';
const REQUEST_QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'testing-request';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';

const WebTask = {
    HEADLESS: 'headless-web',
    RANDOM: 'random-web',
    BDT: 'bdt-web',
    VRT: 'vrt-web'
};

const WebPath = {
    RANDOM: './random',
    VRT: './vrt',
    GIT: './gitRepos',
};

const WebAssets = {
    SCREENSHOTS: './errorShots',
    VRT: './vrtShots',
    REPORT: './report'
};

function init() {
    createMissingFolders(WebPath);
    createMissingFolders(WebAssets);

    sgMail.setApiKey(SENDGRID_API_KEY);
    amqp.connect(RABBITMQ_HOST, (_, conn) => {
        conn.createChannel((_, channel) => {
            channel.assertQueue(REQUEST_QUEUE_NAME, { durable: false });
            channel.prefetch(1, false);
            console.log(' [x] Connected to the request queue');
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
        console.log(' [x] Received message id=%s, envid=%s', request.id, request.environmentId);
        processRequest(request)
        .then(() => requestQueue.ack(queueMessage))
        .catch(() => requestQueue.ack(queueMessage));
    }, { noAck: false });
}

function processRequest(request) {
    const timestamp = new Date().getTime();

    return downloadGitRepository(request, timestamp)
    .then(() => runTests(request, timestamp))
    .then((results) => sendResults(request, results))
    .then(() => console.log(' [x] Finished processing message id=%s, envid=%s', request.id, request.environmentId))
    .catch((err) => console.log(' [x] An error occured processing message id=%s: %s', request.id, err))
}

function needToDownloadGitRepo(request) {
    const isValidRequestType = request.type === WebTask.HEADLESS || request.type === WebTask.BDT;
    return request.gitUrl && isValidRequestType;
}

function getProjectPath(request, timestamp, useBasePath = false) {
    function parseFolderName(gitUrl) {
        if (!gitUrl) {
            return '';
        } else {
            const urlLength = gitUrl.length;
            const formattedGitUrl = gitUrl.endsWith('/') ? gitUrl.substring(0, urlLength-1) : gitUrl;
            const index = formattedGitUrl.lastIndexOf('/');
            return formattedGitUrl.substring(index + 1);
        }
    }

    if (needToDownloadGitRepo(request)) {
        const basePath = useBasePath && request.basePath ? `/${request.basePath}` : '';
        const folderName = parseFolderName(request.gitUrl);
        return `${WebPath.GIT}/${folderName}_${request.environmentId}_${timestamp}${basePath}`;
    } else {
        switch (request.type) {
            case WebTask.RANDOM:
                return WebPath.RANDOM;
            case WebTask.VRT:
                return WebPath.VRT;
        }
    }
}

function downloadGitRepository(request, timestamp) {
    if (needToDownloadGitRepo(request)) {
        const projectPath = getProjectPath(request, timestamp);
        console.log(' [x] Downloading Git repository url=%s on path=%s', request.gitUrl, projectPath);
        return git.Clone(request.gitUrl, projectPath);
    } else {
        console.log(' [x] No need to download Git repository');
        return Promise.resolve();
    }
}

function replaceTemplateTask(request, path) {
    let data = fs.readFileSync(`${path}.template`, 'utf8');

    for (key in request) {
        const pattern = `<<<${key}>>>`;
        const regex = new RegExp(pattern, 'g');
        data = data.replace(regex, request[key]);
    }

    fs.writeFileSync(`${path}.js`, data, 'utf8');
    console.log(' [x] Template generated sucessfully for path=%s', path);
}

function runTests(request, timestamp) {
    console.log(' [x] Running test type=%s', request.type);

    const wdioGenerator = new config_generator();
    const projectPath = getProjectPath(request, timestamp, true);
    wdioGenerator.generate(request, projectPath, WebAssets.REPORT, WebAssets.SCREENSHOTS);

    console.log(' [x] Generated file wdio.conf.js');

    switch (request.type) {
        case WebTask.VRT:
            return runVrtTest(request, timestamp);
        case WebTask.RANDOM:
            return runRandomTest(request, timestamp);
        case WebTask.HEADLESS:
            return runHeadlessTest(request, timestamp);
        case WebTask.BDT:
            return runBdtTest(request, timestamp);
    }
}

function runVrtTest(request, timestamp) {
    function getVrtResults(imgPath1, imgPath2, outputFile) {
        return {
            images: [
                { path: imgPath1, filename: 'url.png', type: 'image/png' },
                { path: imgPath2, filename: 'compareUrl.png', type: 'image/png' },
                { path: outputFile, filename: 'results.png', type: 'image/png' }
            ]
        };
    }
    
    function regression(imgPath1, imgPath2, outputFile) {
        return new Promise((resolve, reject) => {
            compare(imgPath1, imgPath2, {}, (err, data) => {
                if (err) reject(err);
                fs.writeFileSync(outputFile, data.getBuffer());
                const results = getVrtResults(imgPath1, imgPath2, outputFile);
                resolve(results);
            });
        });
    }

    replaceTemplateTask(request, `${WebPath.VRT}/test/specs/vrt`);
    return runWebTests(request, timestamp).then(() => {
        const imgPath1 = `${WebAssets.VRT}/${request.environmentId}_snapshot_1.png`;
        const imgPath2 = `${WebAssets.VRT}/${request.environmentId}_snapshot_2.png`;
        const outputFile = `${WebAssets.VRT}/${request.environmentId}_output.png`;
        return regression(imgPath1, imgPath2, outputFile);
    });
}

function runRandomTest(request, timestamp) {
    function getRandomResults() {
        return { images: [] };
    }

    replaceTemplateTask(request, `${WebPath.RANDOM}/test/specs/gremlins`);
    return runWebTests(request, timestamp).then(getRandomResults);
}

function runHeadlessTest(request, timestamp) {
    function getHeadlessResults() {
        const screenShotsPath = `${WebAssets.SCREENSHOTS}/${request.environmentId}`;
        const images = fs.readdirSync(screenShotsPath).map(imagePath => ({
            path: `${screenShotsPath}/${imagePath}`,
            filename: imagePath,
            type: 'image/png'
        }));
        return { images: images };
    }

    return runWebTests(request, timestamp).then(getHeadlessResults);
}

function runBdtTest(request, timestamp) {
    function getBdtResults() {
        return { images: [] };
    }

    return runWebTests(request, timestamp).then(getBdtResults);
}

function runWebTests(request, timestamp) {
    const projectPath = getProjectPath(request, timestamp, true);
    console.log(' [x] Running a web test with wdio path=%s', projectPath);
    const wdio = new Launcher(`${projectPath}/wdio.conf.js`);
    return wdio.run();
}

function sendResults(request, results) {
    console.log(' [x] Sending results to email=%s, from email=%s', request.email, FROM_DEFAULT_EMAIL);
    
    function attachBase64Image(image) {
        const bitmap = fs.readFileSync(image.path);
        const base64Image = new Buffer(bitmap).toString('base64');
        return {
            content: base64Image,
            filename: image.filename,
            type: image.type,
            disposition: 'attachment',
            content_id: image.filename
        };
    }

    function getHtmlString() {
        const data = fs.readFileSync(`${WebAssets.REPORT}/${request.environmentId}.html`, 'utf-8');
        return data.toString();
    }

    const mailObject = {
        to: request.email,
        from: FROM_DEFAULT_EMAIL,
        subject: 'Tests results',
        html: getHtmlString(),
        attachments: results.images.map(attachBase64Image)
    };

    console.log(' [x] Sendgrid mail object=%s', JSON.stringify(mailObject, null, 2));

    return sgMail.send(mailObject);
}

init();
