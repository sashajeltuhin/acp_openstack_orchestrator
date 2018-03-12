var http = require('http');
var https = require('https');

exports.postData = function(data, url, port, path, heads, secure, auth, callback) {
    var ds = JSON.stringify(data);

    var headers = heads;
    if (!headers) {
        headers = {
            'Content-Type':'application/json'
        };
    }

    var options = {
        host: url,
        path: path,
        method: 'POST',
        headers: headers,
        rejectUnauthorized: false
    };

    if (port){
        options.port = port;
    }

    if (auth){
        options.auth = auth;
    }

    var mod = http;
    if (secure){
        mod = https;
    }

    // Setup the request.  The options parameter is
    // the object we defined above.
    var req = mod.request(options, function(res) {
        res.setEncoding('utf-8');

        var rs = '';

        res.on('data', function(data) {
            rs += data;
        });

        res.on('end', function() {
            if (callback !== undefined){
                callback(null, rs);
            }
        });
    });

    req.on('error', function(e) {
      var error = processError(e);
        if (callback !== undefined){
            callback(error, null);
        }
    });

    req.write(ds);
    req.end();
}

exports.processError = function(e){
  return processError(e);
}

function processError(e){
  var error;
  console.log("error code", e.errno);
  if (e.code && (e.errno == "ENOTFOUND" || e.errno == "ECONNREFUSED")){
    error = "The URL is invalid, you do not have internet connection or you need VPN to connect"
  }
  else{
    error = e;
  }
  return error;
}

exports.getData = function(url, port, path, heads, secure, auth, callback){
    var options = {
        host: url,
        path: path,
        rejectUnauthorized: false
    };
    if (port){
        options.port = port;
    }

    if (auth){
        options.auth = auth;
    }

    if (heads){
        options.headers = heads;
    }

    var mod = http;
    if (secure){
        mod = https;
    }

    mod.get(options, function(res) {
        res.setEncoding('utf-8');
        var rs = '';
        res.on("data", function(chunk) {
            rs += chunk;
        });
        res.on('end', function() {
            if (callback !== undefined){
                callback(null, rs);
            }
        });
    }).on('error', function(e) {
        var error = processError(e);
        if (callback !== undefined){
            callback(error, null);
        }
    });
}

exports.deleteData = function(url, port, path, heads, secure, callback) {
    var headers = heads;
    if (!headers) {
        headers = {
            'Content-Type':'application/json'
        };
    }

    var options = {
        host: url,
        path: path,
        method: 'DELETE',
        headers: headers,
        rejectUnauthorized: false
    };

    if (port){
        options.port = port;
    }

    var mod = http;
    if (secure){
        mod = https;
    }

    // Setup the request.  The options parameter is
    // the object we defined above.
    var req = mod.request(options, function(res) {
        res.setEncoding('utf-8');

        var rs = '';

        res.on('data', function(data) {
            rs += data;
        });

        res.on('end', function() {
            if (callback !== undefined){
                callback(null, rs);
            }
        });
    });

    req.on('error', function(e) {
      var error = processError(e);
        if (callback !== undefined){
            callback(error, null);
        }
    });
    req.end();
}

exports.downloadfile = function(url, secure, filePath, callback){
    var fs = require('fs');

    var mod = http;
    if (secure){
        mod = https;
    }

    var file = fs.createWriteStream(filePath);
    var request = mod.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(callback); //todo: read file and return the contents
        });
    }).on('error', function(err) {
        fs.unlink(filePath); // Delete the file async. (But we don't check the result)
      var error = processError(err);
        if (callback) {
            callback(error);
        }
    });
}

exports.downloadfilecontent = function(url, callback){
  //Load the request module
  var request = require('request');
//Load fs module
  var fs = require('fs');
  var fse = require('fs-extra');
  var dir = __dirname + '/../app/temp/';
  fse.ensureDir(dir, function (err) {
    if (err){
      callback(err);
    }
    else {
      var unique = new Date().getTime();
      var path = dir + unique;
      var destination = fs.createWriteStream(path);
      //Lets save the modulus logo now
      request(url)
        .on('error', function (error) {
          callback(error)
        }).pipe(destination).on('error', function (error) {
          callback(error);
        }).on('close', function () {
          callback(null, path);
        });
    }
  });
}
