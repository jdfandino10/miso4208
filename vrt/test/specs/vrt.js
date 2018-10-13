describe('VRT', function() {

  it('it should take screenshot from url 1', function() {
    browser.reload()
    browser.url('https://losestudiantes.co');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/3ab02ffa-04e4-44fb-87ec-87c161ea1e80_snapshot_1.png');
  });

  it('it should take screenshot from url 2', function() {
    browser.reload()
    browser.url('https://losestudiantes.co');
    // save screenshot to file
    browser.saveScreenshot('./vrtShots/3ab02ffa-04e4-44fb-87ec-87c161ea1e80_snapshot_2.png');
  });

});
