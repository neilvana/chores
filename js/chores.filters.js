angular.module('chores.filters', []).filter('names', function() {
   return function(input,kids) {
      if (!kids) {
         return input;
      }
      var j = 0;
      for (j; j < kids.length; j++) {
         if (kids[j].label == input) {
            return kids[j].name;
         }
      }
      return input;
}}).
filter('checkmark', function() {
   return function(input) {
      if (input) {
         return 'glyphicon-ok'
      } else {
         return 'glyphicon-remove';
      }
}}); 
