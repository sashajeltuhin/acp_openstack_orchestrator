angular.module('openapp').controller('installctrl', ['$scope', '$location', '$http', '$routeParams', 'stackservice', 'msgservice', 'socketservice', '$cookies', 'Upload', function($scope, $location, $http, $routeParams, stackservice, msgservice, socketservice, $cookies, Upload){
  $scope.template = {};
  $scope.serverObj = {};
  $scope.domainObj = {};
  $scope.platformObj = {};
  $scope.adminObj = {};

  $scope.dcObj = {};
  $scope.lmObj = {};
  $scope.sqlObj = {};
  $scope.winObj = {};
  $scope.linObj = {};
  $scope.temp = {};
  $scope.showconfig = false;
  $scope.platformVersions = [{id:"6.5.1", name:"6.5.1"},{id:"6.5.2", name:"6.5.2"},{id:"6.5.3", name:"6.5.3"}, {id:"6.5.0", name:"6.5.0"}, {id:"6.8.0", name:"6.8.0"}, {id:"7.0.0", name:"7.0.0"}];

  if ($routeParams && $routeParams.type){
    $scope.serverObj.type = $routeParams.type;
  }

  if ($routeParams && $routeParams.mode && $routeParams.mode == "install"){
    $scope.temp.showinstall = true;
    $scope.temp.install = true;
  }

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

  if ($routeParams && $routeParams.mode && $routeParams.mode == "install"){
    $scope.temp.showinstall = true;
    $scope.temp.install = true;
    getcachedEnv();
  }


  function getcachedEnv(){
    var envkey = $cookies.get("envkey");
    if (envkey) {
      stackservice.loadCachedEnv(envkey, $http, function (err, data) {
        if (!err) {
          $scope.envObj = data;
          initEnv();
        }
        else {
          $scope.envObj = {};
        }
      });
    }
    else{
      $scope.envObj = {};
    }
  }

  $scope.genTemplate = function(){
    var bag = {};
    bag.iaas = "os";
    bag.serverObj = $scope.serverObj;
    bag.domainObj = $scope.domainObj;
    bag.platformObj = $scope.platformObj;
    stackservice.showTemplate(bag, $http, function(err, data){
      if (!err){
        $scope.template = data;
      }
    })
  }

  $scope.initEnv = function(){
    initEnv();
  }

  $scope.urlChanged = function(){
    if ($scope.envObj.url) {
      var bag = {};
      bag.iaas = "os";
      bag.envObj = $scope.envObj;
      stackservice.detectAPIVersions(bag, $http, function (err, envObj) {
        if (err) {
          popMesg("API Versions", "Oops: ", "error", err);
        }
        else {
          console.log("api discovery", envObj);
          $scope.envObj = envObj;
        }
      });
    }
  }

  function initEnv(){
    if(isEnvValid()) {
      $scope.jobrunning = false;
      $scope.loading = true;
      var bag = {};
      bag.iaas = "os";
      bag.envObj = $scope.envObj;
      bag.serverObj = $scope.serverObj;
      stackservice.initenv(bag, $http, function (err, data) {
        console.log('initenv', err, data);
        $scope.loading = false;
        if (!err) {
          if (data && data.envkey) {
            $cookies.put("envkey", data.envkey);
          }
          $scope.envmeta = data;
          $scope.showconfig = true;
          popMesg("You are connected", "Proceed to configuring the server", "success");
          $scope.jobid = $cookies.get("jobid");
          if ($scope.jobid) {
            console.log($scope.jobid);
            refresh();
          }
          else {
            $scope.progress = false;
            $scope.showconfig = true;
            $scope.showtogle = false;
          }
        }
        else {
          $scope.error = err;
          popMesg("Connection", "Oops: ", "error", err);
        }
      });
    }
  }

  $scope.buildVM = function(){
    $scope.jobrunning = false;
    $scope.loading = true;
    var bag = {};
    bag.iaas = "os";
    bag.serverObj = $scope.serverObj;
    bag.domainObj = $scope.domainObj;
    bag.platformObj = $scope.platformObj;
    bag.envObj = $scope.envObj;
    bag.notifyemail = $scope.temp.notifyemail;
    stackservice.buildVM(bag, $http, function(err, data){
      $scope.loading = false;
      if (err){
        $scope.error = err;
        popMesg("Build VM", "Oops: ", "error", err);
      }
      else{
        if (data.status && data.status == "error"){
          $scope.jobrunning = true;
          popMesg("Oops: ", "Job is already in progress",  "error");
        }
        else {
          popMesg("Build VM", "VM has been scheduled and you will be notified when it is ready", "success");
          $scope.progress = true;
        }
      }
    });
  }

  $scope.buildInfra = function(){
    if (!isModelValid()){
      return;
    }
    else {
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
      bag.winnum = $scope.temp.winnum;
      bag.linnum = $scope.temp.linnum;
      bag.dcObj = $scope.dcObj;
      bag.lmObj = $scope.lmObj;
      bag.sqlObj = $scope.sqlObj;
      bag.winObj = $scope.winObj;
      bag.linObj = $scope.linObj;

      console.log(bag);
      stackservice.buildInfra(bag, $http, function (err, data) {
        console.log("buildInfra", data);
        $scope.loading = false;
        if (err) {
          $scope.error = err;
          popMesg("Oops:", "Issues with orchestration  ", "error", err);
        }
        else {
          if (data.status && data.status == "error") {
            $scope.jobrunning = true;

            if (data.job) {
              $scope.runningjobs = [data.job];
            }
            popMesg("Oops: ", "Job is already in progress", "error");
          }
          else {
            $cookies.put("jobid", data.job._id);
            $scope.jobid = data.job._id;
            initFeedback($scope.jobid);
            refresh();
            $scope.progress = true;
            $scope.showconfig = false;
            $scope.showtogle = true;
            popMesg("Build Infrastructure", "The infra has been scheduled and you will be notified when it is ready", "success");
          }
        }
      });
    }
  }

  $scope.toggleConfig = function(){
    if (!$scope.showconfig){
      $scope.showconfig = true;
    }
    else{
      $scope.showconfig = false;
    }
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

  function refresh(){
    stackservice.getjobstatus($scope.jobid, $http, function(err, data){
      $scope.loading = false;
      if (err){
        $scope.error = err;
        popMesg("Job status", "Oops: ", "error", err);
      }
      else{
        $scope.progress = true;
        $scope.showconfig = false;
        $scope.showtogle = true;
        $scope.job = data;
      }
    });
  }


  $scope.killjob = function(j){
    var temp = {};
    temp._id = j ? j._id : $scope.jobid;
    if (temp._id) {
      stackservice.killjob(temp, $http, function (err, result) {
        $scope.jobrunning = false;
        if (err) {
          $scope.error = err;
          popMesg("Cannot stop the job" + err, "error");
        }
        else {
          $cookies.remove("jobid");
          $scope.jobid = null;
          $scope.progress = false;
          $scope.showconfig = true;
          $scope.showtogle = false;
        }
      });
    }
  }

  $scope.setdefaults = function(){
    $scope.platformObj.admin = "apprendaadmin";
    $scope.platformObj.adminpass = "password";
    $scope.platformObj.dbadmin = "apprendadbadmin";
    $scope.platformObj.dbadminpass = "password";
    $scope.platformObj.appcloud = "PrivatePaaS";
    $scope.platformObj.sys = "apprendasystem";
    $scope.platformObj.url = "demo.paas.local";
    $scope.platformObj.basesub = "apps";
    $scope.domainObj.name = "apptest";
    $scope.domainObj.suf = "local";
    $scope.domainObj.admin = "apprendaadmin";
    $scope.domainObj.pass = "@ppr3nda";
    $scope.temp.winnum = 3;
    $scope.temp.linnum = 1;

    $scope.adminObj.fname = "John";
    $scope.adminObj.lname = "Doe";
    $scope.adminObj.email = "Doe@acme.com";
    $scope.adminObj.pass = "password";
    $scope.adminObj.compname = "Acme";
    $scope.adminObj.compalias = "acme";

    $scope.dcObj.name = "test-dc";
    $scope.lmObj.name = "test-lm";
    $scope.sqlObj.name = "test-sql";
    $scope.sqlObj.instance = "sqlexpress";
    $scope.winObj.name = "test-win";
    $scope.linObj.name = "test-lin";
    $scope.lic = "demo.paas.local.lic";

  }

  function isModelValid(){
    return $scope.isObjValid('envObj') && $scope.isObjValid('domainObj') && $scope.isObjValid('platformObj')
    && $scope.isObjValid('lmObj') && $scope.isObjValid('sqlObj') && $scope.isObjValid('winObj') && $scope.isObjValid('linObj');
  }

  $scope.isObjValid = function(obj){
    if (obj == 'envObj'){
      return isEnvValid();
    }
    else if (obj == "domainObj"){
      return $scope.domainObj.name && $scope.domainObj.suf && $scope.domainObj.admin && $scope.domainObj.pass && $scope.dcObj.name
        && (($scope.dcObj.secgroup && $scope.dcObj.imageid && $scope.dcObj.flavorid && $scope.dcObj.networkid) || $scope.domainObj.dcip);
    }
    else if (obj == 'platformObj'){
      return $scope.platformObj.admin && $scope.platformObj.adminpass && $scope.platformObj.sys && $scope.platformObj.url && $scope.platformObj.ver
        && $scope.adminObj.email && $scope.adminObj.pass && $scope.adminObj.compalias && $scope.platformObj.appcloud && $scope.platformObj.basesub;
    }
    else if (obj == 'lmObj'){
      return $scope.lmObj.name && $scope.lmObj.secgroup && $scope.lmObj.imageid && $scope.lmObj.flavorid &&
        $scope.lmObj.networkid && $scope.lmObj.externalIP;
    }
    else if (obj == 'sqlObj'){
      return $scope.sqlObj.name && $scope.sqlObj.instance && $scope.platformObj.dbadmin && $scope.platformObj.dbadminpass && $scope.sqlObj.secgroup && $scope.sqlObj.imageid && $scope.sqlObj.flavorid &&
        $scope.sqlObj.networkid;
    }
    else if (obj == 'winObj'){
      return $scope.winObj.name && $scope.winObj.secgroup && $scope.winObj.imageid && $scope.winObj.flavorid &&
        $scope.winObj.networkid;
    }
    else if (obj == 'linObj'){
      return $scope.linObj.name && $scope.linObj.secgroup && $scope.linObj.imageid && $scope.linObj.flavorid && $scope.linObj.networkid;
    }
  }

  function isEnvValid(){
    return $scope.envObj.url && $scope.envObj.tid &&  $scope.envObj.uname && $scope.envObj.upass;
  }

  $scope.uploadLic = function (file) {
    Upload.upload({
      url: '/api/uploadLic',
      data: {lic: file, 'platform': $scope.platformObj.url}
    }).then(function (resp) {
      console.log(resp);
      $scope.platformObj.lic = resp.data.filename;
    }, function (resp) {
      console.log('Error status: ' + resp.status);
    }, function (evt) {
      var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
      console.log('progress: ' + progressPercentage + '% ' + evt.config.data.lic.name);
    });
  };
}]);
