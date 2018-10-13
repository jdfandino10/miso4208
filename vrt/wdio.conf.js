exports.config = {
  "specs": [
    "./vrt/test/specs/vrt.js"
  ],
  "exclude": [],
  "maxInstances": 10,
  "capabilities": [
    {
      "maxInstances": 5,
      "browserName": "chrome",
      "chromeOptions": {
        "args": [
          "--headless"
        ]
      }
    }
  ],
  "sync": true,
  "logLevel": "verbose",
  "coloredLogs": true,
  "deprecationWarnings": true,
  "bail": 0,
  "screenshotPath": "./errorShots/203e952a-84f0-4b7d-992d-f8b21344f8f2",
  "waitforTimeout": 10000,
  "connectionRetryTimeout": 90000,
  "connectionRetryCount": 3,
  "services": [
    "selenium-standalone"
  ],
  "framework": "jasmine",
  "reporters": [
    "dot",
    "html"
  ],
  "jasmineNodeOpts": {
    "defaultTimeoutInterval": 10000
  },
  "before": function (capabilities, specs) {
  browser.setViewportSize({
    width: 1366,
    height: 768
  });
},
  "baseUrl": "https://losestudiantes.co",
  "reporterOptions": {
    "html": {
      "outFile": "./report/203e952a-84f0-4b7d-992d-f8b21344f8f2.html"
    }
  }
}