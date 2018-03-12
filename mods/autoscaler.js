var scaleLog = {};
var osclient = require('./osdriver');
var mailer = require('./mailer');
var creds = {};
var modelCache = {};
var timers = {};
var scalestateCache = {};
//model = {service:{state:'on', interval:30000},settings:{}, stats:{win:{}, lin:{}, tags:{"tagKey": {id: id, name:name, val:val, tagKey:"name:val", sname: 'lin-scale'}}, tenants:[]}, envs: [{tenant: tenantAlias, url:url, tid:tid, uname:uname, pw:pw}]};
//scalestate = {cats:{name:'win', nodes:[]}, progress:{nodes:[]}}

//platformObj.dbname
//platformObj.dbadmin
//platformObj.dbadminpass
//platformObj.url
//adminObj.email;
//adminObj.pass;

function shouldProxy(req, url){
  var h = req.headers["host"];
  if (h.indexOf(":") > 0){
    h = h.split(":")[0];
  }
  var m = getCachedModel(url);
  var result = !!(m && m.settings && h !== url);
  return result;
}

function proxyToRemote(req, url, action, method, json, callback){
  //try to send the job to the remote scaler
  var r = require("request");
  var headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  var b = {
    url: 'http://' + url + ":8024/api/" + action, //URL to hit
    method: method,
    headers: headers,
    strictSSL: false
  }
  if (json){
    b.json = json;
    if (req) {
      b.json.caller = req.headers["host"];
    }

  }
  r(b, function(error, response, body){
    if (error && error.errno == "ECONNREFUSED"){
      callback("ECONNREFUSED", response, null)
    }
    else if (response && response.statusCode == 500){
      var b = body;
      if (b && b.error){
        b = b.error;
      }
      callback(b, response, null);
    }
    else{
      var e =  error;
      if (error && error.error){
        e = error.error;
      }
      callback(e, response, body);
    }
  });
}

function reportFromProxy(url, action, method, json, callback){
  var r = require("request");
  var headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  var b = {
    url: 'http://' + url + "/api/" + action, //URL to hit
    method: method,
    headers: headers,
    strictSSL: false
  }
  if (json){
    b.json = json;
  }
  r(b, function(error, response, body){
    if (response && response.statusCode == 500){
      callback(body, response, null);
    }
    else{
      callback(error, response, body);
    }
  });
}



exports.testscale = function(req, res, next){
    var dbname = req.params.dbname.replace('@', '\\');
    var pw = req.params.upass;
    var sname = req.params.sname;
    creds.domainpw = req.params.domainpw;
    creds.pw = req.params.pw;
    creds.emailadminuser = req.params.emailadminuser;
    creds.emailpass = req.params.emailpass.split('^').join('/');
    creds.apipass = req.params.apipass;
    scaleLog.dbname = dbname;
    scaleLog.pw = pw;
    scaleLog.uname = "sa";
    console.log("testscale called", dbname, pw, sname);
    checkStats(dbname, "sa", pw, sname, function(err, data){
        if (err) {
            console.log('responding to client', err);
            next('Unable test scale. ' + err);
        }
        else{
            console.log('responding to client', data);
            res.send(data);
        }
    });
}

exports.loadModel = function(url, callback){
  return loadModel(url, callback);
}

exports.getEnv = function(m, tenant){
  return getEnv(m, tenant);
}

function setCachedModel(url, m){
  modelCache[url] = m;
}

function getCachedModel(url){
  return modelCache[url];
}

function loadModel(url, callback){
  var m = getCachedModel(url);
  if (!m || !m.settings || !m.settings.platformObj || !m.envs){
    var db = require('../core/mongo');
    var f = db.getFilter({'settings.platformObj.url': url});
    db.load(null, 'settings', f, function(err, data){
      if (err){
        callback(err, null);
      }
      else if (data && data.length > 0){
        m = data[0];
        setCachedModel(url, m);
        if (!m.service){
          m.service = {state:'off', interval:30000};
        }
        isModelValid(m);
        callback(null, m);
      }
      else{
        deserializeSettings(url, function(err, mod){
          console.log("deserializeSettings", err, mod);
          if (err){
            callback(err);
          }
          else {
            //updatemodel
            db.saveDataObj(null, 'settings', mod, null, null, function (err, saved) {
              setCachedModel(url, saved);
              callback(null, saved);
            });
          }
        });
      }
    });
  }
  else{
    if (!m.service){
      m.service = {state:'off', interval:30000};
    }
    isModelValid(m);
    callback(null, m);
  }
}

function getCachedState(url){
  return scalestateCache[url];
}

function setCachedState(url, s){
  scalestateCache[url] = s;
}

function loadState(url, callback){
  var st = getCachedState(url);
  if (!st){
    var db = require('../core/mongo');
    var f = db.getFilter({'url': url});
    console.log('loading state');
    db.load(null, 'scalestate', f, function(err, data){
      if (err){
        callback(err, null);
      }
      else if (data && data.length > 0){
        st = data[0];
        setCachedState(url, st);
        callback(null, st);
      }
      else{
        st = {url: url, farm:{'win':{nodes:[]}, 'lin':{nodes:[]}}, progress:{nodesadd:{nodes:[]}, nodesdelete:{nodes:[]}}};
        setCachedState(url, st);
        callback(null, st);
      }
    });
  }
  else{
    callback(null, st);
  }
}

function isModelValid(m){
  var valid = m && isPlatformObjValid(m) && m.settings.adminObj && isDomainObjValid(m) && m.envs.length > 0;
  m.valid = valid;
  m.remoteDB = canCallRemoteDB(m);
  return valid;
}

function isPlatformObjValid(m){
  return !!(m.settings.platformObj && m.settings.platformObj.url && m.settings.platformObj.dbname && m.settings.platformObj.dbadmin
    && m.settings.platformObj.dbadminpass && m.settings.platformObj.repo && m.settings.platformObj.admin && m.settings.platformObj.adminpass &&
    m.settings.platformObj.sys && m.settings.platformObj.scaleurl);
}

function canCallRemoteDB(m){
  return m.settings.platformObj && m.settings.platformObj.url && m.settings.platformObj.dbname && m.settings.platformObj.dbadmin
    && m.settings.platformObj.dbadminpass;
}

function isDomainObjValid(m){
  return !!(m.settings.domainObj && m.settings.domainObj.name && m.settings.domainObj.suf && m.settings.domainObj.dcname && m.settings.domainObj.admin &&
    m.settings.domainObj.pass);
}

exports.updateModel = function(url, m){
  setCachedModel(url, m);
}

function getEnv(m, tenant){
  var env;
  if (m && m.envs) {
    if (tenant) {
      for (var i = 0; i < m.envs.length; i++) {
        if (m.envs[i].tid == tenant) {
          env = m.envs[i];
          break;
        }
      }
    }
    else if(m.envs.length > 0){
      env = m.envs[0];
    }
  }
  return env;
}

function findEnvByAppTenant(m, tenant){
  var env;
  if (m && m.envs) {
    if (tenant) {
      for (var i = 0; i < m.envs.length; i++) {
        if (m.envs[i].apptenants && m.envs[i].apptenants.indexOf(tenant) >= 0) {
          env = m.envs[i];
          break;
        }
      }
    }
    else if(m.envs.length > 0){
      env = m.envs[0];
    }
  }
  return env;
}


exports.buildServerObj = function (m, tenant, type){
  return buildServerObj(m, tenant, type);
}

function buildServerObj(m, tenant, type){
  var serverObj = {};
  serverObj.type = type;
  var env = getEnv(m, tenant);
  if (env){
    if (type == 'win'){
      serverObj.imageid = env.imageidwin;
      serverObj.flavorid = env.flavoridwin;
      serverObj.ram = env.winram;
      serverObj.cpu = env.wincpu;
    }
    else{
      serverObj.imageid = env.imageidlin;
      serverObj.flavorid = env.flavoridlin;
      serverObj.ram = env.linram;
      serverObj.cpu = env.lincpu;
      serverObj.templateUrl = env.templateUrlLin;
      serverObj.repouser = env.repouserlin;
      serverObj.repopass = env.repopasslin;
    }
    serverObj.iaastenant = env.tid;
    serverObj.networkid = env.networkid;
    serverObj.auto = true;  //mark node as created by the autoscaler and make it eligeable for future removal
    if (serverObj.tagKey && env.secgroupmaps){
      for(var i = 0; i < env.secgroupmaps.length; i++){
        var g = env.secgroupmaps[i];
        if (g.secgroup == serverObj.tagKey){
          serverObj.secgroup = g.secgroup;
          break;
        }
      }
    }

    if (!serverObj.secgroup) {
      serverObj.secgroup = env.secgroup;
    }
    serverObj.key = env.key;
  }
  return serverObj;
}

function validateStats(m){
  if (m.stats.win && m.stats.win.up && m.stats.win.down){
    if (m.stats.win.down < m.stats.win.up){
      throw "Windows thresholds are invalid. Scale-up cannot exceed scale-down value";
    }
  }
  if (m.stats.lin && m.stats.lin.up && m.stats.lin.down){
    if (m.stats.lin.down < m.stats.lin.up){
      throw "Linux thresholds are invalid. Scale-up cannot exceed scale-down value";
    }
  }
  if (m.stats.tags){
    for(var t in m.stats.tags){
      if (m.stats.tags[t] && m.stats.tags[t].up && m.stats.tags[t].down){
        if (m.stats.tags[t].down < m.stats.tags[t].up){
          throw "Thresholds for custom property " + t + " are invalid. Scale-up cannot exceed scale-down value";
        }
      }
    }
  }
}

exports.savesettings = function(req, res, next){
  try{
    var bag = req.body;
    var obj = {};
    obj.token = bag.token;
    obj.platformObj = bag.model.settings.platformObj;
    obj.adminObj = bag.model.settings.adminObj;
    var appdriver = require("./appdevdriver");
    appdriver.auth(obj, function(err, token){
      if (err){
        next(err);
      }
      else{
        if (bag.model){
          validateStats(bag.model);
          if (!bag.model.settings.adminObj.pass){
            bag.model.settings.adminObj.pass = obj.adminObj.pass;
          }
          //update scale state url
          loadState(obj.platformObj.url, function(err){
            console.log('scalestate updated', err);
          });
          var db = require('../core/mongo');
          //update scaleurl
          if (bag.model.settings.platformObj.lmip){
            bag.model.settings.platformObj.scaleurl = "http://" + bag.model.settings.platformObj.lmip + ":8024/api/vmdone";
          }
          if (!bag.model.caller){
            bag.model.caller = req.headers["host"];
          }
          bag.model.settings.platformObj.progresscb = req.headers['host'];
            db.saveDataObj(null, 'settings', bag.model, null, null, function(err, saved){
            if (err){
              next("unable to save settings", err);
            }
            else{
              var m = saved;
              setCachedModel(obj.platformObj.url, m);
              isModelValid(m);
              //push to remote orchestrator
              if (shouldProxy(req, obj.platformObj.url)) {
                proxyToRemote(req, obj.platformObj.url, "updatemodel", "POST", {
                  job: null,
                  url: obj.platformObj.url,
                  model: m
                }, function (e, response, body) {
                  if (e){
                    next(e);
                  }
                  else{
                    res.send({token: token, model: m});
                  }
                });
              }
              else{
                res.send({token: token, model: m});
              }
            }
          });
        }
        else{
          next("Invalid model");
        }
      }
    });
  }
  catch(err){
    next(err);
  }
}

exports.getstats = function(req, res, next){
   var bag = req.body;
  if(bag.model){
    setCachedModel(bag.url, bag.model);
  }
  loadModel(bag.url, function(err){
    if(err){
      next(err);
    }
    else {
      if (shouldProxy(req, bag.url)) {
        loadState(bag.url, function (err, state) {
          if (err) {
            next(err);
          }
          else {
            bag.state = state;
            var m = getCachedModel(bag.url);
            bag.model = m;
            proxyToRemote(req, m.settings.platformObj.url, "getstats", 'POST', bag, function (e, r, body) {
              if (e) {
                next(e);
              }
              else {
                bucketToState(body.bucket, bag.url, null);
                updateStateBucket(bag.url, state, body.bucket, null);
                checkforStaleProgress(bag.url);
                saveScaleState(bag.url);
                res.send(state);
              }
            });
          }
        });
      }
      else {
        setCachedState(bag.url, bag.state);
        getutilbucket(bag.url, function (err, bucket) {
          if (err) {
            next(err);
          }
          else {
            res.send(bucket);
          }
        });
      }
    }
  });
}

function checkforStaleProgress(url){
  var st = getCachedState(url);
  for(var i = 0; i < st.farm['win'].nodes.length; i++){
    var existing = st.farm['win'].nodes[i];
    for(var ii = 0; ii < st.progress.nodesadd.nodes.length; ii++){
      var progressNode = st.progress.nodesadd.nodes[ii];
      if (progressNode.name == existing.name){
        existing.vmid = progressNode.vmid;
        existing.tagKey = progressNode.tagKey;
        existing.auto = progressNode.auto;
        console.log("stale progress found", existing);
        st.progress.nodesadd.nodes.splice(ii, 1);
        break;
      }
    }
  }

  for(var i = 0; i < st.farm['lin'].nodes.length; i++){
    var existing = st.farm['lin'].nodes[i];
    for(var ii = 0; ii < st.progress.nodesadd.nodes.length; ii++){
      var progressNode = st.progress.nodesadd.nodes[ii];
      if (progressNode.name == existing.name){
        existing.vmid = progressNode.vmid;
        existing.tagKey = progressNode.tagKey;
        existing.auto = progressNode.auto;
        existing.iaastenant = progressNode.iaastenant;
        console.log("stale progress found", existing);
        st.progress.nodesadd.nodes.splice(ii, 1);
        break;
      }
    }
  }
}

function updateServer(url, server){
  if (server) {
    var st = getCachedState(url);
    var list = server.os == 'win' ? st.farm['win'].nodes : st.farm['lin'].nodes;
    for (var i = 0; i < list.length; i++) {
      var existing = list[i];
      if (existing.name == server.name) {
        existing.vmid = server.vmid;
        console.log("existing server updated", existing);
        break;
      }
    }
  }
}

exports.updateServerState = function(req, res, next){
  try{
    var bag = req.body;
    updateServer(bag.url, bag.server);
    saveScaleState(bag.url, function(err, saved){
      if (err){
        next("Cannot update state " + err);
      }
      else{
        res.send("Ok");
      }
    })
  }
  catch(err){
    next("Cannot update state " + err);
  }
}

function saveScaleState(url, callback){
  var st = getCachedState(url);
  var m = getCachedModel(url);
  if (!st.url){
    st.url = m.settings.platformObj.url;
  }
  var db = require('../core/mongo');
  db.saveDataObj(null, 'scalestate', st, null, null, function(err, saved){
    if (!err){
      st = saved;
      setCachedState(url, st);
    }
    if (callback){
      callback(err, st);
    }
  });
}


function getutilbucket(url, callback){
  try{
      loadModel(url, function(err, m){
        if (canCallRemoteDB(m)){
          getStats(m.settings.platformObj, m.stats.tags, null, function (err, bucket) {
            callback(err, bucket);
          });
        }
        else{
          callback(" Model incomplete", null);
        }
      });
  }
  catch(err){
    callback(err);
  }
}

exports.getsettings = function(req, res, next){
  try{
    var bag = req.body;
    var appdriver = require("./appdevdriver");
    appdriver.auth(bag, function(err, token){
      if (err){
        next(err);
      }
      else{
        loadModel(bag.platformObj.url, function(err, m){
          if (err){
            next("Unable to get model settings", err);
          }
          else{
            res.send({token: token, model: m});
          }
        });
      }
    });
  }
  catch(err){
    next(err);
  }
}

exports.loadCustomProps = function(req, res, next){
  var bag = req.body;
  if(bag.model){
    setCachedModel(bag.url, bag.model);
  }
  loadModel(bag.url, function(err) {
    if (err) {
      next(err);
    }
    else {
      var url = bag.url;
      if (shouldProxy(req, url)) {
        //pass the model
        var m = getCachedModel(url);
        var b = {};
        b.url = url;
        b.model = m;
        proxyToRemote(req, m.settings.platformObj.url, "loadCustomProps", 'POST', b, function (e, r, body) {
          if (e) {
            next(e);
          }
          else {
            res.send(body);
          }
        })
      }
      else {
        var b = req.body;
        var m = b.model;
        if (b && m) {
          setCachedModel(url, m);
          if (b.caller) {
            m.caller = b.caller;
          }
        }
        else if (!m) {
          m = getCachedModel(url);
          if (b.caller) {
            m.caller = b.caller;
          }
        }
        if (!canCallRemoteDB(m)) {
          next(" Model is not complete to call remote DB");
        }
        else {
          var CoreDb = require('../core/core-db');
          var platformObj = m.settings.platformObj;
          var db = new CoreDb(platformObj.dbname, platformObj.dbadmin, platformObj.dbadminpass);
          db.loadCustomProps(null, function (err, props) {
            if (err) {
              next(err);
            }
            else {
              res.send(props);
            }
          });
        }
      }
    }
  });
}

exports.loadTenants = function(req, res, next){
  var bag = req.body;
  var url =  bag.url;
  if(bag.model){
    setCachedModel(bag.url, bag.model);
  }
  loadModel(bag.url, function(err) {
    if (err) {
      next(err);
    }
    else {
      if (shouldProxy(req, url)) {
        //pass the model
        var m = getCachedModel(url);
        var b = {};
        b.url = url;
        b.model = m;
        proxyToRemote(req, m.settings.platformObj.url, "loadTenants", 'POST', b, function (e, r, body) {
          if (e) {
            next(e);
          }
          else {
            res.send(body);
          }
        })
      }
      else {
        var b = req.body;
        var m = b.model;
        if (b && m) {
          setCachedModel(url, m);
          if (b.caller) {
            m.caller = b.caller;
          }
        }
        else if (!m) {
          m = getCachedModel(url);
          if (b.caller) {
            m.caller = b.caller;
          }
        }
        if (!canCallRemoteDB(m)) {
          next(" Model is not complete to call remote DB");
        }
        else {
          var CoreDb = require('../core/core-db');
          var platformObj = m.settings.platformObj;
          var db = new CoreDb(platformObj.dbname, platformObj.dbadmin, platformObj.dbadminpass);
          db.loadTenants(function (err, tenants) {
            if (err) {
              next(err);
            }
            else {
              res.send(tenants);
            }
          });
        }
      }
    }
  });
}

exports.checkStats = function(dbname, uname, pw, sname, callback){
    checkStats(dbname, uname, pw, sname, callback);
}

exports.addNode = function(req, res, next){
  try {
    var bag = req.body;
    loadModel(bag.url, function(err, m){
      if (!m || !m.settings || !m.settings.platformObj || !m.settings.adminObj){
        next("Autoscaler m doesn't not exist. Configure first");
      }
      else {
        var inst = require('./installdriver');
        inst.nodeUp(bag.iaastenant, m, "addnode", bag.jobbag, function(err, response){
          if (err){
            next(err);
          }
          else{
            //register nodes with scale state as in progress
            registerNodes(response.nodes, bag.iaastenant, true, m.settings.platformObj.url);
            res.send(response);
          }
        });
      }
    });
  }
  catch(err){
    next('Unable to add nodes ' + err);
  }
}

exports.ensureCapacity = function(req, res, next){
  try {
    var obj = req.body;
    var tag = obj.tag;   //tagname:val}
    var os = obj.os; //os type
    var url = obj.url;
    var pw = obj.pw;
    var uname = obj.uname;
    var callbackjob = obj.cbjob;
    var jobtoken = obj.jobtoken;
    var jenkurl = obj.jenkurl;
    var apptenant = obj.apptenant;
    if (url.indexOf('https://') >=0){
      url = url.replace('https://', "");
    }
    if (url.indexOf('http://') >=0){
      url = url.replace('http://', "");
    }
    console.log("ensureCapacity", obj, url);
    //use app tenant to lookup env preferences
    loadModel(url, function(err, m){
      if (err || !m){
        next(" Model does not exist " + err);
      }
      else {
        if (shouldProxy(req, url)){
          loadState(url, function(err, state){
            if (err){
              next(err);
            }
            else {
              var bag = {};
              bag.url = url;
              bag.state = state;
              bag.model = m;
              proxyToRemote(req, url, "getstats", 'POST', bag, function (e, r, body) {
                if (e) {
                  next(e);
                }
                else {
                  var iaastenant = findEnvByAppTenant(m, apptenant);
                  bucketToState(body.bucket, url, iaastenant);
                  updateStateBucket(url, state, body.bucket, iaastenant);
                  saveScaleState(url);
                  CIup (state, m, obj, function(err, data){
                    if (err){
                      next(err);
                    }
                    else{
                      res.send(data);
                    }
                  });
                }
              });
            }
          });
        }
        else {
          var m = getCachedModel(url);
          var platformObj = m.settings.platformObj;
          var iaastenant = findEnvByAppTenant(m, apptenant);
          getStats(platformObj, m.stats.tags, iaastenant, function (err, state) {
            if (err) {
              next("Unable to check capacity " + err);
            }
            CIup (state, m, obj, function(err, data){
              if (err){
                next(err);
              }
              else{
                res.send(data);
              }
            });
          });
        }
      }
    });
  }
  catch(err){
    next(err);
  }
}

function getStateBucket(state, tid){
  if (tid && state.buckets && state.buckets[tid]){
    return state.buckets[tid];
  }
  else{
    return state.bucket;
  }
}

function updateStateBucket(url, state, bucket, tid){
  var m = getCachedModel(url);
  if (!tid || m.envs.length <= 1){
    state.bucket = bucket;
  }
  else{
    if (!state.buckets){
      state.buckets = {};
    }
    state.buckets[tid] = bucket;
  }
}

function scaleup(m, state, os, tid, tag, callback){
  var inst = require('./installdriver');
  var jobbag = {};
  if (tag) {
    jobbag.tag = tag;
  }
  var server = {};

  if (os == 'lin'){
    jobbag.linnodes = [];
    jobbag.linnodes.push(server); //has to come from model.stats
  }
  else{
    jobbag.winnodes = [];
    jobbag.winnodes.push(server);
  }

  var name = "";
  if (tag && m.stats.tags && m.stats.tags[tag]){
    name = m.stats.tags[tag].sname;
  }
  else if (m.stats[os]){
    name = m.stats[os].sname;
  }

  server.name = name + state.farm[os].nodes.length;
  if (tag){
    server.tagKey = tag;
  }

  inst.nodeUp(tid, m, 'scalenode', jobbag, function(err, r){
    if (err) {
      callback(err);
    }
    else {
      //register nodes with scale state as in progress
      registerNodes(r.nodes, tid, true, m.settings.platformObj.url);
      callback(null, {msg: "Resources lacking. Scaling up...."});
    }
  });
  return server.name;
}

function CIup (state, m, obj, callback){
  try {
    var tag = obj.tag;   //tagname:val}
    var os = obj.os; //os type
    var callbackjob = obj.cbjob;
    var jobtoken = obj.jobtoken;
    var jenkurl = obj.jenkurl;
    var apptenant = obj.apptenant;
    var env = findEnvByAppTenant(m, apptenant);
    if (!env){
      callback("No environment configured for tenant " + apptenant);
    }
    var iaastenant = env.tid;
    console.log("capacity check m.stats:", m.stats);
    var check = checkCapacity(getStateBucket(state, iaastenant), m.stats, m, tag, os, iaastenant);
    console.log("capacity check returned:", check);
    var list = os == "win" ? check.tags.winup : check.tags.linup;
    if (list.indexOf(tag) >= 0) {//need to spin up VM
      var inst = require('./installdriver');
      var jobbag = {};
      jobbag.jenkurl = jenkurl;
      jobbag.callbackjob = callbackjob;
      jobbag.jobtoken = jobtoken;
      jobbag.tag = tag;
      var server = {};

      if (os == 'lin') {
        jobbag.linnodes = [];
        jobbag.linnodes.push(server); //has to come from model.stats
      }
      else {
        jobbag.winnodes = [];
        jobbag.winnodes.push(server);
      }

      var name = "";
      if (m.stats.tags && m.stats.tags[tag]) {
        name = m.stats.tags[tag].sname;
      }
      else if (m.stats[os]) {
        name = m.stats[os].sname;
      }

      server.name = name + state.farm[os].nodes.length;
      if (tag) {
        server.tagKey = tag;
      }
      server.iaastenant = iaastenant;
      console.log("ci up jobbag", jobbag);
      inst.nodeUp(iaastenant, m, 'cinode', jobbag, function (err, r) {
        if (err) {
          callback(err);
        }
        else {
          //register nodes with scale state as in progress
          registerNodes(r.nodes, server.iaastenant, true, m.settings.platformObj.url);
          callback(null, {msg: "Resources lacking. Scaling up...."});
        }
      });
    }
    else {
      var jenkdriver = require('./jenkinsdriver.js');
      jenkdriver.startJob(jenkurl, callbackjob, jobtoken, function (err, r) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, {msg: "Resources available. The Build job kicked off"});
        }
      });
    }
  }
  catch(e){
    callback(e);
  }
}


function bucketToState(bucket, url, tid){
  var st = getCachedState(url);
  for(var i = 0; i < bucket.WINNODES.length; i++){
    var serverObj = bucket.WINNODES[i];
    updateServerState(serverObj, 'win', bucket.WINNODES, st);
  }
  for(var i = 0; i < bucket.LINNODES.length; i++){
    var serverObj = bucket.LINNODES[i];
    updateServerState(serverObj, 'lin', bucket.LINNODES, st);
  }
  var m = getCachedModel(url);
  if (!tid || m.envs.length <= 1) {
    st.bucket = bucket;
  }
  else{
    if (!st.buckets){
      st.buckets = {};
    }
    st.buckets[tid] = bucket;
  }
}

function updateServerState(serverObj, cat, list, st){
  var s;
  for(var i = 0; i < st.farm[cat].nodes.length; i++){
    if (serverObj.name == st.farm[cat].nodes[i].name){
      s = st.farm[cat].nodes[i];
      break;
    }
  }
  if (!s){
    s = serverObj;
    st.farm[cat].nodes.push(serverObj);
  }
  s.inuse = serverObj.inuse;
  s.CpuTotal = Number(serverObj.CpuTotal);
  s.MemTotal = Number(serverObj.MemTotal);
  s.CpuAllocated = Number(serverObj.CpuAllocated);
  s.MemAllocated = Number(serverObj.MemAllocated);
  s.tagKeys = serverObj.tagKeys;

  //checknodes that were cleared and remove from farm
  for(var i = st.farm[cat].nodes.length - 1; i >= 0; i--){
    var found = false;
    for(var ii = 0; ii < list.length; ii++){
      if (list[ii].name == st.farm[cat].nodes[i].name){
        found = true;
        break;
      }
    }
    if (!found){
      st.farm[cat].nodes.splice(i, 1);
    }
  }
}

function calcProgressBucket(url, bucket, tid){
  var st = getCachedState(url);

  if (st && st.progress.nodesadd.nodes){
    for (var i = 0; i < st.progress.nodesadd.nodes.length; i++){
      var node = st.progress.nodesadd.nodes[i];
      if (node.os == 'win' && (!tid || tid == node.iaastenant)){
        bucket['win'].MemAvailable += node.ram;
        bucket['win'].CpuAvailable += node.cpu * 2000;
      }
      else if (node.os == 'lin' && (!tid || tid == node.iaastenant)){
        bucket['lin'].MemAvailable += node.ram;
        bucket['lin'].CpuAvailable += node.cpu * 2000;
      }
    }
  }
}

function registerNodes(nodes, iaastenant, add, url){
  if (nodes) {
    var st = getCachedState(url);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (add) {
        node.iaastenant = iaastenant;
        if (!st.progress.nodesadd.nodes){
          st.progress.nodesadd.nodes = [];
        }
        st.progress.nodesadd.nodes.push(node);
      }
      else{
        if (!st.progress.nodesdelete.nodes){
          st.progress.nodesdelete.nodes = [];
        }
        st.progress.nodesdelete.nodes.push(node);
      }
    }
    saveScaleState(url);
  }
}

exports.deleteNode = function(req, res, next){
  try {
    var bag = req.body;
    if(bag.model){
      setCachedModel(bag.url, bag.model);
    }
    loadModel(bag.url, function(err) {
      if (err) {
        next(err);
      }
      else {
        deleteNode(req, bag, function (err, r) {
          if (err) {
            next(err);
          }
          else {
            res.send(r);
          }
        });
      }
    });
  }
  catch(e){
    next("Unable to delete node " + e);
  }
}

exports.deleteProgressNode = function(req, res, next){
  var bag = req.body;
  console.log(bag);
  var st = getCachedState(bag.url);
  console.log(st);
  try {
    var list = bag.type == 'add' ? st.progress.nodesadd.nodes : st.progress.nodesdelete.nodes;
    for (var i = 0; i < list.length; i++) {
      var na = list[i];
      if (na.name == bag.name) {
        list.splice(i, 1);
        saveScaleState(bag.url);
        break;
      }
    }
    res.send("OK");
  }
  catch(err){
    next(err);
  }

}

exports.nodeExists = function (url, node){
  var st = getCachedState(url);
  var exists = false;
  for (var i = 0; i < st.farm[node.os].nodes.length; i++) {
    var n = st.farm[node.os].nodes[i];
    if (n.name == node.name) {
      exists = true;
      break;
     }
  }
  if (!exists && st.progress.nodesadd && st.progress.nodesadd.nodes){
    for (var i = 0; i < st.progress.nodesadd.nodes.length; i++){
        var na = st.progress.nodesadd.nodes[i];
      if (na.name == node.name){
        exists = true;
        break;
      }
    }
    if (!exists && st.progress.nodesdelete && st.progress.nodesdelete.nodes) {
      for (var i = 0; i < st.progress.nodesdelete.nodes.length; i++) {
        var na = st.progress.nodesadd.nodes[i];
        if (na.name == node.name) {
          exists = true;
          break;
        }
      }
    }
  }
  return exists;
}

function isNodeinUse(bucket, node){
  var inuse = false;
  var list = node.os == 'win' ? bucket.WINNODES : bucket.LINNODES;

  for(var i = 0; i < list.length; i++){
    var serverObj = list[i];
    if (serverObj.name == node.name && serverObj.inuse){
      inuse = true;
      break;
    }
  }
  return inuse;
}

function deleteNode(req, bag, callback){
  try {
    var url = bag.url;
    var node = bag.node;
    console.log("deletenode called", bag);
    if (shouldProxy(req, url)) {
      var st = getCachedState(url);
      var exists = false;
      for (var i = 0; i < st.farm[node.os].nodes.length; i++) {
        var n = st.farm[node.os].nodes[i];
        if (n.vmid == node.vmid) {
          exists = true;
          //st.farm[os].nodes.splice(i, 1);
          break;
        }
      }
      console.log("deletenode check", exists, st.farm[node.os]);
      if (!exists) {
        callback("Node " + vmid + " does not exist");
      }
      else {
        var m = getCachedModel(bag.url);
        bag.model = m;
        proxyToRemote(req, m.settings.platformObj.url, "deleteNode", 'POST', bag, function (e, r, body) {
          if (e) {
            callback(e);
          }
          else {
            //update inprogress state
            registerNodes([node], node.iaastenant, false, bag.url);

            saveScaleState(bag.url);
            //updatemodel
            var db = require('../core/mongo');
            db.saveDataObj(null, 'settings', m, null, null, function (err, saved) {
            });
            callback(null, getCachedState(bag.url));
          }
        });
      }
    }
    else {
      var m = getCachedModel(bag.url);
      var platformObj = m.settings.platformObj;
      getStats(platformObj, null, node.iaastenant, function(err, state){
        if(err){
          callback(err);
        }
        else {
          if (isNodeinUse(getStateBucket(state, node.iaastenant), node)){
            callback("Node " + node.name + " is in use and cannot be deleted");
          }
          else {
            var envObj = getEnv(m, node.iaastenant);
            var inst = require('./installdriver');
            inst.nodeDown(node, m, envObj);
            callback(null, node);
          }
        }
      });
    }
  }
  catch(e){
    callback("Unable to delete node " + e);
  }
}



exports.toggleService = function(req, res, next){
  var bag = req.body;
  loadModel(bag.url, function(err) {
    if (err) {
      next(err);
    }
    else {
      var service = bag.service;
      if (service.state == "on") {
        service.state = "off";
      }
      else {
        service.state = "on";
      }
      var m = getCachedModel(bag.url);
      m.service.state = service.state;
      m.service.interval = service.interval;
      var db = require('../core/mongo');
      console.log('service', service);
      db.saveDataObj(null, 'settings', m, null, null, function (err, saved) {
        if (err) {
          next("Unable to save settings", err);
        }
        else {
          if (m.service.state && m.service.state == "on") {
            console.log("looping", m.service.state);
            timers[bag.url] = setInterval(function () {
              if (m.service.state == "on") {
                if (m.envs.length > 1) {
                  for (var i = 0; i < m.envs.length; i++) {
                    statscheck(req, bag.url, m, m.envs[i]);
                  }
                }
                else {
                  statscheck(req, bag.url, m, null);
                }
              }
            }, m.service.interval);
          }
          else {
            console.log("no looping", timers[bag.url], m.service.state);
            if (timers[bag.url]) {
              clearInterval(timers[bag.url]);
              console.log("cleared timer", timers[bag.url]);
            }
          }
          res.send(m.service);
        }
      });
    }
  });
}

function statscheck(req, url, m, tid){
  var st = getCachedState(url);
  var bag = {};
  bag.url = url;
  bag.state = st;
  bag.model = m;
  proxyToRemote(req, url, "getstats", 'POST', bag, function (e, r, state) {
    console.log("checked stats in the loop", e);
    if (e) {
      m.service.state = "off";
      var result = {};
      result.tid = tid;
      result.url = m.settings.platformObj.url;
      result.error = e;
      proxyStatCheck(result);
    }
    else {
      var result = checkCapacity(getStateBucket(state, tid), m.stats, m, null, null, tid);
      proxyStatCheck(result);
    }
  });
}


function checkCapacity(bucket, stats, m, tag, os, tid){
  console.log("check capacity", bucket, stats, tag);
  var url = m.settings.platformObj.url;
  //return how many win and linux or by tag to spin up or remove
  var winup = false, linup = false, lindown = false, windown = false;
  if (bucket["win"].percMem < stats['win'].up ||  bucket['win'].percCPU < stats['win'].up){
    //scale up win
    winup = true;
  }

  if (bucket["lin"].percMem < stats['lin'].up ||  bucket['lin'].percCPU < stats['lin'].up){
    //scale up win
    linup = true;
  }

  var tags = {};
  tags.winup = [];
  tags.windown = [];
  tags.linup = [];
  tags.lindown = [];
  if (tag && (!stats.tags || !stats.tags[tag] || !stats.tags[tag].up || stats.tags[tag].up <= 0 ))
  {
    if (os == "lin"){
      tags.linup.push(tag);
    }
    else{
      tags.winup.push(tag);
    }
  }
  else if (tag && stats.tags && stats.tags[tag] && stats.tags[tag].up > 0){
    if (bucket[tag] && (bucket[tag].percMem < stats.tags[tag].up ||  bucket[tag].percCPU < stats.tags[tag].up)){
      if (stats.tags[tag].win){
        tags.winup.push(tag);
      }
      if (stats.tags[tag].lin){
        tags.linup.push(tag);
      }
    }
  }
  if (tag && stats.tags && stats.tags[tag] && stats.tags[tag].down > 0){
    if (bucket[tag] && (bucket[tag].percMem > stats.tags[tag].down ||  bucket[tag].percCPU > stats.tags[tag].down)){
      if (stats.tags[tag].win){
        tags.windown.push(tag);
      }
      if (stats.tags[tag].lin){
        tags.lindown.push(tag);
      }
    }
  }

  if (stats.tags && !tag){
    for(var key in stats.tags){
      if (bucket[key] && !stats.tags[key].ondemand && stats.tags[key].up > 0 && (bucket[key].percMem < stats.tags[key].up ||  bucket[key].percCPU < stats.tags[key].up)){
        if (stats.tags[key].win){
          tags.winup.push(key);
        }
        if (stats.tags[key].lin){
          tags.linup.push(key);
        }
      }
      else if (bucket[key] && stats.tags[key].down > 0 && (bucket[key].percMem > stats.tags[key].down ||  bucket[key].percCPU > stats.tags[key].down)){
        if (stats.tags[key].win){
          tags.windown.push(key);
        }
        if (stats.tags[key].lin){
          tags.lindown.push(key);
        }
      }
    }
  }


  if (!winup && (bucket["win"].percMem > stats['win'].down ||  bucket["win"].percCPU > stats['win'].down)){
    //scale up win
    windown = true;
  }

  if (!linup && (bucket["lin"].percMem > stats['lin'].down ||  bucket['lin'].percCPU > stats['lin'].down)){
    //scale up win
    lindown = true;
  }

  var json = {winup:winup, linup:linup, lindown:lindown, windown:windown, bucket:bucket, url: url, tags:tags, tid:tid};
  console.log("capacity checked", json);
  return json;
}

exports.proxyJobDone = function(req, res, next){
  var job = req.body.job;
  var server = req.body.server;
  var error = req.body.error;
  var url = job.url;
  console.log("proxyJobDone", error);
  var st = getCachedState(url);
  if(job.type == 'cinode' || job.type == 'scalenode' || job.type == 'addnode'){
    //move nodes from in progress to farm
    for (var i = 0; i < st.progress.nodesadd.nodes.length; i++){
      if(st.progress.nodesadd.nodes[i].vmid == server.vmid){
        var cat = server.os;
        server.autoscale = true;
        st.farm[cat].nodes.push(server);

        st.progress.nodesadd.nodes.splice(i, 1);
        break;
      }
    }
  }
  else if (job.type == "deletenode"){
    for (var i = 0; i < st.progress.nodesdelete.nodes.length; i++) {
      if (st.progress.nodesdelete.nodes[i].name == server.name) {
        st.progress.nodesdelete.nodes.splice(i, 1);
      }
      if (st.farm[server.os].nodes[i].name == server.name) {
        st.farm[server.os].nodes.splice(i, 1);
      }
    }
  }
  var m = getCachedModel(job.url);
  saveScaleState(job.url);
  //updatemodel
  var db = require('../core/mongo');
  db.saveDataObj(null, 'settings', m, null, null, function(err, saved){});
  res.send("ok");
}

function proxyStatCheck(body){
  try {
    var tid = body.tid;
    var m = getCachedModel(body.url);
    var db = require('../core/mongo');
    m.service.lastCheck = new Date();
    if (body.error) {
      //stop service
      m.service.state = "off";
      db.saveDataObj(null, 'settings', m, null, null, function (err, saved) {
      });
    }
    else {
      db.saveDataObj(null, 'settings', m, null, null, function (err, saved) {
      });
      var checkResult = {};
      checkResult.up = {};
      checkResult.up.win = [];
      checkResult.up.lin = [];
      checkResult.down = {};
      checkResult.down.win = [];
      checkResult.down.lin = [];
      var st = getCachedState(body.url);
      bucketToState(body.bucket, body.url, tid);
      st.bucket = body.bucket;
      saveScaleState(body.url);

      //act upon the result
      if (body.winup) {
        var n = scaleup(m, st, 'win', tid, null, function(err){
          if (!err) {
            checkResult.up.win.push(n);
          }
          completeProxyStatCheck(m, checkResult);
        });
      }
      if (body.linup) {
        var n = scaleup(m, st, 'lin', tid, null, function(err){
          if (!err) {
            checkResult.up.lin.push(n);
          }
          completeProxyStatCheck(m, checkResult);
        });
      }

      var count = 0;
      for (var i = 0; i < body.tags.winup.length; i++) {
        var tag = body.tag.winup[i];
        var n = scaleup(m, st, 'win', tid, tag, function(err){
          count++;
          if (!err) {
            checkResult.up.win.push(n);
          }
          completeProxyStatCheck(m, checkResult);
        });
      }

      var cl = 0;
      for (var i = 0; i < body.tags.linup.length; i++) {
        var tag = body.tag.linup[i];
        var n = scaleup(m, st, 'lin', tid, tag, function(err){
          cl++;
          if (!err) {
            checkResult.up.lin.push(n);
          }
          completeProxyStatCheck(m, checkResult);
        });
      }

      //removal
      //todo: make sure not to remove, if the new reduced capacity will force the scale-out
      var bag = {};
      bag.url = body.url;
      if (body.lindown && !body.linup) {
        var s = findUnused(body.url, "lin");
        if (s && !whatif(s, body.bucket, "lin", m.stats['lin'].up)) {
          bag.node = s;
          deleteNode(req, bag, function (err, r) {
            if (!err){
              checkResult.down.lin.push(s.name);
            }
            completeProxyStatCheck(m, checkResult)
          });
        }
      }

      if (body.windown && !body.winup) {
        var s = findUnused(body.url, "win");
        if (s && !whatif(s, body.bucket, "win", m.stats['win'].up)) {
          bag.node = s;
          deleteNode(req, bag, function (err, r) {
            if (!err){
              checkResult.down.win.push(s.name);
            }
          });
        }
      }

      for (var i = 0; i < body.tags.windown.length; i++) {
        var tag = body.tags.windown[i];
        var s = findUnused(body.url, "win", tag);
        if (s && m.stats.tags[tag].win && !whatif(s, body.bucket, tag, m.stats.tags[tag].up)) {
          bag.node = s;
          deleteNode(req, bag, function (err, r) {
            if (!err){
              checkResult.down.win.push(s.name);
            }
            completeProxyStatCheck(m, checkResult);
          });
          break;
        }
      }

      for (var i = 0; i < body.tags.lindown.length; i++) {
        var tag = body.tags.lindown[i];
        var s = findUnused(body.url, "lin", tag);
        if (s && m.stats.tags[tag].lin && !whatif(s, body.bucket, tag, m.stats.tags[tag].up)) {
          bag.node = s;
          deleteNode(req, bag, function (err, r) {
            if (!err){
              checkResult.down.lin.push(s.name);
            }
            completeProxyStatCheck(m, checkResult);
          });
          break;
        }
      }
    }
  }
  catch(e){
    console.log("proxyStatCheck error", e);
  }
}

function completeProxyStatCheck(m, checkResult){
  try {
    var db = require('../core/mongo');
    m.service.result = checkResult;
    db.saveDataObj(null, 'settings', m, null, null, function (err, saved) {
    });
  }
  catch(e){
    console.log("completeProxyStatCheck", e);
  }
}

function findUnused(url, os, tag){
  var s;
  var st = getCachedState(url);
  for(var i = 0; i < st.farm[os].nodes.length; i++){
    var node = st.farm[os].nodes[i];
    if (node.auto && !node.inuse){
      if (tag){
        if (tag == node.tagKey){
          s = node;
          break;
        }
      }
      else{
        s = node;
        break;
      }
    }
  }
  console.log("found unused server", s);
  return s;
}

function cleanupNode(m, node, platformObj, callback){
  var CoreDb = require('../core/core-db');
  var db = new CoreDb(platformObj.dbname, platformObj.dbadmin, platformObj.dbadminpass);
  db.cleanUpNode(node.name, function (err, r) {
    console.log('cleanUpNode', err);
    if (err) {
      callback(err);
    }
    else {
      callback(null, node);
    }
  });
}

exports.jobdone = function(err, job, server){
  console.log("job done", err, job.type);
  var m = getCachedModel(job.url);
  var json = {job:job, server:server, error:err};

  if (!err && job){
    var bag = job.jobbag;
    console.log("job done", job.type);
    if (job.type == 'cinode' && bag){
      tagServer(server, bag.tag, job, function(err, r){
        if (!err){
          reportFromProxy(m.caller, "proxyJobDone", "POST", json, function(e, r, b){

          });
          //kick of next job
          setTimeout(function(){
            var jenkdriver = require('./jenkinsdriver.js');
            jenkdriver.startJob(bag.jenkurl, bag.callbackjob, bag.jobtoken, function (err, r, b) {
            });
          }, 60000);
        }
        else{
          json.error = err;
          reportFromProxy(m.caller, "proxyJobDone", "POST", json, function(e, r, b){

          });
        }

      });
    }
    else if(job.type == 'scalenode' || job.type == 'addnode'){
      console.log('checking for tags', server);
      if (server.tagKey){
        tagServer(server, server.tagKey, job, function(err, r){
          if (!err) {
            reportFromProxy(m.caller, "proxyJobDone", "POST", json, function (e, r, b) {

            });
          }
          else{
            json.error = err;
            reportFromProxy(m.caller, "proxyJobDone", "POST", json, function(e, r, b){

            });
          }

        });
      }
      else{
        reportFromProxy(m.caller, "proxyJobDone", "POST", json, function(e, r, b){

        });
      }
    }
    else if(job.type == 'deletenode'){
      cleanupNode(m, server, m.settings.platformObj, function(err, r){
        if (!err) {
          reportFromProxy(m.caller, "proxyJobDone", "POST", json, function (e, r, b) {

          });
        }
        else{
          json.error = err;
          reportFromProxy(m.caller, "proxyJobDone", "POST", json, function(e, r, b){

          });
        }
      });
    }
  }
  else{
    reportFromProxy(m.caller, "proxyJobDone", "POST", json, function(e, r, b){

    });
  }
}

function tagServer(server, tagKey, job, callback){
  try {
    var m = getCachedModel(job.url);
    var platformObj = m.settings.platformObj;
    //find node by name
    var CoreDb = require('../core/core-db');
    var db = new CoreDb(platformObj.dbname, platformObj.dbadmin, platformObj.dbadminpass);
    db.getHosts(server.name, function (err, hosts) {
      if (!err && hosts && hosts.length > 0) {
        var serverID = hosts[0].id;
        //find the tagmodelID
        var ar = tagKey.split(":");
        var propName = ar[0];
        var propVal = ar[1];
        db.findCustomPropertyModel(propName, function (err, recs) {
          console.log('findCustomPropertyModel called', err, recs);
          if (!err && recs && recs.length > 0) {
            var modelID = recs[0].Id;
            //tagserver
            console.log('tagging server ', modelID, serverID, propVal);
            db.tagServer(modelID, serverID, propVal, function (err, r) {
              console.log('server tagged', err, r);
              callback(err, r);
            });
          }
          else {
            callback(err);
          }
        });
      }
      else {
        callback(err);
      }
    });
  }
  catch(e){
    callback(e);
  }
}

exports.wipeUnused = function(req, res, next){
  try {
    var obj = req.body;
    var url = obj.url;
    var apptenant = obj.apptenant;
    if (url.indexOf('https://') >= 0) {
      url = url.replace('https://', "");
    }
    if (url.indexOf('http://') >= 0) {
      url = url.replace('http://', "");
    }
    console.log("wipeUnused", obj, url);
    //use app tenant to lookup env preferences
    loadModel(url, function (err, m) {
      if (err || !m) {
        next(" Model does not exist " + err);
      }
      else {
        if (shouldProxy(req, url)) {
          loadState(url, function (err, state) {
            if (err) {
              next(err);
            }
            else {
              var bag = {};
              bag.url = url;
              bag.state = state;
              bag.model = m;
              proxyToRemote(req, url, "getstats", 'POST', bag, function (e, r, body) {
                if (e) {
                  next(e);
                }
                else {
                  var iaastenant = findEnvByAppTenant(m, apptenant);
                  bucketToState(body.bucket, url, iaastenant);
                  updateStateBucket(url, state, body.bucket, iaastenant);
                  saveScaleState(url);
                  CIDown(req, state, m, obj, function (err, data) {
                    if (err) {
                      next(err);
                    }
                    else {
                      res.send(data);
                    }
                  });
                }
              });
            }
          });
        }
        else {
          var m = getCachedModel(url);
          var platformObj = m.settings.platformObj;
          var iaastenant = findEnvByAppTenant(m, apptenant);
          getStats(platformObj, m.stats.tags, iaastenant, function (err, state) {
            if (err) {
              next("Unable to check capacity " + err);
            }
            CIDown(req, state, m, obj, function (err, data) {
              if (err) {
                next(err);
              }
              else {
                res.send(data);
              }
            });
          });
        }
      }
    });
  }
  catch(ex){
    next(ex);
  }
}

function CIDown(req, state, m, obj, callback){
  try {
    var tag = obj.tag;   //tagname:val}
    var os = obj.os;
    var url = obj.url;
    if (url.indexOf('https://') >= 0) {
      url = url.replace('https://', "");
    }
    if (url.indexOf('http://') >= 0) {
      url = url.replace('http://', "");
    }
    var apptenant = obj.apptenant;
    var env = findEnvByAppTenant(m, apptenant);
    if (!env) {
      callback("No environment configured for tenant " + apptenant);
    }
    var iaastenant = env.tid;

    var check = checkCapacity(getStateBucket(state, iaastenant), m.stats, m, tag, os, iaastenant);
    console.log("wipe check", check);
    //removal

    if (!tag) {
      var error;
      var found = false;
      if (check.lindown) {
        found = true;
        processRemoval(req, url, "lin", tag, function(err){
          if (err){
            error = err;
          }
        });
      }
      if (check.windown) {
        found = true;
        processRemoval(req, url, "win", tag, function(err, r){
          if (err){
            callback(err);
          }
          else if (error){
            callback(error);
          }
          else{
            callback(null, r);
          }
        });
      }
      if (!found){
        callback(null);
      }
    }
    else if (tag) {
      var found = false;
      var error = "";
      for (var i = 0; i < check.tags.windown.length; i++) {
        var t = check.tags.windown[i];
        if (t == tag) {
          found = true;
          processRemoval(req, url, "win", tag, function(err, r){
            if (err){
              error += err;
            }
          });
        }
      }

      for (var i = 0; i < check.tags.lindown.length; i++) {
        var t = check.tags.lindown[i];
        if (t == tag) {
          found = true;
          processRemoval(req, url, "lin", tag, function(err, r){
            if (err) {
              error += err;
            }
          });
        }
      }
      if (found && error){
        callback(error);
      }
      else if (found){
        callback(null);
      }
      else if (!found){
        callback(null);
      }
    }
  }
  catch(e){
    callback(e);
  }
}

function processRemoval(req, url, os, tag, callback){
  var s = findUnused(url, os, tag);
  if (s) {
    var bag = {};
    bag.url = url;
    bag.node = s;
    deleteNode(req, bag, function (err, r) {
      console.log("del node", err, r);
      callback(err, r);
    });
  }
  else{
    callback(null);
  }
}


function getStats (platformObj, tags, tid, callback) {
  var st = getCachedState(platformObj.url);
  var CoreDb = require('../core/core-db');
  var db = new CoreDb(platformObj.dbname, platformObj.dbadmin, platformObj.dbadminpass);
  db.getUtilization(function (err, recordset)
  {
      if (err) {
        callback(err, null);
      }
      else {

        var bucket = {};
        bucket["win"] = {
          CpuAvailable: 0,
          MemAvailable: 0,
          CpuAllocated: 0,
          MemAllocated: 0,
          CpuRemaining: 0,
          MemRemaining: 0,
          percMem: 0,
          percCPU: 0,
          Title:"Windows"
        };

        bucket["lin"] = {
          CpuAvailable: 0,
          MemAvailable: 0,
          CpuAllocated: 0,
          MemAllocated: 0,
          CpuRemaining: 0,
          MemRemaining: 0,
          percMem: 0,
          percCPU: 0,
          Title:"Linux"
        };

        var tagIDs = null;
        if (tags){
          tagIDs = [];
          for (var key in tags){
            var tag = tags[key];
            if (tag.id) {
              tagIDs.push(tag.id);
              bucket[tag.tagKey] = {
                CpuAvailable: 0,
                MemAvailable: 0,
                CpuAllocated: 0,
                MemAllocated: 0,
                CpuRemaining: 0,
                MemRemaining: 0,
                percMem: 0,
                percCPU: 0,
                Title: tag.tagKey
              };
            }
          }
        }

        var byNodeUtil = {};
        bucket.WINNODES = [];
        bucket.LINNODES = [];
        calcProgressBucket(platformObj.url, bucket, tid);

        //load used tags
        if (tagIDs && tagIDs.length > 0) {
          db.loadScalableProps(tagIDs, function (err, props) {
            if (err) {
              callback(err, null);
            }
            else {
              for (var i = 0; i < recordset.length; i++) {
                //cache utilization by server to avoid removing those in use.
                var node = recordset[i];
                var nodeName = recordset[i].Hostname;
                var nodeType = recordset[i].NodeType;
                var os = nodeType == "1" ? "win" : "lin";
                if (fitBucket(nodeName, os, tid, platformObj.url)) {
                  var inuse = Number(recordset[i].CpuAllocated) > 0 || Number(recordset[i].MemAllocated) > 0;
                  byNodeUtil[nodeName] = inuse;
                  var serverObj = {};
                  serverObj.inuse = inuse;
                  serverObj.name = nodeName;
                  serverObj.CpuTotal = Number(node.CpuTotal);
                  serverObj.MemTotal = Number(node.MemTotal);
                  serverObj.CpuAllocated = Number(node.CpuAllocated);
                  serverObj.MemAllocated = Number(node.MemAllocated);
                  assignProps(serverObj, props);
                  if (nodeType == "1") {
                    bucket.WINNODES.push(serverObj);
                    serverObj.os = 'win';
                  }
                  else {
                    bucket.LINNODES.push(serverObj);
                    serverObj.os = 'lin';
                  }
                  bucketize(serverObj, bucket);
                }
              }
              bucketToState(bucket, platformObj.url, tid);
              console.log("getstats return state", st, bucket);
              callback(null, st);
            }

          });
        }
        else{
          for (var i = 0; i < recordset.length; i++) {
            //cache utilization by server to avoid removing those in use.
            var node = recordset[i];
            var nodeName = recordset[i].Hostname;
            var nodeType = recordset[i].NodeType;
            var os = nodeType == "1" ? "win" : "lin";
            if (fitBucket(nodeName, os, tid, platformObj.url)) {
              var inuse = Number(recordset[i].CpuAllocated) > 0 || Number(recordset[i].MemAllocated) > 0;
              byNodeUtil[nodeName] = inuse;
              var serverObj = {};
              serverObj.inuse = inuse;
              serverObj.name = nodeName;
              serverObj.CpuTotal = Number(node.CpuTotal);
              serverObj.MemTotal = Number(node.MemTotal);
              serverObj.CpuAllocated = Number(node.CpuAllocated);
              serverObj.MemAllocated = Number(node.MemAllocated);
              if (nodeType == "1") {
                bucket.WINNODES.push(serverObj);
                serverObj.os = 'win';
              }
              else {
                bucket.LINNODES.push(serverObj);
                serverObj.os = 'lin';
              }
              bucketize(serverObj, bucket);
            }
          }
          bucketToState(bucket, platformObj.url, tid);
          console.log("getstats return state", st, bucket);
          callback(null, st);
        }
      }
    });

}

function fitBucket(nodeName, os, tid, url){
  if (!tid){
    return true;
  }
  else{
    var found = false;
    var st = getCachedState(url);
    for(var i = 0; i < st.farm[os].nodes.length; i++){
      var farmnode = st.farm[os].nodes[i];
      if (nodeName == farmnode.name && tid == farmnode.iaastenant){
        found = true;
        break;
      }
    }
    return true;
  }
}

function assignProps(serverObj, props){
  if (props && props.length > 0){
    for(var i = 0; i < props.length; i++){
      var cp = props[i];

      if (cp.vals.length > 0) {
        for (var v in cp.vals) {
          if (v !== 'length') {
            var servers = cp.vals[v];
            if (servers && servers.indexOf(serverObj.name) >= 0) {
              if (!serverObj.tagKeys) {
                serverObj.tagKeys = [];
              }
              serverObj.tagKeys.push(cp.name + ":" + v);
            }
          }
        }
      }
    }
  }
}


function bucketize(node, bucket){
    for(var key in bucket) {
        if (node.os == key || (node.tagKeys && node.tagKeys.indexOf(key) >= 0)) {
           bucket[key].CpuAvailable += Number(node.CpuTotal);
           bucket[key].MemAvailable += Number(node.MemTotal);
           bucket[key].CpuAllocated += Number(node.CpuAllocated);
           bucket[key].MemAllocated += Number(node.MemAllocated);
           bucket[key].CpuRemaining = bucket[key].CpuAvailable - bucket[key].CpuAllocated;
           bucket[key].MemRemaining = bucket[key].MemAvailable - bucket[key].MemAllocated;


           bucket[key].percMem = Number(bucket[key].MemRemaining / bucket[key].MemAvailable * 100);
           bucket[key].percCPU = Number(bucket[key].CpuRemaining / bucket[key].CpuAvailable * 100);
        }
    }
}

function whatif(node, bucket, key, stateUp){
  console.log("checking if node can be removed", node, bucket, key, stateUp);
  var r = false;
    if (bucket[key]) {
      var newCPUAvailable = bucket[key].CpuAvailable - Number(node.CpuTotal);
      var newMemAvailable = bucket[key].MemAvailable - Number(node.MemTotal);
      var newCpuRemaining = newCPUAvailable - bucket[key].CpuAllocated;
      var newMemRemaining = newMemAvailable - bucket[key].MemAllocated;


      var newpercMem = Number(newMemRemaining / newMemAvailable * 100);
      var newpercCPU = Number(newCpuRemaining / newCPUAvailable * 100);
      if (newpercMem <= stateUp || newpercCPU <= stateUp){
        r = true;
        console.log('cannot delete as % will drop to:', newpercMem, newpercCPU);
      }
    }
  return r;
}

exports.serializeSettings = function(job){
  var settings = {};
  settings.platformObj = {};
  settings.platformObj.ver = job.platform.ver;
  settings.platformObj.lmip = job.LM.IP;
  settings.platformObj.admin = job.platform.admin;
  settings.platformObj.sys = job.platform.sys;
  settings.platformObj.repo = job.SQL.IP;
  settings.platformObj.dbname = job.SQL.name + '\\' + job.SQL.instance;
  settings.platformObj.dbadmin = job.platform.dbadmin;
  settings.platformObj.dbadminpass = job.platform.dbadminpass;
  settings.platformObj.adminpass = job.platform.adminpass;
  settings.domainObj = job.domain;
  settings.adminObj = job.adminObj;
  settings.envObj = {};
  settings.envObj.iaas = job.iaas;
  settings.envObj.compapi = job.envObj.compapi;
  settings.envObj.netapi = job.envObj.netapi;
  settings.envObj.authapi = job.envObj.authapi;
  settings.envObj.url = job.envObj.url;
  settings.envObj.tid = job.envObj.tid;
  settings.envObj.uname = job.envObj.uname;
  settings.envObj.upass = job.envObj.upass;
  settings.envObj.appcloud = job.platform.appcloud;
  settings.envObj.apptenants = [job.adminObj.compalias];
  var str = JSON.stringify(settings);
  return str;
}

function deserializeSettings(url, callback){
   try{
     proxyToRemote(null, url, "loadAutoSettings","GET", null, function(err, r, body){
       if (err){
         callback(err);
       }
       else{
         var rObj = JSON.parse(body);
         console.log("loadAutoSettings parsed", rObj);
         var m = {valid: false, settings:{platformObj:{url:url}}, stats:{win:{}, lin:{}, tags:{}}, bucket:{}, envs:[], service:{state:'off', interval:30000}};
         if (rObj.data){
           var obj = rObj.data;
           m.settings.platformObj = obj.platformObj;
           m.settings.platformObj.url = url;
           m.settings.domainObj = obj.domainObj;
           m.settings.adminObj = obj.adminObj;
           m.envs.push(obj.envObj);
         }
         else{
           console.log("deserializeSettings error ", r.error);
         }
         callback(null, m);
       }
     });
   }
  catch(e){
    callback(e);
  }
}


