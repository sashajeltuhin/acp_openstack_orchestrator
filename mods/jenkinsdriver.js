
exports.testJenk = function(req, res, next){
    var url = req.params.url;
    var user = req.params.user;
    var usertoken = req.params.usertoken;
    var jobname = req.params.jobname;
    var jobtoken = req.params.jobtoken;
    startJob (url, user, usertoken, jobname, jobtoken, function(err, result){
        if (err){
            next(err);
        }
        else{
            res.send(result);
        }
    });

}
exports.startJob = function(url, jobname, jobtoken, callback){
  startJob (url, jobname, jobtoken, callback);
}

function startJob (url, jobname, jobtoken, callback){
  console.log("startjenkinsJob", url, jobname, jobtoken);
  var job = jobname.split(" ").join("%20");
  var path = '/job/' + job + '/build?token=' + jobtoken;
  console.log("startjenkinsJob", url, path);

  var r = require("request");

  r({
    url: url + path,
    method: 'GET',
    strictSSL: false
  }, function(err, response, body){
    console.log('jenk response', err, body);
    callback(err, response, body);
  });

}
