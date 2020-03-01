'use strict';

const geofireListener = (function() {
  const _neetsGeofirePath = '/weets/geofire/witneets/',
    _geoQueryQuery = {
        center: [ 41.004132, 28.974710 ],
        radius: 10000000, // In meters (we are going to listen to all locations...)
    };

  var _neetsGeofire,
    _geoQuery,
    _callbackObject = { };

  function _init(callbackObject) {
    if (typeof callbackObject == 'object')
      _callbackObject = callbackObject;

    _neetsGeofire = new GeoFire(firebase.database().ref(_neetsGeofirePath));
    _geoQuery = _getGeoQuery(_neetsGeofire);
  };

  function _getGeoQuery(geofire) {
    var query = geofire.query(_geoQueryQuery);
    query.on('key_entered', _queryCallback.bind(null, 'entered'));
    query.on('key_exited', _queryCallback.bind(null, 'exited'));
    query.on('key_moved', _queryCallback.bind(null, 'moved'));
  };

  // Valid 'type' values are:
  // - 'entered'
  // - 'exited'
  // - 'moved'
  function _queryCallback(type, key, location) {
    if (typeof _callbackObject[type] == 'function')
      _callbackObject[type](type, key, location);
  };

  return {
    // Firebase MUST have been initialized BEFORE calling init.
    init: _init,
  };
})();
