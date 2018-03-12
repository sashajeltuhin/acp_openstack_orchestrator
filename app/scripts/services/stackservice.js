angular.module('openapp').factory('stackservice', ['$q', function($q) {
  var service = {};

  service.signin = function(bag, $http, callback){
    var url = '/api/signin';

    $http.post(url, bag).success(function(token){
      callback(null, token);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.loadSettings = function(bag, $http, callback){
    var url = '/api/getsettings';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.detectAPIVersions = function(bag, $http, callback){
    var url = 'api/detectAPIVersions';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.loadCustomProps = function(bag, $http, callback){
    var url = '/api/loadCustomProps';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.deleteProgressNode = function(bag, $http, callback){
    var url = '/api/deleteProgressNode';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.loadTenants = function(bag, $http, callback){
    var url = '/api/loadTenants';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.saveSettings = function(bag, $http, callback){
    var url = '/api/savesettings';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.loadCachedEnv = function(key, $http, callback) {
    var url = '/api/getcachedenv/' + key;

    $http.get(url).success(function (data) {
      callback(null, data);
    }).error(function (err, status) {
      callback(err, null, status);
    });

  }

  service.listObjects = function(objname, $http, callback){
    var url = '/api/list/' + objname;

    $http.get(url).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.listJobs = function($http, callback){
    var url = '/api/listjobs';

    $http.get(url).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.getjobstatus = function(key, $http, callback){
    var url = '/api/jobstatus/' + key;

    $http.get(url).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.killjob = function(bag, $http, callback){
    var url = '/api/killjob';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.showTemplate = function(bag, $http, callback){
    var url = '/api/gentemplate';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.buildSeedTemplate = function(bag, $http, callback){
    var url = '/api/buildSeedTemplate';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.initenv = function(bag, $http, callback){
    var url = '/api/initenv';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.getobjdetail = function(bag, $http, callback){
    var url = '/api/getobjdetail';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.installemailsettings = function(bag, $http, callback){
    var url = '/api/installemailsettings';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.loadinstallermail = function($http, callback){
    var url = '/api/loadinstallermail';

    $http.get(url).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.buildVM = function(bag, $http, callback){
    var url = '/api/buildvm';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.buildInfra = function(bag, $http, callback){
    var url = '/api/buildinfra';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.addNode = function(bag, $http, callback){
    var url = '/api/addnode';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.refreshFarm = function(bag, $http, callback){
    var url = '/api/getstats';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }

  service.updateServerState = function(bag, $http, callback){
    var url = '/api/updateServerState';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }


  service.toggleScaler = function(bag, $http, callback){
    var url = '/api/toggleService';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }


  service.deleteServer = function(bag, $http, callback){
    var url = '/api/deletenode';

    $http.post(url, bag).success(function(data){
      callback(null, data);
    }).error(function(err, status) {
      callback(err, null, status);
    });
  }


  return service;

}]);

