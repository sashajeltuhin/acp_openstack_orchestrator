angular.module('openapp').controller('settingsctrl', ['$scope', '$http', 'stackservice', 'msgservice', '$cookies', '$location', function($scope, $http, stackservice, msgservice, $cookies, $location){
  $scope.mail = {};
  $scope.jobs = [];
  $scope.token = $cookies.get('apptoken');

  if (!$scope.token){
    $location.path('/signin');
  }

  init();
  function init(){
    $scope.mail.settings = {};
    stackservice.loadinstallermail($http, function(err, data){
      console.log(err, data);
      if (err){
        popMesg("Email settings", "Failed: ", "error", err);
      }else{
        $scope.mail = data;
      }
    })
  }

  $scope.saveSettings = function(){
    var bag = $scope.mail;
    stackservice.installemailsettings(bag, $http, function(err, data){
      if (err){
        popMesg("Settings Initialized", "Failed: ", "error", err);
      }else{
        popMesg("Settings Initialized", "You will be able to recieve email notifications", "success");
      }
    })
  }

  $scope.listJobs = function(){
    listJobs();
  }

  function listJobs(){
    stackservice.listJobs($http, function(err, data){
      console.log('initsettings', err, data);
      if (err){
        popMesg("Job list", "Failed: ", "error",  err);
      }else{
        $scope.jobs = data;
      }
    });
  }

  $scope.killjob = function(j){
    var temp = {};
    temp.key = j.key;
    temp.id = j.id;
    stackservice.killjob(temp, $http, function(err, result){
      if (err){
        $scope.error = err;
        popMesg("Cannot stop the job", "error", err);
      }
      else{
        listJobs();
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

    var opts = {subject: header, msg: message, type: type};
    $scope.errormsg = message;
    msgservice.poptart(opts);
  }

}]);
