angular.module('openapp').controller('templatectrl', ['$scope', '$routeParams', 'stackservice', function($scope, $routeParams, stackservice){
  console.log('templatectrl called');
    $scope.template = {};
    $scope.serverObj = {};
    $scope.domainObj = {};
    $scope.platformObj = {};

    $scope.platformObj.admin = "apprendaadmin";
    $scope.platformObj.sys = "apprendasystem";
    $scope.domainObj.name = "appdemo";
    $scope.domainObj.suf = "local";
    $scope.domainObj.pass = "password";
    $scope.domainObj.admin = "apprendaadmin";
    if ($routeParams && $routeParams.type){
      $scope.serverObj.type = $routeParams.type;
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

}]);
