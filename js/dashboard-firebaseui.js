'use strict';

var dashboardUi = (function() {
  var _initialized = false;
  var _callback = null;
  var _config = {
      apiKey: "",
      authDomain: "",
      databaseURL: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: ""
  };
  var _uiConfig = {
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        // User successfully signed in.
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        if (_callback)
          _callback();
        return false;
      }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    //signInFlow: 'popup',
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      firebase.auth.GithubAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
      firebase.auth.PhoneAuthProvider.PROVIDER_ID
    ],
  };

  (function _ctor() {
    firebase.initializeApp(_config);
  })();

  function _init(callback) {
    if (_initialized)
      return;

    if (typeof callback == 'function')
      _callback = callback;

    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(function () {
      if (firebase.auth().currentUser == null) {
          // Initialize the FirebaseUI Widget using Firebase.
          var ui = new firebaseui.auth.AuthUI(firebase.auth());
          // The start method will wait until the DOM is loaded.
          ui.start('#firebaseui-auth-container', _uiConfig);
      }
      else {
          if (_callback)
            _callback();
      }
    })
    .catch(function(error) {
      // Handle Errors here.
      console.error(`${error.code}: ${error.message}`);
    });
  }

  return {
    init: _init,
  };
})();
