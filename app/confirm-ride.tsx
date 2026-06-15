import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { getRoute } from '../utils/openStreetMapService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingService, DriverDetails } from '../services/bookingService';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverFindingScreen } from '../components/DriverFindingScreen';
import { driverService, Driver } from '../services/driverService';
import { BookingSuccessModal } from '../components/BookingSuccessModal';

const { width, height } = Dimensions.get('window');

// Vehicle images
const bikeImage    = require('../assets/images/vehicles/bike.png');
const autoImage    = require('../assets/images/vehicles/auto.png');
const carImage     = require('../assets/images/vehicles/car.png');
const suvImage     = require('../assets/images/vehicles/suv.png');
const premiumImage = require('../assets/images/vehicles/premium.png');

// ─── Types ─────────────────────────────────────────────────────────────────────

interface VehicleType {
  id: string;
  name: string;
  category: string;
  image: any;
  baseFare: number;
  perKmRate: number;
  capacity: number;
  time: string;
  promo: string | null;
  description: string;
}

// ─── Vehicle data ──────────────────────────────────────────────────────────────

const VEHICLE_LIST: Record<string, VehicleType> = {
  bike:     { id: 'bike',     name: 'Bike',     category: 'bike',    image: bikeImage,    baseFare: 25,  perKmRate: 8,  capacity: 1, time: '2 min', promo: '₹15 OFF',             description: 'Quick & economical' },
  scooty:   { id: 'scooty',   name: 'Scooty',   category: 'bike',    image: bikeImage,    baseFare: 25,  perKmRate: 8,  capacity: 1, time: '2 min', promo: '₹10 OFF',             description: 'Easy ride' },
  auto:     { id: 'auto',     name: 'Auto',     category: 'auto',    image: autoImage,    baseFare: 40,  perKmRate: 12, capacity: 3, time: '3 min', promo: null,                  description: 'Best for short trips' },
  petAuto:  { id: 'petAuto',  name: 'Pet Auto', category: 'auto',    image: autoImage,    baseFare: 50,  perKmRate: 14, capacity: 3, time: '3 min', promo: '🐾 Pet friendly',     description: 'Travel with pets' },
  economy:  { id: 'economy',  name: 'Economy',  category: 'cab',     image: carImage,     baseFare: 70,  perKmRate: 15, capacity: 4, time: '4 min', promo: 'First ride ₹50 OFF', description: 'Budget friendly' },
  mini:     { id: 'mini',     name: 'Mini',     category: 'cab',     image: carImage,     baseFare: 75,  perKmRate: 16, capacity: 4, time: '4 min', promo: null,                  description: 'Small car' },
  prime:    { id: 'prime',    name: 'Prime',    category: 'premium', image: carImage,     baseFare: 90,  perKmRate: 18, capacity: 4, time: '5 min', promo: null,                  description: 'Comfortable ride' },
  premium:  { id: 'premium',  name: 'Premium',  category: 'premium', image: premiumImage, baseFare: 120, perKmRate: 22, capacity: 4, time: '5 min', promo: '✨ Luxury',           description: 'Premium cars' },
  suv:      { id: 'suv',      name: 'SUV',      category: 'suv',     image: suvImage,     baseFare: 130, perKmRate: 24, capacity: 6, time: '6 min', promo: null,                  description: 'Spacious SUV' },
  xl:       { id: 'xl',       name: 'XL',       category: 'suv',     image: suvImage,     baseFare: 150, perKmRate: 28, capacity: 6, time: '7 min', promo: '👨‍👩‍👧‍👦 6 seater',    description: 'Family & luggage' },
  electric: { id: 'electric', name: 'Electric', category: 'eco',     image: carImage,     baseFare: 85,  perKmRate: 14, capacity: 4, time: '5 min', promo: '🌱 Green ride',       description: 'Eco-friendly' },
};

const CATEGORIES = [
  { id: 'all',     name: 'All',     icon: 'apps-outline'     as const },
  { id: 'bike',    name: 'Bikes',   icon: 'bicycle-outline'  as const },
  { id: 'auto',    name: 'Auto',    icon: 'car-outline'      as const },
  { id: 'cab',     name: 'Cabs',    icon: 'car-outline'      as const },
  { id: 'premium', name: 'Premium', icon: 'star-outline'     as const },
  { id: 'suv',     name: 'SUV/XL',  icon: 'car-sport-outline'as const },
  { id: 'eco',     name: 'Eco',     icon: 'leaf-outline'     as const },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const calculateFare = (distance: number, vehicle: VehicleType, surge: number): number =>
  Math.round((vehicle.baseFare + distance * vehicle.perKmRate) * surge);

const getSurge = (): number => {
  const h = new Date().getHours();
  if ((h >= 8 && h <= 10) || (h >= 17 && h <= 19)) return 1.5;
  if (h >= 23 || h <= 5) return 1.3;
  return 1.0;
};

const getVehiclesByCategory = (cat: string): VehicleType[] =>
  cat === 'all'
    ? Object.values(VEHICLE_LIST)
    : Object.values(VEHICLE_LIST).filter(v => v.category === cat);

const getRideType = (vehicle: VehicleType): string => {
  if (vehicle.category === 'bike') return 'Ride';
  if (vehicle.category === 'auto') return 'Auto';
  if (vehicle.name === 'Premium') return 'Premium Ride';
  if (vehicle.category === 'suv') return 'SUV';
  return 'Ride';
};

// ─── Map HTML generator ────────────────────────────────────────────────────────

const generateMapHTML = (
  pickup: any,
  destination: any,
  routeCoordinates: any[]
): string => {
  const centerLat = pickup?.location?.lat ?? 28.6139;
  const centerLng = pickup?.location?.lng ?? 77.209;

  let routePolyline = '';
  if (routeCoordinates.length > 0) {
    const pts = routeCoordinates.map(p => `[${p.latitude},${p.longitude}]`).join(',');
    routePolyline = `
      var rl = L.polyline([${pts}], {
        color: '#0F172A', weight: 5, opacity: 1,
        smoothFactor: 1, lineJoin: 'round', lineCap: 'round'
      }).addTo(map);
      map.fitBounds(rl.getBounds(), { padding: [60, 60] });
    `;
  } else if (pickup?.location && destination?.location) {
    routePolyline = `
      map.fitBounds([
        [${pickup.location.lat}, ${pickup.location.lng}],
        [${destination.location.lat}, ${destination.location.lng}]
      ], { padding: [60, 60] });
    `;
  }

  const mkPickup = pickup?.location ? `
    L.marker([${pickup.location.lat},${pickup.location.lng}], {
      icon: L.divIcon({
        className: 'ld',
        html: '<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.22));">'
            + '<div style="width:34px;height:34px;border-radius:50%;background:#00B14F;border:3px solid #fff;display:flex;align-items:center;justify-content:center;">'
            + '<div style="width:12px;height:12px;border-radius:50%;background:#fff;"></div></div>'
            + '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #00B14F;margin-top:-2px;"></div>'
            + '</div>',
        iconSize: [34, 46], iconAnchor: [17, 46]
      })
    }).addTo(map).bindPopup('<b>Pickup</b>').openPopup();
  ` : '';

  const mkDest = destination?.location ? `
    L.marker([${destination.location.lat},${destination.location.lng}], {
      icon: L.divIcon({
        className: 'ld',
        html: '<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.22));">'
            + '<div style="width:34px;height:34px;border-radius:50%;background:#EF4444;border:3px solid #fff;display:flex;align-items:center;justify-content:center;">'
            + '<div style="width:12px;height:12px;border-radius:50%;background:#fff;"></div></div>'
            + '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #EF4444;margin-top:-2px;"></div>'
            + '</div>',
        iconSize: [34, 46], iconAnchor: [17, 46]
      })
    }).addTo(map).bindPopup('<b>Drop</b>');
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{overflow:hidden;}
    #map{width:100vw;height:100vh;}
    .ld{background:transparent!important;border:none!important;}
    .leaflet-control-attribution,.leaflet-control-zoom{display:none!important;}
  </style>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var map = L.map('map',{zoomControl:false,attributionControl:false})
             .setView([${centerLat},${centerLng}],14);
  var voyager = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {subdomains:'abcd',maxZoom:20}
  ).addTo(map);
  var osmStd = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19});
  map.on('zoomend',function(){
    if(map.getZoom()>=17){if(!map.hasLayer(osmStd)){voyager.remove();osmStd.addTo(map);}}
    else{if(!map.hasLayer(voyager)){osmStd.remove();voyager.addTo(map);}}
  });
  ${mkPickup}
  ${mkDest}
  ${routePolyline}
})();
</script>
</body>
</html>`;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const CapacityBadge = ({ n }: { n: number }) => (
  <View style={styles.capBadge}>
    <Ionicons name="person-outline" size={9} color="#94A3B8" />
    <Text style={styles.capText}>{n}</Text>
  </View>
);

// ─── Main component ────────────────────────────────────────────────────────────

export default function ConfirmRideScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [isConfirming, setIsConfirming]     = useState(false);
  const [routeInfo, setRouteInfo]           = useState<{ distance: string; duration: number } | null>(null);
  const [routeCoords, setRouteCoords]       = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('bike');
  const [loading, setLoading]               = useState(true);
  const [isCalculating, setIsCalculating]   = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDriverSearch, setShowDriverSearch] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const [successVehicle, setSuccessVehicle] = useState<VehicleType | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<DriverDetails | null>(null);

  const slideAnim   = useRef(new Animated.Value(0)).current;
  const webViewRef  = useRef<WebView>(null);
  const calcDone    = useRef(false);
  const scaleAnims  = useRef<Record<string, Animated.Value>>({});

  Object.keys(VEHICLE_LIST).forEach(id => {
    if (!scaleAnims.current[id]) scaleAnims.current[id] = new Animated.Value(1);
  });

  let pickup: any = null;
  let destination: any = null;
  try {
    if (params.pickup && typeof params.pickup === 'string')
      pickup = JSON.parse(params.pickup);
    if (params.destination && typeof params.destination === 'string')
      destination = JSON.parse(params.destination);
  } catch (e) {
    console.warn('param parse error', e);
  }

  useEffect(() => {
    if (pickup && destination && !calcDone.current) {
      calcDone.current = true;
      calculateRoute();
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 9,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const calculateRoute = async () => {
    if (!pickup?.location || !destination?.location || isCalculating) return;
    setIsCalculating(true);
    try {
      const route = await getRoute(pickup.location, destination.location);
      if (route) {
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
        });
        setRouteCoords(route.coordinates ?? []);
      } else {
        setRouteInfo({ distance: '5.0', duration: 15 });
      }
    } catch {
      setRouteInfo({ distance: '5.0', duration: 15 });
    } finally {
      setLoading(false);
      setIsCalculating(false);
    }
  };

  const selectVehicle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVehicle(id);
    const anim = scaleAnims.current[id];
    if (anim) {
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
        Animated.spring(anim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const handleDriverSearchComplete = useCallback(async (found: boolean) => {
    setShowDriverSearch(false);
    
    if (found && successBooking && successVehicle && pickup?.location) {
      const driver = await driverService.findNearestDriver(
        pickup.location,
        successVehicle.category
      );
      
      if (driver) {
        const driverDetails: DriverDetails = {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          photo: driver.photo,
          vehicle: `${driver.vehicle.model} · ${driver.vehicle.number}`,
          vehicleNumber: driver.vehicle.number,
          vehicleColor: driver.vehicle.color,
          rating: driver.rating,
          totalRides: driver.totalRides,
          eta: driver.eta,
        };
        
        await bookingService.assignDriverToBooking(successBooking.id, driverDetails);
        
        const updatedBooking = {
          ...successBooking,
          driver: driverDetails,
          status: 'confirmed',
          estimatedArrival: `${driver.eta} min`,
        };
        
        setAssignedDriver(driverDetails);
        setSuccessBooking(updatedBooking);
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          'No Drivers Available',
          'We couldn\'t find any drivers nearby. Would you like to try again?',
          [
            { text: 'Cancel', onPress: () => router.back() },
            { text: 'Try Again', onPress: () => {
              setShowDriverSearch(true);
            }},
          ]
        );
      }
    } else if (!found) {
      Alert.alert(
        'Search Cancelled',
        'Your ride search has been cancelled.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [successBooking, successVehicle, pickup]);

  const handleConfirmRide = async () => {
    if (isConfirming || loading) return;
    setIsConfirming(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const dist = routeInfo ? parseFloat(routeInfo.distance) : 5.0;
    const surge = getSurge();
    const vehicle = VEHICLE_LIST[selectedVehicle] ?? VEHICLE_LIST.bike;
    const fare = calculateFare(dist, vehicle, surge);

    try {
      const bookingData = {
        type: getRideType(vehicle),
        vehicleType: vehicle.category,
        vehicleName: vehicle.name,
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        from: pickup?.description || 'Pickup location',
        to: destination?.description || 'Destination',
        pickupLocation: pickup?.location,
        destinationLocation: destination?.location,
        price: fare,
        fare: fare,
        status: 'pending' as const,
        estimatedArrival: `${Math.round(routeInfo?.duration || 15)} min`,
        distance: `${dist} km`,
        duration: routeInfo?.duration || 15,
        surgeMultiplier: surge,
        paymentMethod: 'Cash',
      };

      const savedBooking = await bookingService.saveBooking(bookingData);

      const newRide = {
        id: savedBooking.id,
        pickup: pickup?.description || 'Unknown pickup',
        pickupLocation: pickup?.location ?? null,
        destination: destination?.description || 'Unknown destination',
        destinationLocation: destination?.location ?? null,
        date: new Date().toLocaleString(),
        fare,
        liked: false,
        vehicle: vehicle.name,
      };
      
      const existing = await AsyncStorage.getItem('previousRides');
      const rides: any[] = existing ? JSON.parse(existing) : [];
      await AsyncStorage.setItem('previousRides', JSON.stringify([newRide, ...rides]));

      setSuccessBooking(savedBooking);
      setSuccessVehicle(vehicle);
      setIsConfirming(false);
      setShowDriverSearch(true);
      
    } catch (err) {
      console.warn('Failed to save booking:', err);
      setIsConfirming(false);
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const surgeMultiplier  = getSurge();
  const distance         = routeInfo ? parseFloat(routeInfo.distance) : 0;
  const currentVehicles  = getVehiclesByCategory(selectedCategory);
  const activeVehicle    = VEHICLE_LIST[selectedVehicle] ?? VEHICLE_LIST.bike;
  const activeFare       = calculateFare(distance, activeVehicle, surgeMultiplier);
  const mapHTML          = generateMapHTML(pickup, destination, routeCoords);

  if (!pickup || !destination) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        </View>
        <Text style={styles.errorTitle}>Invalid ride details</Text>
        <Text style={styles.errorSub}>Something went wrong. Please go back and try again.</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.map}
        scrollEnabled
        zoomEnabled
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onError={e => console.warn('WebView error', e.nativeEvent)}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color="#0F172A" />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [height * 0.75, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.routeCard}>
          <TouchableOpacity style={styles.routeRow} onPress={() => router.back()} activeOpacity={0.7}>
            <View style={styles.dotGreen} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeValue} numberOfLines={1}>{pickup.description}</Text>
            </View>
            <View style={styles.editBtn}>
              <Ionicons name="pencil" size={12} color="#64748B" />
            </View>
          </TouchableOpacity>

          <View style={styles.routeDividerWrap}>
            <View style={styles.routeDividerLine} />
            <View style={styles.routeDividerDot} />
            <View style={styles.routeDividerLine} />
          </View>

          <TouchableOpacity style={styles.routeRow} onPress={() => router.back()} activeOpacity={0.7}>
            <View style={styles.dotRed} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>DROP</Text>
              <Text style={styles.routeValue} numberOfLines={1}>{destination.description}</Text>
            </View>
            <View style={styles.editBtn}>
              <Ionicons name="pencil" size={12} color="#64748B" />
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Calculating best route…</Text>
          </View>
        ) : (
          <>
            <View style={styles.tripStrip}>
              <View style={styles.tripItem}>
                <Ionicons name="time-outline" size={15} color="#64748B" />
                <Text style={styles.tripVal}>{routeInfo?.duration} min</Text>
              </View>
              <View style={styles.tripSep} />
              <View style={styles.tripItem}>
                <Ionicons name="navigate-outline" size={15} color="#64748B" />
                <Text style={styles.tripVal}>{routeInfo?.distance} km</Text>
              </View>
              <View style={styles.tripSep} />
              <View style={styles.tripItem}>
                <Ionicons name="cash-outline" size={15} color="#64748B" />
                <Text style={styles.tripFare}>₹{activeFare}</Text>
              </View>
            </View>

            {surgeMultiplier > 1 && (
              <View style={styles.surgeBadge}>
                <Ionicons name="flash" size={12} color="#F59E0B" />
                <Text style={styles.surgeText}>{surgeMultiplier}× surge pricing active</Text>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
              style={styles.catScroll}
            >
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={cat.icon} size={13} color={active ? '#fff' : '#64748B'} />
                    <Text style={[styles.catText, active && styles.catTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleRow}
              style={styles.vehicleScroll}
            >
              {currentVehicles.map(vehicle => {
                const isSelected = selectedVehicle === vehicle.id;
                const fare = calculateFare(distance, vehicle, surgeMultiplier);
                const scaleAnim = scaleAnims.current[vehicle.id] ?? new Animated.Value(1);
                return (
                  <Animated.View
                    key={vehicle.id}
                    style={{ transform: [{ scale: scaleAnim }] }}
                  >
                    <TouchableOpacity
                      style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                      onPress={() => selectVehicle(vehicle.id)}
                      activeOpacity={0.85}
                    >
                      {isSelected && <View style={styles.vehicleSelectedDot} />}
                      <Image source={vehicle.image} style={styles.vehicleImg} resizeMode="contain" />
                      <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSel]}>
                        {vehicle.name}
                      </Text>
                      <View style={styles.vehicleMeta}>
                        <CapacityBadge n={vehicle.capacity} />
                        <View style={styles.metaDot} />
                        <Text style={styles.vehicleTime}>{vehicle.time}</Text>
                      </View>
                      <Text style={[styles.vehicleFare, isSelected && styles.vehicleFareSel]}>
                        ₹{fare}
                      </Text>
                      {vehicle.promo && (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoText} numberOfLines={1}>{vehicle.promo}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, (isConfirming || loading) && styles.confirmBtnDisabled]}
          onPress={handleConfirmRide}
          disabled={isConfirming || loading}
          activeOpacity={0.88}
        >
          {isConfirming ? (
            <View style={styles.confirmInner}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.confirmText}>Booking your ride…</Text>
            </View>
          ) : (
            <View style={styles.confirmInner}>
              <Text style={styles.confirmText}>
                Confirm {activeVehicle.name}
              </Text>
              {!loading && routeInfo && (
                <View style={styles.confirmPricePill}>
                  <Text style={styles.confirmPriceText}>₹{activeFare}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 8 }} />
      </Animated.View>

      {/* Driver Finding Screen */}
      {showDriverSearch && (
        <DriverFindingScreen
          visible={showDriverSearch}
          onComplete={handleDriverSearchComplete}
          vehicleType={successVehicle?.name || 'Ride'}
          pickupLocation={pickup?.description}
          destinationLocation={destination?.description}
        />
      )}

      {/* Success Modal - Using the separate component */}
      {successBooking && successVehicle && (
        <BookingSuccessModal
          visible={showSuccessModal}
          onClose={handleModalClose}
          booking={successBooking}
          vehicle={successVehicle}
          driver={assignedDriver || undefined}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  map: { flex: 1 },

  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', padding: 32,
  },
  errorIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  errorSub:   { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  errorBtn: {
    backgroundColor: '#0F172A', paddingVertical: 14, paddingHorizontal: 36,
    borderRadius: 14,
  },
  errorBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  backBtn: {
    position: 'absolute', left: 16,
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09, shadowRadius: 8, elevation: 4, zIndex: 10,
  },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 16, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 18,
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },

  routeCard: {
    backgroundColor: '#F8F9FB',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEF0F4',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotGreen: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#00B14F', flexShrink: 0 },
  dotRed:   { width: 11, height: 11, borderRadius: 6, backgroundColor: '#EF4444', flexShrink: 0 },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontSize: 9, fontWeight: '800', color: '#94A3B8',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },
  routeValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  editBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#EEF0F4', justifyContent: 'center', alignItems: 'center',
  },
  routeDividerWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginLeft: 15, paddingVertical: 4, gap: 2,
  },
  routeDividerLine: { width: 1, height: 10, backgroundColor: '#CBD5E1' },
  routeDividerDot:  { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 2 },

  tripStrip: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#F8F9FB', borderRadius: 14,
    paddingVertical: 11, marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF0F4',
  },
  tripItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripVal:  { fontSize: 13, color: '#475569', fontWeight: '600' },
  tripFare: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  tripSep:  { width: 1, height: 18, backgroundColor: '#E2E8F0' },

  surgeBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FFFBEB',
    paddingVertical: 6, borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  surgeText: { fontSize: 11, color: '#D97706', fontWeight: '700', letterSpacing: 0.2 },

  catScroll: { marginBottom: 12 },
  catRow:    { paddingRight: 4, gap: 7, flexDirection: 'row' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F8F9FB',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  catChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  catText:       { fontSize: 12, fontWeight: '600', color: '#64748B' },
  catTextActive: { color: '#fff' },

  vehicleScroll: { marginBottom: 14 },
  vehicleRow:    { paddingRight: 8, gap: 9 },
  vehicleCard: {
    width: 110, paddingVertical: 13, paddingHorizontal: 8,
    alignItems: 'center', backgroundColor: '#F8F9FB',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#EEF0F4',
    position: 'relative', overflow: 'hidden',
  },
  vehicleCardSelected: {
    backgroundColor: '#F0F4FF',
    borderColor: '#0F172A',
  },
  vehicleSelectedDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  vehicleImg: { width: 58, height: 52 },
  vehicleName: {
    fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 7,
  },
  vehicleNameSel: { color: '#0F172A' },
  vehicleMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4,
  },
  capBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  capText:  { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  metaDot:  { width: 2, height: 2, borderRadius: 1, backgroundColor: '#CBD5E1' },
  vehicleTime: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  vehicleFare: {
    fontSize: 15, fontWeight: '800', color: '#64748B', marginTop: 5,
  },
  vehicleFareSel: { color: '#0F172A' },
  promoBadge: {
    position: 'absolute', top: 0, right: -2,
    backgroundColor: '#00B14F',
    paddingHorizontal: 7, paddingVertical: 3,
    borderBottomLeftRadius: 10, borderTopRightRadius: 14,
  },
  promoText: {
    fontSize: 7.5, color: '#fff', fontWeight: '800',
    letterSpacing: 0.2,
  },

  confirmBtn: {
    backgroundColor: '#0F172A', borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 18,
    marginBottom: 6,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 7,
  },
  confirmBtnDisabled: { opacity: 0.65 },
  confirmInner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  confirmPricePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  confirmPriceText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  loadingWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 28, gap: 12,
  },
  loadingText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
});