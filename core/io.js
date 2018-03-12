var fs = require('fs');
exports.savePSFile = function(filepath, data, callback){
    fs.writeFile(filepath, data, function (err) {
        if (err) {
            callbacks(err);
        }else {
            callback(null);
        }
    });
}

exports.readFile = function(path, encoding, callback){
  if (!encoding) {
    encoding = 'utf8';
  }
  fs.readFile(path, function (err, data) {
    callback(err, data);
  });

}
