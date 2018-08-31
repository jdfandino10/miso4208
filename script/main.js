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
  var testEnv = {

  };
 $.post('/testupload', testEnv, function(data) {
   console.log(data);
 });
 return false;
});
