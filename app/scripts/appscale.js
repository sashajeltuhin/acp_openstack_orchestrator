'use strict';

var openapp = angular.module("openapp", ['ngRoute', 'ngCookies', 'chart.js', 'rzModule', 'ngFileUpload']);
openapp.config(function($routeProvider, $locationProvider){
  $routeProvider.when('/scale', {
    templateUrl: 'views/scale.html'
  }).when('/signin', {
    templateUrl: 'views/scalelogin.html'
  }).when('/scalesettings', {
    templateUrl: 'views/scalesettings.html'
  }).otherwise( { redirectTo: "/scale" });

  $locationProvider.html5Mode(true);
  $locationProvider.hashPrefix('!');
});
