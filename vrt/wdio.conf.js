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
  "screenshotPath": "./errorShots/3ab02ffa-04e4-44fb-87ec-87c161ea1e80",
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
    width: 1000,
    height: 1000
  });
},
  "baseUrl": "https://losestudiantes.co",
  "reporterOptions": {
    "html": {
      "outFile": "./report/3ab02ffa-04e4-44fb-87ec-87c161ea1e80.html"
    }
  }
}