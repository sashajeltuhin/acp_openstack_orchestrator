var http = require('../core/httpservice');

function auth(uname, pw, url, callback){
    var body = '<aaaLogin inName="' + uname+ '" inPassword="' + pw + '"></aaaLogin>';
    console.log(body);

    postUCSM(body, url, function(err, result){
        var authObj = {};
        if (!err){
            authObj.token = result["aaaLogin"]["$"]["outCookie"];
        }
        else{
            authObj = null;
        }
        if (callback){
            callback(err, authObj);
        }
    });

}

function postUCSM(body, url, callback){
    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    http.postData(body, url, 80, '/nuova', headers, false, null, function (err, result) {
        if (err) {
            callback(err, null);
        }
        else {
            console.log(err, result);
            var parseString = require('xml2js').parseString;
            parseString(result, function (err, result) {

                if (callback){
                    callback(err, result);
                }
            });
        }
    });
}

exports.testAuth = function(req, res, next){
    var uname = req.params.uname;
    var url = req.params.url;
    var pw = req.params.pw;
    auth(uname, pw, url, function(err, result){
        if (err) {
            next('Unable get to auth with UCSM. ' + err);
        }
        else{
            res.send(result);
        }
    })
}

exports.listObj = function(req, res, next){
    var uname = req.params.uname;
    var url = req.params.url;
    var pw = req.params.pw;
    var objname = req.params.objname;
    auth(uname, pw, url, function(err, result){
        if (err) {
            next('Unable get to auth with UCSM. ' + err);
        }
        else if (result.token){
            var body = "<configResolveClass cookie='" + result.token + "' classId='" + objname+ "'/>"; //equipmentChassis
            console.log(body);
            postUCSM(body, url, function(err, result){
                if (err) {
                    next('Unable list objects. ' + err);
                }
                else{
                    res.send(result);
                }
            });
        }
        else{
            res.send(result);
        }
    })

}


exports.getObjInfo = function(req, res, next){
    var uname = req.params.uname;
    var url = req.params.url;
    var pw = req.params.pw;
    var objname = buildObjPath(req.params.objname);

    auth(uname, pw, url, function(err, result){
        if (err) {
            next('Unable get to auth with UCSM. ' + err);
        }
        else if (result.token){
            var body = "<configResolveDn inHierarchical='false' dn='" + objname + "' cookie='" + result.token + "'></configResolveDn>";

            console.log(body);
            postUCSM(body, url, function(err, result){
                if (err) {
                    next('Unable list objects. ' + err);
                }
                else{
                    res.send(result);
                }
            });
        }
        else{
            res.send(result);
        }
    })

}

function buildObjPath(objname){
    if (objname){
        objname = objname.split(',').join('/');
        objname = 'sys/' + objname;
    }
    return objname;
}

exports.addSP = function(req, res, next){
    var uname = req.params.uname;
    var url = req.params.url;
    var pw = req.params.pw;
    var profileName = req.params.sname;
    fqName = "org-root/" + profileName;
    var objname = buildObjPath(req.params.objname);


    auth(uname, pw, url, function(err, result){
        if (err) {
            next('Unable get to auth with UCSM. ' + err);
        }
        else if (result.token){
            var body = "<configConfMos cookie='" + result.token + "' inHierarchical='yes'>\n" +
                "<inConfigs>\n" +
                "<pair key='" + fqName + "'>\n" +
                "<lsServer dn='" + fqname + "' name='" + profileName + "'>\n" +
                "<vnicEther addr='01:02:03:04:05:06' name='vnicfinanceA' switchId='A'>\n" +
                "<vnicEtherIf defaultNet='yes' name='finance'/>\n" +
                "</vnicEther>\n" +
                "<lsbootDef>\n" +
                "<lsbootStorage order='1'>\n" +
                "<lsbootSanImage type='primary'>\n" +
                "<lsbootSanImagePath lun='1' type='primary' vnicName='fc1' wwn='00:00:00:00:00:00:00:10'/>\n" +
                "</lsbootSanImage>\n" +
                "</lsbootStorage>\n" +
                "<lsbootVirtualMedia order='2'/>\n" +
                "<lsbootLan order='3'>\n" +
                "<lsbootLanImagePath type='primary' vnicName='finance'/>\n" +
                "</lsbootLan>\n" +
                "</lsbootDef>\n" +
                "<vnicFc addr='01:02:03:04:05:06:07:8D' name='fc1'>\n" +
                "<vnicFcIf name='primary'/>\n" +
                "</vnicFc>\n" +
                "<lsBinding pnDn='" + objname + "' status='created'/>\n" +
                "</lsServer>\n" +
                "</pair>\n" +
                "</inConfigs>\n" +
                "</configConfMos>";
            console.log(body);
            postUCSM(body, url, function(err, result){
                if (err) {
                    next('Unable list objects. ' + err);
                }
                else{
                    res.send(result);
                }
            });
        }
        else{
            res.send(result);
        }
    })
}