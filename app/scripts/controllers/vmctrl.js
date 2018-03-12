angular.module('openapp').controller('templatectrl', ['$scope', function($scope, $routeParams, stackservice){
    $scope.template = {};
    $scope.serverObj = {};
    $scope.domainObj = {};
    $scope.platformObj = {};
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
