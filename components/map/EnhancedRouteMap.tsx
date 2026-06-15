import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface EnhancedRouteMapProps {
  pickup?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  userLocation?: { latitude: number; longitude: number };
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  rideStatus?: string;
  onMapDragComplete?: (region: { latitude: number; longitude: number }) => void;
  dragMode?: boolean;
}

export default function EnhancedRouteMap({
  pickup,
  destination,
  userLocation,
  routeCoordinates,
  rideStatus,
  onMapDragComplete,
  dragMode,
}: EnhancedRouteMapProps) {
  const webViewRef = useRef<WebView>(null);

  const generateMapHTML = () => {
    const centerLat = pickup?.lat ?? userLocation?.latitude ?? destination?.lat ?? 28.6139;
    const centerLng = pickup?.lng ?? userLocation?.longitude ?? destination?.lng ?? 77.2090;

    // ── Route polyline ────────────────────────────────────────────────────────
    let routePolyline = '';
    if (routeCoordinates && routeCoordinates.length > 0) {
      const points = routeCoordinates.map(p => `[${p.latitude},${p.longitude}]`).join(',');
      routePolyline = `
        var routeLine = L.polyline([${points}], {
          color: '#1565C0',
          weight: 6,
          opacity: 0.95,
          smoothFactor: 1,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
      `;
    }

    // ── Fit bounds if no route but have pickup + destination ─────────────────
    const fitBoundsScript = (!routeCoordinates || routeCoordinates.length === 0)
      ? `
        var _bounds = [];
        ${pickup    ? `_bounds.push([${pickup.lat}, ${pickup.lng}]);`         : ''}
        ${destination ? `_bounds.push([${destination.lat}, ${destination.lng}]);` : ''}
        ${userLocation ? `_bounds.push([${userLocation.latitude}, ${userLocation.longitude}]);` : ''}
        if (_bounds.length > 1) map.fitBounds(_bounds, { padding: [80, 80] });
      `
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{overflow:hidden;background:#e8edf0;}
    #map{width:100vw;height:100vh;}

    /* ── Animated user dot ── */
    @keyframes userPulse {
      0%   { box-shadow: 0 0 0 0 rgba(33,150,243,0.5); }
      70%  { box-shadow: 0 0 0 12px rgba(33,150,243,0); }
      100% { box-shadow: 0 0 0 0 rgba(33,150,243,0); }
    }
    .user-dot {
      width:16px; height:16px; border-radius:50%;
      background:#2196F3; border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      animation: userPulse 2s ease-in-out infinite;
    }

    /* ── Building footprint style ── */
    .building {
      stroke: #bbb;
      stroke-width: 1;
      fill: #e8e8e8;
      fill-opacity: 0.5;
      transition: fill 0.2s;
    }
    .building:hover {
      fill: #d0d0d0;
      stroke: #999;
    }

    /* ── POI chip (from Overpass overlay) ── */
    .poi-chip {
      background:rgba(255,255,255,0.96);
      border:none;
      padding:3px 8px;
      border-radius:12px;
      font-size:11px;
      font-family:-apple-system,sans-serif;
      font-weight:500;
      color:#333;
      white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.18);
      cursor:pointer;
      display:flex;
      align-items:center;
      gap:3px;
      line-height:1.4;
    }
    .poi-chip:active { transform:scale(0.96); }

    /* Suppress default Leaflet outline on divIcons */
    .leaflet-div-icon { background:transparent !important; border:none !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function() {
  // ── 1. Initialise map ─────────────────────────────────────────────────────
  var map = L.map('map', {
    zoomControl: false,
    fadeAnimation: true,
    zoomAnimation: true,
  }).setView([${centerLat}, ${centerLng}], 15);

  // ── 2. Tile layers ────────────────────────────────────────────────────────
  var cartoVoyager = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; OSM &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
      maxNativeZoom: 19,
    }
  );

  var osmStandard = L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }
  );

  cartoVoyager.addTo(map);

  map.on('zoomend', function() {
    var z = map.getZoom();
    if (z >= 17) {
      if (!map.hasLayer(osmStandard)) {
        map.removeLayer(cartoVoyager);
        osmStandard.addTo(map);
      }
    } else {
      if (!map.hasLayer(cartoVoyager)) {
        map.removeLayer(osmStandard);
        cartoVoyager.addTo(map);
      }
    }
  });

  // ── 3. Zoom control (bottom-right) ────────────────────────────────────────
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

  // ── 4. BUILDING FOOTPRINTS ─────────────────────────────────────────────────
  async function addBuildings() {
    var bounds = map.getBounds();
    var bbox = [
      bounds.getSouth(), bounds.getWest(),
      bounds.getNorth(), bounds.getEast()
    ].join(',');
    
    var query = '[out:json];(way["building"]({{bbox}}););out geom;';
    query = query.replace('{{bbox}}', bbox);
    
    try {
      var response = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query));
      var data = await response.json();
      
      data.elements.forEach(function(el) {
        if (el.geometry && el.geometry.length > 0) {
          var coords = el.geometry.map(function(g) { return [g.lat, g.lon]; });
          L.polygon(coords, {
            color: '#bbb',
            weight: 1,
            opacity: 0.6,
            fillColor: '#e8e8e8',
            fillOpacity: 0.5,
            className: 'building'
          }).addTo(map);
        }
      });
    } catch(e) {}
  }

  // ── 5. Pickup marker ─────────────────────────────────────────────────────
  ${pickup ? `
    var pickupIcon = L.divIcon({
      className: 'leaflet-div-icon',
      html: [
        '<div style="',
          'width:36px;height:36px;border-radius:50%;',
          'background:#43A047;border:3px solid white;',
          'box-shadow:0 3px 10px rgba(0,0,0,0.25);',
          'display:flex;align-items:center;justify-content:center;',
        '">',
          '<div style="width:12px;height:12px;border-radius:50%;background:white;"></div>',
        '</div>',
        '<div style="',
          'width:0;height:0;',
          'border-left:7px solid transparent;border-right:7px solid transparent;',
          'border-top:10px solid #43A047;',
          'margin:-2px auto 0 auto;width:0;display:block;',
        '"></div>',
      ].join(''),
      iconSize: [36, 46],
      iconAnchor: [18, 46],
      popupAnchor: [0, -48],
    });
    L.marker([${pickup.lat}, ${pickup.lng}], { icon: pickupIcon })
      .addTo(map)
      .bindPopup('<b>Pickup</b>', { closeButton: false });
  ` : ''}

  // ── 6. Destination marker ─────────────────────────────────────────────────
  ${destination ? `
    var destIcon = L.divIcon({
      className: 'leaflet-div-icon',
      html: [
        '<div style="',
          'width:36px;height:36px;border-radius:50%;',
          'background:#E53935;border:3px solid white;',
          'box-shadow:0 3px 10px rgba(0,0,0,0.25);',
          'display:flex;align-items:center;justify-content:center;',
        '">',
          '<div style="width:12px;height:12px;border-radius:50%;background:white;"></div>',
        '</div>',
        '<div style="',
          'width:0;height:0;',
          'border-left:7px solid transparent;border-right:7px solid transparent;',
          'border-top:10px solid #E53935;',
          'margin:-2px auto 0 auto;width:0;display:block;',
        '"></div>',
      ].join(''),
      iconSize: [36, 46],
      iconAnchor: [18, 46],
      popupAnchor: [0, -48],
    });
    L.marker([${destination.lat}, ${destination.lng}], { icon: destIcon })
      .addTo(map)
      .bindPopup('<b>Drop</b>', { closeButton: false });
  ` : ''}

  // ── 7. User location dot ──────────────────────────────────────────────────
  ${userLocation ? `
    var userIcon = L.divIcon({
      className: 'leaflet-div-icon',
      html: '<div class="user-dot"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10],
    });
    L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>You</b>', { closeButton: false });
  ` : ''}

  // ── 8. Route polyline ─────────────────────────────────────────────────────
  ${routePolyline}
  ${fitBoundsScript}

  // ── 9. Overpass POI overlay ───────────────────────────────────────────────
  var poiLayer = L.layerGroup().addTo(map);
  var poiLoadTimer = null;
  var lastPoiBbox = null;

  var POI_ICONS = {
    restaurant:'🍽️', cafe:'☕', fast_food:'🍔', food_court:'🍱',
    bar:'🍺', pub:'🍺', bakery:'🥐', ice_cream:'🍦', juice_bar:'🥤',
    supermarket:'🛒', convenience:'🏪', mall:'🏬', clothes:'👗',
    shoes:'👟', electronics:'📱', mobile_phone:'📱', jewellery:'💍',
    hospital:'🏥', clinic:'🏥', pharmacy:'💊', doctors:'👨‍⚕️',
    dentist:'🦷', veterinary:'🐾', bank:'🏦', atm:'💳',
    fuel:'⛽', parking:'🅿️', bus_station:'🚌', taxi:'🚕',
    school:'🏫', college:'🏫', university:'🎓', library:'📚',
    park:'🌳', cinema:'🎬', theatre:'🎭', museum:'🏛️',
    hotel:'🏨', hostel:'🏨', guest_house:'🏠',
    post_office:'📮', police:'👮', fire_station:'🚒',
    place_of_worship:'🕌', toilets:'🚻',
  };

  function poiEmoji(tags) {
    var t = tags.amenity || tags.shop || tags.tourism || tags.leisure || '';
    return POI_ICONS[t] || '📍';
  }

  function loadPOIs() {
    var z = map.getZoom();
    if (z < 15) {
      poiLayer.clearLayers();
      lastPoiBbox = null;
      return;
    }

    var b = map.getBounds();
    var bbox = [
      b.getSouth().toFixed(5), b.getWest().toFixed(5),
      b.getNorth().toFixed(5), b.getEast().toFixed(5)
    ].join(',');

    if (bbox === lastPoiBbox) return;
    lastPoiBbox = bbox;

    var q = [
      '[out:json][timeout:10];',
      '(',
        'node["amenity"]["name"](', bbox, ');',
        'node["shop"]["name"](', bbox, ');',
        'node["tourism"]["name"](', bbox, ');',
        'node["leisure"]["name"](', bbox, ');',
        'way["amenity"]["name"](', bbox, ');',
        'way["shop"]["name"](', bbox, ');',
      ');',
      'out center 80;',
    ].join('');

    fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        poiLayer.clearLayers();
        var seen = {};
        var count = 0;

        data.elements.forEach(function(el) {
          if (count >= 80) return;
          var lat = el.lat || (el.center && el.center.lat);
          var lon = el.lon || (el.center && el.center.lon);
          if (!lat || !lon) return;

          var name = el.tags && el.tags.name;
          if (!name || name.length > 30) return;

          var key = name + '|' + lat.toFixed(3) + '|' + lon.toFixed(3);
          if (seen[key]) return;
          seen[key] = true;
          count++;

          var emoji = poiEmoji(el.tags || {});
          var shortName = name.length > 18 ? name.slice(0, 16) + '…' : name;

          var icon = L.divIcon({
            className: 'leaflet-div-icon',
            html: '<div class="poi-chip">' + emoji + ' ' + shortName + '</div>',
            iconSize: [0, 0],
            iconAnchor: [0, 0],
            popupAnchor: [40, 0],
          });

          var typeLabel = (el.tags && (el.tags.amenity || el.tags.shop || el.tags.tourism || el.tags.leisure)) || 'Place';
          L.marker([lat, lon], { icon: icon, interactive: true, zIndexOffset: 100 })
            .addTo(poiLayer)
            .bindPopup('<b>' + name + '</b><br><span style="color:#888;font-size:12px;text-transform:capitalize;">' + typeLabel + '</span>');
        });
      })
      .catch(function() {});
  }

  // Load buildings and POIs on map move
  map.on('moveend zoomend', function() {
    setTimeout(addBuildings, 300);
    clearTimeout(poiLoadTimer);
    poiLoadTimer = setTimeout(loadPOIs, 600);
  });

  // Initial loads
  setTimeout(addBuildings, 500);
  setTimeout(loadPOIs, 800);

  // ── 10. Drag-mode center reporting ─────────────────────────────────────────
  ${dragMode ? `
    map.on('moveend', function() {
      var c = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'dragend', lat: c.lat, lng: c.lng
      }));
    });
  ` : ''}

})();
</script>
</body>
</html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'dragend' && onMapDragComplete) {
        onMapDragComplete({ latitude: data.lat, longitude: data.lng });
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        scrollEnabled={true}
        zoomEnabled={true}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8edf0' },
  map: { flex: 1, backgroundColor: '#e8edf0' },
});