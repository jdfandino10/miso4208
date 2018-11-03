const amqp = require('amqplib/callback_api');
const config_generator = require('./wdio_generator/generator');
const cypress = require('cypress');
const fs = require('fs');
const git = require('nodegit');
const Launcher = require('webdriverio').Launcher;
const compare = require('resemblejs').compare;
const exec = require('child_process').execSync;
const spawn = require('child_process').spawn;
const sgMail = require('@sendgrid/mail');

const gtmetrix = require ('gtmetrix') ({
    email: 'jg.angel10@uniandes.edu.co',
    apikey: '3a275e13df2b4fb47ec5d47dc6bd71fa'
});
const gtmetrixLocations=['Canada','UK','Australia','USA','India','Brazil','China'];

const downloadFileSync = require('download-file-sync');
const path = require('path');

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'amqp://localhost';
const REQUEST_QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'testing-request-durable';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';

const WebTask = {
    HEADLESS: 'headless-web',
    RANDOM: 'random-web',
    RANDOM_ANDROID: 'random-android',
    BDT: 'bdt-web',
    VRT: 'vrt-web',
    MUTATION: 'mutation-web',
    USABILITY: 'usability',
    CHAOS: 'chaos'
};

const WebPath = {
    RANDOM: './random',
    VRT: './vrt',
    GIT: './gitRepos',
    MUTATION: './mutation',
    APK_PATH: './apk',
};

const WebAssets = {
    SCREENSHOTS: './errorShots',
    SCENARIOS: './errorScenarios',
    VIDEOS: './errorVideos',
    MONKEY_FOLDER: 'monkey_testing_ripper.spec.js',
    VRT: './vrtShots',
    REPORT: './report',
    MUTATION_REPORT: './mutationReport'
};

function init() {
    createMissingFolders(WebPath);
    createMissingFolders(WebAssets);

    sgMail.setApiKey(SENDGRID_API_KEY);
    amqp.connect(RABBITMQ_HOST, (err, conn) => {
        if (err) {
            console.log(' [x] There was an connecting to host=%s: %s', RABBITMQ_HOST, err);
        } else {
            conn.createChannel((_, channel) => {
                channel.assertQueue(REQUEST_QUEUE_NAME, { durable: true });
                channel.prefetch(1, false);
                console.log(' [x] Connected to the request queue host=%s', RABBITMQ_HOST);
                processNextQueueMessage(channel);
            });
        }
    });
}

function createMissingFolders(keyValue) {
    for (key in keyValue) {
        const pathFolder = keyValue[key];
        if (!fs.existsSync(pathFolder)) {
            fs.mkdirSync(pathFolder);
        }
    }
}

function processNextQueueMessage(requestQueue) {
    requestQueue.consume(REQUEST_QUEUE_NAME, (queueMessage) => {
        const request = JSON.parse(queueMessage.content.toString());
        console.log(' [x] Received message id=%s, envid=%s', request.id, request.environmentId);
        processRequest(request)
        .then(() => {
            console.log(' [x] Finished processing message id=%s, envid=%s', request.id, request.environmentId);
            requestQueue.ack(queueMessage)
        })
        .catch((err) => {
            console.log(' [x] An error occured processing message id=%s, envid=%s: %s', request.id, request.environmentId, err)
            requestQueue.ack(queueMessage);
        });
    }, { noAck: false });
}

function processRequest(request) {
    const timestamp = new Date().getTime();

    return downloadGitRepository(request, timestamp)
    .then(() => runTests(request, timestamp))
    .then((results) => sendResults(request, results));
}

function needToDownloadGitRepo(request) {
    const isValidRequestType = request.type === WebTask.HEADLESS || request.type === WebTask.BDT || request.type === WebTask.MUTATION;
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
        if(request.type==WebTask.MUTATION) {
          return `${WebPath.GIT}/${folderName}_${timestamp}${basePath}`;
        }
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

function replaceTemplateTask(request, filePath, ext='js') {
    let data = fs.readFileSync(`${filePath}.template`, 'utf8');

    for (key in request) {
        const pattern = `<<<${key}>>>`;
        const regex = new RegExp(pattern, 'g');
        data = data.replace(regex, request[key]);
    }

    fs.writeFileSync(`${filePath}.${ext}`, data, 'utf8');
    console.log(' [x] Template generated sucessfully for path=%s', filePath);
}

function runTests(request, timestamp) {
    console.log(' [x] Running test type=%s', request.type);

    var wdioGenerator;
    var projectPath;

    if (
        request.type !== WebTask.MUTATION &&
        request.type !== WebTask.RANDOM &&
        request.type !== WebTask.USABILITY &&
        request.type !== WebTask.CHAOS &&
        request.type !== WebTask.RANDOM_ANDROID
    ) {
        wdioGenerator = new config_generator();
        projectPath = getProjectPath(request, timestamp, true);
        wdioGenerator.generate(request, projectPath, WebAssets.REPORT, WebAssets.SCREENSHOTS);
        console.log('generated wdio.conf.js!');
    }

    switch (request.type) {
        case WebTask.VRT:
            return runVrtTest(request, timestamp);
        case WebTask.RANDOM:
            return runRandomTest(request, timestamp);
        case WebTask.RANDOM_ANDROID:
            return runRandomTestAndroid(request, timestamp);
        case WebTask.HEADLESS:
            return runHeadlessTest(request, timestamp);
        case WebTask.BDT:
            return runBdtTest(request, timestamp);
        case WebTask.MUTATION:
            return runMutationWebTest(request, timestamp);
         case WebTask.USABILITY:
            return runUsabilityTest(request, timestamp);
        case WebTask.CHAOS:
            return runChaosTest(request, timestamp);
    }
}

function downloadApk(request) {
    var packageParts = request.package.split('.');
    var fileName = packageParts[packageParts.length - 1] + '.apk';
    var apkDir = path.join(WebPath.APK_PATH, fileName);
    var command = `curl "${request.apkUrl}" -o ${apkDir} -L -s`;
    console.log(' [x] Downloading apk from %s', request.apkUrl);
    exec(command);
    console.log(' [x] Done downloading apk, saved @ %s', apkDir);
    return apkDir;
}

function runRandomTestAndroid(request, timestamp) {
    const defaultRandomSeed = (new Date()).getTime();
    const defaultMaxEvents = 50;

    const videosPath = `${WebAssets.VIDEOS}/${request.environmentId}`;
    const maxEvents = request.maxEvents || defaultMaxEvents;
    const randomSeed =  request.randomSeed || defaultRandomSeed;

    function getAndroidRandomResults(x) {
        const videos = fs.readdirSync(videosPath).map(filePath => ({
            path: `${videosPath}/${filePath}`,
            filename: filePath,
            type: 'video/mp4'
        }));

        return {
            images: [],
            videos: videos,
            randomSeed: randomSeed,
            maxEvents: maxEvents
        };
    }

    const promise = new Promise((resolve, _) => {
        const apkDir = downloadApk(request);
        try {
            console.log(' [x] Trying to uninstall apk %s', request.package);
            exec(`adb uninstall ${request.package}`);
            console.log(' [x] Uninstalled apk %s', request.package);
        } catch (e) {
            console.log(' [x] App not installed on device, continue...');
        }

        console.log(' [x] Installing apk with package %s...', request.package);
        exec(`adb install ${apkDir}`);

        console.log(' [x] Starting video recording...');
        let videoRecording = spawn('adb', ['shell', 'screenrecord', '/sdcard/monkey.mp4']);
        videoRecording.on('close', (code, signal) => {
            console.log(' [x] Done killing video code=%s, signal=%s', code, signal);
            performVideoPostProcessing();
        });

        console.log(' [x] Starting monkey testing with %s events and %d seed', maxEvents, randomSeed);
        exec(`adb shell monkey -p ${request.package} -v ${maxEvents} -s ${randomSeed}`);
        console.log(' [x] Trying to kill video recording...');
        videoRecording.kill('SIGINT');

        function performVideoPostProcessing() {
            if (!fs.existsSync(videosPath)) {
                fs.mkdirSync(videosPath);
            }
            console.log(` [x] Waiting 2 seconds for video to be ready...`);
            setTimeout(() => {
              console.log(` [x] Saving video at ${videosPath}`);
              exec(`adb pull /sdcard/monkey.mp4 ${path.join(videosPath, 'monkey.mp4')}`);
              resolve();
            }, 2000);
        }
    });

    return promise.then(getAndroidRandomResults);
}


function runChaosTest(request, timestamp) {
    return new Promise((resolve, reject) => {
        replaceTemplateTask(request, './SimianArmy/src/main/resources/client', 'properties');
        replaceTemplateTask(request, './SimianArmy/src/main/resources/chaos', 'properties');
        replaceTemplateTask(request, './SimianArmy/src/main/resources/conformity', 'properties');
        replaceTemplateTask(request, './SimianArmy/src/main/resources/janitor', 'properties');
        replaceTemplateTask(request, './SimianArmy/src/main/resources/simianarmy', 'properties');
        console.log(` [x] Starting simian army`);
        exec(".\\gradlew jettyRun", {cwd: '.\\SimianArmy'});
        console.log(` [x] Done with simian army`);
    });
}

function runVrtTest(request, timestamp) {
    if (request.url && request.compareUrl) {
        return runImageCompareVrtTest(request, timestamp);
    } else {
        return runIdCompareVrtTest(request, timestamp);
    }
}

function runImageCompareVrtTest(request, timestamp) {
    console.log(' [x] Running image compare VRT');

    function getVrtResults(imgPath1, imgPath2, outputFile) {
        return {
            images: [
                { path: imgPath1, filename: 'url.png', type: 'image/png' },
                { path: imgPath2, filename: 'compareUrl.png', type: 'image/png' },
                { path: outputFile, filename: 'results.png', type: 'image/png' }
            ],
            videos: []
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

function runIdCompareVrtTest(request, timestamp) {
    console.log(' [x] Running ID compare VRT id1=%s id2=%s', request.vrtId, request.compareVrtId);

    const vrtIdPath1 = `${WebAssets.SCREENSHOTS}/${request.vrtId}`;
    const vrtIdPath2 = `${WebAssets.SCREENSHOTS}/${request.compareVrtId}`;
    const outputPath = `${WebAssets.SCREENSHOTS}/${request.environmentId}`;

    function getVrtResults(imgPath1, imgPath2, outputFile) {
        const imgName1 = path.basename(imgPath1);
        const imgName2 = path.basename(imgPath2);
        const outputName = path.basename(outputFile);

        return {
            images: [
                { path: imgPath1, filename: imgName1, type: 'image/png' },
                { path: imgPath2, filename: imgName2, type: 'image/png' },
                { path: outputFile, filename: outputName, type: 'image/png' }
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

    const promises = fs.readdirSync(vrtIdPath1).map(imgPath => {
        console.log(' [x] Regression to imgPath=%s', imgPath);

        const lastPos = imgPath.lastIndexOf('.');
        const imgName = imgPath.substring(0, lastPos);

        const imgPath1 = `${vrtIdPath1}/${imgPath}`;
        const imgPath2 = `${vrtIdPath2}/${imgPath}`;
        const outputFile = `${outputPath}/${imgName}.vrt.png`;
        return regression(imgPath1, imgPath2, outputFile);
    });

    return Promise.all(promises).then(allResults => {
        const answerResults = { images: [], videos: [] };
        allResults.forEach(result => answerResults.images = answerResults.images.concat(result.images));
        return answerResults;
    });
}

function runRandomTest(request, timestamp) {
    const defaultRandomSeed = (new Date()).getTime();
    const defaultMaxEvents = 50;

    const projectLocation = './random';
    const monkeyLocation = './random/cypress/integration/monkey_testing_ripper.spec.js';
    const screenShotsPath = `${WebAssets.SCREENSHOTS}/${request.environmentId}`;
    const videosPath = `${WebAssets.VIDEOS}/${request.environmentId}`;
    const scenariosPath = `${WebAssets.SCENARIOS}/${request.environmentId}`;

    const randomSeed = request.randomSeed || defaultRandomSeed;
    const maxEvents = request.maxEvents || defaultMaxEvents;
    const generateScenario = request.generateScenario || false;

    function getRandomResults(x) {
        // grab images
        let images = [];
        if (fs.existsSync(screenShotsPath)) {
            const innerPath = `${screenShotsPath}/${WebAssets.MONKEY_FOLDER}`;
            if (fs.existsSync(innerPath)) {
                images = fs.readdirSync(innerPath).map(imagePath => ({
                    path: `${innerPath}/${imagePath}`,
                    filename: imagePath,
                    type: 'image/png'
                }));
            }
        }

        // grab videos
        let videos = [];
        if (fs.existsSync(videosPath)) {
            videos = fs.readdirSync(videosPath).map(filePath => ({
                path: `${videosPath}/${filePath}`,
                filename: filePath,
                type: 'video/mp4'
            }));
        }

        // grab report
        let scenarios = [];
        if (fs.existsSync(scenariosPath)) {
            scenarios = fs.readdirSync(scenariosPath).map(filePath => ({
                path: `${scenariosPath}/${filePath}`,
                filename: filePath,
                type: 'plain/text'
            }));
        }

        return {
            images: images,
            videos: videos,
            scenarios: scenarios,
            randomSeed: randomSeed,
            maxEvents: maxEvents
        };
    }

    const cypressPromise = cypress.run({
        spec: monkeyLocation,
        project: projectLocation,
        env: {
            baseUrl: request.url,
            randomSeed: randomSeed,
            maxEvents: maxEvents,
            generateScenario: generateScenario,
            scenariosPath: `.${scenariosPath}`,
        },
        config: {
            baseUrl: request.url,
            screenshotsFolder: `.${screenShotsPath}`,
            screenshotOnRunFailure: !generateScenario,
            videosFolder: `.${videosPath}`,
            trashAssetsBeforeRuns: false,
            viewportHeight: request.environment.viewport.height,
            viewportWidth: request.environment.viewport.width
        }
    });
    return cypressPromise.then(getRandomResults);
}

function runHeadlessTest(request, timestamp) {
    function getHeadlessResults() {
        const screenShotsPath = `${WebAssets.SCREENSHOTS}/${request.environmentId}`;
        const images = fs.readdirSync(screenShotsPath).map(imagePath => ({
            path: `${screenShotsPath}/${imagePath}`,
            filename: imagePath,
            type: 'image/png'
        }));
        return { images: images, videos: [] };
    }

    return runWebTests(request, timestamp).then(getHeadlessResults);
}

function runBdtTest(request, timestamp) {
    function getBdtResults() {
        return { images: [], videos: [] };
    }

    return runWebTests(request, timestamp).then(getBdtResults);
}

function runMutationWebTest(request, timestamp) {
    console.log("run mutation");
    var projectPath = getProjectPath(request, timestamp);
    exec("npm --prefix " + projectPath + " install " + projectPath);
    // fs.renameSync("package.json","package.jsonbak");
    // fs.copyFileSync(projectPath+"/package.json","package.json");
    // exec("npm install");
    // fs.unlinkSync("package.json");
    // fs.renameSync("package.jsonbak","package.json");
    request.projectPath = projectPath;
    replaceTemplateTask(request, WebPath.MUTATION + '/stryker.conf');
    replaceTemplateTask(request, WebPath.MUTATION + '/karma.conf');
    //fs.renameSync(WebPath.MUTATION + "/karma.conf.js",projectPath+ "/karma.conf.js");
    //fs.renameSync(WebPath.MUTATION + "/stryker.conf.js",projectPath+ "/stryker.conf.js");
    exec('stryker run ' + WebPath.MUTATION + '/stryker.conf.js');
    return { images: [], videos: [] };
}

function runUsabilityTest(request, timestamp) {
    console.log(' [x] Running usability test');
    var testDetails = {
        url: request.url,
        location: gtmetrixLocations.indexOf(request.location)+1,
        browser: request.browser=='Firefox'?1:3
        };
        return gtmetrix.test.create (testDetails).then (data =>
            gtmetrix.test.get (data.test_id, 5000).then (processResponse))


    function processCreateResponse(response) {
        var response_object = JSON.parse(response);
        var test_id = response.test_id;
        var data = `Usability test done. Check your results at:\n${report_url}`;
        fs.writeFileSync(`${WebAssets.REPORT}/index.html`, data, 'utf8');
        console.log(response);
    }

    function processResponse(response) {
        console.log(response)
        var report_url = response.results.report_url;
        var data = `<p>Usability test done. Check your results at:</p>\n<p><a href="${report_url}">${report_url}</a></p>`;
        fs.writeFileSync(`${WebAssets.REPORT}/index.html`, data, 'utf8');
        return { images: [] }
    }
}

function mockData(rows,path,dataLayout) {

    var pass = JSON.parse(fs.readFileSync(`data/pass.txt`, 'utf8')).pass;
    var email = JSON.parse(fs.readFileSync(`data/email.txt`, 'utf8')).email;

    //console.log(pass);
    //console.log(email);

    var msg='';
    for(var i=0;i<rows;i++)
    {
        msg+='\t\t\t|';
        for (key in dataLayout) {
            switch(dataLayout[key])
            {
                case "email":
                    msg+=email[i];
                    break;
                case "pass":
                    msg+=pass[i];
                    break;
                default:
                    msg+=dataLayout[key];
                    break;
            }
            msg+='|';
        }
        msg+='\n';
    }
    console.log(msg);
    console.log(path);
    fs.appendFileSync(path, msg);
}

function runWebTests(request, timestamp) {
    const projectPath = getProjectPath(request, timestamp, true);
    const configFileName = `wdio.${request.environmentId}.conf.js`;
    console.log(' [x] Running a web test with wdio path=%s/%s', projectPath, configFileName);
    if(request.type==WebTask.BDT && typeof request.pathToMock != "undefined")
    {
        mockData(request.mockSize,`${projectPath}/${request.pathToMock}`,request.dataMock)
    }
    const wdio = new Launcher(`${projectPath}/${configFileName}`);
    return wdio.run();
}

function sendResults(request, results) {
    console.log(' [x] Sending results to email=%s, from email=%s', request.email, FROM_DEFAULT_EMAIL);

    function attachBase64(image) {
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

    function getHtmlString(task) {
        if (task === WebTask.MUTATION) {
            const data = fs.readFileSync(`${WebAssets.MUTATION_REPORT}/index.html`, 'utf-8');
            return data.toString();
        } else if (task === WebTask.RANDOM || task === WebTask.RANDOM_ANDROID) {
            return `
                <h1>Check your attachments</h1>
                <ul>
                    <li><strong>Environment Id:</strong> ${request.environmentId}</li>
                    <li><strong>Random Seed:</strong> ${request.randomSeed}</li>
                    <li><strong>Max Events:</strong> ${request.maxEvents}</li>
                </ul>`;
        } else if (task === WebTask.VRT && request.vrtId) {
            return `
                <h1>Check your attachments</h1>
                <ul>
                    <li><strong>Id #1:</strong> ${request.vrtId}</li>
                    <li><strong>Id #2:</strong> ${request.compareVrtId}</li>
                    <li><strong>Environment Id:</strong> ${request.environmentId}</li>
                </ul>`;
        } else {
            let data = fs.readFileSync(`${WebAssets.REPORT}/${request.environmentId}.html`, 'utf-8');
            data += `
                <ul>
                    <li><strong>Environment Id:</strong> ${request.environmentId}</li>
                </ul>`
            return data.toString();
        }
    }

    const imagesAttachments = results.images.map(attachBase64);
    const videosAttachments = results.videos.map(attachBase64);
    const scenariosPath = (results.scenarios || []).map(attachBase64);
    const attachments = imagesAttachments.concat(videosAttachments).concat(scenariosPath);

    const mailObject = {
        to: request.email,
        from: FROM_DEFAULT_EMAIL,
        subject: 'Top Testing Tool Test results',
        html: getHtmlString(request.type),
        attachments: attachments
    };

    console.log(' [x] Sendgrid mail object=%s', JSON.stringify(mailObject, null, 2));

    return sgMail.send(mailObject);
}

init();
