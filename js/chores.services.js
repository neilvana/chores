'use strict';

/* Services */

angular.module('chores.services', ['ngResource']).
   factory('Chores', function($resource) {
      return $resource('/api/chores/chores', {}, {
         query: {method: 'GET', params:{}, isArray:false},
      });
   }).
   factory('Chore', function($resource) {
      return $resource('/api/chores/chores/:id', {id : '@_id.$oid'});
   }).
   factory('Kids', function($resource) {
      return $resource('/api/chores/kids', {}, {
         query: {method: 'GET', params:{}, isArray:false}
      });
   }).
   factory('Summaries', function($resource) {
      return $resource('/api/chores/kids/summaries', {}, {
         query: {method: 'GET', params:{}, isArray:false},
       });
   }).
   factory('CompletedChores', function($resource) {
      return $resource('/api/chores/completed-chores', {}, {
         query: {method: 'GET', params:{}, isArray:false}
      });
   }).
   factory('CompletedChore', function($resource) {
      return $resource('/api/chores/completed-chores/:id', {id: '@id'});
   });
