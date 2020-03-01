'use strict';

const configListener = (function () {
  const _configPath = '/config';
  let _callback,
    _configRef,
    _configuration;

  function _init(callback) {
    _callback = callback;
    _configRef = firebase.database().ref(_configPath);
    _configRef.once('value').then(function (snapshot) {
      _configuration = snapshot.val();
      if (typeof _callback == 'function') {
        _callback(_configuration);
      }
    });
  }

  return {
    init: _init,
    configuration: () => _configuration,
  };
})();
