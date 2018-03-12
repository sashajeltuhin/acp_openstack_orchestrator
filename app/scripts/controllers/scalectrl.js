angular.module('openapp').controller('scalectrl', ['$scope', '$http', '$cookies', 'stackservice', 'msgservice', '$location', function($scope, $http, $cookies, stackservice, msgservice, $location){
  $scope.template = {};
  $scope.serverObj = {};
  $scope.domainObj = {};
  $scope.platformObj = {};
  $scope.adminObj = {};
  $scope.envs = [];

  $scope.winObj = {};
  $scope.linObj = {};
  $scope.temp = {};
  $scope.showconfig = false;
  $scope.showsignin = false;
  $scope.token = $cookies.get('apptoken');
  $scope.showscalecontrols = false;
  $scope.shownewenv = false;

  $scope.iaastypes = [];
  $scope.iaastypes.push({id:"os", name:"Openstack"});
  $scope.platformVersions = [{id:"6.5.1", name:"6.5.1"}, {id:"6.5.2", name:"6.5.2"}, {id:"6.5.3", name:"6.5.3"}, {id:"6.8.0", name:"6.8.0"}, {id:"7.0.0", name:"7.0.0"}];
  loadSettings();

  function loadCustomProps(url){
    var bag = {};
    bag.url = url;
    stackservice.loadCustomProps(bag, $http, function (err, data) {
      console.log("loadCustomProps", err, data);
      if (err) {
        popMesg("Custom Props", "Oops: ", "error", err);
      } else {
          $scope.customfields = data;
      }
    });
  }

  function loadTenants(url){
    var bag = {};
    bag.url = url;
    stackservice.loadTenants(bag, $http, function (err, data) {
      if (err) {
        popMesg("Tenants", "Oops: ", "error", err);
      } else {
        $scope.apptenants = data;
        populateFreeTenants();
      }
    });
  }

  function loadSettings(){
    try {
      if ($scope.token) {
        $scope.platformObj.url = $cookies.get('appurl');
        $scope.adminObj.email = $cookies.get('appadmin');
        $scope.adminObj.pass = $cookies.get('appadminpass');
        var bag = {};
        bag.token = $scope.token;
        bag.adminObj = $scope.adminObj;
        bag.platformObj = $scope.platformObj;
        bag.url = $scope.platformObj.url;
        stackservice.loadSettings(bag, $http, function (err, data) {
          if (!err) {
            bindModel(data, true);
            if (data.model.valid) {
              loadCustomProps(bag.url);
              loadTenants(bag.url);
              $scope.showsignin = false;
              $scope.showconfig = true;
              $scope.showscalecontrols = true;
              refreshFarm();
              popMesg("Autoscaler", "You are connected. Autoscaler is configured and ready to use", "success");
            }
            else{
              if (data.model.remoteDB){
                loadCustomProps(bag.url);
                loadTenants(bag.url);
              }
              $location.path('/scalesettings');
              popMesg("Autoscaler", "You are missing some of the required config settings. Complete before you can set the autoscaler in motion", "warning");
            }
          }
          else {
            $scope.showsignin = true;
          }
        });
      }
      else {
        $scope.showsignin = true;
        $location.path('/signin');
      }
    }
    catch(err){
      popMesg("Init settings", "Oops: ", "error", err);
    }
  }



  function bindModel(data, paint){
    var model = data.model;

    if (model._id) {
      $scope.modelID = model._id;
    }
    $scope.platformObj = model.settings.platformObj ? model.settings.platformObj : {};
    $scope.adminObj = model.settings.adminObj ? model.settings.adminObj : {};
    if (!$scope.platformObj.url) {
      $scope.platformObj.url = $cookies.get('appurl');
    }
    if (!$scope.adminObj.email) {
      $scope.adminObj.email = $cookies.get('appadmin');
    }

    if (!$scope.adminObj.pass) {
      $scope.adminObj.pass = $cookies.get('appadminpass');
    }
    $scope.domainObj = model.settings.domainObj ? model.settings.domainObj : {};
    if (!model.stats.win.up) {
      model.stats.win.up = 0;
    }
    if (!model.stats.lin.up) {
      model.stats.lin.up = 0;
    }

    if (!model.stats.win.down) {
      model.stats.win.down = 0;
    }
    if (!model.stats.lin.down) {
      model.stats.lin.down = 0;
    }
    if (!model.stats.tags){
      model.stats.tags = {};
    }

    $scope.service = model.service;
    console.log('service:', $scope.service);
    updateToggleButton();
    $scope.stats = model.stats;

    console.log($scope.stats);
    refreshstats();
    $scope.envs = model.envs;
    if (paint && $scope.envs.length > 0) {
      $scope.envmeta = {};
      for (var i = 0; i < $scope.envs.length; i++) {
        var envObj = $scope.envs[i];
        getEnvMeta(envObj, envObj.tid);
      }
    }
  }


  function updateToggleButton(){
    if($scope.service) {
      $scope.toggleButtonText = $scope.service.state == 'on' ? "Turn Off" : "Turn On";
      $scope.toggleServiceText = $scope.service.state == 'on' ? "Utilization Check service is running" : "Utilization Check service is stopped";
    }
  }

  function getEnvMeta(env, tid){
    var bag = {};
    bag.iaas = env.iaas;
    bag.envObj = env;
    stackservice.initenv(bag, $http, function(err, data){
      console.log("meta", data);
      if (!err){
        $scope.envmeta[tid] = data;
      }
    });
  }

  $scope.signout = function(){
    $cookies.remove('apptoken');
    $scope.token = "";
    $cookies.remove('appurl');
    $cookies.remove('appadmin');
    $cookies.remove('appadminpass');
    $scope.platformObj = {};
    $scope.adminObj = {};
    $scope.showsignin = true;
    $scope.showconfig = false;
    $location.path('/signin');
  }

  $scope.signin = function(){
    try {
      $scope.loading = true;
      var bag = {};
      bag.url = $scope.platformObj.url;
      bag.iaas = "os";
      bag.adminObj = $scope.adminObj;
      bag.platformObj = $scope.platformObj;
      stackservice.signin(bag, $http, function (err, token) {
        if (!err) {
          $scope.token = token;
          $cookies.put('apptoken', token);
          $cookies.put('appurl', $scope.platformObj.url);
          $cookies.put('appadmin', $scope.adminObj.email);
          $cookies.put('appadminpass', $scope.adminObj.pass);
          $location.path('/scale');
        }
        else{
          $scope.loading = false;
          $scope.error = err;
          popMesg("Sign In", "Oops: ", "error", err);
          $scope.showsignin = true;
        }
      });
    }
    catch(err){
      $scope.loading = false;
      popMesg("Sign In", "Oops: ", "error", err);
    }
  }

  $scope.newEnv = function(){
    $scope.tempEnv = {};
    $scope.shownewenv = true;
  }

  $scope.urlChanged = function(){
    if ($scope.tempEnv.url) {
      var bag = {};
      bag.iaas = "os";
      bag.envObj = $scope.tempEnv;
      stackservice.detectAPIVersions(bag, $http, function (err, envObj) {
        if (err) {
          popMesg("API Versions", "Oops: ", "error", err);
        }
        else {
          console.log("api discovery", envObj);
          $scope.tempEnv = envObj;
        }
      });
    }
  }

  $scope.addEnv = function(){
    var clone = jQuery.extend({}, $scope.tempEnv );
    var bag = {};
    bag.iaas = clone.iaas;
    bag.envObj = clone;
    stackservice.initenv(bag, $http, function(err, data){
      if (!err){
        if ($scope.envs.length == 0){
          clone.apptenants = [];
          if ($scope.apptenants) {
            for (var i = 0; i < $scope.apptenants.length; i++) {
              clone.apptenants.push($scope.apptenants[i].alias);
            }
          }
        }
        $scope.envs.push(clone);
        $scope.shownewenv = false;
        $scope.tempEnv = {};
        if(!$scope.envmeta){
          //init
          $scope.envmeta = {};
        }
        $scope.envmeta[clone.tid] = data;
        popMesg("Success", "Tenant environment registered", "success");
      }
      else{
        popMesg("Oops", "Cannot register environment", "error", err);
      }
    });
  }

  $scope.addAppTenant = function(e, name){
    if (!e.apptenants){
      e.apptenants = [];
    }
    e.apptenants.push(name);
    for (var i = 0; i < $scope.freeTenants.length; i++){
      if ($scope.freeTenants[i] == name){
        $scope.freeTenants.splice(i, 1);
        break;
      }
    }
  }

  $scope.removeAppTenant = function(e, t){
    var tenant;
    for (var i = 0; i < e.apptenants.length; i++){
      if (e.apptenants[i] == t){
        tenant = e.apptenants[i];
        e.apptenants.splice(i, 1);
        break;
      }
    }
    if (tenant){
      $scope.freeTenants.push(tenant);
    }
  }

  function populateFreeTenants(){
    $scope.freeTenants = [];
    if ($scope.envs.length == 1 && (!$scope.envs[0].apptenants || $scope.envs[0].apptenants.length == 0)){
      $scope.envs[0].apptenants = [];
      for (var i = 0; i < $scope.apptenants.length; i++) {
        $scope.envs[0].apptenants.push($scope.apptenants[i].alias);
      }
    }
    else {
      for (var i = 0; i < $scope.apptenants.length; i++) {
        var t = $scope.apptenants[i];
        if (!tenantExists(t)) {
          $scope.freeTenants.push(t.alias);
        }
      }
    }
    if ($scope.envs.length == 1){
      $scope.winObj.iaastenant = $scope.envs[0].tid;
      $scope.linObj.iaastenant = $scope.envs[0].tid;
    }
  }

  function tenantExists(t){
    var found = false;
    for(var i = 0; i < $scope.envs.length; i++){
      for(var ii = 0; ii < $scope.envs[i].apptenants.length; ii++){
        if ($scope.envs[i].apptenants[ii] == t.alias){
          found = true;
          break;
        }
      }
      if (found){
        break;
      }
    }
    return found;
  }

  $scope.onnewwinflavor = function(e){
    var bag = {};
    bag.iaas = e.iaas;
    bag.envObj = e;
    bag.id = e.flavoridwin;
    bag.objname = 'flavors';
    stackservice.getobjdetail(bag, $http, function(err, data){
      if (!err){
        var flavor = data.flavor;
        if(flavor){
          e.winram = flavor.ram;
          e.wincpu = flavor.vcpus;
        }
      }
    });
  }

  $scope.onnewlinflavor = function(e){
    var bag = {};
    bag.iaas = e.iaas;
    bag.envObj = e;
    bag.id = e.flavoridlin;
    bag.objname = 'flavors';
    stackservice.getobjdetail(bag, $http, function(err, data){
      if (!err){
        var flavor = data.flavor;
        if(flavor){
          e.linram = flavor.ram;
          e.lincpu = flavor.vcpus;
        }
      }
    });
  }

  $scope.removeEnv = function(env){
      for(var i = 0; i < $scope.envs.length; i++){
        if ($scope.envs[i].tid == env.tid){
          $scope.envs.splice(i, 1);
          break;
        }
      }
  }

  $scope.saveModel = function(){
    save();
  }
  function save(){
    var bag = {};
    bag.token = $scope.token;
    bag.model = {};
    bag.model._id = $scope.modelID;
    bag.model.service = $scope.service;
    bag.model.settings = {};
    bag.model.settings.proxy = $scope.temp.proxy;
    bag.model.settings.platformObj = $scope.platformObj;
    bag.model.settings.adminObj = $scope.adminObj;
    bag.model.settings.domainObj = $scope.domainObj;
    bag.model.stats = $scope.stats;
    bag.model.envs = $scope.envs;
    stackservice.saveSettings(bag, $http, function (err, savedData) {
      if (err){
        popMesg("Update Failed", "Oops: ", "error", err);
      }
      else{
        bindModel(savedData);
        $scope.showscalecontrols = true;
        var msg = "Autoscaler settings updated";
        var msgtype = "success";
        if (savedData.model.valid){
          msg = msg + ". The settings are complete and the Autoscaler is ready to use";
        }
        else{
          msg = msg + ". You are still missing some of the required config settings";
          msgtype = 'warning';
        }
        popMesg("All is well", msg, msgtype);
        if (!$scope.customfields && savedData.model.remoteDB){
          loadCustomProps(bag.url);
          loadTenants(bag.url);
        }
      }
    });
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
        if (e.error == "ECONNREFUSED"){
          message = 'Autoscaler service is not accessible or does not exist. For directions click <a href="/autoservice">here</a>'
        }
        else {
          message += e.error;
        }

      }
      else{
        message += e;
      }
    }
    console.log(message);
    var opts = {subject: header, msg: message, type: type};
    $scope.errormsg = message;
    $scope.errclass = "alert alert-success";
    switch(type){
      case "error":
        $scope.errclass = "alert alert-error";
            break;
      case "warning":
        $scope.errclass = "alert alert-warning";
            break;
    }
    msgservice.poptart(opts);
  }


  $scope.refresh = function(){
    stackservice.getjobstatus($scope.jobkey, $http, function(err, data){
      $scope.loading = false;
      if (err){
        $scope.error = err;
        popMesg("Build VM", "Oops: ", "error", err);
      }
      else{
        $scope.job = data;
      }
    });
  }

  $scope.refreshFarm = function(){
    loadSettings();
  }

  function refreshFarm(){
    var bag = {};
    bag.url = $scope.platformObj.url;
    stackservice.refreshFarm(bag, $http, function (err, data) {
      if (err){
        popMesg("Failed to get server farm data", "Oops: ", "error", err);
      }
      else{
        console.log(data);
        $scope.scalestate = data;
        bindStateData();
      }
    });
  }

  function bindStateData(){
    if ($scope.scalestate && $scope.scalestate.bucket){
      $scope.cats = [];
      for (var key in $scope.scalestate.bucket){
        if (key !== "win" && key !== "lin" && key !== "WINNODES" && key !== "LINNODES"){
          $scope.cats.push(key);
        }
      }
    }

    $scope.poolcolors = ['#45b7cd','#45b7cd', '#ff6384'];

    $scope.poollabels = ['CPU', 'Memory'];
    $scope.pool = {};
    $scope.poolmeta = {};
    $scope.pool['win'] = [
      [$scope.scalestate.bucket["win"].percCPU.toFixed(2), $scope.scalestate.bucket["win"].percMem.toFixed(2)],
      [$scope.stats.win.up, $scope.stats.win.up],
      [$scope.stats.win.down, $scope.stats.win.down]
    ];
    $scope.poolmeta['win'] = [
      {
        label: "Windows Remaining Capacity",
        borderWidth: 1,
        type: 'bar'
      },
      {
        label: "Add VMs threshold",
        borderWidth: 3,
        hoverBackgroundColor: "rgba(58, 247, 213, 0.4)",
        hoverBorderColor: "rgba(58, 247, 213, 1)",
        type: 'line'
      },
      {
        label: "Remove VMs threshold",
        borderWidth: 3,
        hoverBackgroundColor: "rgba(255,99,132,0.4)",
        hoverBorderColor: "rgba(255,99,132,1)",
        type: 'line'
      }
    ];

    $scope.pool['lin'] = [
      [$scope.scalestate.bucket["lin"].percCPU.toFixed(2), $scope.scalestate.bucket["lin"].percMem.toFixed(2)],
      [$scope.stats.lin.up, $scope.stats.lin.up],
      [$scope.stats.lin.down, $scope.stats.lin.down]
    ];
    $scope.poolmeta['lin'] = [
      {
        label: "Linux Remaining Capacity",
        borderWidth: 1,
        type: 'bar'
      },
      {
        label: "Add VMs threshold",
        borderWidth: 3,
        hoverBackgroundColor: "rgba(58, 247, 213, 0.4)",
        hoverBorderColor: "rgba(58, 247, 213, 1)",
        type: 'line'
      },
      {
        label: "Remove VMs threshold",
        borderWidth: 3,
        hoverBackgroundColor: "rgba(255,99,132,0.4)",
        hoverBorderColor: "rgba(255,99,132,1)",
        type: 'line'
      }
    ];
    $scope.pooloptions = {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            max:100
          }
        }]
      }
    }

    //servers

    $scope.servercolors = ['#45b7cd', '#45b7cd'];

    $scope.serverlabels = ['CPU', 'RAM'];
    $scope.serverdata = {};
    for(var i = 0; i < $scope.scalestate.farm['win'].nodes.length; i++){
      var s = $scope.scalestate.farm['win'].nodes[i];
      var CpuRemaining = s.CpuTotal - s.CpuAllocated;
      var MemRemaining = s.MemTotal - s.MemAllocated;
      var percMem = Number(MemRemaining / s.MemTotal * 100);
      var percCPU = Number(CpuRemaining / s.CpuTotal * 100);
      $scope.serverdata[s.name] = [percCPU.toFixed(2), percMem.toFixed(2)];
    }

    for(var i = 0; i < $scope.scalestate.farm['lin'].nodes.length; i++){
      var s = $scope.scalestate.farm['lin'].nodes[i];
      var CpuRemaining = s.CpuTotal - s.CpuAllocated;
      var MemRemaining = s.MemTotal - s.MemAllocated;
      var percMem = Number(MemRemaining / s.MemTotal * 100);
      var percCPU = Number(CpuRemaining / s.CpuTotal * 100);
      $scope.serverdata[s.name] = [percCPU.toFixed(2), percMem.toFixed(2)];
    }

    $scope.serveroptions = {
      responsive: true,
      maintainAspectRatio: true,
      scaleShowVerticalLines: false,
      scales: {
        yAxes: [{
          display:false,
          ticks: {
            beginAtZero: true,
            max:100
          }
        }]//,
        //xAxes:[{
        //  display:false,
        //}]
      }
    }

  }

  $scope.toggleScaler = function(){
    var bag = {};
    bag.url = $scope.platformObj.url;
    bag.service = $scope.service;
    console.log('service', bag.service);
    stackservice.toggleScaler(bag, $http, function (err, data) {
      console.log('toggle', err, data);
      if (err){
        popMesg("Failed to get server farm data", "Oops: ", "error", err);
      }
      else{
        $scope.service = data;
        updateToggleButton();
      }
    });
  }

  $scope.deleteServer = function(s){
    var bag = {};
    bag.url = $scope.platformObj.url;
    bag.node = s;
    stackservice.deleteServer(bag, $http, function(err, data){
      if (err){
        popMesg("Failed to remove node from the farm", "Oops: ", "error", err);
      }
      else{
        refreshFarm();
        popMesg("Node deleted successfully", "All is well", "success");
      }
    });
  }

  $scope.addWinNode = function(){
    var bag = {};
    bag.jobbag = {};
    bag.jobbag.winnodes = [];
    bag.jobbag.winnodes.push($scope.winObj);
    bag.iaastenant = $scope.winObj.iaastenant;
    addNode(bag);
  }

  $scope.addLinNode = function(){
    var bag = {};
    bag.jobbag = {};
    bag.jobbag.linnodes = [];
    bag.jobbag.linnodes.push($scope.linObj);
    bag.iaastenant = $scope.linObj.iaastenant;
    addNode(bag);
  }

  function addNode(bag){
    bag.url = $scope.platformObj.url;
    bag.jobbag.url = $scope.platformObj.url;
    console.log('addnode bag', bag);
    stackservice.addNode(bag, $http, function (err) {
      if (err){
        popMesg("Failed to create node", "Oops: ", "error", err);
      }
      else{
        refreshFarm();
        $scope.winObj.name = "";
        $scope.linObj.name = "";
        $scope.winObj.tagKey = "";
        $scope.linObj.tagKey = "";
        popMesg("Node creation started", "All is well", "success");
      }
    });
  }

  $scope.updateServer = function(s){
    var bag = {};
    bag.server = s;
    bag.url = $scope.platformObj.url;
    stackservice.updateServerState(bag, $http, function (err) {
      if (err){
        popMesg("Failed to update node", "Oops: ", "error", err);
      }
      else{
        popMesg("Node updated", "All is well", "success");
      }
    });
  }

  $scope.addCSMap = function(e, customprop){
    if (!e.secgroupmaps){
      e.secgroupmaps = [];
    }
    var g = {};
    g.name = customprop.tagKey;
    e.secgroupmaps.push(g);
  }

  $scope.removeSecGroup = function(g, e){
    for(var i = 0; i < e.secgroupmaps.length; i++){
      if (e.secgroupmaps[i].name == g.name){
        e.secgroupmaps.splice(i, 1);
        break;
      }
    }
  }

  $scope.addStatsTag = function(tagKey){
    var tag;
    for(var i = 0; i < $scope.customfields.length; i++){
      if ($scope.customfields[i].tagKey == tagKey){
        tag = $scope.customfields[i];
        break;
      }
    }
    console.log(tag);
    if (tag) {
      if (!$scope.sliderTagsUp) {
        $scope.sliderTagsUp = {}
      }
      if (!$scope.sliderTagsDown) {
        $scope.sliderTagsDown = {};
      }

      if (!$scope.stats.tags[tag.tagKey]) {
        $scope.stats.tags[tag.tagKey] = {};
        $scope.stats.tags[tag.tagKey].up = 0;
        $scope.stats.tags[tag.tagKey].id = tag.id;
        $scope.stats.tags[tag.tagKey].down = 0;
        $scope.stats.tags[tag.tagKey].tagKey = tag.tagKey;
        $scope.stats.tags[tag.tagKey].sname = tag.tagKey + "-extra";
        $scope.stats.tags[tag.tagKey].ondemand = true;
        $scope.sliderTagsUp[tag.tagKey] =
        {
          value: $scope.stats.tags[tag.tagKey].up,
          options: {
            floor: 0,
            ceil: 100,
            step: 10,
            showTicks: true,
            vertical: true,
            onChange: function (sliderId, modelValue, highValue, pointerType) {
              $scope.stats.tags[tag.tagKey].up = modelValue;
            }
          }
        };
        $scope.sliderTagsDown[tag.tagKey] = {
          value: $scope.stats.tags[tag.tagKey].down,
          options: {
            floor: 0,
            ceil: 100,
            step: 10,
            showTicks: true,
            vertical: true,
            getPointerColor: function (value) {
              return 'red';
            },
            getSelectionBarColor: function (value) {
              return 'red';
            },
            onChange: function (sliderId, modelValue, highValue, pointerType) {
              $scope.stats.tags[tag.tagKey].down = modelValue;
            }
          }
        };
      }
    }
  }

  $scope.removeStatsTag = function(tag){
    delete $scope.stats.tags[tag];
    delete $scope.sliderTagsUp[tag];
    delete $scope.sliderTagsDown[tag];
  }

  function refreshstats(){
    if ($scope.stats) {
      $scope.sliderLinUp = {
        value: $scope.stats.lin.up,
        options: {
          floor: 0,
          ceil: 100,
          step: 10,
          showTicks: true,
          vertical: true,
          onChange: function (sliderId, modelValue, highValue, pointerType) {
            $scope.stats.lin.up = modelValue;
            bindStateData();
          }
        }
      };
      $scope.sliderWinUp = {
        value: $scope.stats.win.up,
        options: {
          floor: 0,
          ceil: 100,
          step: 10,
          showTicks: true,
          vertical: true,
          onChange: function (sliderId, modelValue, highValue, pointerType) {
            $scope.stats.win.up = modelValue;
            bindStateData();
          }
        }
      };

      $scope.sliderLinDown = {
        value: $scope.stats.lin.down,
        options: {
          floor: 0,
          ceil: 100,
          step: 10,
          showTicks: true,
          vertical: true,
          getPointerColor: function(value) {
            return 'red';
          },
          getSelectionBarColor: function(value) {
            return 'red';
          },
          onChange: function (sliderId, modelValue, highValue, pointerType) {
            $scope.stats.lin.down = modelValue;
            bindStateData();
          }
        }
      };
      $scope.sliderWinDown = {
        value: $scope.stats.win.down,
        options: {
          floor: 0,
          ceil: 100,
          step: 10,
          showTicks: true,
          vertical: true,
          getPointerColor: function(value) {
            return 'red';
          },
          getSelectionBarColor: function(value) {
            return 'red';
          },
          onChange: function (sliderId, modelValue, highValue, pointerType) {
            $scope.stats.win.down = modelValue;
            bindStateData();
          }
        }
      };

      if (!$scope.sliderTagsUp){
        $scope.sliderTagsUp = {}
      }
      if (!$scope.sliderTagsDown){
        $scope.sliderTagsDown = {};
      }
      for(var t in $scope.stats.tags){
        var tag = $scope.stats.tags[t];
        $scope.sliderTagsUp[tag.tagKey] =
        {value: $scope.stats.tags[tag.tagKey].up,
          options: {
            floor: 0,
            ceil: 100,
            step: 10,
            showTicks: true,
            vertical: true,
            onChange: function (sliderId, modelValue, highValue, pointerType) {
              $scope.stats.tags[tag.tagKey].up = modelValue;
            }
          }
        };
        $scope.sliderTagsDown[tag.tagKey] = {
          value: $scope.stats.tags[tag.tagKey].down,
          options: {
            floor: 0,
            ceil: 100,
            step: 10,
            showTicks: true,
            vertical: true,
            getPointerColor: function (value) {
              return 'red';
            },
            getSelectionBarColor: function (value) {
              return 'red';
            },
            onChange: function (sliderId, modelValue, highValue, pointerType) {
              $scope.stats.tags[tag.tagKey].down = modelValue;
            }
          }
        };
      }
    }
  }

  $scope.deleteProgressNode = function(type, node){
    var bag = {};
    bag.type = type;
    bag.name = node.name;
    bag.url = $scope.platformObj.url;

    stackservice.deleteProgressNode(bag, $http, function (err) {
      if (err){
        popMesg("Oops: ", "Failed to delete progress node",  "error", err);
      }
      else{
        refreshFarm();
        popMesg("All is well", "Node removed",  "success");
      }
    });
  }

}]);
