'use strict';

var openapp = angular.module("openapp", ['ngRoute', 'ngCookies', 'chart.js', 'rzModule', 'ngFileUpload']);
openapp.config(function($routeProvider, $locationProvider){
  $routeProvider.when('/home', {
    templateUrl: 'views/main.html'
  }).when('/install', {
    templateUrl: 'views/install.html'
  }).when('/scale', {
    templateUrl: 'views/scale.html'
  }).when('/signin', {
    templateUrl: 'views/scalelogin.html'
  }).when('/scalesettings', {
    templateUrl: 'views/scalesettings.html'
  }).when('/use', {
    templateUrl: 'views/use.html'
    }).when('/settings', {
    templateUrl: 'views/settings.html'
  }).when('/template/:type', {
    templateUrl: 'views/template.html'
  }).when('/buildvm/:type', {
    templateUrl: 'views/buildvm.html'
  }).when('/buildinfra', {
    templateUrl: 'views/buildinfra.html'
  }).when('/buildinfra/:mode', {
    templateUrl: 'views/buildinfra.html'
  }).when('/heat', {
    templateUrl: 'views/buildseedtemplate.html'
  }).otherwise( { redirectTo: "/home" });

  $locationProvider.html5Mode(true);
  $locationProvider.hashPrefix('!');
});
