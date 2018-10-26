describe('VRT', function() {

  it('it should take screenshot from url 1', function() {
    browser.reload()
    browser.url('https://losestudiantes.co');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/203e952a-84f0-4b7d-992d-f8b21344f8f2_snapshot_1.png');
  });

  it('it should take screenshot from url 2', function() {
    browser.reload()
    browser.url('https://losestudiantes.co');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/203e952a-84f0-4b7d-992d-f8b21344f8f2_snapshot_2.png');
  });

});
