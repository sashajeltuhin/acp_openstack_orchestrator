var http = require('../core/httpservice');
var token = {};
var tid = 'dd56d51cb32c4a209676f5ae203c31c9';


exports.detectVersions = function(envObj, callback){
  try {
    if (envObj.compapi && envObj.netapi && envObj.authapi) {
      callback(null, envObj);
    }
    else {
      if (envObj.url.indexOf('https://') >=0){
        envObj.url = envObj.url.replace('https://', "");
      }
      if (envObj.url.indexOf('http://') >=0){
        envObj.url = envObj.url.replace('http://', "");
        envObj.ssl = false;
      }

      var headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      var ports = {"8774": "compapis", "9696": "netapis", "5000": "authapis"};
      var url = envObj.url;
      var path = '/';

      var ssl = true;
      if (envObj.ssl !== undefined && envObj.ssl !== null) {
        ssl = envObj.ssl;
      }
      var c = 0;
      var endpoints = {};
      endpoints.compapis = [];
      endpoints.authapis = [];
      endpoints.netapis = [];
      for (var key in ports) {
        endpoints[ports[key]] = [];
        var port = Number(key);
        http.getData(url, port, path, headers, ssl, null, function (err, result) {
          console.log("api discovery error", err);
          if (!err && result) {
            var obj = JSON.parse(result);
            var vdata = obj.versions;
            if (obj.versions.values){
              vdata = obj.versions.values;
            }
            for (var v = 0; v < vdata.length; v++) {
              var ref = vdata[v].links[0].href;
              var parsed = getPortfromRef(ref);
              if (!envObj.ssl) {
                envObj.ssl = parsed.ssl;
              }
              if (!envObj[parsed.port]){
                envObj[parsed.port] = [];
              }
              envObj[parsed.port].push({ssl:parsed.ssl, path:parsed.path});
              endpoints[ports[parsed.port]].push(parsed.path);
            }
            c++;
            if (c == Object.keys(ports).length) {
              for (var k in ports) {
                envObj[ports[k]] = endpoints[ports[k]];
              }
              if (envObj.compapis && envObj.compapis.length > 0) {
                envObj.compapi = envObj.compapis[envObj.compapis.length - 1];
              }
              if (envObj.netapis && envObj.netapis.length > 0) {
                envObj.netapi = envObj.netapis[envObj.netapis.length - 1];
              }
              if (envObj.authapis && envObj.authapis.length > 0) {
                envObj.authapi = envObj.authapis[envObj.authapis.length - 1];
              }
              console.log("envObj", envObj);
              callback(null, envObj);
            }
          }
        });
      }
    }
  }
  catch(e){
    callback(e);
  }
}

function getPortfromRef(ref){
  var ar = ref.split(':');
  var final = ar[2].split('/');
  return {port: final[0], path:final[1], ssl:(ar[0] === "https")};
}

function isValidToken(adminObj){
    var now = new Date();
    if (token.id && token.tid == adminObj.tid && token.expires.getTime() > now.getTime()){
        return true;
    }

    return false;
}

function auth(adminObj, callback){
    if (isValidToken(adminObj)){
        callback(null, token.id);
    }
    else {
        if (!adminObj){
            throw "Missing credentials";
        }
        var url = "api-trial2.client.metacloud.net";
        if (adminObj.authurl){
            url = adminObj.authurl;
        }
        var ssl = true;
        if (adminObj.ssl !== undefined && adminObj.ssl !== null){
            ssl = adminObj.ssl;
        }
        var tenantID = tid;
        if (adminObj.tid){
            tenantID = adminObj.tid;
        }
        var data = {
            "auth": {
                "tenantId": tenantID, "passwordCredentials": {"username": adminObj.uname, "password": adminObj.upass}
            }
        };
      console.log("adminObj in auth", adminObj);
      var vnum = adminObj.authapi.replace('v', '');
       if (Number(vnum) >= 3){
         data = {
           "auth": {
             "identity": {
               "methods": [
                 "password"
               ],
               "password": {
                 "user": {
                   "id": adminObj.uname,
                   "password": adminObj.upass
                 }
               }
             },
             "scope": {
               "project": {
                 "id": tenantID
               }
             }
           }
         }
       }
        var datastring = JSON.stringify(data);
        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        adminObj.clength = true;
        if (adminObj.clength){
            headers['Content-Length'] = Buffer.byteLength(datastring);
        }


        http.postData(data, url, 5000, '/' + adminObj.authapi + '/tokens', headers, ssl, null, function (err, result) {
          console.log("auth", err, ssl, adminObj.authapi);
            if (err) {
                callback(err, null);
            }
            else {
                var obj = JSON.parse(result);
                if (obj.error) {
                    callback(obj.error, null);
                } else {
                    var t = obj.access.token;
                    token.id = t.id;
                    token.tid = tenantID;
                    token.expires = new Date(t.expires);
                    callback(null, t.id);
                }
            }
        });
    }
}

function getServers(adminObj, callback){
    listObjects('servers', adminObj, callback);
}

function getFlavors(adminObj, callback){
    listObjects('flavors', adminObj, callback);
}

function getImages(adminObj, callback){
    listObjects('images', adminObj, callback);
}

function getNetworks(admin, callback){
    listNetworkObjects('networks', admin, callback);
}

exports.listObjects = function(req, res, next){
  var adminObj = {};
  adminObj.uname = req.params.uname;
  adminObj.upass = req.params.pass;
  adminObj.authurl = req.params.url;
  adminObj.tid = req.params.tid;
  adminObj.novaurl = req.params.url;

  listObjects(req.params.objname, adminObj, function(err, result){
    if (err) {
      next('Unable get to flavors. ' + err);
    }
    else{
      res.send(result);
    }
  });
}

exports.listEnvObjects = function(objname, envObj, callback){
  envObj.authurl = envObj.url;
  auth(envObj, function(err, tokenid) {
    if (err){
      callback(err, null);
    }
    else {
      var headers = {"X-Auth-Token": tokenid};
      var port = 8774;
      var url = envObj.url;
      var path = '/' + envObj.compapi + '/' + envObj.tid + '/' + objname;

      var ssl = true;
      if (envObj.ssl !== undefined && envObj.ssl !== null){
        ssl = envObj.ssl;
      }
      if (objname == "networks"){
        port = 9696;
        path = '/' + envObj.netapi + '/'  + objname;
      }

      http.getData(url, port, path, headers, ssl, null, function (err, result) {
        var obj = JSON.parse(result);
        callback(err, obj);
      });
    }
  });
}

function listObjects(objname, adminObj, callback){
    auth(adminObj, function(err, tokenid) {
        if (err){
            callback(err, null);
        }
        else {
            var headers = {"X-Auth-Token": tokenid};
            var url = "api-trial2.client.metacloud.net";
            if (adminObj.novaurl){
                url = adminObj.novaurl;
            }
            var tenantID = tid;
            if (adminObj.tid){
                tenantID = adminObj.tid;
            }
            var ssl = true;
            if (adminObj.ssl !== undefined && adminObj.ssl !== null){
                ssl = adminObj.ssl;
            }
            http.getData(url, 8774, '/' + adminObj.compapi + '/' + tenantID + '/' + objname, headers, ssl, null, function (err, result) {
                callback(err, result);
            });
        }
    });
}

exports.listObjDetail = function(objname, objid, envObj, callback){
  listObjectDetail(objname, objid, envObj, callback);
}

function listObjectDetail(objname, objid, envObj, callback){
  envObj.authurl = envObj.url;
  auth(envObj, function(err, tokenid) {
    if (err){
      callback(err, null);
    }
    else {
      var headers = {"X-Auth-Token": tokenid};
      var port = 8774;
      var url = envObj.url;
      var path = '/' + envObj.compapi + '/' + envObj.tid + '/' + objname + '/' + objid;

      var ssl = true;
      if (envObj.ssl !== undefined && envObj.ssl !== null){
        ssl = envObj.ssl;
      }
      if (objname == "networks"){
        port = 9696;
        path = '/' + envObj.netapi + '/' + objname + '/' + objid;
      }
      http.getData(url, port, path, headers, ssl, null, function (err, result) {
        var obj = JSON.parse(result);
        callback(err, obj);
      });
    }
  });
}

function listNetworkObjects(objname, admin, callback){
    auth(admin, function(err, tokenid) {
        if (err){
            callback(err, null);
        }
        else {
            var headers = {"X-Auth-Token": tokenid};
            var url = admin.novaurl;
            var ssl = true;
            if (admin.ssl !== undefined && admin.ssl !== null){
                ssl = admin.ssl;
            }

            http.getData(url, 9696, '/v' + admin.netapi + '/'  + objname, headers, ssl, null, function (err, result) {
                callback(err, result);
            });
        }
    });
}

exports.servers= function(callback){
    getServers(function(err, result){
        if (err) {
            callback(err, null);
        }
        else{
            callback(null, result);
        }
    });
}

exports.listServers = function(req, res, next){
    var adminObj = checkEnv(req);
    getServers(adminObj, function(err, result){
        if (err) {
            next('Unable get to servers. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.listFlavors = function(req, res, next){
    var adminObj = checkEnv(req);
    getFlavors(adminObj, function(err, result){
        if (err) {
            next('Unable get to flavors. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.listImages = function(req, res, next){
    var adminObj = checkEnv(req);
    getImages(adminObj, function(err, result){
        if (err) {
            next('Unable get to images. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

function checkEnv(req){
    var adminObj = {};

    return adminObj;
}

exports.listNetworks = function(req, res, next){
    var adminObj = checkEnv(req);

    getNetworks(adminObj, function(err, result){
        if (err) {
            next('Unable get to networks. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.scaleup= function(callback){
    addServer(function(err, result){
        if (err) {
            callback(err, null);
        }
        else{
            callback(null, result);
        }
    });
}

exports.addServer = function(req, res, next){
    addServer(function(err, result){
        if (err) {
            next('Unable add server. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.cmdAddVM= function(domainObj, platformObj, envObj, serverObj, adminObj, callback){
    if(!adminObj && envObj) {
        var adminObj = {};
        adminObj.uname = envObj.apiuser;
        adminObj.upass = envObj.apipass;
    }
    createVM(serverObj.type, domainObj, platformObj, envObj, serverObj, adminObj, function(err, result){
        if (err) {
            callback(err, null);
        }
        else{
            callback(null, result);
        }
    });
}

exports.cmdBuildVM = function(domainObj, platformObj, envObj, serverObj, callback){
  buildVM(serverObj.type, domainObj, platformObj, envObj, serverObj, function(err, result){
    if (err) {
      callback(err, null);
    }
    else{
      callback(null, result);
    }
  });
}

function buildVM(t, domainObj, platformObj, envObj, serverObj, callback)
{
  envObj.authurl = envObj.url;
  auth(envObj, function(err, tokenid) {
    if (err){
      callback(err, null);
    }
    else {
      var headers = {"X-Auth-Token": tokenid, 'Content-Type': 'application/json'};
      var env = envObj;

      var data = {};
      getuserdata(t, serverObj.params, function(err, script){

        if (err){
          callback(err, null);
        }else{
          data.user_data = new Buffer(script).toString('base64');

            //data.tenant_id = env.tid;
            //data.source_type = 'image';


          data.security_groups = [
            {
              "name": serverObj.secgroup
            }
          ];
          if (serverObj.key) {
            data.key_name = serverObj.key;
          }

          data.name = serverObj.name;
          if (serverObj.volume){
            data.block_device_mapping_v2 = [{"boot_index": "0",
              "uuid": serverObj.imageid,
              "source_type": "image",
              "volume_size": serverObj.volumeSize,
              "destination_type": "volume",
              "delete_on_termination": true}]
          }
          else{
            data.imageRef = serverObj.imageid;
          }
          data.flavorRef = serverObj.flavorid;
          if (serverObj.networkid){
            data.networks = [];
            var n = {};
            n.uuid = serverObj.networkid;
            data.networks.push(n);
          }
          var d = {};
          d.server = data;

          var ssl = true;
          if (envObj.ssl !== undefined && envObj.ssl !== null){
            ssl = envObj.ssl;
          }

          http.postData(d, env.url, 8774, '/' + envObj.compapi + '/' + env.tid + '/servers', headers, ssl, null, function(err, result){
            if (!err){
              var obj = JSON.parse(result);
              if (obj.overLimit && obj.overLimit.code == 413){
                callback("No more VM capacity " + obj.overLimit.message, null);

              }
              else if (obj.badRequest && obj.badRequest.message){
                callback("Cannot spin up VM " + obj.badRequest.message, null);
              }
              else {
                callback(null, obj.server);
              }
            }
            else {
              callback(err, null);
            }
            //in case the quota are exceeded following json is sent in result param: {overLimit:{code:413, message:"Quota exceeded.."}}
          });
        }
      });
    }
  });
  //if (volume){
  //  "block_device_mapping_v2": [
  //    {
  //      "boot_index": "0",
  //      "uuid": "ac408821-c95a-448f-9292-73986c790911",
  //      "source_type": "image",
  //      "volume_size": "25",
  //      "destination_type": "volume",
  //      "delete_on_termination": true
  //    }
  //}
}

exports.addVM = function(req, res, next){
    var t = req.params.type;
    createVM(t, null, null, null, null, null, function(err, result){
        if (err) {
            next('Unable add VM. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.addNeutronVM = function(req, res, next){
    var t = req.params.type;
    var sname = req.params.sname;
    var imageRef = req.params.imageRef;
    var flavorRef = req.params.flavorRef;
    var adminObj = checkEnv(req);
    var envObj = {};
    envObj.tid = adminObj.tid;
    envObj.url = adminObj.novaurl;
    envObj.netid = adminObj.netid;
    var serverObj = {};
    serverObj.name = sname;
    serverObj.imageRef = imageRef;//"11b27291-c02c-4336-9bca-bfbb527d5387"; //3a44ca22-a9ca-46a5-bc1a-ab4aa571421c centos 6
    serverObj.flavorRef = flavorRef;// "65e45fe3-b957-4033-afa7-a786f4cef95b";  //35f08da2-5e18-494b-9c51-b16288fa73f8  med
    var domainObj = {};
    domainObj.name = "paasdemo.local";
    domainObj.admin = "apprendaadmin";
    domainObj.pass = "@ppr3nda";
    domainObj.dns = adminObj.dns;
    var platform = {};
    platform.url = req.params.url;
    platform.admin = "apprendaadmin";
    platform.pass = domainObj.pass;
    platform.sys = "apprendasystem";
    platform.repo = adminObj.repo;
    createNeutronVM(t, domainObj, platform, envObj, serverObj, adminObj, function(err, result){
        if (err) {
            next('Unable add VM. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.orchestrate = function(req, res, next){
    //:/uname/:upass/:spass/:type/:name/:image/:flavor/:sec/:key
    console.log("orchestrate called");
    var admin = {};
    admin.uname = req.params.uname;
    admin.upass = req.params.upass;
    admin.ssl = req.params.authurl == "https";
    admin.clength = req.params.clength == "true";

    admin.authurl = req.params.novaurl;
    admin.tid = req.params.tid;
    console.log("admin data: ", admin);
    var serverObj = {};
    serverObj.name = req.params.name;
    serverObj.imageRef = req.params.image;
    serverObj.flavorRef = req.params.flavor;
    serverObj.key = req.params.key;
    serverObj.secgroup = req.params.sec;
    serverObj.options = req.params.options;
    serverObj.networkID = req.params.networkid;

    var envObj = {};
    envObj.tid = req.params.tid;
    envObj.url = req.params.novaurl;
    console.log("server data: ", serverObj);
    var t = req.params.type;
    createVM(t, null, null, envObj, serverObj, admin, function(err, result){
        if (err) {
            next('Unable add VM. ' + err);
        }
        else{
            res.send(result);
        }
    });
}



function addServer(callback){
    auth(null, function(err, tokenid) {
        if (err){
            callback(err, null);
        }
        else {
            var domain = {};
            domain.name = "apprendademo";
            domain.admin = "apprendaadmin";
            domain.pass =  "@pp4ever";
            domain.dns = "10.2.4.4";
            var platform = {};
            platform.admin = "apprendaadmin";
            platform.sys = "apprendasystem";
            var headers = {"X-Auth-Token": tokenid};
            var env = {};
            env.tid = "dd56d51cb32c4a209676f5ae203c31c9";
            env.url = "api-trial2.client.metacloud.net";
            var data = {};
            data.files = {};
            data.files.winfile = "#ps1_sysnative\n" +
                "$domain = \"" + domain.name + "\"\n" +
                "$password = \"" + domain.pass + "\" | ConvertTo-SecureString -asPlainText -Force\n" +
                "$username = \"$domain\\" + domain.admin + "\"\n" +
                "$credential = New-Object System.Management.Automation.PSCredential($username,$password)\n" +
                "Set-DnsClientServerAddress -InterfaceAlias \"Ethernet\" -ServerAddresses " + domain.dns + "\n" +
                "Add-Computer -DomainName $domain -Credential $credential | Out-Null\n" +
                "Set-Service NetTcpPortSharing -startuptype \"automatic\" | Out-Null\n" +
                "start-service -name NetTcpPortSharing  | Out-Null\n" +
                "$regkey = \"HKLM:\\Software\\Microsoft\\MSDTC\\Security\"\n" +
                "$regkeyroot = \"HKLM:\\Software\\Microsoft\\MSDTC\"\n"+
                "Set-ItemProperty -Path $regkey -Name NetworkDtcAccess -Value 1\n" +
                "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessClients -Value 1\n" +
                "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessInbound -Value 1\n" +
                "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessOutbound -Value 1\n" +
                "Set-ItemProperty -Path $regkeyroot -Name AllowOnlySecureRpcCalls -Value 0\n" +
                "Set-ItemProperty -Path $regkeyroot -Name TurnOffRpcSecurity -Value 1\n" +
                "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessTransactions -Value 1\n" +
                "Set-ItemProperty -Path $regkey -Name XaTransactions -Value 1\n" +
                //"Set-Service msdtc -startuptype \"automatic\" | Out-Null\n" +
                "Restart-Service msdtc | Out-Null\n" +
                "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False\n" +
                "$admin = \"apprendademo\\" + platform.admin + "\"\n" +
                "$sys = \"apprendademo\\" + platform.sys + "\"\n" +
                "$locallogon = \"SeInteractiveLogonRight\"\n" +
                "$imp = \"SeImpersonatePrivilege\"\n" +
                "$CarbonDllPath = \"c:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Carbon\\bin\\Carbon.dll\"\n" +
                "[Reflection.Assembly]::LoadFile($CarbonDllPath)\n" +
                "[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)\n" +
                "[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)\n" +
                "[Carbon.Lsa]::GrantPrivileges($admin, $imp)\n" +
                "[Carbon.Lsa]::GrantPrivileges($sys, $imp)\n" +
                "Install-WindowsFeature -Name Web-Server,AS-NET-Framework,Web-Net-Ext,Web-Net-Ext45,Web-ASP,Web-Asp-Net,Web-Asp-Net45 | Out-Null\n" +
                "Restart-Computer\n";
            data.tenant_id = env.tid;
            data.stack_name = "AppWinServer";
            data.template = {};
            data.template.heat_template_version = "2014-10-16";
            data.template.description = "Apprenda Web Loads";
            data.template.resources = {};
            data.template.resources.winserver = {};
            data.template.resources.winserver.type = "OS::Nova::Server";
            data.template.resources.winserver.properties = {};
            data.template.resources.winserver.properties.key_name = "metapod";
            data.template.resources.winserver.properties.name = "app-ws-06";
            data.template.resources.winserver.properties.image =  "windows_server_2012_r2_standard_eval_kvm_20140607-raw";
            data.template.resources.winserver.properties.flavor =  "WinServer2012.flavor";
            data.template.resources.winserver.properties.user_data = {get_file: "winfile"};

            http.postData(data, env.url, 8004, '/v1/dd56d51cb32c4a209676f5ae203c31c9/stacks', headers, true, null, function(err, result){
                callback(err, result);
            });
        }
    });
}

function createNeutronVM(t, domainObj, platformObj, envObj, serverObj, adminObj, callback){
    auth(adminObj, function(err, tokenid) {
        if (err){
            callback(err, null);
        }
        else {
            var domain = domainObj;
            if (!domain) {
                domain = {};
                domain.name = "appdemo.local";
                domain.admin = "apprendaadmin";
                domain.pass = "@ppr3nda";
                domain.dns = "10.10.100.17";
            }
            var platform = platformObj;
            if (!platform) {
                platform = {};
                platform.admin = "apprendaadmin";
                platform.pass = domain.pass;
                platform.sys = "apprendasystem";
                platform.repo = "10.10.100.19";
            }
            var headers = {"X-Auth-Token": tokenid, 'Content-Type': 'application/json'};
            var env = envObj;
            if (!env) {
                env = {};
                env.tid = "6163243e6d8c4a2f9398e24bc9f33efe";
                env.url = "api-trial6.client.metacloud.net";
            }
            var data = {};
            var serverdata = getTemplate(t, domain, platform, serverObj, adminObj);
            data.user_data = new Buffer(serverdata.script).toString('base64');
            data.tenant_id = env.tid;
            data.source_type = 'image';
            data.security_groups = [
                {
                    "name": serverdata.secgroup
                }
            ];
            data.name = serverdata.name;
            data.imageRef = serverdata.imageRef; //"windows_server_2012_r2_standard_eval_kvm_20140607-raw";
            data.flavorRef = serverdata.flavorRef;// "m.large";
            data.networks = [];
            var n = {};
            if (env && env.netid){
                n.uuid = env.netid;
            }
            data.networks.push(n);
            var d = {};
            d.server = data;

            var ssl = true;
            if (adminObj.ssl !== undefined && adminObj.ssl !== null){
                ssl = adminObj.ssl;
            }

            http.postData(d, env.url, 8774, '/' + envObj.compapi + '/' + data.tenant_id + '/servers', headers, ssl, null, function(err, result){
                var obj = JSON.parse(result);
                console.log("createNeutronVM error", err);
                callback(err, obj.server);
                //in case the quota are exceeded following json is sent in result param: {overLimit:{code:413, message:"Quota exceeded.."}}
            });
        }
    });
}

exports.execAction = function(req, res, next){
    var action = req.params.action;
    var type = req.params.type;
    var objID = req.params.id;

    var adminObj = checkEnv(req);

    var envObj = {};
    envObj.tid = adminObj.tid;
    envObj.url = adminObj.novaurl;
    execAction(envObj, adminObj, objID, action, type, function (err, result) {
        if (err) {
            next('Exec ' + action + ' failed. ' + err);
        }
        else {
            res.send(result);
        }
    });
}

function execAction(env, adminObj, objID, action, type, callback){
    var d = {};
    d[action] = {};
    d[action].type = type;
    auth(adminObj, function(err, tokenid) {
        if (err){
            callback(err, null);
        }
        else {
            var ssl = true;
            if (adminObj.ssl !== undefined && adminObj.ssl !== null){
                ssl = adminObj.ssl;
            }
            var headers = {"X-Auth-Token": tokenid, 'Content-Type': 'application/json'};
            http.postData(d, env.url, 8774, '/' + adminObj.compapi + '/' + env.tid + '/servers/' + objID + "/action", headers, ssl, null, function(err, result) {

                var obj = {};
                if (result){
                    obj = JSON.parse(result);
                }
                console.log("execAction error", err);
                callback(err, obj);
            });
        }
    });
}

exports.assignExternalIP = function(ip, envObj, serverID, callback){
  var data = {};
  data.addFloatingIp = {};
  data.addFloatingIp.address = ip;
  execOSAction(data, envObj, serverID, callback);
}

function execOSAction(data, envObj, serverID, callback){
  auth(envObj, function(err, tokenid) {
    if (err){
      callback(err, null);
    }
    else {
      var ssl = true;
      if (envObj.ssl !== undefined && envObj.ssl !== null){
        ssl = envObj.ssl;
      }
      var headers = {"X-Auth-Token": tokenid, 'Content-Type': 'application/json'};
      http.postData(data, envObj.url, 8774, '/' + envObj.compapi + '/' + envObj.tid + '/servers/' + serverID + "/action", headers, ssl, null, function(err, result) {

        var obj = {};
        if (result){
          obj = JSON.parse(result);
        }
        console.log("execAction error", err);
        callback(err, obj);
      });
    }
  });
}

function createVM(t, domainObj, platformObj, envObj, serverObj, adminObj, callback){
    auth(adminObj, function(err, tokenid) {
        if (err){
            callback(err, null);
        }
        else {
            var domain = domainObj;

            var platform = platformObj;

            var headers = {"X-Auth-Token": tokenid, 'Content-Type': 'application/json'};
            var env = envObj;

            var data = {};
            var serverdata = getTemplate(t, domain, platform, serverObj, adminObj);


            data.user_data = new Buffer(serverdata.script).toString('base64');
            data.tenant_id = env.tid;
            data.source_type = 'image';
            data.security_groups = [
                {
                    "name": serverdata.secgroup
                }
            ];
            data.key_name = serverdata.key;
            data.name = serverdata.name;
            data.imageRef = serverdata.imageRef; //"windows_server_2012_r2_standard_eval_kvm_20140607-raw";
            data.flavorRef = serverdata.flavorRef;// "WinServer2012.flavor";
            if (serverObj.networkID){
                data.networks = [];
                var n = {};
                n.uuid = serverObj.networkID;
                data.networks.push(n);
            }
            var d = {};
            d.server = data;

            var ssl = true;
            if (adminObj.ssl !== undefined && adminObj.ssl !== null){
                ssl = adminObj.ssl;
            }

            http.postData(d, env.url, 8774, '/' + envObj.compapi + '/' + env.tid + '/servers', headers, ssl, null, function(err, result){
                if (!err){
                    var obj = JSON.parse(result);
                    if (obj.overLimit && obj.overLimit.code == 413){
                        callback("No more VM capacity " + obj.overLimit.message, null);

                    }
                    else if (obj.badRequest && obj.badRequest.message){
                      callback("Cannot spin up VM " + obj.badRequest.message, null);
                    }
                    else {
                        callback(null, obj.server);
                    }
                }
                else {
                    console.log(err);
                    callback(err, null);
                }
                //in case the quota are exceeded following json is sent in result param: {overLimit:{code:413, message:"Quota exceeded.."}}
            });
        }
    });
}

exports.deleteServer = function(req, res, next){
    var objID = req.params.id;
    deleteObject(objID, null, function(err, result){
        if (err) {
            next('Unable delete VM. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

exports.cmdDeleteVM = function(objID, envObj, callback){
  envObj.authurl = envObj.url;
    deleteObject(objID, envObj, function(err, result){
        if (callback){
            callback(err, result);
        }
    });
}

exports.deleteVM = function(req, res, next){
    console.log("Delete VM called");
    var objID = req.params.id;
    console.log("VM id ", objID);
    var adminObj = {};
    adminObj.uname = req.params.uname;
    adminObj.upass = req.params.upass;
    adminObj.authurl = req.params.authurl;
    adminObj.tid = req.params.tid;
    adminObj.ssl = req.params.authurl == "https";
    adminObj.clength = req.params.clength == "true";
    adminObj.url = req.params.novaurl;

    deleteObject(objID, adminObj, function(err, result){
        if (err) {
            next('Unable delete VM. ' + err);
        }
        else{
            res.send(result);
        }
    });
}

function deleteObject(objID, envObj, callback){
    auth(envObj, function(err, tokenid) {
        if (err) {
            callback(err, null);
        }
        else {

            var url = envObj.url;
            if (!url){
                url = "api-trial2.client.metacloud.net";
            }
            var headers = {"X-Auth-Token": tokenid};

            var ssl = true;
            if (envObj.ssl !== undefined && envObj.ssl !== null){
                ssl = envObj.ssl;
            }

            http.deleteData(url, 8774, '/v2/' + envObj.tid + '/servers/' + objID, headers, ssl, function (err, result) {
                callback(err, result);
            });
        }
    });
}

exports.getTemplate = function(type, domain, platform, serverObj, adminObj){
    return getTemplate(type, domain, platform, serverObj, adminObj);
}

function getTemplate(type, domain, platform, serverObj, adminObj){
    var serverdata = {};
    if (! serverObj.imageRef && serverObj.template){
        serverObj.imageRef = serverObj.template;
    }

    switch (type){
        case 'dc': //install
            serverdata.script = getDCFull(domain);
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-dc";
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            break;
        case 'lm': //install
            serverdata.script = getLMTemplate(domain, platform, serverObj.name);
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-lm";
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            break;
        case 'sql': //install
            serverdata.script = getSQLTemplate(domain, platform);
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-dc";
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            break;
        case 'win': //install
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef : "583658dd-062d-45f8-9639-6ea1a377dbf6"; //"windows_server_2012_r2_standard_eval_kvm_20140607-raw";
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            serverdata.name = serverObj.name;
            serverdata.script = getWebAppInstallTemplate(domain, platform, serverdata.name);
            break;
        case 'webwin': //autoscale
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef : "583658dd-062d-45f8-9639-6ea1a377dbf6"; //"apprenda-webapp";
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef :  "71ae6fa4-d889-41c6-bd62-e6cc78fcf835";// "WinServer2012.flavor";
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-ws-07";
            serverdata.script = getWebWinTempl(domain, platform, serverdata.name, serverObj);
            break;
        case 'weblinux'://autoscale
        case 'lin':
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef : "8dde920a-20b7-4a04-acfb-7fa1c21da5e6"; //m1.large
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "4f4fbb3c-38b7-4329-92bd-2b93a2c8e4c8"; //Centos 6.4
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-ln-07";
            serverdata.script = getWebLinuxTempl651(domain, platform, serverdata.name, serverObj);
            break;
        case 'rabbit':
            serverdata.script = getRabbitTempl(adminObj);
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef : "8dde920a-20b7-4a04-acfb-7fa1c21da5e6"; //m1.large
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "54aeacd7-64e6-46e7-a6a7-fb67dd0757d1"; //Ubuntu 12
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-rabbitmq";
            break;
        case 'mongo':
            serverdata.script = getMongoTemplate(adminObj);
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef : "8dde920a-20b7-4a04-acfb-7fa1c21da5e6"; //m1.large
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "54aeacd7-64e6-46e7-a6a7-fb67dd0757d1"; //Ubuntu 12
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-mongo";
            break;
        case 'postgres':
            serverdata.script = getPostgresTemplate(adminObj, serverObj);
            serverdata.flavorRef = serverObj && serverObj.flavorRef ? serverObj.flavorRef : "8dde920a-20b7-4a04-acfb-7fa1c21da5e6"; //m1.large
            serverdata.imageRef = serverObj && serverObj.imageRef ? serverObj.imageRef :  "54aeacd7-64e6-46e7-a6a7-fb67dd0757d1"; //Ubuntu 12
            serverdata.name = serverObj && serverObj.name ? serverObj.name : "app-postgres";
            break;
    }

    serverdata.key = serverObj && serverObj.key ? serverObj.key : "metapod";
    serverdata.secgroup = serverObj && serverObj.secgroup ? serverObj.secgroup : "apprenda";
    return serverdata;
}

function getuserdata(nodename, params, callback){
  if(params.templateUrl){
    http.downloadfilecontent(params.templateUrl, function(err, path){
      if (err){
        callback(err);
      }
      else{
          readTemplateFile(path, params, function (err, str) {
            console.log('usertempl. loaded', err, str);
            callback(err, str);
          });
      }
    });
  }
  else {
    var path;
    switch (nodename) {
      case 'dc':
        path = __dirname + '/../app/installscripts/dc.ps1';
        break;
      case 'lm':
        path = __dirname + '/../app/installscripts/lm.ps1';
        break;
      case 'sql':
        path = __dirname + '/../app/installscripts/sql.ps1';
        break;
      case 'win':
        path = __dirname + '/../app/installscripts/win.ps1';
        break;
      case 'lin':
        path = __dirname + '/../app/installscripts/linuxadd.sh';
        break;
      case 'seed':
        path = __dirname + '/../app/installscripts/linuxstarter.sh';
        break;
    }
    if (path) {
      readTemplateFile(path, params, function (err, str) {
        callback(err, str);
      });
    }
    else {
      callback("Node type not supported", null);
    }
  }
}

exports.getuserdata = function(nodename, params, callback){
  getuserdata(nodename, params, callback);
}

exports.getheattemplate = function(type, serverObj, callback){
  getheattemplate(type, serverObj, callback);
}

function getheattemplate(type, serverObj, callback){
  if (!type){
    type = "seed";
  }
  var io = require('../core/io');
  var path = __dirname + '/../app/installscripts/HEATsingle.tmpl';
  io.readFile(path, null, function(err, data){
    if (err){
      callback("Cannot read template for " + filename + ". " + err, null);
    }
    else{
      var s = data.toString();
      for (var key in serverObj){
        if (serverObj[key]) {
          s = s.replace("^^" + key + "^^", serverObj[key]);
        }
      }
      getuserdata(type, serverObj.params, function(err, ud){
        if (err){
          callback(err);
        }
        else{
          s = s.replace("^^userdata^^", ud);
          callback(null, s);
        }
      });
    }
  });
}

function buildHeatParams(serverObj){
  var params
}

function readTemplateFile(filename, params, callback){
  var io = require('../core/io');
  io.readFile(filename, null, function(err, data){
    if (err){
      callback("Cannot read template for " + filename + ". " + err, null);
    }
    else{
      var s = data.toString();
      if (params){
        for (var key in params){
          if (params[key]) {
            s = s.replace("^^" + key + "^^", params[key]);
          }
        }
      }
      callback(null, s);
    }
  });

}

function getWebLinuxTempl(domain, platform, serverName){
   return "#!/bin/bash \n" +
       "sed -i \"s/mirrorlist=https/mirrorlist=http/\" /etc/yum.repos.d/epel.repo\n" +
       "yum check-update\n" +
       "yum -y install libcgroup cifs-utils nano openssh-clients libcgroup-tools unzip iptables-services net-tools\n" +
       "service cgconfig start\n" +
       "echo \"root:" + domain.pass + "\" | chpasswd\n" +
       "echo \"Updating domain info in resolv.conf\" \n" +
       "cat > /etc/resolv.conf << EOF\n" +
       "nameserver " + domain.dns + "\n" + 
       "search " + domain.name + "\n" + 
       "domain " + domain.name + "\n" + 
       "EOF\n" + 
       "chattr +i /etc/resolv.conf\n" + 
       "echo \"Updating sshd to allow root login via ssh\" \n" + 
       "file=/etc/ssh/sshd_config\n" + 
       "cp -p $file $file.old &&\n" + 
       "while read key other\n" + 
       "do\n" + 
       "    case $key in\n" + 
       "PasswordAuthentication) other=yes;;\n" + 
       "PermitRootLogin) other=yes;;\n" + 
       "esac\n" + 
       "echo \"$key $other\" \n" + 
       "done < $file.old > $file \n" + 
       "echo \"Creating repo mounts\" \n" + 
       "mkdir -p /apprenda/repo/apps\n" + 
       "mkdir -p /apprenda/repo/sys\n" + 
       "echo \"//" + platform.repo +  "/Applications /apprenda/repo/apps cifs username=" + platform.admin + ",password=" + platform.pass + " 0 0\" >> /etc/fstab\n" + 
       "echo \"//" + platform.repo +  "/Apprenda /apprenda/repo/sys cifs username=" + platform.admin + ",password=" + platform.pass + " 0 0\" >> /etc/fstab\n" + 
       "mount -a\n" + 
       "echo \"Stop firewall\" \n" + 
       "service iptables stop\n" + 
       "chkconfig iptables off\n" +
       "wget http://installs.apprendalabs.com/hb/vmdone/" + serverName +  "/unknown/unknown/lin\n";
}

function getWebLinuxTempl651(domain, platform, serverName, serverObj){
    var s = "#!/bin/bash \n" +
        "sed -i \"s/mirrorlist=https/mirrorlist=http/\" /etc/yum.repos.d/epel.repo\n" +
        "yum check-update\n" +
        "yum -y install libcgroup cifs-utils nano openssh-clients libcgroup-tools unzip iptables-services net-tools\n" +
        "tee /etc/yum.repos.d/docker.repo <<-'EOF' \n" +
        "[dockerrepo]\n" +
        "name=Docker Repository\n" +
        "baseurl=https://yum.dockerproject.org/repo/main/centos/7\n" +
        "enabled=1\n" +
        "gpgcheck=1\n" +
        "gpgkey=https://yum.dockerproject.org/gpg\n" +
        "EOF\n" +
        "yum install -y docker-engine\n" +
        "mkdir /etc/systemd/system/docker.service.d\n" +
        "touch /etc/systemd/system/docker.service.d/docker.conf\n" +
        "cat > /etc/systemd/system/docker.service.d/docker.conf << EOF\n" +
        "[Service]\n" +
        "ExecStart=\n" +
        "ExecStart=/usr/bin/docker daemon -H fd:// --exec-opt native.cgroupdriver=systemd\n" +
        "EOF\n" +
        "systemctl daemon-reload\n" +
        "systemctl start docker\n" +
        "systemctl enable docker\n" +
        "service cgconfig start\n" +
        "echo \"root:" + domain.pass + "\" | chpasswd\n" +
        "echo \"Updating domain info in resolv.conf\" \n" +
        "cat > /etc/resolv.conf << EOF\n" +
        "nameserver " + domain.dns + "\n" +
        "search " + domain.name + "\n" +
        "domain " + domain.name + "\n" +
        "EOF\n" +
        "chattr +i /etc/resolv.conf\n" +
        "echo \"Updating hosts file\" \n" +
        "var=$(hostname -I)\n" +
        "echo \"$var " + serverName + "\" >> /etc/hosts\n" +
        "echo \"Updating sshd to allow root login via ssh\" \n" +
        "file=/etc/ssh/sshd_config\n" +
        "cp -p $file $file.old &&\n" +
        "while read key other\n" +
        "do\n" +
        "    case $key in\n" +
        "PasswordAuthentication) other=yes;;\n" +
        "PermitRootLogin) other=yes;;\n" +
        "esac\n" +
        "echo \"$key $other\" \n" +
        "done < $file.old > $file \n" +
        "echo \"Creating repo mounts\" \n" +
        "mkdir -p /apprenda/repo/apps\n" +
        "mkdir -p /apprenda/repo/sys\n" +
        "echo \"//" + platform.repo +  "/Applications /apprenda/repo/apps cifs username=" + platform.admin + ",password=" + platform.pass + " 0 0\" >> /etc/fstab\n" +
        "echo \"//" + platform.repo +  "/Apprenda /apprenda/repo/sys cifs username=" + platform.admin + ",password=" + platform.pass + " 0 0\" >> /etc/fstab\n" +
        "mount -a\n" +
        "echo \"Stop firewall\" \n" +
        "service iptables stop\n" +
        "chkconfig iptables off\n" +
        "cd /apprenda/repo/sys/6.5.1/System/Nodes/RPM\n" +
        "ls | grep -v rhel7 | xargs yum -y localinstall \n" +
        "/apprenda/apprenda-updater/bin/configure-node.sh -a /apprenda/repo/apps -s /apprenda/repo/sys -h " + serverName + " -o /tmp/output.log -c http://" + platform.url + "\n";
    if (serverObj && serverObj.scalerurl) {
        s = s + "wget " + serverObj.scalerurl + "hb/install/" + serverName + "/lin\n";
    }
    return s;
}

function getWebWinTempl(domain, platform, serverName, serverObj){
    return "#ps1_sysnative\n" +
    "$domain = \"" + domain.name + "\"\n" +
    "$password = \"" + domain.pass + "\" | ConvertTo-SecureString -asPlainText -Force\n" +
    "$username = \"$domain\\" + domain.admin + "\"\n" +
    "$credential = New-Object System.Management.Automation.PSCredential($username,$password)\n" +
    "Set-DnsClientServerAddress -InterfaceAlias \"Ethernet\" -ServerAddresses " + domain.dns + "\n" +
    "Add-Computer -DomainName $domain -Credential $credential | Out-Null\n" +
    "Set-Service NetTcpPortSharing -startuptype \"automatic\" | Out-Null\n" +
    "start-service -name NetTcpPortSharing  | Out-Null\n" +
    "$regkey = \"HKLM:\\Software\\Microsoft\\MSDTC\\Security\"\n" +
    "$regkeyroot = \"HKLM:\\Software\\Microsoft\\MSDTC\"\n"+
    "Set-ItemProperty -Path $regkey -Name NetworkDtcAccess -Value 1\n" +
    "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessClients -Value 1\n" +
    "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessInbound -Value 1\n" +
    "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessOutbound -Value 1\n" +
    "Set-ItemProperty -Path $regkeyroot -Name AllowOnlySecureRpcCalls -Value 0\n" +
    "Set-ItemProperty -Path $regkeyroot -Name TurnOffRpcSecurity -Value 1\n" +
    "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessTransactions -Value 1\n" +
    "Set-ItemProperty -Path $regkey -Name XaTransactions -Value 1\n" +
        //"Set-Service msdtc -startuptype \"automatic\" | Out-Null\n" +
    "Restart-Service msdtc | Out-Null\n" +
    "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False\n" +
    "$admin = \"" + domain.name + "\\" + platform.admin + "\"\n" +
    "$sys = \"" + domain.name + "\\" + platform.sys + "\"\n" +
    "$locallogon = \"SeInteractiveLogonRight\"\n" +
    "$imp = \"SeImpersonatePrivilege\"\n" +
    "$CarbonDllPath = \"c:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Carbon\\bin\\Carbon.dll\"\n" +
    "[Reflection.Assembly]::LoadFile($CarbonDllPath)\n" +
    "[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)\n" +
    "[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)\n" +
    "[Carbon.Lsa]::GrantPrivileges($admin, $imp)\n" +
    "[Carbon.Lsa]::GrantPrivileges($sys, $imp)\n" +
    "Install-WindowsFeature -Name Web-Server,AS-NET-Framework,Web-Net-Ext,Web-Net-Ext45,Web-ASP,Web-Asp-Net,Web-Asp-Net45 | Out-Null\n" +
    "Invoke-WebRequest -URI " + serverObj.scalerurl + "hb/install/" + serverName +  "/web -UseBasicParsing\n" +
    "Restart-Computer\n";

}

function getDCFull(domain){
    return "#ps1_sysnative\n" +
    "$LocalAdmin = \"Administrator\"\n" +
    "$objUser = [ADSI]\"WinNT://localhost/$($LocalAdmin), user\"\n" +
    "$objUser.psbase.Invoke(\"SetPassword\", \"" + domain.pass + "\")\n" +
    "Install-WindowsFeature -name AD-Domain-Services -IncludeManagementTools | Out-Null\n" +
    "$dsrmPassword = (ConvertTo-SecureString -AsPlainText -Force -String \"" + domain.pass + "\")\n" +
    "Install-ADDSForest -DomainName \"" + domain.name + "\" -InstallDNS -Force -SafeModeAdministratorPassword $dsrmPassword -ForestMode Win2012R2 -DomainMode Win2012R2 | Out-Null\n" +
    "$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq \"Ethernet\"}\n" +
    "$sname = $env:computername\n" +
    "$url = \"http://installs.apprendalabs.com/hb/vmdone/$($sname)/extIP/$($localIP.IPAddress)/dc\"\n" +
    "write-output $url\n" +
    "Invoke-WebRequest -URI $url -UseBasicParsing\n";
}

function getDCShort(){
    return "#ps1_sysnative\n" +
    "$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq \"Ethernet\"}\n" +
    "$sname = $env:computername\n" +
    "$url = \"http://installs.apprendalabs.com/hb/vmdone/$($sname)/$($localIP.IPAddress)/$($localIP.IPAddress)/dc\"\n" +
    "write-output $url\n" +
    "Invoke-WebRequest -URI $url -UseBasicParsing\n";
}

function getLMTemplate(domain, platform, serverName){
    var s = "#ps1_sysnative\n" +
        "$LocalAdmin = \"Administrator\"\n" +
        "$objUser = [ADSI]\"WinNT://localhost/$($LocalAdmin), user\"\n" +
        "$objUser.psbase.Invoke(\"SetPassword\", \"" + domain.pass + "\")\n" +
        "$domain = \"" + domain.name + "\"\n" +
        "$password = \"" + domain.pass + "\" | ConvertTo-SecureString -asPlainText -Force\n" +
        "$username = \"$domain\\" + domain.admin + "\"\n" +
        "$credential = New-Object System.Management.Automation.PSCredential($username,$password)\n" +
        "Set-DnsClientServerAddress -InterfaceAlias \"Ethernet\" -ServerAddresses " + domain.dns + "\n" +
        "Add-Computer -DomainName $domain -Credential $credential | Out-Null\n" +
        "Set-Service NetTcpPortSharing -startuptype \"automatic\" | Out-Null\n" +
        "start-service -name NetTcpPortSharing  | Out-Null\n" +
        "Uninstall-Dtc -Confirm:$False | Out-Null\n" +
        "Install-Dtc -LogPath \"C:\\log\" -StartType \"AutoStart\" | Out-Null\n" +
        "$regkey = \"HKLM:\\Software\\Microsoft\\MSDTC\\Security\"\n" +
        "$regkeyroot = \"HKLM:\\Software\\Microsoft\\MSDTC\"\n"+
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccess -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessClients -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessInbound -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessOutbound -Value 1\n" +
        "Set-ItemProperty -Path $regkeyroot -Name AllowOnlySecureRpcCalls -Value 0\n" +
        "Set-ItemProperty -Path $regkeyroot -Name TurnOffRpcSecurity -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessTransactions -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name XaTransactions -Value 1\n" +
        "Restart-Service msdtc | Out-Null\n" +
        "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False\n" +
        "$admin = \"" + domain.name + "\\" + platform.admin + "\"\n" +
        "$sys = \"" + domain.name + "\\" + platform.sys + "\"\n" +
        "$locallogon = \"SeInteractiveLogonRight\"\n" +
        "$imp = \"SeImpersonatePrivilege\"\n" +
        "$servicelogon = \"SeServiceLogonRight\"\n" +
        "$CarbonDllPath = \"c:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Carbon\\bin\\Carbon.dll\"\n" +
        "[Reflection.Assembly]::LoadFile($CarbonDllPath)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $imp)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $imp)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $servicelogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $servicelogon)\n" +
        "Install-WindowsFeature -Name Web-Server,AS-NET-Framework,Web-Net-Ext,Web-Net-Ext45,Web-ASP,Web-Asp-Net,Web-Asp-Net45 | Out-Null\n" +
        //"Install-WindowsFeature DNS | Out-Null\n" +
        "$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq \"Ethernet\"}\n" +
        "$file = \"C:\\Windows\\System32\\drivers\\etc\\hosts\"\n" +
        "$($localIP.IPAddress)+ \"`t`t\" + \"apps." + platform.url + "\" | Out-File -encoding ASCII -append $file\n" +
        "New-Item \"C:\\builder\\temp\" -type directory -force\n" +
        "$webClient = New-Object System.Net.WebClient\n" +
        "(iex ($webClient.DownloadString(\"https://chocolatey.org/install.ps1\")))>$null 2>&1 | Out-Null\n" +
        "$webClient.DownloadFile(\"http://installs.apprendalabs.com/docs/apporchinit.ps1\",\"c:\\builder\\temp\\apporchinit.ps1\") | Out-Null\n" +
        "Invoke-Expression \"c:\\builder\\temp\\apporchinit.ps1\" | Out-Null\n"+
        "choco install -y iis-arr --force | OutNull\n" +
        "$sname = $env:computername\n";
        if (!platform.supportexip){
                s = s + "$url = \"http://installs.apprendalabs.com/hb/vmdone/$($sname)/unknown/$($localIP.IPAddress)/lm\"\n";
        }
        else{
            s = s + "$url = \"http://installs.apprendalabs.com/hb/vmdone/$($sname)/$($localIP.IPAddress)/$($localIP.IPAddress)/lm\"\n";
        }

        s = s + "write-output $url\n" +
        "Invoke-WebRequest -URI $url -UseBasicParsing\n" +
        "Restart-Computer\n";

    return s;
    //"Stop-Service -name appinstall  | Out-Null\n" +
    //"$LocalSrv = Get-WmiObject Win32_service -filter \"name='appinstall'\"\n" +
    //"$LocalSrv.Change($null,$null,$null,$null,$null,$false, $username" + ",\"" + domain.pass + "\") | Out-Null\n" +
    //"Start-Service -name appinstall  | Out-Null\n" +
}
function getSQLTemplate(domain, platform){
    var s = "#ps1_sysnative\n" +
        "$LocalAdmin = \"Administrator\"\n" +
        "$objUser = [ADSI]\"WinNT://localhost/$($LocalAdmin), user\"\n" +
        "$objUser.psbase.Invoke(\"SetPassword\", \"" + domain.pass + "\")\n" +
        "$domain = \"" + domain.name + "\"\n" +
        "$password = \"" + domain.pass + "\" | ConvertTo-SecureString -asPlainText -Force\n" +
        "$username = \"$domain\\" + domain.admin + "\"\n" +
        "$credential = New-Object System.Management.Automation.PSCredential($username,$password)\n" +
        "Set-DnsClientServerAddress -InterfaceAlias \"Ethernet\" -ServerAddresses " + domain.dns + "\n" +
        "Add-Computer -DomainName $domain -Credential $credential | Out-Null\n" +
        "Set-Service NetTcpPortSharing -startuptype \"automatic\" | Out-Null\n" +
        "start-service -name NetTcpPortSharing  | Out-Null\n" +
        "Uninstall-Dtc -Confirm:$False | Out-Null\n" +
        "Install-Dtc -LogPath \"C:\\log\" -StartType \"AutoStart\" | Out-Null\n" +
        "$regkey = \"HKLM:\\Software\\Microsoft\\MSDTC\\Security\"\n" +
        "$regkeyroot = \"HKLM:\\Software\\Microsoft\\MSDTC\"\n"+
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccess -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessClients -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessInbound -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessOutbound -Value 1\n" +
        "Set-ItemProperty -Path $regkeyroot -Name AllowOnlySecureRpcCalls -Value 0\n" +
        "Set-ItemProperty -Path $regkeyroot -Name TurnOffRpcSecurity -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessTransactions -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name XaTransactions -Value 1\n" +
        "Restart-Service msdtc | Out-Null\n" +
        "Restart-Service -name appinstall  | Out-Null\n" +
        "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False\n" +
        "$admin = \"" + domain.name + "\\" + platform.admin + "\"\n" +
        "$sys = \"" + domain.name + "\\" + platform.sys + "\"\n" +
        "$locallogon = \"SeInteractiveLogonRight\"\n" +
        "$imp = \"SeImpersonatePrivilege\"\n" +
        "$CarbonDllPath = \"c:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Carbon\\bin\\Carbon.dll\"\n" +
        "[Reflection.Assembly]::LoadFile($CarbonDllPath)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $imp)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $imp)\n" +
        "New-Item \"C:\\Repo\\Apprenda\" -type directory -force\n" +
        "New-Item \"C:\\Repo\\Applications\" -type directory -force\n" +
        "New-Item \"C:\\Repo\\SAC\" -type directory -force\n" +
        "New-SMBShare -Name \"Apprenda\" -Path \"C:\\Repo\\Apprenda\" -FullAccess Everyone\n" +
        "New-SMBShare -Name \"Applications\" -Path \"C:\\Repo\\Applications\" -FullAccess Everyone\n" +
        "New-SMBShare -Name \"SAC\" -Path \"C:\\Repo\\SAC\" -FullAccess Everyone\n" +
        "$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq \"Ethernet\"}\n" +
        "$sname = $env:computername\n" +
        "$url = \"http://installs.apprendalabs.com/hb/vmdone/$($sname)/$($localIP.IPAddress)/$($localIP.IPAddress)/sql\"\n" +
        "write-output $url\n" +
        "Invoke-WebRequest -URI $url -UseBasicParsing\n" +
        "Restart-Computer\n";
    return s;
}

function getWebAppInstallTemplate(domain, platform, serverName){
    var s =  "#ps1_sysnative\n" +
        "$domain = \"" + domain.name + "\"\n" +
        "$password = \"" + domain.pass + "\" | ConvertTo-SecureString -asPlainText -Force\n" +
        "$username = \"$domain\\" + domain.admin + "\"\n" +
        "$credential = New-Object System.Management.Automation.PSCredential($username,$password)\n" +
        "Set-DnsClientServerAddress -InterfaceAlias \"Ethernet\" -ServerAddresses " + domain.dns + "\n" +
        "Add-Computer -DomainName $domain -Credential $credential | Out-Null\n" +
        "Set-Service NetTcpPortSharing -startuptype \"automatic\" | Out-Null\n" +
        "start-service -name NetTcpPortSharing  | Out-Null\n" +
        "Uninstall-Dtc -Confirm:$False | Out-Null\n" +
        "Install-Dtc -LogPath \"C:\\log\" -StartType \"AutoStart\" | Out-Null\n" +
        "$regkey = \"HKLM:\\Software\\Microsoft\\MSDTC\\Security\"\n" +
        "$regkeyroot = \"HKLM:\\Software\\Microsoft\\MSDTC\"\n"+
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccess -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessClients -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessInbound -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessOutbound -Value 1\n" +
        "Set-ItemProperty -Path $regkeyroot -Name AllowOnlySecureRpcCalls -Value 0\n" +
        "Set-ItemProperty -Path $regkeyroot -Name TurnOffRpcSecurity -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name NetworkDtcAccessTransactions -Value 1\n" +
        "Set-ItemProperty -Path $regkey -Name XaTransactions -Value 1\n" +
        "Restart-Service msdtc | Out-Null\n" +
        "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False\n" +
        "$admin = \"" + domain.name + "\\" + platform.admin + "\"\n" +
        "$sys = \"" + domain.name + "\\" + platform.sys + "\"\n" +
        "$locallogon = \"SeInteractiveLogonRight\"\n" +
        "$imp = \"SeImpersonatePrivilege\"\n" +
        "$CarbonDllPath = \"c:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules\\Carbon\\bin\\Carbon.dll\"\n" +
        "[Reflection.Assembly]::LoadFile($CarbonDllPath)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $locallogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $locallogon)\n" +
        "[Carbon.Lsa]::GrantPrivileges($admin, $imp)\n" +
        "[Carbon.Lsa]::GrantPrivileges($sys, $imp)\n" +
        "Install-WindowsFeature -Name Web-Server,AS-NET-Framework,Web-Net-Ext,Web-Net-Ext45,Web-ASP,Web-Asp-Net,Web-Asp-Net45 -IncludeManagementTools | Out-Null\n" +
        "$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript {$_.InterfaceAlias -eq \"Ethernet\"}\n" +
        "$sname = $env:computername\n" +
        "(iex ($webClient.DownloadString(\"https://chocolatey.org/install.ps1\")))>$null 2>&1 | Out-Null\n" +
        "choco install -y sql2008.smo | OutNull\n" +
        "$url = \"http://installs.apprendalabs.com/hb/vmdone/$($sname)/unknown/$($localIP.IPAddress)/win\"\n" +
        "write-output $url\n";
    if (platform.lmInternalIP){
        s = s + "$r = Invoke-WebRequest -URI $url -UseBasicParsing\n" +
        "write-output $r.content\n" +
        "if ($r.content -eq \"install\"){Invoke-WebRequest -URI \"http://" + platform.lmInternalIP + ":8024/hb/kickoff\" -UseBasicParsing}\n" +
        "Restart-Computer\n";
    }
    else{
        s = s + "Invoke-WebRequest -URI $url -UseBasicParsing\n" +
        "Restart-Computer\n";
    }

    return s;
}

function getRabbitTempl(adminObj){
    return "#!/bin/bash \n"+
        "wget https://www.rabbitmq.com/rabbitmq-signing-key-public.asc\n" +
        "sudo apt-key add rabbitmq-signing-key-public.asc\n"+
        "echo \"deb http://www.rabbitmq.com/debian/ testing main\" >> /etc/apt/sources.list\n" +
        "apt-get update\n" +
        "sudo apt-get -q -y install rabbitmq-server\n" +
        "rabbitmqctl add_user " + adminObj.uname + " " + adminObj.spass + "\n" +
        "rabbitmqctl set_user_tags " + adminObj.uname + " administrator\n" +
        "rabbitmqctl set_permissions -p / " + adminObj.uname + " \".*\" \".*\" \“.*\”\n";
}

function getMongoTemplate(adminObj){
    return "#!/bin/bash \n"+ "" +
        "sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10\n" +
        "echo \"deb http://repo.mongodb.org/apt/ubuntu precise/mongodb-org/3.0 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list\n" +
        "sudo apt-get update\n" +
        "sudo apt-get install -y mongodb-org\n" +
        "$ echo 'db.createUser({user: " + adminObj.uname + ",pwd: " + adminObj.upass + ",roles: [ { role: \"userAdminAnyDatabase\", db: \"admin\" } ] });' > file.js\n" +
        "$ mongo admin file.js\n";
}

function getPostgresTemplate(adminObj, serverObj){
    var templ =  "#!/bin/bash \n" +
        "sudo apt-get update\n" +
        "sudo apt-get -q -y install postgresql postgresql-contrib\n";
    if (serverObj.options && serverObj.options.indexOf("GIS") > -1){
        templ += "sudo apt-get install python-software-properties\n" +
        "sudo apt-add-repository ppa:ubuntugis/ppa\n" +
        "sudo apt-get update\n" +
        "sudo apt-get install postgresql-9.1-postgis\n";
    }
    return templ;
}
