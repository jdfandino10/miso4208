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
  "screenshotPath": "./errorShots/68a6321d-167a-4502-9d11-a3ad52bd57ae",
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
      "outFile": "./report/68a6321d-167a-4502-9d11-a3ad52bd57ae.html"
    }
  }
}