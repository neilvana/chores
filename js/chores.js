'use strict';

/* Main Application */

var choreDashboard = angular.module('chores', [ 'chores.controllers', 'ngRoute', 'ngSanitize'])
  .config
  (
    [
      '$routeProvider',
      '$locationProvider',
      '$sceProvider',
      function($routeProvider, $locationProvider, $sceProvider) {
        $sceProvider.enabled(false);
        $routeProvider.
        when('/chores/:kid', {
          templateUrl: 'partials/chores.html',
          controller: 'ChoresCtrl',
          reloadOnSearch: false
        }).
        when('/list', {
          templateUrl: 'partials/list.html',
          controller: 'ListCtrl',
          reloadOnSearch: false
        }).
        when('/main', {
          templateUrl: 'partials/main.html',
          controller: 'MainCtrl',
          reloadOnSearch: false
        }).
        otherwise({redirectTo: '/main'});
      }
    ]
  );
