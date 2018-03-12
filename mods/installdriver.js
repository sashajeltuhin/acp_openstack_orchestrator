var jobs = {};
var installmailsettings;
var moment = require('moment');
var creds;


function runInstaller(params, exe, callback){
    console.log("running installer with params", params);
    var spawn = require('child_process').spawn;
    var pathtoexe = exe;
    if(!pathtoexe){
        pathtoexe = 'c:\\Apprenda\\Installer\\Apprenda.Wizard.exe';
    }
    var child = spawn(pathtoexe, params);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(chunk) {
        console.log(chunk);
    });

    child.stderr.on('data',
        function (data) {
            console.log(data);
        }
    );

    child.on('exit', function (exitCode) {
        console.log("Installer finished with error code: " + exitCode);
        if (callback){
            if (exitCode == 0 || exitCode == "0"){
                callback(null, exitCode);
            }
            else{
                callback("Installer finished with error code " + exitCode, exitCode);
            }
        }
    });
}


function getManifestName(baseurl){

    return baseurl + "manifest.xml";
}

function runpsfile(filename, callback){
    var spawn = require("child_process").spawn;
    var child = spawn("powershell.exe",[filename]);
    child.stdout.on("data",function(data){
        console.log("Powershell Data: " + data);
    });
    child.stderr.on("data",function(data){
        console.log("Powershell Errors: " + data);
    });
    child.on("exit",function(){
        console.log("Powershell Script finished");
        callback(null, "done");
    });
    child.stdin.end(); //end input
}

/////////////////////////API///////////////////////////

function getModule(iaas){
  var mod;
  if (iaas == 'os'){
    mod = require('./osdriver');
  }
  else if (iaas == 'sl'){
    mod = require('./softlayerdriver');
  }
  else{
    throw "Not supported";
  }
  return mod;
}

function registerEnv(envObj){
  var key = buildEnvKey(envObj);
  var db = require('../core/mongo');
  db.saveDataObj(null, "envs", envObj, {key:key}, null, function(err, saved){
    if (err){
      console.log("save env state error", err);
    }
  });

  return key;
}

function checkEnv(key, callback){
  var db = require('../core/mongo');
  var f = db.getFilter({'key': key});
  db.load(null, 'envs', f, function (err, data) {
    if (err){
      callback(err);
    }
    else{
      if (data && data.length > 0){
        callback(null, data[0]);
      }
      else{
        callback(null, {});
      }
    }
  });
}

function getCaller(req){
  var h = req.headers["host"];
  if (h.indexOf(":") > 0){
    h = h.split(":")[0];
  }
  return h;
}

function getcallbackurl(req){
  return req.headers['host'] + "/api/vmdone";
}

function getupdateprogressurl(){
  return "/api/updateprogress";
}

exports.getNodeTemplate = function(req, res, next){
  try{
    var bag = req.body;
    var mod = getModule(bag.iaas);
    var serverObj = bag.serverObj;
    var domainObj = bag.domainObj;
    var platformObj = bag.platformObj;
    serverObj.callback = getcallbackurl(req);
    var params = buildTemplateParams(domainObj, platformObj, serverObj);
    mod.getuserdata(serverObj.type, params, function(err, data){
      if (err){
        next(err);
      }
      else{
        var t = {};
        t.str = data;
        res.send(t);
      }
    });
  }
  catch(err){
    next(err);
  }
}


exports.buildSeedTemplate = function(req, res, next){
  try{
    var bag = req.body;
    var mod = getModule(bag.iaas);
    var serverObj = bag.serverObj;
    if (!serverObj.name) {
      serverObj.name = "appseedlin";
    }
    var domainObj = bag.domainObj;
    serverObj.params = buildSeedTemplateParams(domainObj, serverObj, bag);
    mod.getheattemplate('seed', serverObj, function(err, data){
      if (err){
        next(err);
      }
      else{
        var t = {};
        t.str = data;
        res.send(t);
      }
    });
  }
  catch(err){
    next(err);
  }
}

function buildSeedTemplateParams(domainObj, serverObj, bag){
  var postData = "";
  for(var key in bag){
    var val = bag[key];
    if (val && typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'boolean'){
      for(var k in val){
        if (postData){
          postData += "&";
        }
        postData += key + "." + k + "=" + val[k];
      }
    }
    else{
      if (postData){
        postData += "&";
      }
      postData +=  key + "=" + bag[key];
    }
  }
  var params = {};
  params.postData = postData;

  if (domainObj){

    params.domainPass = domainObj.pass;

  }

  if (serverObj){
    if (!params) {
      params = {};
    }
    params.serverName = serverObj.name;
  }

  return params;
}

function buildTemplateParams(domainObj, platformObj, serverObj, job){
  var params = null;
  if (domainObj){
    if (!params) {
      params = {};
    }
    params.domainName = domainObj.name;
    params.domainSuf = domainObj.suf;
    params.domainPass = domainObj.pass;
    params.domainAdmin = domainObj.admin;
    params.dns = domainObj.dcip;
    params.dcname = domainObj.dcname;
  }
  if (platformObj){
    if (!params) {
      params = {};
    }
    params.platformadmin = platformObj.admin;
    params.platformadminpass = platformObj.adminpass;
    params.platformsystem = platformObj.sys;
    params.dbPass = platformObj.dbadminpass;
    params.dbadmin = platformObj.dbadmin;
    params.url = platformObj.url;
    if (params.url && params.url.indexOf('apps.') >= 0){
      params.url = params.url.replace('apps.', '');
    }
    params.repo = platformObj.repo;
    params.ver = platformObj.ver;

  }
  if (serverObj){
    if (!params) {
      params = {};
    }
    params.serverName = serverObj.name;
    params.callback = serverObj.callback;
    params.caller = serverObj.caller;
    params.templateUrl = serverObj.templateUrl;
    params.repouser = serverObj.repouser;
    params.repopass = serverObj.repopass;
  }
  if (job) {
    if (serverObj.type == 'lin'){
      if (job.LM) {
        params.callback = job.LM.name + ":8024/api/vmdone";
      }
    }
    if (serverObj.type == 'sql'){
      params.lmip = job.LM.IP;
      params.instance = job.SQL.instance;
    }
    var id = job._id;
    if (typeof id !== 'string'){
      id = id.toHexString();
    }
    params.jobid = id;
    params.lic = job.lic;
  }
  return params;
}

exports.buildVM = function(req, res, next){
  try{
    var bag = req.body;
    var mod = getModule(bag.iaas);
    var serverObj = bag.serverObj;
    serverObj.callback = getcallbackurl(req);
    var domainObj = bag.domainObj;
    var platformObj = bag.platformObj;
    var envObj = bag.envObj;
    var job = bag.job;
    job.type = "buildvm";
    genJobKey(envObj, platformObj, job, true, function(err, savedjob) {
      if (err) {
        next(err);
      }
      else {
        job = savedjob;
        job.start = moment();
        var id = job._id;
        if (typeof id !== 'string'){
          id = id.toHexString();
        }
        jobs[id] = job;

        serverObj.params = buildTemplateParams(domainObj, platformObj, serverObj, job, req);
        mod.cmdBuildVM(domainObj, platformObj, envObj, serverObj, function (err, result) {
          console.log("added vm", err, result);
          if (err) {
            saveJobState(err, job);
            next("Cannot add VM " + err);
          }
          else {
            saveJobState(null, job);
            res.send(result);
          }
        });
      }
    });
  }
  catch(err){
    next(err);
  }
}

function buildEnvKey(envObj){
  var s = envObj.tid + "." + envObj.uname + "." + envObj.url;
  return new Buffer(s).toString('base64');
}

function genJobKey(envObj, platformObj, job, alwayscreate, callback){
  var s = buildEnvKey(envObj) + "." + platformObj.url + "." + job.type;
  var key = new Buffer(s).toString('base64');
  //checks if the job exists
  var runningJob;
  var db = require('../core/mongo');
  var f = db.getFilter({'key': key});
  db.load(null, 'jobs', f, function(err, data) {
    if (err){
      callback("Cannot load jobs " + err);
    }
    else{
      if (data && data.length > 0){
        var j = data[data.length-1];
        if (j && (job.status == "job-complete" || job.status == "job-failed" || job.status == "job-stopped")){
          runningJob = j;
        }
      }
      if (alwayscreate || !runningJob){
        job.uname = envObj.uname;
        job.key = key;
        db.saveDataObj(null, "jobs", job, null, null, function(err, saved){
          if (err){
            callback("Cannot save job " + err);
          }
          else {
            callback(null, saved, runningJob);
          }
        });
      }
      else{
        callback(null, null, runningJob);
      }
    }
  });
}

exports.loadCachedEnv = function(req, res){
  var key = req.params.key;
  checkEnv(key, function(err, envObj){
    if (err){
      next(err);
    }
    else{
      res.send(envObj);
    }
  });
}

exports.initPlatform = function(req, res, next){
  try{
    var bag = req.body;
    var appdriver = require("./appdevdriver");
    appdriver.auth(bag, function(err, token){
      if (err){
        next(err);
      }
      else{
        var scaleSettings = scaleCache[result];
        res.send({token:token, settings: scaleSettings});
      }
    });
  }
  catch(err){
    next(err);
  }
}

exports.updateScaleSettings = function(req, res, next){
  try{
    var bag = req.body;
    var appdriver = require("./appdevdriver");
    appdriver.auth(bag, function(err, token) {
      if (err){
        next(err);
      }
      else {
        scaleCache[token] = bag;
        res.send({token: token});
      }
    });
  }
  catch(err){
    next(err);
  }
}

exports.getScaleSettings = function(req, res, next){
  try{
    var bag = req.body;
    var appdriver = require("./appdevdriver");
    appdriver.auth(bag, function(err, token) {
      if (err){
        next(err);
      }
      else {
        var bag = scaleCache[bag.token];
        res.send({token: token, settings: scaleSettings});
      }
    });
  }
  catch(err){
    next(err);
  }
}

exports.listObjDetail = function(req, res, next){
  try{
    var bag = req.body;
    var mod = getModule(bag.iaas);

    var envObj = bag.envObj;
    mod.listObjDetail(bag.objname, bag.id, envObj, function(err, data){
      if (err){
        next("Cannot load " + bag.obj +' with id ' +  bag.id, err);
      }
      else{
        res.send(data);
      }
    })
  }
  catch(err){
    next(err);
  }
}

exports.detectAPIVersions = function(req, res, next){
  try {
    var bag = req.body;
    var envObj = bag.envObj;
    var mod = getModule(bag.iaas);
    mod.detectVersions(envObj, function (err, env) {
      if (err) {
        next(err);
      }
      else {
        res.send(env);
      }
    });
  }
  catch(e){
    next(e);
  }
}


exports.initEnv = function(req, res, next){
  try{
    var bag = req.body;
    var mod = getModule(bag.iaas);
    var envObj = bag.envObj;
    var meta = {};

    getinstallermailsettings(function(err, installmailsettings){
      meta.emailsetup = !err && installmailsettings;
    });

    meta.envkey = registerEnv(envObj);

    if (!envObj){
      next("Environment data is not valid");
    }

    meta.status = [];

    mod.listEnvObjects("images", envObj, function (err, im) {
      console.log("image error", err);
      if (err){
        next("Cannot get images " + err);
      }
      else{
        meta.images = im.images;
        mod.listEnvObjects("networks", envObj, function (err, nets) {
          if (err){
            next("Cannot get networks " + err);
          }
          else{
            meta.networks = nets.networks;
            mod.listEnvObjects("flavors", envObj, function (err, fl) {
              if (err){
                next("Cannot get flavors " + err);
              }
              else{
                meta.flavors = fl.flavors;
                mod.listEnvObjects("os-security-groups", envObj, function (err, sg) {
                  if (err){
                    next("Cannot load secgroups " + err);
                  }
                  else{
                    meta.secgroups = sg.security_groups;
                    mod.listEnvObjects("os-floating-ips", envObj, function (err, ips) {
                      if (err){
                        next("Cannot load ips " + err);
                      }
                      else{
                        meta.floaters = ips.floating_ips;
                        mod.listEnvObjects("os-keypairs", envObj, function (err, k) {
                          if (err){
                            next("Cannot load keypairs " + err);
                          }
                          else{
                            meta.keypairs = [];
                            for(var i = 0; i < k.keypairs.length; i++){
                              meta.keypairs.push(k.keypairs[i].keypair);
                            }
                            res.send(meta);
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }

        });
      }
    });
  }
  catch(err){
    next(err);
  }
}

function prepPlatformManifest(job, callback){
  var baseurl = job.platform.url;
  var dir = __dirname + '/../app/';
  var url = "http://" + baseurl;
  var id = job._id;
  if (typeof id !== 'string'){
    id = id.toHexString();
  }
  job.manifest = id + '.xml';
  var manifestFile = dir + job.manifest;
  var sqlnode = job.SQL.name;
  var repopath = job.platform.repo;
  var fse = require('fs-extra');
  var sourceLic = __dirname + "/../uploads/";
  if (!job.platform.lic){
    job.lic = baseurl + '.lic';
    sourceLic = __dirname + '/../app/installscripts/' + job.lic;
  }
  else{
    sourceLic = sourceLic + job.platform.lic;
    job.lic = job.platform.lic;
  }
  fse.copy(sourceLic, dir + job.lic, function (err) {
    if (err){
      callback(err);
    }
    else {
      var licPath = "c:\\builder\\temp\\" + job.lic;
      var xml = buildXml(licPath, sqlnode, job.platform, job.adminObj, job.domain, null, url, job.WINNODES, null, job, repopath);
      var io = require('../core/io');
      io.savePSFile(manifestFile, xml, function (err, d) {
        console.log("manifest built", err);
        if (err) {
          callback(err);
        }
        else {
          callback(null);
        }
      });
    }
  });

}

function buildXml(licfile, sqlnode, platform, adminObj, domain, linux, url, winnodes, linnodes, job, repopath) {

  var winstring = "";
  var linstring = "";
  var linuxBlock = "";
  if (!repopath){
    repopath = "\"" + sqlnode + "\"";
  }

  if (!adminObj.street){
    adminObj.street = "123 St"
  }
  if (!adminObj.city){
    adminObj.city = "New York"
  }
  if (!adminObj.state){
    adminObj.state = "NY";
  }
  if (!adminObj.zip){
    adminObj.zip = "10001";
  }
  if (!adminObj.country) {
    adminObj.country = "USA";
  }

  for (var i = 0; i < winnodes.length; i++){
    var node = winnodes[i];
    winstring +=
      "<Server" +
      " hostName = \"" + node.name + "\">\n" +
      "<Roles >\n" +
      "<Role" +
      " name = \"web\" />\n" +
      "<Role" +
      " name = \"app\" />\n";
    if (i < 3){
      winstring += "<Role" +
        " name = \"coordination\" />\n"
    }
    if (i < 2){
      winstring += "<Role" +
        " name = \"cache\" />\n";
    }
    winstring += "</Roles >\n" +
      "</Server >\n";
  }

  //if (linnodes) {
  //  for (var l = 0; l < linnodes.length; l++) {
  //    var ln = linnodes[l];
  //    linstring += "<Server" +
  //      " hostName = \"" + ln.name + "\">\n" +
  //      "<Roles >\n" +
  //      "<Role" +
  //      " name = \"linux\" / >\n" +
  //      "</Roles >\n" +
  //      "</Server >\n";
  //  }
  //}
  //
  //if (linux) {
  //  linuxBlock = "<LinuxConfig" +
  //    " adminUser = \"root\"" +
  //    " adminPassword = \"" + linux.pass + "\"" +
  //    " elevationMethod = \"su\"" +
  //    " appsRepositoryMount = \"/apprenda/repo/apps\"" +
  //    " systemRepositoryMount = \"/apprenda/repo/sys\"" +
  //    " defaultWorkloadAccount = \"apprenda\"" +
  //    " enableWorkloadAccountAutoCreation = \"true\">\n";
  //}

  var xmlstring =
    "<?xml version=\"1.0\"?>\n" +
    "<ApprendaGridDefinitions xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"" +
    " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"" +
    " xmlns=\"http://schemas.apprenda.com/ApprendaGridDefinitions\"" +
    " xsi:schemaLocation=\"http://schemas.apprenda.com/ApprendaGridDefinitions http://apprenda.com/schemas/platform/6.0/ApprendaGridDefinitions.xsd\">\n" +

    "<ApprendaGrid licenseFilePath=\"" + licfile + "\"";
  xmlstring = xmlstring + " runtimeDriveLetter = \"C\"" +
    " repositoryHost = " + repopath +
    " enforceSslForAllPages = \"false\"" +
    " useApprendaHostFileExtension = \"false\"" +
    " requireSocAuthorization = \"true\"" +
    " pathBasedUrlSubdomain = \"" + platform.basesub + "\">\n" +


    "<CompanyInfo" +
    " name = \"" + adminObj.compname + "\"" +
    " alias = \"" + adminObj.compalias + "\"" +
    " address = \"" + adminObj.street + "\"" +
    " city = \"" + adminObj.city + "\"" +
    " state = \""+ adminObj.state + "\"" +
    " zip = \"" + adminObj.zip + "\"" +
    " country = \"" + adminObj.country + "\"" +
    " phoneNumber = \"\"" +
    " adminFirstName = \"" + adminObj.fname + "\"" +
    " adminLastName = \"" + adminObj.lname + "\"" +
    " adminEmail = \"" + adminObj.email + "\" />\n" +

    "<EmailConfig" +
    " useFreeCloudSolution = \"true\"/>\n" +



    "<WindowsServiceConfig >\n" +
    "<AdminUserAccount >\n" +
    "<UserAccount" +
    " domain = \"" + domain.name + "\"" +

    " username = \"" + platform.admin + "\" />\n" +
    "</AdminUserAccount>\n" +
    "<SystemUserAccount>\n" +
    "<UserAccount" +
    " domain = \"" + domain.name + "\"" +
    " username = \"" + platform.sys + "\" />\n" +
    "</SystemUserAccount>\n" +
    "</WindowsServiceConfig>\n" +


    linuxBlock +

    "<Clouds>\n" +


    "<Cloud" +
    " name = \""  + platform.appcloud + "\"" +
    " description = \"Private cloud\"" +
    " rootUrl = \"" + url + "\"" +
    " cloudType = \"Public\"" +
    " infrastructureProvider = \"My Datacenter\"" +
    " generateSslCertificate = \"true\"" +
    " cachePorts = \"6379\"" +
    " cacheSize = \"512\"" +
    " cachePassword = \"password\">\n" +

    "<Servers>\n" +
    "<Server" +
    " hostName = \"" + job.LM.name + "\">\n" +
    "<Roles>\n" +
    "<Role" +
    " name = \"loadManager\"/>\n" +
    "</Roles>\n" +
    "</Server>\n" +

    winstring +
    linstring +

    "</Servers>\n" +
    "<DatabaseServerInstances>\n" +
    "<DatabaseServerInstance" +
    " name = \""+ sqlnode + "\\sqlexpress\"" +
    " adminUser = \"apprendadbadmin\"" +
    " totalMemoryMB = \"12270\"" +
    " totalCpuMHz = \"27136\"" +
    " totalStorageMB = \"10240\"" +
    " coreServer = \"true\"" +
    " fqdn = \"" + sqlnode + "." + domain.name + "\"/>\n" +
    "</DatabaseServerInstances>\n" +
    "</Cloud>\n" +
    "</Clouds >\n" +
    "</ApprendaGrid >\n" +
    "</ApprendaGridDefinitions >\n";
  return xmlstring;
}

function addNode(tenant, model, jobtype, jobbag, callback){
  var auto = require('./autoscaler');
  var envObj = auto.getEnv(model, tenant);
  if (!envObj) {
    callback("No environment configured for tenant " + tenant, null);
  }
  else {

    var job = {};
    job.progresscb = model.settings.platformObj.progresscb;
    job.url = model.settings.platformObj.url;

    //job.notifyemail = bag.notifyemail;
    job.iaas = envObj.iaas;
    job.jobbag = jobbag;
    job.type = jobtype;
    genJobKey(envObj, model.settings.platformObj, job, true, function(err, savedjob){
      if (err) {
        callback(err);
      }
      else {
        job = savedjob;

        job.start = moment();
        var id = job._id;
        if (typeof id !== 'string'){
          id = id.toHexString();
        }
        jobs[id] = job;
        job.envObj = envObj;
        job.domain = model.settings.domainObj;
        job.platform = model.settings.platformObj;
        job.adminObj = model.settings.adminObj;

        var batch;
        var dupes = [];
        if (jobbag && jobbag.winnodes) {
          job.WINNODES = [];
          for (var i = 0; i < jobbag.winnodes.length; i++) {
            var wo = auto.buildServerObj(model, tenant, 'win');
            wo.name = jobbag.winnodes[i].name;
            wo.tagKey = jobbag.winnodes[i].tagKey;
            wo.os = 'win';
            wo.callback = job.platform.scaleurl;
            if (auto.nodeExists(job.url, wo)){
              dupes.push(wo.name);
            }
            else {
              job.WINNODES.push(wo);
            }
          }
          if (job.WINNODES.length > 0) {
            batch = job.WINNODES;
          }
        }

        if (jobbag && jobbag.linnodes) {
          job.LINNODES = [];
          for (var i = 0; i < jobbag.linnodes.length; i++) {
            var lo = auto.buildServerObj(model, tenant, 'lin');
            lo.name = jobbag.linnodes[i].name;
            lo.tagKey = jobbag.linnodes[i].tagKey;
            lo.os = 'lin';
            lo.callback = job.platform.scaleurl;
            if (auto.nodeExists(job.url, lo)){
              dupes.push(lo.name);
            }
            else {
              job.LINNODES.push(lo);
            }
          }
          batch = job.LINNODES;
        }

        if (batch && batch.length > 0) {
          orchVMs(job, batch, function (err, d) {
            if (err) {
              saveJobState(err, job);
              callback('Unable get to orchestrate. ' + err, null);
            }
            else {
              //try to send the job to the remote scaler
              var r = require("request");
              var headers = {
                'Content-Type': 'application/json; charset=utf-8'
              };
              r({
                url: 'http://' + job.platform.url + ":8024/api/registerjob", //URL to hit
                method: 'POST',
                headers: headers,
                //Lets post the following key/values as form
                json: {job:job, model:model, url:job.platform.url},
                strictSSL: false
              }, function(error, response, body){
                if(error) {
                  callback('Cannot pass the job to the remote env' + error, null);
                } else {
                  callback(null, {key: job.key, msg: "Started adding nodes", nodes: batch});
                }
              });
            }
          });
        }
        else {
          if (dupes){
            var msg = "Following servers are either exist or are in the process of being created: ";
            for (var i=0; i < dupes.length; i++){
              var dup = dupes[i];
              msg += dup + " ";
            }
            callback(msg, null);
          }
          callback('No nodes specified ', null);
        }
      }
    });
  }
}

exports.nodeUp = function(tenant, model, jobtype, jobbag, callback){
  addNode(tenant, model, jobtype, jobbag, callback);
}

exports.nodeDown = function(node, model, envObj, callback){
  var auto = require('./autoscaler');
  var job = {};
  job.type = "deletenode";
  job.url = model.settings.platformObj.url;
  try {
    removeNode(node, model, envObj);
    //if (node.os == "win") {
    //  removeNode(node, model, envObj);
    //}
    //else {
    //  var mod = getModule(envObj.iaas);
    //  mod.cmdDeleteVM(node.vmid, envObj, function (err, r) {
    //    if (err) {
    //      auto.jobdone(err, job, node);
    //    }
    //    else {
    //      onNodeRemoved(node.name, model.settings.domainObj, function (err) {
    //        if (err) {
    //          auto.jobdone(err, job, node);
    //        }
    //        else {
    //          auto.jobdone(null, job, node);
    //        }
    //      })
    //    }
    //  });
    //}
    if (callback){
      callback(null, node);
    }
  }
  catch(ex){
    console.log("deleteNode", ex);
    auto.jobdone(ex, job, node);
  }
}

function removeNode(node, model, envObj){
  var auto = require('./autoscaler');
  var job = {};
  job.type = "deletenode";
  job.url = model.settings.platformObj.url;
  uninstallNode(model.settings.adminObj, node, model.settings.platformObj, envObj, function(err, r){
    if (err){
      auto.jobdone(err, job, node);
    }
    else{
      var mod = getModule(envObj.iaas);
      mod.cmdDeleteVM(node.vmid, envObj, function (err, r) {
        if (err) {
          auto.jobdone(err, job, node);
        }
        else {
          onNodeRemoved(node.name, model.settings.domainObj, function (err) {
            if (err) {
              auto.jobdone(err, job, node);
            }
            else {
              auto.jobdone(null, job, node);
            }
          })
        }
      });
    }
  });
}

function uninstallNode(adminObj, serverObj, platformObj, envObj, callback){
  var url = "http://" + platformObj.url;
  var params = [
    'RemoveNode',
    '-autoRetry',
    '-url', url,
    '-user', adminObj.email,
    '-password', adminObj.pass,
    '-cloud', envObj.appcloud,
    '-hostName', serverObj.name
  ];
  runInstaller(params, platformObj.exepath, callback);
}


function onNodeRemoved(sname, domainObj, callback){
  var psfile = "c:\\cleandns.ps1";
  var pstext = 'Remove-DnsServerResourceRecord -Force -ComputerName "' + domainObj.dcname + '" -ZoneName "'+ domainObj.name + '.' + domainObj.suf + '" -RRType "A" -Name "' + sname + '"';
  var io = require('../core/io');
  io.savePSFile(psfile, pstext, function(err, d){
    if (err){
      callback(err);
    }
    else{
      runpsfile(psfile, function(err, result){
        callback(err, result);
      });
    }
  });
}

exports.updatemodel = function(req, res, next){
  var j = req.body.job;
  var m = req.body.model;
  var url = req.body.url;
  if (m){
    var auto = require('./autoscaler');
    if (req.body.caller){
      m.caller = req.body.caller;
    }
    auto.updateModel(url, m);
    res.send("Got it");
  }
  else{
    next(" Invalid model");
  }
}


exports.registerjob = function(req, res, next){
  var j = req.body.job;
  var m = req.body.model;
  var url = req.body.url;
  if (m){
    var auto = require('./autoscaler');
    if (req.body.caller){
      m.caller = req.body.caller;
    }
    auto.updateModel(url, m);
  }
  if (j && j._id){
    var id = j._id;
    if (typeof id !== 'string'){
      id = id.toHexString();
    }
    jobs[id] = j;
    res.send("Got it");
  }
  else{
    next("Invalid job object");
  }
}

function completeLinuxInstall(job, platformObj, adminObj, domainObj, serverObj, callback){
  onLinuxInstalled(domainObj, serverObj, function(err, result){
    if (!err){
      setTimeout(function () {
        var url = job.type == "buildinfra" ? platformObj.basesub + '.' + platformObj.url : platformObj.url;
        turnOn(adminObj.email, adminObj.pass, url, serverObj.name, function (e) {
          if (e) {
            callback("Unable to turn server on " + err, null);
          }
          else {
            callback(null);
          }
        });
      },30000);
    }
    else{
      callback("Unable to add to DNS " + err, null);
    }
  });
}

function onLinuxInstalled(domainObj, serverObj, callback){
  var pstext = 'Add-DnsServerResourceRecordA -Name "' + serverObj.name + '" -ComputerName "' + domainObj.dcname + '" -ZoneName "' + domainObj.name + '.' + domainObj.suf + '" -AllowUpdateAny -IPv4Address "' + serverObj.IP + '" -TimeToLive 01:00:00 | Out-Null\n';
  var psfile = "c:\\adddns.ps1";
  var io = require('../core/io');
  io.savePSFile(psfile, pstext, function(err, d){
    console.log("add dns file built", err);
    if (err){
      callback(err);
    }
    else{
      runpsfile(psfile, function(e, result){
        callback(e, result);
      });
    }
  });
}


function turnOn(user, pass, url, node, callback){
  var appdriver = require("./appdevdriver");
  var state = "Online";
  appdriver.changeState(user, pass, url, node, state, function(err){
    callback(err);
  });
}

exports.turnon = function(req, res, next){
  var user = req.params.user;
  var pass = req.params.pass;
  var node = req.params.node;
  var url = req.params.url;
  var state = "Online";
  turnOn(user, pass, url, node, function(err, result){
    if (err){
      next("Unable to turn on " + node + err);
    }
    else{
      res.send(result);
    }
  });
}

exports.stopJob = function(req, res, next){
  var job = req.body;
  if (job && job._id && jobs[job._id]){
    var id = job._id;
    if (typeof id !== 'string'){
      id = id.toHexString();
    }
    delete jobs[id];
  }
  job.status = "job-stopped";
  var db = require('../core/mongo');
  db.saveDataObj(null, "jobs", job, null, null, function(err, saved){
    if (err){
      next(err);
    }
    else{
      res.send("ok");
    }
  });
}

function saveJobState(err, job){
  try {
    if (err) {
      job.status = "job-failed";
    }

    if (moment.isMoment(job.start) ) {
      job.starttime = job.start.toDate();
    }
    else{
      job.starttime = job.start;
    }
    var db = require('../core/mongo');
    if (db) {
      db.saveDataObj(null, "jobs", job, null, null, function (err, saved) {
        if (err) {
          console.log("save job state error", err);
        }
      });
    }
  }
  catch(err){
    console.log(err);
  }
}

function convertSeedBodyToBag(body){
  var bag = {}
  for(var key in body){
    if (key.indexOf('.') > 0) {
      var ar = key.split('.');
      if (ar && ar.length > 1) {
        var objname = ar[0];
        var fieldname = ar[1];
        if (!bag[objname]) {
          bag[objname] = {};
        }
        bag[objname][fieldname] = body[key];
      }
    }
    else{
      bag[key] = body[key];
    }
  }
  return bag;
}

exports.buildInfraFromSeed = function(req, res, next){
  try {
    var bag = convertSeedBodyToBag(req.body);
    var mod = getModule(bag.iaas);
    var domainObj = bag.domainObj;
    var platformObj = bag.platformObj;
    var envObj = bag.envObj;
    var job = {};
    job.notifyemail = bag.notifyemail;
    job.install = bag.install;
    job.iaas = bag.iaas;
    job.type = "buildinfraseed";
    genJobKey(envObj, platformObj, job, false, function(err, saved, running) {
      if (err){
        next(err);
      }
      else if (running) {
        res.send({key: job.key, msg: "Job Exists", status: "error", job: running});
      }
      else {
        job = saved;
        job.status = "Initialized";
        job.start = moment();
        var id = job._id;
        if (typeof id !== 'string'){
          id = id.toHexString();
        }
        jobs[id] = job;

        var dc = envObj.datacenter;

        job.envObj = envObj;
        if (domainObj && bag.dcObj) {
          domainObj.dcname = bag.dcObj.name;
        }
        job.domain = domainObj;
        job.platform = platformObj;
        job.adminObj = bag.adminObj;

        job.LM = bag.lmObj;
        job.LM.type = "lm";
        job.LM.callback = getcallbackurl(req);
        job.LM.caller = getCaller(req);

        job.SQL = bag.sqlObj;
        job.SQL.type = "sql";
        job.SQL.callback = getcallbackurl(req);
        job.SQL.caller = getCaller(req);

        job.WINNODES = [];
        for (var i = 0; i < bag.winnum; i++) {
          var wo = JSON.parse(JSON.stringify(bag.winObj));
          var nameNum = Number(i) + 1;
          wo.type = "win";
          wo.name = bag.winObj.name + nameNum;
          wo.callback = getcallbackurl(req);
          wo.caller = getCaller(req);
          job.WINNODES.push(wo);
        }

        if (bag.linObj && bag.linnum && Number(bag.linnum) > 0) {
          job.LINNODES = [];
          for (var i = 0; i < bag.linnum; i++) {
            var lo = JSON.parse(JSON.stringify(bag.linObj));
            var nameNum = Number(i) + 1;
            lo.type = "lin";
            lo.name = bag.linObj.name + nameNum;
            lo.callback = getcallbackurl(req);
            lo.caller = getCaller(req);
            job.LINNODES.push(lo);
          }
        }

        prepPlatformManifest(job, function (err) {
          if (err) {
            saveJobState(err, job);
            next('Unable to save Install Manifest. ' + err);
          } else {
            if (job.domain.dcip) {
              //dc exists, orchestrate other machines
              console.log("DC exists", job.domain.dcip);
              var batch = [];
              batch.push(job.SQL);
              for (var i = 0; i < job.WINNODES.length; i++) {
                batch.push(job.WINNODES[i]);
              }
              orchVMs(job, batch, function (err, d) {
                if (err) {
                  saveJobState(err, job);
                  next('Unable get to orchestrate. ' + err);
                }
                else {
                  saveJobState(null, job);
                  res.send({key: job.key, msg: "Orchestration started", job: job});
                }
              });
            }
            else {
              console.log("Install from scratch");
              job.DC = bag.dcObj;
              job.DC.start = moment();
              job.DC.type = "dc";
              job.DC.callback = getcallbackurl(req);
              job.DC.params = buildTemplateParams(domainObj, platformObj, job.DC, job);
              mod.cmdBuildVM(job.domain, job.platform, job.envObj, job.DC, function (err, result) {
                console.log("DC kicked off", err, result);
                if (err) {
                  next('Unable get to create DC VM. ' + err);
                }
                else {
                  job.DC.vmid = result.id;
                  saveJobState(null, job);
                  res.send({key: job.key, msg: "Orchestration started", job: job});
                }
              });
            }
          }
        });
      }
    });
  }
  catch(err){
    next(err);
  }
}

exports.buildInfra = function(req, res, next){
  try {
    var bag = req.body;
    var mod = getModule(bag.iaas);
    var domainObj = bag.domainObj;
    var platformObj = bag.platformObj;
    var envObj = bag.envObj;
    var job = {};
    job.notifyemail = bag.notifyemail;
    job.install = bag.install;
    job.iaas = bag.iaas;
    job.type = "buildinfra";
    console.log('buildinfra', bag);
    genJobKey(envObj, platformObj, job, false, function(err, saved, running) {
      if (err){
        next(err);
      }
      else if (running) {
        res.send({key: job.key, msg: "Job Exists", status: "error", job: running});
      }
      else {
        job = saved;
        job.status = "Initialized";
        job.start = moment();
        var id = job._id;
        if (typeof id !== 'string'){
          id = id.toHexString();
        }
        jobs[id] = job;

        var dc = envObj.datacenter;

        job.envObj = envObj;
        if (domainObj && bag.dcObj) {
          domainObj.dcname = bag.dcObj.name;
        }
        job.domain = domainObj;
        job.platform = platformObj;
        job.adminObj = bag.adminObj;

        job.LM = bag.lmObj;
        job.LM.type = "lm";
        job.LM.callback = getcallbackurl(req);
        job.LM.caller = getCaller(req);

        job.SQL = bag.sqlObj;
        job.SQL.type = "sql";
        job.SQL.callback = getcallbackurl(req);
        job.SQL.caller = getCaller(req);

        job.WINNODES = [];
        for (var i = 0; i < bag.winnum; i++) {
          var wo = JSON.parse(JSON.stringify(bag.winObj));
          var nameNum = Number(i) + 1;
          wo.type = "win";
          wo.name = bag.winObj.name + nameNum;
          wo.callback = getcallbackurl(req);
          wo.caller = getCaller(req);
          job.WINNODES.push(wo);
        }

        if (bag.linObj && bag.linnum && Number(bag.linnum) > 0) {
          job.LINNODES = [];
          for (var i = 0; i < bag.linnum; i++) {
            var lo = JSON.parse(JSON.stringify(bag.linObj));
            var nameNum = Number(i) + 1;
            lo.type = "lin";
            lo.name = bag.linObj.name + nameNum;
            lo.callback = getcallbackurl(req);
            lo.caller = getCaller(req);
            job.LINNODES.push(lo);
          }
        }

        prepPlatformManifest(job, function (err) {
          if (err) {
            saveJobState(err, job);
            next('Unable to save Install Manifest. ' + err);
          } else {
            if (job.domain.dcip) {
              //dc exists, orchestrate other machines
              console.log("DC exists", job.domain.dcip);
              console.log("Starting LM orchestration now");
              job.LM.start = moment();
              job.LM.params = buildTemplateParams(job.domain, job.platform, job.LM, job);
              job.LM.params.manifest = job.manifest;
              mod.cmdBuildVM(job.domain, job.platform, job.envObj, job.LM, function (err, result) {
                console.log("LM kicked off", err, result);
                if (err) {
                  saveJobState(err, job);
                  next('Unable get to create LM VM. ' + err);
                }
                else {
                  saveJobState(null, job);
                  res.send({key: job.key, msg: "Orchestration started", job: job});
                }
              });
            }
            else {
              console.log("Install from scratch");
              job.DC = bag.dcObj;
              job.DC.start = moment();
              job.DC.type = "dc";
              job.DC.callback = getcallbackurl(req);
              job.DC.params = buildTemplateParams(domainObj, platformObj, job.DC, job);
              mod.cmdBuildVM(job.domain, job.platform, job.envObj, job.DC, function (err, result) {
                console.log("DC kicked off", err, result);
                if (err) {
                  next('Unable get to create DC VM. ' + err);
                }
                else {
                  job.DC.vmid = result.id;
                  saveJobState(null, job);
                  res.send({key: job.key, msg: "Orchestration started", job: job});
                }
              });
            }
          }
        });
      }
    });
  }
  catch(err){
    next(err);
  }
}

function orchVMs(job, list, callback){
  var mod = getModule(job.iaas);

  var i = 0;
  var e = "";
  if (list && list.length > 0) {
    spinUpVM(mod, i, job, list, e, callback);
  }
  else{
    callback("No servers configured", null);
  }
}

function spinUpVM(mod, i, job, batch, e, callback){
  var serverObj = batch[i];
  serverObj.start = moment();
  serverObj.params = buildTemplateParams(job.domain, job.platform, serverObj, job);
  mod.cmdBuildVM(job.domain, job.platform, job.envObj, serverObj, function (err, result) {
    console.log('spin up complete for ' + serverObj.name, err, result);
    i++;
    if (err){
      e += err;
    }
    else if (result){
      serverObj.vmid = result.id;
    }
    if (i == batch.length){
      if (!e){
        callback(null, {msg: "Done"});
      }
      else {
        callback(e, null);
      }
    }
    else{
      spinUpVM(mod, i, job, batch, e, callback);
    }
  });
}


exports.vmbuilt = function(req, res, next){
  try {
    var feedback = require('./feedback');
    var serverName = req.params.sname;
    var externalIP = req.params.extIP;
    var internalIP = req.params.localIP;
    var role = req.params.role;
    var jobid = req.params.jobid;
    if (jobid && jobs[jobid] && jobs[jobid].type == 'buildvm') {
      getinstallermailsettings(function(err, installmailsettings) {
        if (!err && installmailsettings && jobs[jobid].data && jobs[jobid].notifyemail) {

          var mailer = require('./mailer');
          mailer.sendMail("Apprenda VM built", installmailsettings.from, jobs[jobid].notifyemail, "VM is ready ", installmailsettings.smtp, installmailsettings.smtpport, installmailsettings.emailadmin, installmailsettings.emailpass, false, function (err, r) {
            console.log("Mailed", err, r);
          });
        }
      });
      delete jobs[job];
    }
    else {
      var timestamp = new Date();
      var job = jobs[jobid];
      console.log('VM is built at ' + timestamp, serverName, externalIP, internalIP, role, jobid);
      var answer = "Got It";
      if (!job) {
        answer = "Job with key " + jobid + " not found";
        res.send(answer);
      }
      else {
        if (role == "dc") {
          job.DC.installed = true;
          job.DC.end = moment();
          job.DC.life = moment.duration(job.DC.end.diff(job.DC.start)).asSeconds();
          feedback.notify('EV_VM_BUILT', job._id, job.DC);
          job.domain.dcip = internalIP;
          console.log("Starting LM orchestration");
          var mod = getModule(job.iaas);
          job.LM.start = moment();
          job.LM.params = buildTemplateParams(job.domain, job.platform, job.LM, job);
          job.LM.params.manifest = job.manifest;
          mod.cmdBuildVM(job.domain, job.platform, job.envObj, job.LM, function (err, result) {
            console.log("LM kicked off", err, result);
            if (err) {
              next('Unable get to create LM VM. ' + err);
            }
            else {
              job.LM.vmid = result.id;
              answer = "Orchestration started";
            }
          });

        }
        else if (role == "sql" && job.SQL) {
          job.SQL.installed = true;
          job.SQL.IP = internalIP;
          job.SQL.end = moment();
          job.SQL.life = moment.duration(job.SQL.end.diff(job.SQL.start)).asSeconds();
          console.log("SQL life ", job.SQL.life);
          if (!job.platform.repo) {
            job.platform.repo = internalIP;
            console.log("Registering SQL and repo ip", internalIP);
          }
          else {
            console.log("Using pre-defined repo", job.platform.repo);
          }
        }
        else if (role == "lm" && job && job.LM) {
          job.LM.installed = true;
          job.LM.IP = internalIP;
          job.LM.end = moment();
          job.LM.life = moment.duration(job.LM.end.diff(job.LM.start)).asSeconds();
          feedback.notify('EV_VM_BUILT', job._id, job.LM);
          var batch = [];
          batch.push(job.SQL);
          for (var i = 0; i < job.WINNODES.length; i++){
            batch.push(job.WINNODES[i]);
          }
          orchVMs(job, batch, function (err, result) {
            if (err) {
              next("Orchestration of VMs failed", err);
            }
            else {
              answer = "LM built and the rest of the orchestration is kicked off";
              var mod = getModule(job.iaas);
              mod.assignExternalIP(job.LM.externalIP, job.envObj, job.LM.vmid, function (err, r) {
                if (err) {
                  answer = answer + " External IP was not associated. You may need to assign manually and install the platform thereafter";
                }
              });
            }
          });
        }
        else if (role == "win" && job) {
          var ready = true;
          var winnode;
          for (var i = 0; i < job.WINNODES.length; i++) {
            if (job.WINNODES[i].name.toLowerCase() == serverName.toLowerCase()) {
              winnode = job.WINNODES[i];
              job.WINNODES[i].installed = true;
              job.WINNODES[i].IP = internalIP;
              job.WINNODES[i].end = moment();
              job.WINNODES[i].life = moment.duration(job.WINNODES[i].end.diff(job.WINNODES[i].start)).asSeconds();
              feedback.notify('EV_VM_BUILT', job._id, job.WINNODES[i]);
            }
            else if (!job.WINNODES[i].installed){
              ready = false;
            }
          }
          if (ready) {
            if (!job.LINNODES || job.LINNODES.length == 0) {
              job.status = "job-complete";
            }

            if (job.type == "addnode" || job.type == "scalenode"){
              addWinNode(job, winnode);
            }
          }
          if (job.progresscb) {
            var web = require('../core/httpservice');
            var status = {
              id: 'EV_VM_BUILT',
              key: job._id,
              job: job,
              status: "success",
              msg: "Windows server " + winnode.name + " is built and added to the platform."
            };
            if (ready){
              status.msg += " All Windows nodes are ready to use";
            }
            web.postData(status, job.progresscb, 80, getupdateprogressurl(), null, false, null, function (err, result) {
                console.log('response:', err);
            });

          }
        }
        else if (role == "lin" && job) {
          var linnode;
          for (var i = 0; i < job.LINNODES.length; i++) {
            if (job.LINNODES[i].name.toLowerCase() == serverName.toLowerCase()) {
              linnode = job.LINNODES[i];
              break;
            }
          }

          if (!linnode){
            answer = "Linux node " + linnode + " cannot be found in the job definition";
          }
          else {
            linnode.IP = internalIP;
            completeLinuxInstall(job, job.platform, job.adminObj, job.domain, linnode, function (err) {
              if (err) {
                answer = "Linux node " + linnode + " failed to initialize";
                var web = require('../core/httpservice');
                var status = {
                  id: 'EV_VM_BUILT',
                  key: job._id,
                  job: job,
                  status: "error",
                  msg: "Linux server  " + linnode.name + " not initialized"
                };
                if (job.progresscb) {
                  web.postData(status, job.progresscb, 80, getupdateprogressurl(), null, false, null, function (err, result) {
                    console.log('response:', err);
                  });
                }
              } else {
                answer = "Linux node " + linnode + " initialized";
                linnode.installed = true;
                linnode.end = moment();
                linnode.life = moment.duration(linnode.end.diff(linnode.start)).asSeconds();
                var ready = true;
                for (var i = 0; i < job.LINNODES.length; i++) {
                  if (!job.LINNODES[i].installed) {
                    ready = false;
                    break;
                  }
                }

                var web = require('../core/httpservice');
                var status = {
                  id: 'EV_VM_BUILT',
                  key: job._id,
                  job: job,
                  status: "success",
                  msg: "Linux server " + linnode.name + " is built and added to the platform."
                };

                if (ready) {
                  job.status = "job-complete";
                  console.log("job complete with type", job.type);
                  status.msg += " All Linux nodes are ready to use";
                  if (job.type !== "buildinfra") {
                    var auto = require('./autoscaler');
                    auto.jobdone(null, job, linnode);
                  }
                }
                if (job.progresscb) {
                  web.postData(status, job.progresscb, 80, getupdateprogressurl(), null, false, null, function (err, result) {
                    console.log('response:', err);
                  });
                }

                feedback.notify('EV_VM_BUILT', job._id, linnode);
              }
            });
          }
        }

        if (role !== "lin" && isReadyForPlatformInstall(job)) {
          job.end = moment();
          job.life = moment.duration(job.end.diff(job.start)).asSeconds();
          job.status = "infra-complete";
          getinstallermailsettings(function(err, installmailsettings) {
            if (!err && installmailsettings && job.notifyemail) {
              var mailer = require('./mailer');
              mailer.sendMail("Platform Orchestrator", installmailsettings.from, job.notifyemail, "Platform is ready to be installed", installmailsettings.smtp, installmailsettings.smtpport, installmailsettings.emailadmin, installmailsettings.emailpass, false, function (err, r) {
                console.log("Mailed", err, r);
              });
            }
          });
          //ready to kickoff installer
          if (job.install) {
            feedback.notify('EV_INSTALL_START', job._id);
            console.log("invoking remote install from LM using IP", job.LM.externalIP);
            job.progresscb = req.headers['host'];
            invokeRemotePlatformInstall(job, job.LM.externalIP, function (err, ri) {
              if (err) {
                saveJobState(err, job);
                next("remote install failed" + err);
              }
              else {
                job.status = ri.status;
                saveJobState(null, job);
                res.send(ri);
              }
            });
          }
          else//must respond to the last box and trigger the install from it
          {
            feedback.notify('EV_INSTALL_READY', job._id);
            console.log("responding to the last built windows box to initiate the install using internal IP of the load manager");
            res.send("installs");
          }
        }
        else {
          res.send(answer);
        }
      }
    }
  }
  catch(err){
    next("failed to process VM complete request" + err);
  }

}

function isReadyForPlatformInstall(job){
  if (!job || job.status == "infra-complete" || job.status == "install-complete" || !job.LM || !job.SQL || !job.WINNODES){
    return false;
  }
  var ready = true;
  if (!job.LM.installed){
    return false;
  }

  if (!job.SQL.installed){
    return false;
  }

  for (var i = 0; i < job.WINNODES.length; i++){
    if (!job.WINNODES[i].installed){
      ready = false;
      break;
    }
  }

  return ready;
}

function addWinNode(job, serverObj){
  setTimeout(function () {
    installWinNode(job.adminObj, serverObj, job.platform, job.envObj, function(err, code){
      console.log("AddNode finished with code", code, err);
      var auto = require('./autoscaler');
      auto.jobdone(err, job, serverObj);
    });
  }, 90000);
}

function installWinNode(adminObj, serverObj, platformObj, envObj, callback){
  var url = "http://" + platformObj.url;
  var params = [
    'AddNode',
    '-y',
    '-autoRepair',
    '-url', platformObj.url,
    '-user', adminObj.email,
    '-password', adminObj.pass,
    '-cloud', envObj.appcloud,
    '-hostName', serverObj.name,
    '-roles', 'web,app'
  ];
  runInstaller(params, platformObj.exepath, callback);
}


exports.updateRemoteProgress = function(req, res, next){
  var status = req.body;
  if (jobs[status.key]){
    //update the job
    if (status.job){
      jobs[status.key] = status.job;
    }
    var feedback = require('./feedback');
    var job = jobs[status.key];
    var err;
    if (status.status == "error"){
      err = status.msg;
    }
    saveJobState(err, job);
    //{id:'EV_INSTALL_COMPLETE',key:job.key,status:"success",msg:"Installer completed. Checking for linux requirements"};
    feedback.notify('EV_INSTALL_READY', status.key, status);
    getinstallermailsettings(function(err, installmailsettings){
      if (!err && installmailsettings && job.notifyemail) {
        var mailer = require('./mailer');
        mailer.sendMail("Platform Orchestrator", installmailsettings.from, job.notifyemail, status.msg, installmailsettings.smtp, installmailsettings.smtpport, installmailsettings.emailadmin, installmailsettings.emailpass, false, function (err, r) {
          console.log("Mailed", err, r);
        });
      }
    });

  }
  res.send({});
}

function invokeRemotePlatformInstall(job, ip, callback){
  var web = require('../core/httpservice');
  console.log('invoking remote install', ip);
  web.postData(job, ip, 8024, '/api/kickoff', null, false, null, function (err, result) {
    callback(err, result);
  });
}

exports.completeLMinstall = function(req, res, next){
  runpsfile("c:\\builder\\temp\\arrinstall.ps1", function(err, result) {
    if (err) {
      next("Error running LM postinit script", err);
    }
    else {
      res.send(result);
    }
  });
}

exports.installPlatform = function(req, res, next){
  var job = req.body;
  jobs[job._id] = job;
  runpsfile("c:\\builder\\temp\\arrinstall.ps1", function(err, result){
    if (err){
      next("Error running LM postinit script", err);
    }
    else {
      if (!job){
        next("Job data does not exists", err);
      }
      else {
        var manfile = "c:\\builder\\temp\\" + job.manifest;

        var params = [
          'Install',
          '-y',
          '-autoRepair',
          '-allowRestart',
          '-autoRetry',
          '-inputFile', manfile,
          '-tenantPassword', job.adminObj.pass,
          '-windowsAdminPassword', job.platform.adminpass,
          '-windowsSystemPassword', job.platform.adminpass,
          '-cachePasswords', job.platform.appcloud + '=' + job.adminObj.pass,
          '-sqlPasswords', job.SQL.name + '\\sqlexpress=' + job.platform.dbadminpass
        ];
        job.status = "install-started";
        res.send({status: job.status});
        console.log("Running installer with params ", params);
        //first ensure that all boxes have rebooted. wait 2 min.//todo: better let win boxes to notify of the completed reboot
        setTimeout(function () {
          runInstaller(params, null, function(err, result){
            if (!err){
              job.status = "install-complete";
              var web = require('../core/httpservice');
              if (job.progresscb) {
                var status = {
                  id: 'EV_INSTALL_COMPLETE',
                  key: job._id,
                  status: "success",
                  msg: "Installer completed. Checking for linux requirements"
                };
                web.postData(status, job.progresscb, 80, getupdateprogressurl(), null, false, null, function (err, result) {

                });
              }
              var batch = job.LINNODES;
              var appdriver = require("./appdevdriver");
              var url = job.platform.basesub + '.' + job.platform.url;
              appdriver.addDockerProps(url, job.adminObj.email, job.adminObj.pass, function(err){
                console.log("addDockerProps", err);
              });

              var auto = require("./autoscaler");
              var autostr = auto.serializeSettings(job);
              var io = require('../core/io');
              var dir = __dirname + '/../../temp/';
              io.savePSFile(dir + "autosettings", autostr, function (err) {
                console.log("autostring serialized", err);
              });


              orchVMs(job, batch, function(e, r){

              });
            }
            else{
              var web = require('../core/httpservice');
              job.status = "job-failed";
              if (job.progresscb) {
                var status = {
                  id: 'EV_INSTALL_COMPLETE',
                  key: job._id,
                  status: "error",
                  msg: "Installer failed with code " + result
                };
                web.postData(status, job.progresscb, 80, getupdateprogressurl(), null, false, null, function (err, result) {

                });
              }
            }
          });
        }, 120000);

      }
    }
  });
}


exports.installemailsettings = function(req, res){
  var bag = req.body;
  bag.type = "installer";
  var db = require('../core/mongo');
  db.saveDataObj(null, 'mailsettings', bag, {'type': 'installer'}, null, function (err, saved) {
    installmailsettings = saved;
  });

  res.send({});
}

exports.loadinstallermail = function(req, res, next){
  getinstallermailsettings(function(err, data){
    if (err){
      next(err);
    }
    else{
      res.send(data);
    }
  })
}

function getinstallermailsettings(callback){
  if (!installmailsettings){
    var db = require('../core/mongo');
    var f = db.getFilter({'type': 'installer'});
    db.load(null, 'mailsettings', f, function(err, data) {
      if (err) {
        callback(err, null);
      }
      else if (data && data.length > 0) {
        installmailsettings = data[0];
        callback(null, installmailsettings);
      }
    });
  }
  else{
    if (callback){
      callback(null, installmailsettings);
    }
  }
}

exports.getjobstatus = function(req, res, next){
  var jobid = req.params.key;
  var db = require('../core/mongo');
  var f = db.getFilter({_id:jobid});
  db.load(null, 'jobs', f, function(err, data) {
    if (err) {
      next("Unable to load jobs " + err);
    }
    else {
      if (data && data.length > 0){
        res.send(data[0]);
      }
      else{
        next("Job with provided ID does not exist");
      }

    }
  });
}

exports.listJobs = function(req, res, next){
  var db = require('../core/mongo');
  db.load(null, 'jobs', {}, function(err, data) {
    if (err) {
      next("Unable to load jobs " + err);
    }
    else {
      res.send(data);
    }
  });
}

exports.installApp = function(req, res, next){
  var body = req.body;
  var packageUrl = body.appurl;
  //download
  //call apprenda API to upload the archive in the publish stage
  //developer/api/v1/versions/
  //success = patchApp(appAlias, "v1", appFile, stage, "patch");
  //getClient(bypassSSL).target(url).path(path).queryParam("action", action).queryParam("stage", stage)
  //  .request(MediaType.APPLICATION_JSON).header("ApprendaSessionToken", ApprendaSessionToken)
  //  .post(Entity.entity(fileInStream, MediaType.APPLICATION_OCTET_STREAM));
}

exports.addonInstalled = function(req, res, next){
  try {
    var addonName = req.params.addon;
    var serverName = req.params.serverName;
    var internalIP = req.params.ip;
    var os = req.params.os;
    var emails = req.params.emails;
    //add to DNS
    if (emails !== 'none' && creds) {
      var CoreDb = require('../core/core-db');

      var db = new CoreDb(creds.dbname, creds.dbadmin, creds.dbpass);

      db.getAddon(addonName, function(err, recordset){
        if (err){
          next(err);
        }
        else {
          if (recordset && recordset.length > 0) {
            var addon = {};
            addon.AddonID = recordset[0].AddonID;
            db.getAddonProps(addon.AddonID, function (err, props) {
              if (err) {
                next(err);
              }
              else {
                if (props && props.length > 0) {
                  for (var i = 0; i < props.length; i++) {
                    var key = props[i].Key;
                    var val = props[i].Val;
                    addon[key] = val;
                  }

                  addon.emailadminuser = creds.emailadminuser;
                  addon.emailpass = creds.emailpass;

                  var msg = "Addon  " + addonName + " is installed on server " + serverName;
                  if (!err){
                    msg = msg + " and is ready to use";
                  }else{
                    msg = msg + ", but there were errors." + err;
                  }
                  var mailer = require('./mailer');
                  mailer.sendMail("Service " + addonName + " Created", addon.fromemail, emails, msg, addon.smtp, addon.smtpport, addon.emailadminuser, addon.emailpass, false, function(err, r){
                    console.log("Mailed", err, r);
                    res.send('ok');
                  });
                }
              }
            });
          }
        }
      });

    }
    else {
      res.send('ok');
    }
  }
  catch(e){
    next(e);
  }
}

exports.setCreds = function (emailadminuser, emailpass, dbname, dbadmin, dbpass){
  if (!creds){
    creds = {};
    creds.emailadminuser = emailadminuser;
    creds.emailpass = emailpass;
    creds.dbname = dbname;
    creds.dbadmin = dbadmin;
    creds.dbpass = dbpass;
  }
}

exports.orchestrate = function(req, res, next){
  var obj = req.body;
  console.log("orch", obj);
  var mod = getModule(obj.iaas);
  var serverObj = {};
  serverObj.type = obj.type;
  serverObj.name = obj.servername;
  serverObj.imageid = obj.imageRef;
  serverObj.flavorid = obj.flavorRef;
  serverObj.secgroup = obj.secgroup;
  serverObj.key = obj.key;
  serverObj.templateUrl = obj.templateUrl;
  serverObj.apptenant = obj.apptenant;
  serverObj.networkid = obj.networkid;
  serverObj.options = obj.options;
  serverObj.dbname = obj.dbname;
  serverObj.spass = obj.spass;
  serverObj.callback = obj.callback;
  serverObj.emails = obj.emails;

  var envObj = {};
  envObj.tid = obj.tid;
  envObj.url = obj.osUrl;
  envObj.uname = obj.uname;
  envObj.upass = obj.upass;
  envObj.tid = obj.tid;
  envObj.clength = obj.clength == "true";
  envObj.ssl = obj.authUrl == "https";
  envObj.authurl = obj.osUrl;

  var domainObj = {};
  domainObj.domainName = obj.domainname;
  domainObj.domainSuf = obj.domainsuf;
  domainObj.dcip = obj.dcip;

  serverObj.params = buildServerParams(serverObj, envObj, domainObj);
  var installer = require('./installdriver');
  installer.setCreds(obj.emailadminuser, obj.emailpass, obj.appdbname, obj.dbadmin, obj.dbpass);

  mod.cmdBuildVM(null, null, envObj, serverObj, function(err, result){
    console.log('orch build vm', err, result);
    if (err) {
      next('Unable add VM. ' + err);
    }
    else{
      res.send(result);
    }
  });
}

function buildServerParams(serverObj, envObj, domainObj){
  var params = null;
  if (envObj){
    if (!params) {
      params = {};
    }
    params.uname = envObj.uname;
    params.upass = envObj.upass;
  }

  if (serverObj){
    if (!params) {
      params = {};
    }
    params.serverName = serverObj.name;
    params.emails = serverObj.emails;
    if (!params.emails){
      params.emails = 'none';
    }
    params.callback = serverObj.callback;
    params.spass = serverObj.spass;
    params.templateUrl = serverObj.templateUrl;
    params.dbname = serverObj.dbname ?  serverObj.dbname : serverObj.apptenant + 'DB';
    params.apptenant = serverObj.apptenant;
  }
  if (domainObj){
    params.domainName = domainObj.domainName;
    params.domainSuf = domainObj.domainSuf;
    params.dcip = domainObj.dcip;
  }

  return params;
}

exports.loadAutoSettings = function(req, res, next){
  try{
    var io = require('../core/io');
    var dir = __dirname + '/../../temp/';
    io.readFile(dir + "autosettings", null, function(err, data){
      var obj = {};
      if (err){
        obj.error = err;
      }
      else{
        obj.data = JSON.parse(data);
      }
      res.send(obj);
    });
  }
  catch(e){
    next(e);
  }
}




