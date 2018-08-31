console.log('main js ok');

$('#testForm').submit(function () {
  var selectedEnvs = $('input:checked');
  console.log(selectedEnvs);
  var stringEnvs = "";
  selectedEnvs.each((index, elem) => {
    console.log(elem);
    stringEnvs += elem.value + " - ";
  });
  stringEnvs = stringEnvs.substring(0, stringEnvs.length - 3);

  $.ajax({
        // Your server script to process the upload
        url: '/testupload',
        type: 'POST',

        // Form data
        data: new FormData($('form')[0]),

        // Tell jQuery not to process data or worry about content-type
        // You *must* include these options!
        cache: false,
        contentType: false,
        processData: false,

        // Custom XMLHttpRequest
        xhr: function() {
            var myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                // For handling the progress of the upload
                myXhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        console.log(e.loaded);
                    }
                } , false);
            }
            return myXhr;
        },
        success: function(res) {
          console.log(res);
        }
    });
 return false;
});
