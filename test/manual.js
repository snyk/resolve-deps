var resolve = require('../lib');

function main() {
  var target = process.argv[2];
  var options = process.argv[3] || '{}';
  options = JSON.parse(options);

  resolve(target, options).then(function (result) {
    console.log(JSON.stringify(result, null, 2));
  }).catch(function (error) {
    console.log('Error:', error.stack);
  });

};

main();
