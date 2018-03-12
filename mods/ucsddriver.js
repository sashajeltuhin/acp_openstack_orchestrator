var http = require('../core/httpservice');
//40FE227A2BF142168FDD52B5F9B68739

exports.testGet = function(req, res, next){
    var key = req.params.key;
    var url = req.params.url;
    var oper = req.params.oper;
    getUCSD(url, key, oper, null, function(err, result){
        if (err) {
            next('Unable get from UCSD. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.startworkflow = function(req, res, next){
    var key = req.params.key;
    var url = req.params.url;
    var oper = "userAPISubmitWorkflowServiceRequest";
    getUCSD(url, key, oper, function(err, result){
        if (err) {
            next('Unable get from UCSD. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

function postUCSD(body, url, key, oper, callback){
    var headers = {
        'X-Cloupia-Request-Key': key
    };

    http.postData(body, url, 80, '/app/api/rest?formatType=json&opName' + oper, headers, false, null, function (err, result) {
        if (err) {
            callback(err, null);
        }
        else {
            console.log(err, result);
            if (callback){
                callback(err, result);
            }
        }
    });
}

function getUCSD(url, key, oper, data, callback){
    var headers = {
        'X-Cloupia-Request-Key': key
    };
    var opData = data ? "$opData=" + data + "'" : "&opData={}";

    http.getData(url, 80, '/app/api/rest?formatType=json&opName=' + oper + opData, headers, false, null, function (err, result) {
        if (err) {
            callback(err, null);
        }
        else {
            console.log(err, result);
            if (callback){
                callback(err, result);
            }
        }
    });
}