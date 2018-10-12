describe('VRT', function() {

  it('it should take screenshot from url 1', function() {
    browser.url('https://twitter.com');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/eb08833f-b395-4d64-b1ab-b1c2d7595b4c_snapshot_1.png');
  });

  it('it should take screenshot from url 2', function() {
    browser.url('https://twitter.com');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/eb08833f-b395-4d64-b1ab-b1c2d7595b4c_snapshot_2.png');
  });

});
