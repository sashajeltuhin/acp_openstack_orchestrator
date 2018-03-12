var fse = require('fs-extra');

exports.saveLic = function(req, res, next){
  console.log(req.file);
  console.log(req.body);
  var f = req.file;
  var name = f.filename + '.lic';
  var dir = __dirname + '/../' + f.destination + '/';
  fse.move(dir + f.filename, dir + name, function (err) {
    if (err){
      next(err);
    }
    else{
      f.filename = name;
      res.send(f);
    }
  });
}
