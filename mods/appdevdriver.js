var http = require('../core/httpservice');

function getToken(url, user, pass, tenant, app, callback){
    var path = "/authentication/api/v1/sessions/" + app;
    var json = {
        "username": user,
        "password": pass
    };
    if (app !== 'soc'){
        json.tenantAlias = tenant;
    }

    var headers = {
        'Content-Type': 'application/json; charset=utf-8'
    };

    var r = require("request");
    r({
        url: 'https://' + url + path, //URL to hit
        method: 'POST',
        headers: headers,
        //Lets post the following key/values as form
        json: json,
        strictSSL: false
    }, function(error, response, body){
        if(error) {
          var e = http.processError(error);
            callback(e, null);
        } else {
            var obj = body;
            if (obj && obj.apprendaSessionToken) {
                callback(null, obj.apprendaSessionToken);
            }
            else if (obj && obj.err) {
                callback(obj.error, null);
            }
            else if (obj && obj.result) {
                callback("invalid response " + obj.result.message, null);
            }
            else if (obj && obj.message) {
                callback("invalid response " + obj.message, null);
            }
            else if (!obj){
              callback("Cannot get token from api at ", url);
            }
        }
    });
}

exports.loadApps = function(req, res, next){
    var path = "/developer/api/v1/apps";
    var user = req.params.user;
    var pass = req.params.pass;
    var tenant = req.params.tenant;
    var url = req.params.url;
    getToken(url, user, pass, tenant, "developer", function(err, authToken){
        if (err){
            next(err);
        }
        else{
            var headers = {
                'ApprendaSessionToken': authToken
            };

            http.getData(url, null, path, headers, true, null, function (err, apps) {
                if (err) {
                    next(err, null);
                }
                else {
                    res.send(apps);
                }
            });

        }
    })
}

exports.createApp = function(req, res, next){
    var path = "/developer/api/v1/apps";
    var user = req.params.user;
    var pass = req.params.pass;
    var tenant = req.params.tenant;
    var url = req.params.url;
    var app = req.params.app;
    getToken(url, user, pass, tenant, "developer", function(err, authToken){
        if (err){
            next(err);
        }
        else{
            var body = {
                "Name":app,
                "Alias":app
            }
            var headers = {
                'Content-Type': 'application/json',
                'ApprendaSessionToken': authToken
            };

            http.postData(body, url, null, path, headers, true, null, function (err, apps) {
                if (err) {
                    next(err, null);
                }
                else {
                    res.send(apps);
                }
            });

        }
    })
}

exports.deleteApp = function(req, res, next){
    var path = "/developer/api/v1/apps";
    var user = req.params.user;
    var pass = req.params.pass;
    var tenant = req.params.tenant;
    var url = req.params.url;
    var app = req.params.app;
    getToken(url, user, pass, tenant, "developer", function(err, authToken){
        if (err){
            next(err);
        }
        else{
            var headers = {
                'ApprendaSessionToken': authToken
            };

            http.deleteData(url, null, path + "/" + app, headers, true, function (err, msg) {
                console.log("delete", err, msg);
                if (err) {
                    next(err, null);
                }
                else {
                    res.send(msg);
                }
            });

        }
    })
}

exports.signin = function(req, res, next){
  auth(req.body, function(err, token){
    if(err){
      next("Auth failed. " + err);
    }
    else{
      res.send(token);
    }
  });
}

exports.auth = function(body, callback){
  auth(body, callback);
}

function auth(body, callback){
  var valid = true;
  var token = body.token;
  var user = body.adminObj.email;
  var pass = body.adminObj.pass;
  var url = body.platformObj.url;
  if(token){
    if (valid){
      callback(null, token); //todo test the validity of the token. if not, relogin to get new token
    }
    else{
      authSoc(user, pass, url, callback);
    }

  }else{
    authSoc(user, pass, url, callback);
  }
}

function authSoc(user, pass, url, callback){
  getToken(url, user, pass, null, "soc", function(err, authToken){
    callback(err, authToken);
  })
}

exports.authSoc = function(user, pass, url, callback){
  authSoc(user, pass, url, callback);
}

exports.testAppSession = function(req, res, next){
    var user = req.params.user;
    var pass = req.params.pass;
    var tenant = req.params.tenant;
    var url = req.params.url;
    var app = req.params.app;
    getToken(url, user, pass, tenant, app, function(err, authToken){
        if (err){
            next(err);
        }
        else{
            res.send(result);
        }
    })
}

exports.changeState = function(user, pass, url, node, state, callback){
    changeNodeState(user, pass, url, node, state, callback);
}

function changeNodeState(user, pass, url, node, state, callback){
    var path = "/soc/api/v1/hosts/" + node + "/state";
    getToken(url, user, pass, null, "soc", function(err, authToken){
        if (err){
          callback(err);
        }
        else{
            var headers = {
                'ApprendaSessionToken': authToken
            };
            var data = {
                "state": state,
                "reason": "Internal"
            }

            var r = require("request");
            r({
                url: 'https://' + url + path, //URL to hit
                method: 'PUT',
                headers: headers,
                //Lets post the following key/values as form
                json: data,
                strictSSL: false
            }, function(err, response, body){
                callback(err, response, body);
            });

        }
    })
}

exports.changeNodeState = function(req, res, next){
    var user = req.params.user;
    var pass = req.params.pass;
    var node = req.params.node;
    var url = req.params.url;
    var state = req.params.state;
    changeNodeState( function(err, response, body){
        if (err) {
            next(err, null);
        }
        else if (response.statusCode !== 204){
            next(response.statusMessage, null);
        }
        else {
            res.send(body);
        }
    })

}
exports.addDockerProps = function(url, user, pass, callback){
  addDockerProps(url, user, pass, callback);
}

function addDockerProps(url, user, pass, callback){
  var ar = [
    {name:"DockerDeploy", vals:["No", "Dockerfile", "Registry"], freevalok: false, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:true, editable:true },
    {name:"DockerBindHost", vals:[], freevalok: true, defvals:[], cs:true, db:true, apps:true, linux:true, required:false, visible:true, editable:true },
    {name:"DockerBindHostApprovedDirs", vals:[], freevalok: false, defvals:[], cs:false, db:false, apps:true, linux:true, required:false, visible:false, editable:false },
    {name:"DockerBindLocal", vals:[], freevalok: true, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:true, editable:true },
    {name:"DockerBindShared", vals:[], freevalok: true, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:true, editable:true },
    {name:"DockerBindSharedRootDir", vals:[], freevalok: true, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:false, editable:false },
    {name:"DockerImageName", vals:[], freevalok: true, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:true, editable:true },
    {name:"DockerImageTag", vals:[], freevalok: true, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:true, editable:true },
    {name:"DockerNetworkMode", vals:[], freevalok: true, defvals:[], cs:true, db:false, apps:true, linux:true, required:false, visible:true, editable:true }
  ];

  var count = 0;
  for (var i = 0; i < ar.length; i++){
    addCustomProperty(url, user, pass, ar[i], function(err){
      count++;
      if (count == ar.length){
        callback();
      }
    });
  }
}

exports.addCustomProperty = function(url, user, pass, propObj, callback){
  addCustomProperty(url, user, pass, propObj, callback);
}

function addCustomProperty(url, user, pass, propObj, callback){
  //res: {"d":{"__type":"Apprenda.Eux.Shared.Web.WebServices.AjaxResult","ErrorMessage":null,"HasError":false,"HasWarning":false,"WarningMessage":null}}
  var d = {};
  d.model = {};
  d.model.supportedObjectTypes = 1029;
  if(propObj.cs && propObj.db && propObj.apps && propObj.linux){
    d.model.supportedObjectTypes = 1153
  }
  else if (propObj.cs && propObj.apps && propObj.linux){
    d.model.supportedObjectTypes = 129;
  }
  else if (propObj.apps && propObj.linux){
    d.model.supportedObjectTypes = 128;
  }

  d.model.name = propObj.name;
  d.model.displayName = propObj.name;
  d.model.defaultValues = propObj.defvals;
  d.model.developerVisibility = propObj.visible ? "Visible" : "Hidden";
  d.model.visibleToDevelopers = propObj.visible;
  d.model.editableByDevelopers = propObj.editable;
  d.model.required = propObj.required;
  d.model.allowedValues = [];
  //d.model.reassignmentOptions = [{text: "None", value: ""}];
  d.model.reassignments = [];
  d.model.allowedValuesString = "";
  if (propObj.vals){
    for(var i = 0; i < propObj.vals.length; i++){
      d.model.allowedValues.push(propObj.vals[i]);
      if (i==0) {
        d.model.allowedValuesString = d.model.allowedValuesString + propObj.vals[i];
      }
      else{
        d.model.allowedValuesString = d.model.allowedValuesString + ", " + propObj.vals[i];
      }
    }
  }
  d.model.appliesToApplications = "0";
  d.model.appliesToBootstrapPolicies = false;
  d.model.appliesToComputeServers = propObj.cs;
  d.model.appliesToDatabaseServers = propObj.db;
  d.model.appliesToDatabases = false;
  d.model.appliesToGuestApps = propObj.apps;
  d.model.appliesToLinuxServices = propObj.linux;

  d.model.appliesToPolicies = false;
  d.model.appliesToServices = false;
  d.model.appliesToStorageQuotas = false;
  d.model.appliesToUserInterfaces = false;
  d.model.appliesToWars = false;

  d.model.scopeOrComponentSelected = propObj.linux || d.model.appliesToUserInterfaces || d.model.appliesToWars;

  d.model.arbitraryValuesAllowed = propObj.freevalok;
  d.model.description = "";
  d.model.disabledScopeMessage = "This setting may not be changed while this property is a member of group 'undefined'";
  d.model.id = -1;
  d.model.isGroup = false;
  d.model.memberOf = null;
  d.model.multiSelectApplications = false;
  d.model.multiSelectComputeServers = false;
  d.model.multiSelectDatabaseServers = false;
  d.model.multiSelectDatabases = false;
  d.model.multiSelectJavaWebApplications = false;
  d.model.multiSelectLinuxServices = false;
  d.model.multiSelectPolicies = false;
  d.model.multiSelectServers = false;
  d.model.multiSelectStorageQuotas = false;
  d.model.multiSelectTypes = 0;
  d.model.multiSelectUserInterfaces = false;
  d.model.multiSelectWindowsServices = false;

  var path = "/soc/CustomPropertiesService.asmx/CreateCustomPropertyModel";
  getToken(url, user, pass, null, "soc", function(err, authToken){
    if (err){
      callback(err);
    }
    else{
      var headers = {
        'ApprendaSessionToken': authToken
      };

      var r = require("request");
      r({
        url: 'https://' + url + path, //URL to hit
        method: 'POST',
        headers: headers,
        //Lets post the following key/values as form
        json: d,
        strictSSL: false
      }, function(err, response, body){
        console.log("cprops", err, body, d.model.supportedObjectTypes, d.model.allowedValues, d.model.allowedValuesString);
        if (err){
          callback("Issues adding custom properties. Error Code  " + err.errno);
        }
        else if (response && response.statusCode == 200){
          if (body && d && d.HasError){
            callback(d.ErrorMessage);
          }
          else if (body && d && !d.HasError){
            callback(null);
          }
        }
        else if (response && response.statusCode){
          callback("Issues adding custom properties. Status Code " +  response.statusCode);
        }
      });

    }
  })



}

//{"d":{"__type":"Apprenda.Eux.Shared.Web.WebServices.AjaxResult","ErrorMessage":null,"HasError":false,"HasWarning":false,"WarningMessage":null}}

////https://apps.metapod.apprendalabs.com/soc/CustomPropertiesService.asmx/CreateCustomPropertyModel
//{"model":{
//  "allowedValues"
//:
//  ["v1", "v2", "v3"],
//    "allowedValuesString"
//:
//  "v1, v2, v3",
//    "appliesTo"
//:
//  "Compute Servers, Database Servers, Linux Services",
//    "appliesToApplications"
//:
//  "0",
//    "appliesToBootstrapPolicies"
//:
//  false,
//    "appliesToComputeServers"
//:
//  true,
//    "appliesToDatabaseServers"
//:
//  true,
//    "appliesToDatabases"
//:
//  false,
//    "appliesToGuestApps"
//:
//  true,
//    "appliesToLinuxServices"
//:
//  true,
//    "appliesToPolicies"
//:
//  false,
//    "appliesToServices"
//:
//  false,
//    "appliesToStorageQuotas"
//:
//  false,
//    "appliesToUserInterfaces"
//:
//  false,
//    "appliesToWars"
//:
//  false,
//    "arbitraryValuesAllowed"
//:
//  false,
//    "defaultValues"
//:
//  [],
//    "description"
//:
//  "",
//    "developerVisibility"
//:
//  "Visible",
//    "disabledScopeMessage"
//:
//  "This setting may not be changed while this property is a member of group 'undefined'",
//    "displayName"
//:
//  "Saastest",
//    "editable"
//:
//  true,
//    "editableByDevelopers"
//:
//  false,
//    "id"
//:
//  -1,
//    "isGroup"
//:
//  false,
//    "memberOf"
//:
//  null,
//    "multiSelectApplications"
//:
//  false,
//    "multiSelectComputeServers"
//:
//  false,
//    "multiSelectDatabaseServers"
//:
//  false,
//    "multiSelectDatabases"
//:
//  false,
//    "multiSelectJavaWebApplications"
//:
//  false,
//    "multiSelectLinuxServices"
//:
//  false,
//    "multiSelectPolicies"
//:
//  false,
//    "multiSelectServers"
//:
//  false,
//    "multiSelectStorageQuotas"
//:
//  false,
//    "multiSelectTypes"
//:
//  0,
//    "multiSelectUserInterfaces"
//:
//  false,
//    "multiSelectWindowsServices"
//:
//  false,
//    "name"
//:
//  "Saastest",
//    "reassignmentOptions"
//:
//  [{"text": "None", "value": ""}, {"text": "v1", "value": "v1"}, {"text": "v2", "value": "v2"},{"text": "v3", "value": "v3"}],
//
//    "reassignments"
//:
//  [],
//    "required"
//:
//  false,
//    "scopeOrComponentSelected"
//:
//  true,
//    "supportedObjectTypes"
//:
//  1153,
//    "visibleToDevelopers"
//:
//  true
//}}
