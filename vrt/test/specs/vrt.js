describe('VRT', function() {

  it('it should take screenshot from url 1', function() {
    browser.reload()
    browser.url('https://twitter.com');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/b71345ef-dafa-4a08-9b89-f68e136943e6_snapshot_1.png');
  });

  it('it should take screenshot from url 2', function() {
    browser.reload()
    browser.url('https://twitter.com');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/b71345ef-dafa-4a08-9b89-f68e136943e6_snapshot_2.png');
  });

});
