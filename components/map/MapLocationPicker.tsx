import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { reverseGeocode } from '../../utils/openStreetMapService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: any) => void;
  initialLocation?: { lat: number; lng: number };
  title: string;
  pickupLocation?: any;
  destinationLocation?: any;
}

export default function MapLocationPicker({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
  title,
  pickupLocation,
  destinationLocation,
}: MapLocationPickerProps) {
  const [centerLat, setCenterLat] = useState(initialLocation?.lat || 28.6139);
  const [centerLng, setCenterLng] = useState(initialLocation?.lng || 77.2090);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
      if (initialLocation) {
        setCenterLat(initialLocation.lat);
        setCenterLng(initialLocation.lng);
        getAddressFromLocation(initialLocation.lat, initialLocation.lng);
        
        // Animate map to initial location
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: initialLocation.lat,
              longitude: initialLocation.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 500);
          }
        }, 100);
      }
    } else {
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
    }
  }, [visible, initialLocation]);

  const getAddressFromLocation = async (lat: number, lng: number) => {
    setLoading(true);
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
    setLoading(false);
  };

  const onRegionChangeComplete = async (newRegion: any) => {
    setCenterLat(newRegion.latitude);
    setCenterLng(newRegion.longitude);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    timeoutRef.current = setTimeout(async () => {
      await getAddressFromLocation(newRegion.latitude, newRegion.longitude);
    }, 300);
  };

  const handleConfirmLocation = () => {
    onSelectLocation({
      description: address.split(',')[0] || 'Selected Location',
      location: { lat: centerLat, lng: centerLng },
      address: address,
      place_id: 0,
    });
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (initialLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
      setCenterLat(initialLocation.lat);
      setCenterLng(initialLocation.lng);
      getAddressFromLocation(initialLocation.lat, initialLocation.lng);
    }
  };

  const initialRegion = {
    latitude: initialLocation?.lat || 28.6139,
    longitude: initialLocation?.lng || 77.2090,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1000, 0] }) }] }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={handleConfirmLocation} style={styles.doneBtn}>
            <Text style={styles.doneText}>Confirm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            ref={(ref) => { mapRef.current = ref; }}
            style={styles.map}
            initialRegion={initialRegion}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* Show existing pickup marker for reference */}
            {pickupLocation?.location && (
              <Marker
                coordinate={{
                  latitude: pickupLocation.location.lat,
                  longitude: pickupLocation.location.lng,
                }}
                pinColor="#4CAF50"
              />
            )}
            {/* Show existing destination marker for reference */}
            {destinationLocation?.location && (
              <Marker
                coordinate={{
                  latitude: destinationLocation.location.lat,
                  longitude: destinationLocation.location.lng,
                }}
                pinColor="#F44336"
              />
            )}
          </MapView>

          {/* Center Pin - Static */}
          <View style={styles.centerPin} pointerEvents="none">
            <View style={styles.pinShadow}>
              <Ionicons name="pin" size={48} color="#F44336" />
            </View>
            <View style={styles.pinPulse} />
          </View>

          {/* Drag Hint */}
          <View style={styles.dragHint}>
            <Text style={styles.dragHintText}>Drag map to move pin</Text>
          </View>
        </View>

        {/* Address Bar */}
        <View style={styles.addressBar}>
          <View style={styles.addressIcon}>
            <Ionicons name="location-outline" size={20} color="#666" />
          </View>
          <View style={styles.addressContent}>
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Text style={styles.addressLabel}>Selected location</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {address || 'Move the map to select a location'}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity onPress={handleUseCurrentLocation} style={styles.myLocationBtn}>
            <Ionicons name="navigate" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 100,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    zIndex: 10,
  },
  pinShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    top: -16,
    left: -16,
  },
  dragHint: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dragHintText: {
    color: '#fff',
    fontSize: 12,
  },
  addressBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  myLocationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});