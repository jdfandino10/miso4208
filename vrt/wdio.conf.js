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
  "screenshotPath": "./errorShots/",
  "waitforTimeout": 10000,
  "connectionRetryTimeout": 90000,
  "connectionRetryCount": 3,
  "services": [
    "selenium-standalone"
  ],
  "framework": "jasmine",
  "reporters": [
    "dot"
  ],
  "jasmineNodeOpts": {
    "defaultTimeoutInterval": 10000
  },
  "before": function (capabilities, specs) {
  browser.setViewportSize({
    width: 500,
    height: 500
  });
},
  "baseUrl": "https://twitter.com"
}