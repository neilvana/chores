var choreControllers = angular.module('chores.controllers', ['chores.services', 'chores.filters', 'ui.bootstrap.modal', 'ngRoute']);

choreControllers.controller('HeadCtrl', [ '$scope', '$location', 'Kids', function($scope, $location, Kids) {
   $scope.currentPath = $location.path();
   $scope.errors = {
      hasError : false,
      errorMsg : '',
      handleHTTPError : function(response) {
         if (response.status == 404) {
                  $scope.errors.errorMsg = response.status + " Internal Error: Backend URL not found."
               } else {
                  $scope.errors.errorMsg = response.status + " " + response.data.title + ": "  +response.data.description
               }
               $scope.errors.hasError = true;
      }
   };
   Kids.query({},
      function(value) {
         $scope.mainModel = value;
      },
      $scope.errors.handleHTTPError);
   $scope.$on('$locationChangeSuccess', function(event) {
      $scope.currentPath = $location.path();
   });
 }]);

choreControllers.controller('ListCtrl', [ '$scope', '$modal', 'Chores', 'Chore', function($scope, $modal, Chores, Chore) {
   $scope.q = '';
   $scope.formVisible = false;
   $scope.passwd = '';
   $scope.newChore = {
      name : '',
      _id : { $oid : '' },
      type : 'one-time',
      assigned : [],
      points : 10,
      sundays : false,
      independent : true
   };

   var updateChores = function() {
      Chores.query({},
      function(value) {
         $scope.response = value;
      },$scope.errors.handleHTTPError);
   }
   updateChores();

   $scope.openForm = function(chore, kids) {
       var modalInstance = $modal.open({
         templateUrl: 'partials/editChoreDialog.html',
         controller: 'ChoreEditDialogCtrl',
         size: 'lg',
         resolve: {
            chore: function () {
               return chore;
            },
            kids: function() {
               return kids;
            }
         }
      });

      modalInstance.result.then(function(chore) {
         if (chore._id.$oid != '') {
            Chore.save(chore, updateChores, $scope.errors.handleHTTPError);
         } else {
            newChore = new Chores(chore);
            newChore.$save(chore, updateChores, $scope.errors.handleHTTPError);
         }
      }, function () {
         // Modal dismissed, nothing to do.
      });
   };
 
   $scope.deleteChore = function(choreId) {
      var doIt = confirm('Are you sure you would like to delete this chore?');
      if (doIt) {
         Chore.remove({id:choreId.$oid},updateChores,$scope.errors.handleHTTPError);
      }
   };

}]);

choreControllers.controller('ChoreEditDialogCtrl', [ '$scope', '$modalInstance', 'chore', 'kids', function($scope, $modalInstance, chore, kids) {
   $scope.chore = chore;
   $scope.kids = kids;
   $scope.toggleAssigned = function toggleAssigned(kid) {
      var idx = $scope.chore.assigned.indexOf(kid);
      if (idx > -1) {
         $scope.chore.assigned.splice(idx, 1);
      } else {
         $scope.chore.assigned.push(kid);
      }
   };
   $scope.ok = function() {
      $modalInstance.close($scope.chore);
   };

   $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
   };

}]);

choreControllers.controller('MainCtrl', [ '$scope', '$location', 'Summaries', function($scope, $location, Summaries) {
   var updateSummaries = function() {
      if (typeof $scope.date == 'undefined') {
         $scope.date = Date.now();
      }
      if (typeof $location.search()['t'] == 'undefined') {
         $scope.date = Date.now();
      } else if (parseInt($location.search()['t']) != $scope.date) {
         $scope.date = parseInt($location.search()['t']);
      }
      Summaries.query({date: $scope.date},
         function(value) {
            $scope.response = value;
            $scope.response.hasError = false;
         },
         $scope.errors.handleHTTPError);
   };
   updateSummaries();
   $scope.utility = {
      incrementDate : function() {
         var date = $scope.date + 24*60*60*1000;
         if (date > Date.now()) {
            return;
         }
         $location.search('t', date);
      },
      decrementDate : function() {
         $location.search('t', $scope.date - 24*60*60*1000);
      },
      isToday : function() {
         if ($scope.date + 24*60*60*1000 > Date.now()) {
            return true;
         } else {
            return false;
         }
      },
      jumpToToday : function() {
         $location.search('t', Date.now());
      }
   };
   $scope.$on('$locationChangeSuccess', function(event) {
      updateSummaries();
   });
 }]);

choreControllers.controller('ChoresCtrl', [ '$scope', '$routeParams', '$location', 'Chores', 'CompletedChores', 'CompletedChore', function($scope, $routeParams, $location, Chores, CompletedChores, CompletedChore) {
   $scope.kid = $routeParams.kid;
   $scope.chores = {
      available: [],
      completed: []
   }
   
   var update = function() {
      if (typeof $scope.date == 'undefined') {
         $scope.date = Date.now();
      }
      if (typeof $location.search()['t'] == 'undefined') {
         $scope.date = Date.now();
      } else if (parseInt($location.search()['t']) != $scope.date) {
         $scope.date = parseInt($location.search()['t']);
      }
      Chores.query({kid:$scope.kid, date: $scope.date},
         function(value) {
            $scope.chores.available = value.chores;
         },
         $scope.errors.handleHTTPError);
      CompletedChores.query({kid:$scope.kid, date: $scope.date},
         function(value) {
            $scope.chores.completed = value.chores;
            $scope.chores.total = value.total;
         },
         $scope.errors.handleHTTPError);
   };

   update();

   $scope.utility = {
      incrementDate : function() {
         var date = $scope.date + 24*60*60*1000;
         if (date > Date.now()) {
            return;
         }
         $location.search('t', date);
      },
      decrementDate : function() {
         $location.search('t', $scope.date - 24*60*60*1000);
      },
      isToday : function() {
         if ($scope.date + 24*60*60*1000 > Date.now()) {
            return true;
         } else {
            return false;
         }
      },
      jumpToToday : function() {
         $location.search('t', Date.now());
      },
      markDone : function(id) {
         var chore = new CompletedChores()
         chore.kid = $scope.kid;
         chore.date = $scope.date;
         chore.choreId = id;
         chore.$save(
            function(value) {
               update();
            },
            $scope.errors.handleHTTPError);
      },
      markUndone : function(choreId) {
         CompletedChore.delete({id:choreId},
            function(value) {
               update();
            },
            $scope.errors.handleHTTPError);
   }
   };
   $scope.$on('$locationChangeSuccess', function(event) {
      update();
   });

}]);
