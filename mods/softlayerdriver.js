//check if server is created. https://username:apiKey@api.softlayer.com/rest/v3/SoftLayer_Virtual_Guest/1301396/getObject?objectMask=provisionDate
//create server: https://username:apiKey@api.softlayer.com/rest/v3/SoftLayer_Virtual_Guest
//{
//    "parameters":[
//    {
//        "hostname": "app-dc",
//        "domain": "apprendademo.local",
//        "datacenter": {
//            "name": "dal05"
//        },
//        "startCpus": 2,
//        "maxMemory": 4096,
//        "hourlyBillingFlag": true,
//        "blockDevices": [
//            {
//                "device": "0",
//                "diskImage": {
//                    "capacity": 100
//                }
//            }
//        ],
//        "localDiskFlag": true,
//        "operatingSystemReferenceCode": "WIN_2012-STD-R2_64",
//        "postInstallScriptUri" : "https://s3.amazonaws.com/sashascripts/test.ps1"
//    }
//]
//}
//{
//    "parameters":[
//    {
//        "hostname": "app-dc",
//        "domain": "apprendademo.local",
//        "datacenter": {
//            "name": "dal05"
//        },
//        "startCpus": 2,
//        "maxMemory": 4096,
//        "hourlyBillingFlag": true,
//        "localDiskFlag": true,
//        "blockDeviceTemplateGroup": {
//            "globalIdentifier": "de754697-c404-47f4-8f2b-c933a04ded27"
//        },
//        "postInstallScriptUri" : "https://s3.amazonaws.com/sashascripts/test.ps1"
//    }
//]
//}
//set-executionpolicy remotesigned
//GET SoftLayer_Virtual_Guest/id/deleteObject  or DELETE SoftLayer_Virtual_Guest/id
//$localIP = Get-NetIPAddress –AddressFamily IPv4 | Where-Object -FilterScript { $_.InterfaceIndex -Gt 1 -and $_.InterfaceAlias -eq "Ethernet" }
//$externalIP = Get-NetIPAddress –AddressFamily IPv4 | Where-Object -FilterScript { $_.InterfaceIndex -Gt 1 -and $_.InterfaceAlias -eq "Ethernet 2" }  or PrivateNetwork-A and PublicNetwork-A
//echo $externalIP.IPAddress
var io = require('../core/io');
var http = require('../core/httpservice');
var batch = [];

exports.testSaveFile = function(req, res, next){
    io.savePSFile('/users/ajeltuhin/dev/scripts/savetest.ps1', getWebLinuxTempl(null, null, "app-ln-01"), function(err){
        if (err){
            next("Error saving file", err);
        }
        else{
            res.send({msg:"OK"});
        }
    })
}

exports.testCreate = function(req, res, next){
    batch = [];
    var dctemplid = "808a6477-3f79-4419-b8f7-063ab71fbea4";
    var lmtemplid = "a849c8fb-efac-4bc1-9a60-eb03fef3ec9c";
    var sqltemplid = "93a37447-d456-4792-94b4-81c851293676";
    var dc = "dal05";
    var domainObj = {};
    domainObj.name = "apprendademo.local";

    var envObj = {};
    envObj.apiuser = "IBM777839";
    envObj.apipass = "562f109e51e934e09c8e7dd837924a2a5d6901d9ef3700acf2f1d5d552b779ad";
    envObj.scripturl = "https://installs/apprendalabs.com/scripts/";
    envObj.scriptrepo = "/users/ajeltuhin/dev/testscripts/";

    var dcObj = {};
    dcObj.dc = dc;
    dcObj.template = dctemplid;
    dcObj.type = "dc";
    dcObj.name = "app-dc";
    batch.push(dcObj);

    var lmObj = {};
    lmObj.dc = dc;
    lmObj.template = lmtemplid;
    lmObj.type = "lm";
    dcObj.name = "app-lm";
    batch.push(lmObj);

    var sqlObj = {};
    sqlObj.dc = dc;
    sqlObj.template = sqltemplid;
    sqlObj.type = "sql";
    dcObj.name = "app-sql";
    batch.push(sqlObj);

    var c = 0;
    for(var i = 0; i < batch.length; i++) {
        var serverObj = batch[i];
        createVM(null, null, envObj, serverObj, null, function (err, result) {
            c++;
            if (c == batch.length){
                res.send({msg: "done"});
            }
        });
    }
}

exports.cmdAddVM = function(domainObj, platformObj, envObj, serverObj, adminObj,  callback){
    createVM(domainObj, platformObj, envObj, serverObj, adminObj,function(err, result){
        if (err) {
            callback(err, null);
        }
        else{
            callback(null, result);
        }
    });
}

function createVM(domainObj, platformObj, envObj, serverObj, adminObj, callback){

    var domain = domainObj;
    if (!domain) {
        domain = {};
        domain.name = "apprendademo.local";
        domain.admin = "apprendaadmin";
        domain.pass = "@pp4ever";
        domain.dns = "10.2.4.4";
    }
    var platform = platformObj;
    if (!platform) {
        platform = {};
        platform.admin = "apprendaadmin";
        platform.pass = domain.pass;
        platform.sys = "apprendasystem";
        platform.repo = "10.2.4.3";
    }
    var headers = {"Content-Type": 'application/json', 'Accept': 'application/json'};
    var env = envObj;
    if (!env) {
        env = {};
        env.apiuser = "IBM777839";
        env.apipass = "562f109e51e934e09c8e7dd837924a2a5d6901d9ef3700acf2f1d5d552b779ad";
        env.scripturl = "https://installs.apprendalabs.com/pscripts/";
        env.scriptrepo = "c:\\builder\\scripts\\";
    }
    var data = {};
    data.parameters = [];
    var p = {};
    data.parameters.push(p);
    p.hostname = serverObj.name;
    p.domain = domain.name;
    p.datacenter = {};
    p.datacenter.name = serverObj.dc;
    p.startCpus = 2;
    p.maxMemory = 4096;
    p.hourlyBillingFlag = true;
    p.localDiskFlag =  true;
    p.blockDeviceTemplateGroup = {};
    p.blockDeviceTemplateGroup.globalIdentifier = serverObj.template;
    var ext = serverObj.type == "lin" ? ".sh" : ".ps1";
    var scriptname = serverObj.name + ext;
    var scriptcontent = getTemplate(serverObj.type, domain, platform, serverObj, adminObj);
    if (scriptcontent) {
        var scriptpath = env.scripturl + scriptname;
        p.postInstallScriptUri = scriptpath;
        console.log("adding post script url", p.postInstallScriptUri);
    }
    var url = "api.softlayer.com";
    var auth = env.apiuser + ":" + env.apipass;
    io.savePSFile(env.scriptrepo + scriptname, scriptcontent, function(err){
        console.log("file " + scriptname + " save attempt", err);
        if (!err){
            http.postData(data, url, null, '/rest/v3/SoftLayer_Virtual_Guest', headers, true, auth, function(err, result){
                console.log(serverObj.name + " requested", err, result);
                callback(err, result);
            });
        }
    })
}

exports.getTemplate = function(type, domain, platform, serverObj, adminObj){
    return getTemplate(type, domain, platform, serverObj, adminObj);
}

function getTemplate(type, domain, platform, serverObj, adminObj){
    var templ;

    switch (type){
        case 'dc':
            templ = getDCTempl(domain, platform, serverObj.name);
            break;
        case 'lm':
            templ = getLMTempl(domain, platform, serverObj.name);
            break;
        case 'sql':
            templ = getLMTempl(domain, platform, serverObj.name);
            break;
        case 'win':
            templ = getLMTempl(domain, platform, serverObj.name);
            break;
        case 'lin':
            templ = getWebLinuxTempl(domain, platform, serverObj.name);
            break;
    }
    return templ;
}

function getDCTempl(domain, platform, serverName){
    return "﻿$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript { $_.InterfaceAlias -eq\"PrivateNetwork-A\" -or  $_.InterfaceAlias -eq \"Ethernet\" }\n" +
    "$externalIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript { $_.InterfaceAlias -eq \"PublicNetwork-A\" -or  $_.InterfaceAlias -eq \"Ethernet 2\" }\n" +
    "$sname = $env:computername\n" +
    "$url = \"https://installs.apprendalabs.com/hb/vmdone/$($sname)/$($externalIP.IPAddress)/$($localIP.IPAddress)/dc\"\n" +
    "write-output $url\n" +
    "Invoke-WebRequest -URI $url\n";
}

function getLMTempl(domain, platform, serverName){
    var s = "$domain = \"" + domain.name + "\"\n" +
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
        "﻿$localIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript { $_.InterfaceAlias -eq\"PrivateNetwork-A\" -or  $_.InterfaceAlias -eq \"Ethernet\" }\n" +
        "$externalIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object -FilterScript { $_.InterfaceAlias -eq \"PublicNetwork-A\" -or  $_.InterfaceAlias -eq \"Ethernet 2\" }\n" +
        "$sname = $env:computername\n" +
        "$url = \"https://installs.apprendalabs.com/hb/vmdone/$($sname)/$($externalIP.IPAddress)/$($localIP.IPAddress)/lm\"\n" +
        "write-output $url\n" +
        "Invoke-WebRequest -URI $url\n" +
        "Restart-Computer\n";
    return s;
}

function getWebLinuxTempl(domain, platform, serverName){
    return "#!/bin/bash \n" +
        "cat > /etc/resolv.conf << EOF\n" +
        "nameserver " + domain.dns + "\n" +
        "search apprendademo.local\n" +
        "domain apprendademo.local\n" +
        "EOF\n" +
        "chattr +i /etc/resolv.conf\n" +
        "echo \"root:" + domain.pass + "\" | chpasswd\n" +
        "echo \"//" + platform.repo +  "/Applications /apprenda/repo/apps cifs username=" + platform.admin + ",password=" + platform.pass + " 0 0\" >> /etc/fstab\n" +
        "echo \"//" + platform.repo +  "/Apprenda /apprenda/repo/sys cifs username=" + platform.admin + ",password=" + platform.pass + " 0 0\" >> /etc/fstab\n" +
        "mount -a\n" +
        "WGET https://installs.apprendalabs.com/hb/vmdone/" + serverName + "/ipx/ip/lin\n";
}
