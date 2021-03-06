var myApp = angular.module("MyJournal", ['ngAnimate', 'firebase', 'ngSanitize']);

function JournalController($scope, $firebase) {
  var entryRef = new Firebase("https://sweltering-fire-8827.firebaseio.com/2/entries");
  //var tagRef = new Firebase("https://sweltering-fire-8827.firebaseio.com/tags");
  $scope.entries = $firebase(entryRef);
  //$scope.userTags = $firebase(tagRef);
  $scope.showLoading = true;
  $scope.entries.$on('loaded', function() {
    $scope.showLoading = false;
  });
}
