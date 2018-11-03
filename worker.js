const amqp = require('amqplib/callback_api');
const config_generator = require('./wdio_generator/generator');
const fs = require('fs');
const git = require('nodegit');
const Launcher = require('webdriverio').Launcher;
const compare = require('resemblejs').compare;
const exec = require('child_process').execSync;
const sgMail = require('@sendgrid/mail');
const gtmetrix = require ('gtmetrix') ({
    email: 'jg.angel10@uniandes.edu.co',
    apikey: '3a275e13df2b4fb47ec5d47dc6bd71fa'
  });

const gtmetrixLocations=['Canada','UK','Australia','USA','India','Brazil','China'];

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'amqp://localhost';
const REQUEST_QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'testing-request-durable';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_DEFAULT_EMAIL = 'jc.bages10@uniandes.edu.co';

const WebTask = {
    HEADLESS: 'headless-web',
    RANDOM: 'random-web',
    BDT: 'bdt-web',
    VRT: 'vrt-web',
    MUTATION: 'mutation-web',
    USABILITY: 'usability'
};

const WebPath = {
    RANDOM: './random',
    VRT: './vrt',
    GIT: './gitRepos',
    MUTATION: './mutation'
};

const WebAssets = {
    SCREENSHOTS: './errorShots',
    VRT: './vrtShots',
    REPORT: './report',
    MUTATION_REPORT: './reports/mutation/html'
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
        if(request.type==WebTask.MUTATION)
        {
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

    var wdioGenerator;
    var projectPath;
    if(request.type!=WebTask.MUTATION && request.type!=WebTask.USABILITY)
    {
        wdioGenerator = new config_generator();
        projectPath= getProjectPath(request, timestamp, true);
    wdioGenerator.generate(request, projectPath);
        console.log('generated wdio.conf.js!');
    }

    switch (request.type) {
        case WebTask.VRT:
            return runVrtTest(request, timestamp);
        case WebTask.RANDOM:
            return runRandomTest(request, timestamp);
        case WebTask.HEADLESS:
            return runHeadlessTest(request, timestamp);
        case WebTask.BDT:
            return runBdtTest(request, timestamp);
        case WebTask.MUTATION:
            return runMutationWebTest(request, timestamp);
         case WebTask.USABILITY:
            return runUsabilityTest(request, timestamp);
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

function runMutationWebTest(request, timestamp) {
console.log("run mutation");
var projectPath=getProjectPath(request, timestamp);
exec("npm --prefix "+projectPath+" install "+projectPath)
// fs.renameSync("package.json","package.jsonbak");
// fs.copyFileSync(projectPath+"/package.json","package.json");
// exec("npm install");
// fs.unlinkSync("package.json");
// fs.renameSync("package.jsonbak","package.json");
request.projectPath=projectPath;
replaceTemplateTask(request, WebPath.MUTATION + "/stryker.conf");
replaceTemplateTask(request, WebPath.MUTATION + "/karma.conf");
//fs.renameSync(WebPath.MUTATION + "/karma.conf.js",projectPath+ "/karma.conf.js");
//fs.renameSync(WebPath.MUTATION + "/stryker.conf.js",projectPath+ "/stryker.conf.js");
exec("stryker run "+WebPath.MUTATION+"/stryker.conf.js");
return { images: [] };
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
                case "pass":
                    msg+=pass[i];
                    default:
                    msg+=dataLayout[key];
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

    function getHtmlString(task) {
        if(task==WebTask.MUTATION)
            {
                const data = fs.readFileSync(`${WebAssets.MUTATION_REPORT}/.html`, 'utf-8');
                return data.toString();
            } 
        const data = fs.readFileSync(`${WebAssets.REPORT}/index.html`, 'utf-8');
        return data.toString();
    }

    const mailObject = {
        to: request.email,
        from: FROM_DEFAULT_EMAIL,
        subject: 'Top Testing Tool Test results',
        html: getHtmlString(request.WebTask),
        attachments: results.images.map(attachBase64Image)
    };

    console.log(' [x] Sendgrid mail object=%s', JSON.stringify(mailObject, null, 2));

    return sgMail.send(mailObject);
}

init();
