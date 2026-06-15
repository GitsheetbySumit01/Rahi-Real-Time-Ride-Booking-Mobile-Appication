import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface RouteMapProps {
  pickup?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  userLocation?: { latitude: number; longitude: number };
  routePoints?: Array<{ latitude: number; longitude: number }>;
}

export default function RouteMap({ pickup, destination, userLocation, routePoints }: RouteMapProps) {
  const webViewRef = useRef<WebView>(null);

  const generateMapHTML = () => {
    const centerLat = pickup?.lat || userLocation?.latitude || destination?.lat || 28.6139;
    const centerLng = pickup?.lng || userLocation?.longitude || destination?.lng || 77.2090;
    
    // Build route polyline
    let routePolyline = '';
    if (routePoints && routePoints.length > 0) {
      const points = routePoints.map(p => `[${p.latitude}, ${p.longitude}]`).join(',');
      routePolyline = `
        var routePoints = [${points}];
        var routeLine = L.polyline(routePoints, {
          color: '#0066CC',
          weight: 5,
          opacity: 0.8,
          smoothFactor: 1,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 0; padding: 0; overflow: hidden; background: #f8f9fa; }
            #map { width: 100vw; height: 100vh; background: #f8f9fa; }
          </style>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        </head>
        <body>
          <div id="map"></div>
          <script>
            try {
              var map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
              
              L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                subdomains: 'abcd',
                maxZoom: 19,
                minZoom: 3
              }).addTo(map);
              
              // Pickup Marker
              ${pickup ? `
                L.marker([${pickup.lat}, ${pickup.lng}], {
                  icon: L.divIcon({
                    html: '<div style="background-color: #4CAF50; width: 28px; height: 28px; border-radius: 14px; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><div style="width: 10px; height: 10px; background-color: white; border-radius: 5px;"></div></div>',
                    iconSize: [28, 28]
                  })
                }).addTo(map).bindPopup('Pickup').openPopup();
              ` : ''}
              
              // Destination Marker
              ${destination ? `
                L.marker([${destination.lat}, ${destination.lng}], {
                  icon: L.divIcon({
                    html: '<div style="background-color: #F44336; width: 28px; height: 28px; border-radius: 14px; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><div style="width: 10px; height: 10px; background-color: white; border-radius: 5px;"></div></div>',
                    iconSize: [28, 28]
                  })
                }).addTo(map).bindPopup('Destination');
              ` : ''}
              
              // User Location Marker
              ${userLocation ? `
                L.marker([${userLocation.latitude}, ${userLocation.longitude}], {
                  icon: L.divIcon({
                    html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 10px; border: 2px solid white;"></div>',
                    iconSize: [20, 20]
                  })
                }).addTo(map).bindPopup('Your Location');
              ` : ''}
              
              // Route Polyline
              ${routePolyline}
              
              // Fit bounds to show all markers
              var bounds = [];
              ${pickup ? `bounds.push([${pickup.lat}, ${pickup.lng}]);` : ''}
              ${destination ? `bounds.push([${destination.lat}, ${destination.lng}]);` : ''}
              ${userLocation ? `bounds.push([${userLocation.latitude}, ${userLocation.longitude}]);` : ''}
              ${routePoints && routePoints.length > 0 ? `bounds.push([${routePoints[0].latitude}, ${routePoints[0].longitude}]);` : ''}
              ${routePoints && routePoints.length > 0 ? `bounds.push([${routePoints[routePoints.length-1].latitude}, ${routePoints[routePoints.length-1].longitude}]);` : ''}
              
              if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50] });
              }
              
            } catch(e) {
              console.error('Map error:', e);
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        scrollEnabled={false}
        zoomEnabled={true}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  map: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});