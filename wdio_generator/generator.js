const beforeFuncTemplate = `function (capabilities, specs) {
  browser.setViewportSize({
    width: _WIDTH_,
    height: _HEIGHT_
  });
}`

const emptyFunc = 'function () {}';

class Generator {

  constructor() {
    this.baseSpec = {
        specs: [
            './test/specs/**/*.js'
        ],
        // Patterns to exclude.
        exclude: [
            // 'path/to/excluded/files'
        ],
        maxInstances: 10,

        capabilities: [{
            maxInstances: 5,
            //
            browserName: 'chrome',
            chromeOptions: {
              args: [ "--headless", "--disable-gpu", "--window-size=800,600" ]
            }
        }],
        sync: true,
        logLevel: 'verbose',
        coloredLogs: true,
        deprecationWarnings: true,
        bail: 0,
        screenshotPath: './errorShots/',
        waitforTimeout: 10000,
        connectionRetryTimeout: 90000,
        connectionRetryCount: 3,
        services: ['selenium-standalone'],
        framework: 'jasmine',
        reporters: ['dot'],
        jasmineNodeOpts: {
            defaultTimeoutInterval: 10000,
        },

        /**
         * Gets executed before test execution begins. At this point you can access to all global
         * variables like `browser`. It is the perfect place to define custom commands.
         * @param {Array.<Object>} capabilities list of capabilities details
         * @param {Array.<String>} specs List of spec file paths that are to be run
         */
        before: '__BEFORE__FUNC__',
    };
    this.baseCopy = this.baseSpec;
  }

  toString() {
    let str = JSON.stringify(this.baseCopy);
    let fun = emptyFunc;
    if (this.beforeFunc) {
      fun = this.beforeFunc;
    }
    str = str.replace('"__BEFORE__FUNC__"', fun);
    return str;
  }

  setWindowSize(width, height) {
    this.beforeFunc = beforeFuncTemplate.replace('_WIDTH_', width);
    this.beforeFunc = this.beforeFunc.replace('_HEIGHT_', height);
    return this;
  }

  setReporters(reporters) {
    if (!Array.isArray(reporters)) {
      reporters = [reporters];
    }
    this.baseCopy.reporters = reporters;
  }

  setSpecs(specsArr) {
    if (!Array.isArray(specsArr)) {
      specsArr = [specsArr];
    }
    this.baseCopy.spec = specsArr;
    return this;
  }

  setUrl(url) {
    this.baseCopy.baseUrl = url;
    return this;
  }

  setBrowser(browser) {
    let cap = {
        maxInstances: 5,
        browserName: browser,
    };
    if (browser == 'chrome') {
      cap['chromeOptions'] = {
        args: [ "--headless"]
      };
    } else if (browser == 'safari') {
      cap['safari.options'] = {
        args: [ "--headless"]
      };
    } else if (browser == 'firefox') {
      cap['moz:firefoxOptions'] = {
        args: [ "-headless"]
      };
    }
    this.baseCopy.capabilities = [cap];
    return this;
  }

  setCucumber(featuresPath) {
    this.baseCopy.framework = 'cucumber';
    this.baseCopy.reporters = ['spec'];
    this.baseCopy.cucumberOpts = {
        require: [featuresPath],
        backtrace: false,
        compiler: [],
        dryRun: false,
        failFast: false,
        format: ['pretty'],
        colors: true,
        snippets: true,
        source: true,
        profile: [],
        strict: false,
        tags: [],
        timeout: 20000,
        ignoreUndefinedDefinitions: false,
    };
    return this;
  }
}

module.exports = Generator;
