// Initialize and add the map
(function initMap() {
  // The location of Istanbul
  const kadikoy = { lat: 40.975980, lng: 29.050518 },
    zoom = 14;
  // The map, centered at Istanbul
  const map = new google.maps.Map(document.getElementById('map'),
   { zoom: zoom, center: kadikoy });

  dashboardUi.init(() => {
    document.getElementById('firebaseui-auth-container').className += ' hidden';
    let mapDiv = document.getElementById('map');
    mapDiv.className = mapDiv.className.replace('hidden', '');
    markerManager.init(map);
    geofireListener.init(markerManager);
  });
}());
