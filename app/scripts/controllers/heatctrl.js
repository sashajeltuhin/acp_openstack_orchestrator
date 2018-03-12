angular.module('openapp').controller('heatctrl', ['$scope', '$location', '$http', '$routeParams', 'stackservice', 'msgservice', 'socketservice', '$cookies', function($scope, $location, $http, $routeParams, stackservice, msgservice, socketservice, $cookies){
  $scope.template = {};
  $scope.serverObj = {};
  $scope.domainObj = {};
  $scope.platformObj = {};
  $scope.adminObj = {};
  $scope.envObj = {};

  $scope.dcObj = {};
  $scope.lmObj = {};
  $scope.sqlObj = {};
  $scope.winObj = {};
  $scope.linObj = {};
  $scope.temp = {};
  $scope.showconfig = false;


  function initFeedback(jobid){
    $scope.jobid = jobid;
    socketservice.close();
    socketservice.open(jobid);
    socketservice.emit('EV_UNSUBSCRIBE', {msg: 'EV_VM_BUILT'});
    var data = {msg: 'EV_VM_BUILT', uid: jobid};
    socketservice.emit('EV_SUBSCRIBE', data);

  }

  socketservice.on('EV_VM_BUILT', function (obj) {
    console.log("EV_VM_BUILT fired", obj);
  });

  $scope.checkEnv = function(){
    var bag = {};
    bag.iaas = "os";
    bag.envObj = $scope.envObj;
    $scope.envmeta = {};
    $scope.envmeta.authapis = ["2.0"];
    $scope.envmeta.compapis = ["2.0", "2.1"];
    $scope.envmeta.netapis = ["2.0"];

  }


  $scope.buildHeat = function(){
    $scope.jobrunning = false;
    $scope.loading = true;
    var bag = {};
    bag.iaas = "os";
    bag.serverObj = $scope.serverObj;
    bag.domainObj = $scope.domainObj;
    bag.platformObj = $scope.platformObj;
    bag.envObj = $scope.envObj;
    bag.adminObj = $scope.adminObj;
    bag.notifyemail = $scope.temp.notifyemail;
    bag.install = $scope.temp.install;
    bag.winnum = $scope.winnum;
    bag.linnum = $scope.linnum;
    bag.dcObj = $scope.dcObj;
    bag.lmObj = $scope.lmObj;
    bag.sqlObj = $scope.sqlObj;
    bag.winObj = $scope.winObj;
    bag.linObj = $scope.linObj;

    stackservice.buildSeedTemplate(bag, $http, function(err, data){
      if (!err){
        $scope.template = data;
        popMesg("Success", "Template is built. See below", "success");
      }
      else{
        popMesg("Oops", "Issue with the template ", "error", err);
      }
    });
  }


  function popMesg(header, message, type, e){
    if (e){
      if (e.error){
        message += e.error;
      }
      else{
        message += e;
      }
    }
    console.log(message);
    var opts = {subject: header, msg: message, type: type};
    msgservice.poptart(opts);
  }

  socketservice.on('EV_VM_BUILT', function (msg) {
    console.log('EV_VM_BUILT', msg);
  });

  $scope.refresh = function(){
    refresh();
  }


  $scope.setdefaults = function(){
    $scope.platformObj.admin = "apprendaadmin";
    $scope.platformObj.adminpass = "@ppr3nda";
    $scope.platformObj.sys = "apprendasystem";
    $scope.platformObj.url = "demo.paas.local";
    $scope.domainObj.name = "apptest";
    $scope.domainObj.suf = "local";
    $scope.domainObj.admin = "apprendaadmin";
    $scope.domainObj.pass = "@ppr3nda";
    $scope.winnum = 3;
    $scope.linnum = 1;

    $scope.adminObj.fname = "John";
    $scope.adminObj.lname = "Doe";
    $scope.adminObj.email = "Doe@acme.com";
    $scope.adminObj.pass = "password";
    $scope.adminObj.compname = "Acme";
    $scope.adminObj.compalias = "acme";

    $scope.dcObj.name = "test-dc";
    $scope.dcObj.key = "metapod";
    $scope.lmObj.name = "test-lm";
    $scope.lmObj.key = "metapod";
    $scope.sqlObj.name = "test-sql";
    $scope.sqlObj.key = "metapod";
    $scope.winObj.name = "test-win";
    $scope.winObj.key = "metapod";
    $scope.linObj.name = "test-lin";
    $scope.linObj.key = "metapod";
    $scope.lic = "demo.paas.local.lic";
  }

  $scope.isObjValid = function(obj){
    if (obj == 'envObj'){
      return $scope.envObj.url && $scope.envObj.tid &&  $scope.envObj.uname && $scope.envObj.upass
        && $scope.envObj.authapi && $scope.envObj.compapi && $scope.envObj.netapi;
    }
    else if (obj == "domainObj"){
      return $scope.domainObj.name && $scope.domainObj.suf && $scope.domainObj.admin && $scope.domainObj.pass && $scope.dcObj.name
        && (($scope.dcObj.key && $scope.dcObj.secgroup && $scope.dcObj.imageid && $scope.dcObj.flavorid && $scope.dcObj.networkid) || $scope.domainObj.dcip);
    }
    else if (obj == 'platformObj'){
      return $scope.platformObj.admin && $scope.platformObj.adminpass && $scope.platformObj.sys && $scope.platformObj.url
        && $scope.adminObj.email && $scope.adminObj.pass && $scope.adminObj.compalias;
    }
    else if (obj == 'lmObj'){
      return $scope.lmObj.name && $scope.lmObj.secgroup && $scope.lmObj.key && $scope.lmObj.imageid && $scope.lmObj.flavorid &&
        $scope.lmObj.networkid && $scope.lmObj.externalIP;
    }
    else if (obj == 'sqlObj'){
      return $scope.sqlObj.name && $scope.sqlObj.secgroup && $scope.sqlObj.key && $scope.sqlObj.imageid && $scope.sqlObj.flavorid &&
        $scope.sqlObj.networkid;
    }
    else if (obj == 'winObj'){
      return $scope.winObj.name && $scope.winObj.secgroup && $scope.winObj.key && $scope.winObj.imageid && $scope.winObj.flavorid &&
        $scope.winObj.networkid;
    }
    else if (obj == 'linObj'){
      return $scope.linObj.name && $scope.linObj.secgroup && $scope.linObj.key && $scope.linObj.imageid && $scope.linObj.flavorid &&
        $scope.linObj.networkid;
    }
    else if (obj == 'serverObj'){
      return $scope.serverObj.name && $scope.serverObj.secgroup && $scope.serverObj.key && $scope.serverObj.imageid && $scope.serverObj.flavorid &&
        $scope.serverObj.networkid;
    }
  }
}]);
