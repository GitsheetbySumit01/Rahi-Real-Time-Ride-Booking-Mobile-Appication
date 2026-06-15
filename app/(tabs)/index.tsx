import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useLocation } from '../../hooks/useLocation';
import { useRideHistory, PreviousRide } from '../../hooks/useRideHistory';
import { checkServiceArea, reverseGeocode, geocodeAddress } from '../../utils/openStreetMapService';

import LocationInputRow from '../../components/LocationInputRow';
import RideHistoryList from '../../components/RideHistoryList';
import ServiceErrorModal from '../../components/ServiceErrorModal';
import InputMethodSheet from '../../components/InputMethodSheet';
import SelectionModeOverlay from '../../components/SelectionModeOverlay';
import SearchModal from '../../components/SearchModal';

const { width, height } = Dimensions.get('window');
const SAVED_PLACES_KEY = '@saved_places';

// Sheet snap points (distance from top of screen)
const SHEET_MAX_HEIGHT = height * 0.88;  // Increased to 88% for more scroll space
const SNAP_EXPANDED   = height * 0.35;   // ~65% visible
const SNAP_MEDIUM     = height * 0.55;   // ~45% visible
const SNAP_COLLAPSED  = height * 0.75;   // ~25% visible

const CARD_HALF = (width - 32 - 8) / 2;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Place {
  description: string;
  location: { lat: number; lng: number };
  address: string;
  place_id: number;
  country?: string;
  city?: string;
}

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  isDefault?: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PLACES: SavedPlace[] = [
  {
    id: 'home',
    name: 'Home',
    address: '',
    location: { lat: 0, lng: 0 },
    iconName: 'home-outline',
    iconBg: '#E8FBF0',
    iconColor: '#00B14F',
    isDefault: true,
  },
  {
    id: 'work',
    name: 'Work',
    address: '',
    location: { lat: 0, lng: 0 },
    iconName: 'business-outline',
    iconBg: '#EBF2FF',
    iconColor: '#2563EB',
    isDefault: true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationSelectorScreen() {
  const { location } = useLocation();
  const { previousRides, loadPreviousRides, toggleLikeRide } = useRideHistory();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [pickupLocation, setPickupLocation] = useState<Place | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Place | null>(null);

  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);
  const [selectionAddress, setSelectionAddress] = useState('');
  const [selectionCoordinates, setSelectionCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const [serviceError, setServiceError] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });
  const [inputMethodVisible, setInputMethodVisible] = useState(false);
  const [inputMethodField, setInputMethodField] = useState<'pickup' | 'destination' | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(DEFAULT_PLACES);
  const [savePlaceModal, setSavePlaceModal] = useState<{
    visible: boolean;
    editingId: string | null;
    pendingPlace: Place | null;
  }>({ visible: false, editingId: null, pendingPlace: null });
  const [saveName, setSaveName] = useState('');
  const [saveAddress, setSaveAddress] = useState('');

  const mainMapRef = useRef<WebView>(null);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSetInitialPickup = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const webViewKey = useRef(0);

  // ─── Sheet drag (handle-only PanResponder) ────────────────────────────────

  const translateY = useRef(new RNAnimated.Value(SNAP_MEDIUM)).current;
  const startY = useRef(SNAP_MEDIUM);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        startY.current = (translateY as any)._value ?? SNAP_MEDIUM;
      },
      onPanResponderMove: (_, g) => {
        const newY = Math.max(SNAP_EXPANDED - 20, Math.min(SNAP_COLLAPSED + 30, startY.current + g.dy));
        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, g) => {
        const current = (translateY as any)._value ?? SNAP_MEDIUM;
        let target: number;
        if (g.vy > 0.7) {
          target = SNAP_COLLAPSED;
        } else if (g.vy < -0.7) {
          target = SNAP_EXPANDED;
        } else {
          const d = [SNAP_EXPANDED, SNAP_MEDIUM, SNAP_COLLAPSED].map(s => Math.abs(current - s));
          target = [SNAP_EXPANDED, SNAP_MEDIUM, SNAP_COLLAPSED][d.indexOf(Math.min(...d))];
        }
        RNAnimated.spring(translateY, {
          toValue: target,
          damping: 28,
          stiffness: 260,
          mass: 0.75,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // ─── Map HTML (memoized) ─────────────────────────────────────────────────

  const mapHTML = useMemo(() => {
    const centerLat =
      selectionMode && selectionCoordinates
        ? selectionCoordinates.lat
        : pickupLocation?.location?.lat ?? location?.coords?.latitude ?? 28.6139;
    const centerLng =
      selectionMode && selectionCoordinates
        ? selectionCoordinates.lng
        : pickupLocation?.location?.lng ?? location?.coords?.longitude ?? 77.209;

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{overflow:hidden;}
    #map{width:100vw;height:100vh;}
    .leaflet-div-icon{background:transparent!important;border:none!important;}
    @keyframes pulse{
      0%{box-shadow:0 0 0 0 rgba(37,99,235,0.45);}
      70%{box-shadow:0 0 0 12px rgba(37,99,235,0);}
      100%{box-shadow:0 0 0 0 rgba(37,99,235,0);}
    }
    .leaflet-control-attribution{display:none!important;}
  </style>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var map=L.map('map',{zoomControl:false,attributionControl:false})
           .setView([${centerLat},${centerLng}],15);

  var voyager=L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {subdomains:'abcd',maxZoom:20}
  ).addTo(map);

  var osmStd=L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19}
  );

  map.on('zoomend',function(){
    if(map.getZoom()>=17){
      if(!map.hasLayer(osmStd)){voyager.remove();osmStd.addTo(map);}
    } else {
      if(!map.hasLayer(voyager)){osmStd.remove();voyager.addTo(map);}
    }
  });

  ${
    location
      ? `L.marker([${location.coords.latitude},${location.coords.longitude}],{
           icon:L.divIcon({className:'leaflet-div-icon',
             html:'<div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.5);animation:pulse 2s infinite;"></div>',
             iconSize:[14,14],iconAnchor:[7,7]})
         }).addTo(map);`
      : ''
  }

  ${
    !selectionMode && pickupLocation?.location
      ? `L.marker([${pickupLocation.location.lat},${pickupLocation.location.lng}],{
           icon:L.divIcon({className:'leaflet-div-icon',
             html:'<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.2));"><div style="width:34px;height:34px;border-radius:50%;background:#00B14F;border:3px solid #fff;display:flex;align-items:center;justify-content:center;"><div style="width:12px;height:12px;border-radius:50%;background:#fff;"></div></div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #00B14F;margin-top:-2px;"></div></div>',
             iconSize:[34,45],iconAnchor:[17,45]})
         }).addTo(map).bindPopup('<b>Pickup</b>');`
      : ''
  }

  ${
    !selectionMode && destinationLocation?.location
      ? `L.marker([${destinationLocation.location.lat},${destinationLocation.location.lng}],{
           icon:L.divIcon({className:'leaflet-div-icon',
             html:'<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.2));"><div style="width:34px;height:34px;border-radius:50%;background:#EF4444;border:3px solid #fff;display:flex;align-items:center;justify-content:center;"><div style="width:12px;height:12px;border-radius:50%;background:#fff;"></div></div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #EF4444;margin-top:-2px;"></div></div>',
             iconSize:[34,45],iconAnchor:[17,45]})
         }).addTo(map).bindPopup('<b>Drop</b>');`
      : ''
  }

  ${
    !selectionMode && pickupLocation?.location && destinationLocation?.location
      ? `map.fitBounds([[${pickupLocation.location.lat},${pickupLocation.location.lng}],[${destinationLocation.location.lat},${destinationLocation.location.lng}]],{padding:[80,80]});`
      : ''
  }

  ${
    selectionMode
      ? `map.on('moveend',function(){
           var c=map.getCenter();
           window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapmoveend',lat:c.lat,lng:c.lng}));
         });`
      : ''
  }
})();
</script>
</body>
</html>`;
  }, [location, selectionMode, selectionCoordinates, pickupLocation, destinationLocation]);

  // Re-key WebView only on mode change
  useEffect(() => {
    if (selectionMode !== null) webViewKey.current += 1;
  }, [selectionMode]);

  // ─── Load saved places ────────────────────────────────────────────────────

  useEffect(() => { loadSavedPlaces(); }, []);

  const loadSavedPlaces = async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_PLACES_KEY);
      if (raw) {
        const stored: SavedPlace[] = JSON.parse(raw);
        const defaults = DEFAULT_PLACES.map(d => stored.find(s => s.id === d.id) ?? d);
        const customs = stored.filter(s => !s.isDefault);
        setSavedPlaces([...defaults, ...customs]);
      }
    } catch (e) { console.warn('loadSavedPlaces:', e); }
  };

  const persistSavedPlaces = async (places: SavedPlace[]) => {
    try { await AsyncStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places)); }
    catch (e) { console.warn('persistSavedPlaces:', e); }
  };

  // ─── Location init ────────────────────────────────────────────────────────

  useEffect(() => {
    loadPreviousRides();
    if (location && !hasSetInitialPickup.current) {
      setPickupLocation({
        description: 'Current Location',
        location: { lat: location.coords.latitude, lng: location.coords.longitude },
        address: 'Current Location',
        place_id: 0,
      });
      setLoading(false);
      hasSetInitialPickup.current = true;
    } else if (location && loading) {
      setLoading(false);
    }
  }, [location]);

  useFocusEffect(useCallback(() => { loadPreviousRides(); }, []));

  // ─── Auto-navigate when both set ─────────────────────────────────────────

  useEffect(() => {
    if (pickupLocation && destinationLocation && !isNavigating) {
      validateAndNavigate();
    }
  }, [pickupLocation, destinationLocation]);

  const validateAndNavigate = async () => {
    if (!pickupLocation || !destinationLocation) return;
    if (destinationLocation.location.lat === 0 && destinationLocation.location.lng === 0) {
      Alert.alert('📍 Select Exact Location', 'Please search for or pin your destination on the map.');
      return;
    }
    try {
      const serviceCheck = await checkServiceArea(pickupLocation.location, destinationLocation.location);
      if (!serviceCheck.available) {
        setServiceError({
          visible: true,
          title: '🚫 Service Area Restricted',
          message: serviceCheck.message || 'This route is currently not available.',
        });
        setDestinationLocation(null);
        return;
      }
    } catch (e) {
      console.warn('checkServiceArea error:', e);
    }
    setIsNavigating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/confirm-ride',
      params: {
        pickup: JSON.stringify(pickupLocation),
        destination: JSON.stringify(destinationLocation),
      },
    });
    setTimeout(() => setIsNavigating(false), 1000);
  };

  // ─── Input method sheet ────────────────────────────────────────────────────

  const openInputMethodSheet = (field: 'pickup' | 'destination') => {
    setInputMethodField(field);
    setInputMethodVisible(true);
  };

  // ─── Reuse ride ──────────────────────────────────────────────────────────

  const reuseRideLocation = async (ride: PreviousRide) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasCoords = ride.destinationLocation &&
      ride.destinationLocation.lat !== 0 && ride.destinationLocation.lng !== 0;
    if (hasCoords) {
      setDestinationLocation({
        description: ride.destination,
        location: ride.destinationLocation,
        address: ride.destination,
        place_id: 0,
      });
    } else {
      try {
        const coords = await geocodeAddress(ride.destination);
        setDestinationLocation({
          description: ride.destination,
          location: coords || { lat: 0, lng: 0 },
          address: ride.destination,
          place_id: 0,
        });
      } catch {
        setDestinationLocation({
          description: ride.destination,
          location: { lat: 0, lng: 0 },
          address: ride.destination,
          place_id: 0,
        });
      }
    }
  };

  // ─── Map pin selection ────────────────────────────────────────────────────

  const confirmSelection = async () => {
    if (!selectionCoordinates || !selectionMode) return;
    const { lat, lng } = selectionCoordinates;
    const addressToUse = selectionAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const selectedPlace: Place = {
      description: addressToUse.split(',')[0].trim(),
      location: { lat, lng },
      address: addressToUse,
      place_id: 0,
    };
    if (selectionMode === 'pickup') setPickupLocation(selectedPlace);
    else setDestinationLocation(selectedPlace);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectionMode(null);
    setSelectionCoordinates(null);
    setSelectionAddress('');
  };

  const cancelSelectionMode = () => {
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    setSelectionMode(null);
    setSelectionCoordinates(null);
    setSelectionAddress('');
    setIsGeocoding(false);
  };

  // ─── Saved places CRUD ────────────────────────────────────────────────────

  const openAddSaveModal = () => {
    setSaveName(''); setSaveAddress('');
    setSavePlaceModal({ visible: true, editingId: null, pendingPlace: null });
  };

  const openEditSaveModal = (place: SavedPlace) => {
    setSaveName(place.name); setSaveAddress(place.address);
    setSavePlaceModal({ visible: true, editingId: place.id, pendingPlace: null });
  };

  const onSelectLocationForSave = (place: any) => {
    const p: Place = {
      description: place.description?.split(',')[0] || place.title || place.address,
      location: place.location,
      address: place.address || place.description,
      place_id: place.place_id || 0,
    };
    setSaveAddress(p.address);
    setSavePlaceModal(prev => ({ ...prev, visible: true, pendingPlace: p }));
    setSearchModalVisible(false);
  };

  const confirmSavePlace = async () => {
    const trimName = saveName.trim();
    const trimAddr = saveAddress.trim();
    if (!trimName) { Alert.alert('Name required', 'Please enter a name for this place.'); return; }
    const { editingId, pendingPlace } = savePlaceModal;
    if (editingId) {
      const updated = savedPlaces.map(p =>
        p.id !== editingId
          ? p
          : { ...p, name: trimName, address: trimAddr || p.address, ...(pendingPlace ? { location: pendingPlace.location } : {}) }
      );
      setSavedPlaces(updated); await persistSavedPlaces(updated);
    } else {
      const newPlace: SavedPlace = {
        id: `custom_${Date.now()}`,
        name: trimName,
        address: trimAddr,
        location: pendingPlace?.location ?? { lat: 0, lng: 0 },
        iconName: 'star-outline',
        iconBg: '#F3E8FF',
        iconColor: '#7C3AED',
        isDefault: false,
      };
      const updated = [...savedPlaces, newPlace];
      setSavedPlaces(updated); await persistSavedPlaces(updated);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavePlaceModal({ visible: false, editingId: null, pendingPlace: null });
    setSaveName(''); setSaveAddress('');
  };

  const deleteSavedPlace = async (id: string) => {
    Alert.alert('Remove place', 'Remove this saved place?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = savedPlaces.filter(p => p.id !== id);
          setSavedPlaces(updated); await persistSavedPlaces(updated);
        },
      },
    ]);
  };

  const useSavedPlace = (place: SavedPlace) => {
    if (!place.address) {
      setActiveField(null);
      setSavePlaceModal({ visible: false, editingId: place.id, pendingPlace: null });
      setSaveName(place.name); setSaveAddress('');
      setSearchModalVisible(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDestinationLocation({
      description: place.name,
      location: place.location,
      address: place.address,
      place_id: 0,
    });
  };

  const onSelectLocation = async (place: any) => {
    if (savePlaceModal.editingId !== null && !activeField) { onSelectLocationForSave(place); return; }
    const selected: Place = {
      description: place.description?.split(',')[0] || place.title || place.address,
      location: place.location,
      address: place.address || place.description,
      place_id: place.place_id || 0,
      country: place.country,
      city: place.city,
    };
    if (activeField === 'pickup') setPickupLocation(selected);
    else setDestinationLocation(selected);
    setSearchModalVisible(false);
    setActiveField(null);
  };

  // ─── Map message handler ─────────────────────────────────────────────────

  const handleMapMessage = (event: any) => {
    if (!selectionMode) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapmoveend') {
        const { lat, lng } = data;
        setSelectionCoordinates({ lat, lng });
        setIsGeocoding(true);
        if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
        geocodeTimeout.current = setTimeout(async () => {
          try {
            const addr = await reverseGeocode(lat, lng);
            setSelectionAddress(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } catch {
            setSelectionAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } finally {
            setIsGeocoding(false);
          }
        }, 300);
      }
    } catch {}
  };

  // ─── Loading screen ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingDot} />
        <Text style={styles.loadingText}>Locating you…</Text>
      </View>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Map */}
      <WebView
        ref={mainMapRef}
        key={webViewKey.current}
        source={{ html: mapHTML }}
        style={styles.map}
        scrollEnabled
        zoomEnabled
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMapMessage}
        onError={e => console.warn('WebView error', e.nativeEvent)}
      />

      {/* Modals & Overlays */}
      <ServiceErrorModal
        visible={serviceError.visible}
        title={serviceError.title}
        message={serviceError.message}
        onClose={() => setServiceError(prev => ({ ...prev, visible: false }))}
      />
      <InputMethodSheet
        visible={inputMethodVisible}
        field={inputMethodField}
        onClose={() => setInputMethodVisible(false)}
        onSearch={() => { setActiveField(inputMethodField); setSearchModalVisible(true); setInputMethodVisible(false); }}
        onMapSelect={() => { setSelectionMode(inputMethodField); setInputMethodVisible(false); }}
      />
      <SelectionModeOverlay
        visible={!!selectionMode}
        mode={selectionMode}
        address={selectionAddress}
        isGeocoding={isGeocoding}
        onConfirm={confirmSelection}
        onCancel={cancelSelectionMode}
        pinColor={selectionMode === 'pickup' ? '#00B14F' : '#EF4444'}
      />
      <SearchModal
        visible={searchModalVisible}
        field={activeField}
        onClose={() => {
          setSearchModalVisible(false);
          if (!activeField) setSavePlaceModal(p => ({ ...p, visible: false, editingId: null }));
        }}
        onSelectLocation={onSelectLocation}
      />

      {/* Save/Edit Place Modal */}
      <Modal
        visible={savePlaceModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setSavePlaceModal({ visible: false, editingId: null, pendingPlace: null })}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSavePlaceModal({ visible: false, editingId: null, pendingPlace: null })}
          />
          <View style={[styles.saveModalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.saveModalHandle} />
            <Text style={styles.saveModalTitle}>
              {savePlaceModal.editingId ? 'Edit saved place' : 'Save new place'}
            </Text>

            <Text style={styles.saveInputLabel}>Name</Text>
            <TextInput
              style={styles.saveInput}
              placeholder="e.g. Mom's House, Gym, College…"
              placeholderTextColor="#B0B7C3"
              value={saveName}
              onChangeText={setSaveName}
              autoFocus
            />

            <Text style={styles.saveInputLabel}>Address</Text>
            <TouchableOpacity
              style={styles.saveAddressRow}
              onPress={() => {
                setSavePlaceModal(p => ({ ...p, visible: false }));
                setActiveField(null);
                setSearchModalVisible(true);
              }}
            >
              <View style={styles.saveAddressIcon}>
                <Ionicons name="location-outline" size={16} color="#2563EB" />
              </View>
              <Text
                style={[styles.saveAddressText, !saveAddress && styles.saveAddressPlaceholder]}
                numberOfLines={1}
              >
                {saveAddress || 'Search for address…'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveConfirmBtn} onPress={confirmSavePlace} activeOpacity={0.85}>
              <Text style={styles.saveConfirmText}>Save Place</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Top bar */}
      {!selectionMode && (
        <>
          <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.topBtn}>
              <Ionicons name="menu" size={21} color="#1A1A2E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.promoPill} activeOpacity={0.8}>
              <Ionicons name="pricetag-outline" size={11} color="#FFD60A" style={{ marginRight: 5 }} />
              <Text style={styles.promoText}>10% off today</Text>
              <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBtn}>
              <Ionicons name="person-circle-outline" size={23} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          {/* Bottom sheet */}
          <RNAnimated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            {/* Drag handle zone */}
            <View style={styles.dragZone} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
              nestedScrollEnabled={true}
              bounces={true}
            >
              {/* ── Where to? input card ── */}
              <View style={styles.inputCard}>
                <LocationInputRow
                  pickupLocation={pickupLocation}
                  destinationLocation={destinationLocation}
                  onPressPickup={() => openInputMethodSheet('pickup')}
                  onPressDestination={() => openInputMethodSheet('destination')}
                  onSwap={() => {
                    const t = pickupLocation;
                    setPickupLocation(destinationLocation);
                    setDestinationLocation(t);
                  }}
                />
              </View>

              {/* ── Saved places ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Saved places</Text>
                <TouchableOpacity style={styles.sectionBtn} onPress={openAddSaveModal}>
                  <Ionicons name="add" size={14} color="#2563EB" />
                  <Text style={styles.sectionBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickGrid}>
                {savedPlaces.map(place => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.quickBtn}
                    onPress={() => useSavedPlace(place)}
                    onLongPress={() => openEditSaveModal(place)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.quickIcon, { backgroundColor: place.iconBg }]}>
                      <Ionicons name={place.iconName} size={16} color={place.iconColor} />
                    </View>
                    <View style={styles.quickTextWrap}>
                      <Text style={styles.quickName} numberOfLines={1}>{place.name}</Text>
                      <Text style={styles.quickAddr} numberOfLines={1}>
                        {place.address || 'Tap to set'}
                      </Text>
                    </View>
                    {!place.isDefault && (
                      <TouchableOpacity
                        onPress={() => deleteSavedPlace(place.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={15} color="#CBD5E1" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Drivers nearby card ── */}
              <View style={styles.driversCard}>
                <View style={styles.driverPulseWrap}>
                  <View style={styles.driverPulseRing} />
                  <View style={styles.driverPulseDot} />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverTitle}>12 drivers nearby</Text>
                  <Text style={styles.driverSub}>Avg pickup · 2 min away</Text>
                </View>
                <View style={styles.etaBox}>
                  <Text style={styles.etaNum}>2</Text>
                  <Text style={styles.etaLabel}>min ETA</Text>
                </View>
              </View>

              {/* ── Recent rides ── */}
              <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Recent rides</Text>
              <RideHistoryList
                rides={previousRides.slice(0, 5)}
                onRidePress={reuseRideLocation}
                onToggleLike={toggleLikeRide}
              />

              {/* ── Safety row ── */}
              <Text style={[styles.sectionLabel, { marginTop: 18, marginBottom: 10 }]}>Ride safely</Text>
              <View style={styles.safetyRow}>
                <TouchableOpacity style={[styles.safetyChip, styles.safetyChipSOS]} activeOpacity={0.8}>
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                  <Text style={[styles.safetyChipText, { color: '#EF4444' }]}>SOS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.safetyChip} activeOpacity={0.8}>
                  <Ionicons name="location-outline" size={14} color="#2563EB" />
                  <Text style={styles.safetyChipText}>Live Track</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.safetyChip} activeOpacity={0.8}>
                  <Ionicons name="share-social-outline" size={14} color="#00B14F" />
                  <Text style={styles.safetyChipText}>Share Ride</Text>
                </TouchableOpacity>
              </View>
              
              {/* Extra bottom padding to ensure smooth scrolling */}
              <View style={{ height: 40 }} />
            </ScrollView>
          </RNAnimated.View>
        </>
      )}

      {/* Navigating overlay */}
      {isNavigating && (
        <View style={styles.navigatingOverlay}>
          <View style={styles.navigatingCard}>
            <ActivityIndicator size="large" color="#1A1A2E" />
            <Text style={styles.navigatingText}>Finding rides…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  map: { ...StyleSheet.absoluteFillObject },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 14,
  },
  loadingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1A1A2E',
    opacity: 0.85,
  },
  loadingText: { fontSize: 15, color: '#64748B', letterSpacing: 0.2 },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  promoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  promoText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: SHEET_MAX_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 18,
  },
  dragZone: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },

  // Input card
  inputCard: {
    backgroundColor: '#F8F9FB',
    borderRadius: 18,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionBtnText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },

  // Quick places grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickBtn: {
    width: CARD_HALF,
    backgroundColor: '#F8F9FB',
    borderRadius: 15,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTextWrap: { flex: 1, minWidth: 0 },
  quickName: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  quickAddr: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // Drivers card
  driversCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  driverPulseWrap: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverPulseRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,230,118,0.2)',
  },
  driverPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
  },
  driverInfo: { flex: 1 },
  driverTitle: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  driverSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  etaBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  etaNum: { fontSize: 20, fontWeight: '800', color: '#FFD60A', lineHeight: 24 },
  etaLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },

  // Safety row
  safetyRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  safetyChip: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  safetyChipSOS: { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  safetyChipText: { fontSize: 11, fontWeight: '700', color: '#374151' },

  // Navigating overlay
  navigatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  navigatingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 14,
  },
  navigatingText: { color: '#1A1A2E', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },

  // Save place modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  saveModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  saveModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  saveModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 22,
    letterSpacing: -0.2,
  },
  saveInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 7,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  saveInput: {
    backgroundColor: '#F8F9FB',
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  saveAddressRow: {
    backgroundColor: '#F8F9FB',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },
  saveAddressIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EBF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveAddressText: { flex: 1, fontSize: 14, color: '#0F172A' },
  saveAddressPlaceholder: { color: '#B0B7C3' },
  saveConfirmBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  saveConfirmText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});