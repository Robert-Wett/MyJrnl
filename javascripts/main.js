var journalApp = angular.module("MyJournal", ['ngAnimate', 'firebase']);

function JournalController($scope, $firebase) {
  var entryRef = new Firebase("https://sweltering-fire-8827.firebaseio.com/entries");
  var tagRef = new Firebase("https://sweltering-fire-8827.firebaseio.com/tags");
  // Automatically syncs everywhere in realtime
  $scope.showLoading = true;
  $scope.entries = $firebase(entryRef);
  $scope.userTags = $firebase(tagRef);
  
  $scope.entries.$on('loaded', functon() {
    $scope.showLoading = false;
  });
}
