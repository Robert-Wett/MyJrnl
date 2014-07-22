var myApp = angular.module("MyJournal", ['ngAnimate', 'firebase']);

function JournalController($scope, $firebase) {
  var entryRef = new Firebase("https://sweltering-fire-8827.firebaseio.com/entries");
  var topRef = new Firebase("https://sweltering-fire-8827.firebaseio.com");
  var auth = new FirebaseSimpleLogin(topRef, function(error, user) {
      if (error) console.log(error)
      console.log(user);
  });
  //var tagRef = new Firebase("https://sweltering-fire-8827.firebaseio.com/tags");
  // Automatically syncs everywhere in realtime
  $scope.entries = $firebase(entryRef);
  //$scope.userTags = $firebase(tagRef);
  $scope.showLoading = true;
  $scope.entries.$on('loaded', function() {
    $scope.showLoading = false;
  });
  auth.login('github');
}
