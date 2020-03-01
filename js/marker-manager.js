const markerManager = (function () {
  const _markerIconPath = 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
    _markerScale = 1.3,
    _markerFillOpacity = 0.8,
    _witneetsPath = '/weets/witneets/',
    _witneetsRef = firebase.database().ref(_witneetsPath),
    _validKeys = new Set(), // A map of tweet ids that are within our area of interest.
    _markerMap = new Map(),
    _witneetMap = new Map(),
    _defaultDisplacement = 0.00002, // Used for finding a unique position for a marker.
		DefaultTagName = 'default',
		DefaultMarkerColor = "green",
		DefaultMarker = {
            path: _markerIconPath,
            scale: _markerScale,
            fillColor: DefaultMarkerColor,
            fillOpacity: _markerFillOpacity,
            strokeWeight: 0
          },
		HiddenTagsSet = new Set();
  let _gMap,
    _markerClusterer,
    _config,
    _markerIconsMap;

  function _init(googleMap) {
    _gMap = googleMap;
    _markerClusterer = new MarkerClusterer(_gMap, [], {imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'});
    configListener.init(config => {
        _config = config;
        _processConfiguration(_config);
        _witneetsRef.on('child_changed', snapshot => {
          _processWitneet(snapshot.val());
        });
        _witneetsRef.on('child_added', snapshot => {
          _processWitneet(snapshot.val());
        });
    });
  };

  function _processConfiguration(config) {
    _markerIconsMap = {};
    for (let prop in config.replyTracks) {
      let rack = config.replyTracks[prop];
      if (typeof rack.text == 'string'
        && typeof rack.color == 'string') {
          _markerIconsMap[rack.text] = {
            path: _markerIconPath,
            scale: _markerScale,
            fillColor: rack.color,
            fillOpacity: _markerFillOpacity,
            strokeWeight: 0
          };
      }
    }
  }

  function _processWitneet(witneet) {
		_witneetMap.set(witneet.tweetId, witneet);
    _updateMarker(witneet.tweetId);
  }

  // Handles geofire events.
  function _eventHandler(type, key, location) {
    switch (type) {
      case 'entered':
        _validKeys.add(key);
        _updateMarker(key);
        break;

      case 'exited':
        if (_validKeys.has(key)) {
          _validKeys.delete(key);
        }
        _removeMarker(key);
        break;

      case 'moved':
        if (_markerMap.has(key)) {
          _markerMap.get(key).setPosition(_getMarkerPosition(location));
        }
      break;
    };
  };

  function _removeMarker(key) {
    if (_markerMap.has(key)) {
      _markerClusterer.removeMarker(_markerMap.get(key));
      _markerMap.delete(key);
    }
  }

	function _isWitneetHidden(witneet) {
		let tag = (witneet.replyStats && witneet.replyStats.currentQualifiedStatus && witneet.replyStats.currentQualifiedStatus.tag) || DefaultTagName;
		return HiddenTagsSet.has(tag);
	}

  function _getMarker(key, witneet) {
    let infoWindow = _getInfoWindow(witneet),
      markerOptions = {
        position: _getMarkerPosition(witneet),
      },
      marker;

    // In case this marker's witneet has an effective reply
    // status associated to it, qualify its display.
    if (witneet.replyStats
      && witneet.replyStats.currentQualifiedStatus) {
      let tag = witneet.replyStats.currentQualifiedStatus.tag;
      if (typeof tag == 'string'
        && _markerIconsMap[tag]) {
        markerOptions.icon = _markerIconsMap[tag];
      }
    }
		else {
			markerOptions.icon = DefaultMarker;
		}

    marker = new google.maps.Marker(markerOptions);
    // Set infoWindow listener.
    marker.addListener('click', () => infoWindow.open(_gMap, marker));
		if (_isWitneetHidden(witneet)) {
			marker.visible = false;
		}

    return marker;
  };

  function _findUniquePosition(coords) {
    let unique,
      positions  = [..._markerMap.values()].map(m => ({ lat: m.position.lat(), lng: m.position.lng() })),
      direction = 0;

    for (let i = 0; ; ++i) {
      unique = true;

      for (let mCoords of positions) {
          let deltaLat = Math.abs(mCoords.lat - coords.lat),
            deltaLng = Math.abs(mCoords.lng - coords.lng);

          if (deltaLat < _defaultDisplacement
            && deltaLng < _defaultDisplacement) {
            let displacementMultiplier = Math.floor(i / 4) + 1,
              displacement = _defaultDisplacement * displacementMultiplier;

            switch (direction % 4) {
              case 0:
                coords.lng += displacement;
                break;

              case 1:
                coords.lat -= displacement;
                break;

              case 2:
                coords.lng -= displacement;
                break;

              case 3:
                coords.lat += displacement;
                break;
            }

            ++direction;
            unique = false;
            break;
          }
      }

      if (unique) {
        break;
      }
    }

    return coords;
  }

  function _getMarkerPosition(witneet) {
    let lat, lng;
    if (witneet.coordinates) {
      [lat, lng] = witneet.coordinates;
    }
    else {
      [lat, lng] = witneet.poi.coordinates;
    }

    return _findUniquePosition({ lat: lat, lng: lng });
  };

  function _getInfoWindow(witneet) {
    var contentString = `<div class="info-window-content">
        <div><span>Id:</span>&nbsp;${witneet.tweetId}</div>
        <div><span>Hashtags:</span>&nbsp;${witneet.hashtags.join(', ')}</div>
        <div><span>Username:</span>&nbsp;${witneet.user.name}</div>
        <div><span>Tweet date:</span>&nbsp;${new Date(witneet.twitterTimeStamp).toString()}</div>
        <div><span>Tweet text:</span>&nbsp;${witneet.text}</div>
        <div><span>Geoparsed:</span>&nbsp;${witneet.geoparsed}</div>
        <div><a href="https://twitter.com/${witneet.user.screenName}/status/${witneet.tweetId}" target="_blank">Tweet link</a></div>
      </div>`;
    return new google.maps.InfoWindow({
        content: contentString
      });
  };

  function _updateMarker(key) {
    if (!_validKeys.has(key)
      || !_witneetMap.has(key)) {
      return;
    }

    if (_markerMap.has(key)) {
      _removeMarker(key);
    }

    let witneet = _witneetMap.get(key),
      marker = _getMarker(key, witneet);
    _markerMap.set(key, marker);
    _markerClusterer.addMarker(marker);
  };
	
	// Updates the visibility of markers according to
	// their tag's hidden status.
	function _refreshMarkers() {
		for (let [key, value] of _markerMap.entries()) {
			_markerClusterer.clearMarkers();
			if (_isWitneetHidden(_witneetMap.get(key))) {
				_markerClusterer.removeMarker(value);
			}
			else {
				_markerClusterer.addMarker(value);
			}
		}
	}
	
	function _setHiddenTags(hiddenTags) {
		HiddenTagsSet.clear();
		if (Array.isArray(hiddenTags)) {
			hiddenTags.forEach(tr => HiddenTagsSet.add(tr));
		}
		_refreshMarkers();
	}

  return {
    init: _init,
    entered: _eventHandler,
    exited: _eventHandler,
    moved: _eventHandler,
		setHiddenTags: _setHiddenTags
  };
})();
