describe('VRT', function() {

  it('it should take screenshot from url 1', function() {
    browser.url('losestudiantes.co');
    // save screenshot to file
    browser.saveScreenshot('./snapshot_1.png');
  });

  it('it should take screenshot from url 2', function() {
    browser.url('losestudiantes.co');
    // save screenshot to file
    browser.saveScreenshot('./snapshot_2.png');
  });

});
