// components/BookingSuccessModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverDetails } from '../services/bookingService';

const { width } = Dimensions.get('window');

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

interface BookingSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  booking: {
    bookingId: string;
    fare: number;
    estimatedArrival: string;
  };
  vehicle: VehicleType;
  driver?: DriverDetails;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  visible,
  onClose,
  booking,
  vehicle,
  driver,
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const carAnim = useRef(new Animated.Value(-width)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      carAnim.setValue(-width);
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
      
      // Sequence animations
      Animated.sequence([
        // Fade in overlay
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Slide in modal
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        // Car drives in from left
        Animated.spring(carAnim, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        // Bounce effect
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const bounceScale = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.1, 1],
  });

  const getVehicleImage = () => {
    switch (vehicle.category) {
      case 'bike':
        return require('../assets/images/vehicles/bike.png');
      case 'auto':
        return require('../assets/images/vehicles/auto.png');
      case 'cab':
      case 'premium':
        return require('../assets/images/vehicles/car.png');
      case 'suv':
        return require('../assets/images/vehicles/suv.png');
      default:
        return require('../assets/images/vehicles/car.png');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
        <Animated.View 
          style={[
            styles.successCard,
            {
              transform: [{ translateY: slideAnim }, { scale: bounceScale }],
            },
          ]}
        >
          {/* Animated Car Illustration */}
          <View style={styles.carAnimationContainer}>
            <Animated.View
              style={[
                styles.carContainer,
                {
                  transform: [{ translateX: carAnim }],
                },
              ]}
            >
              <View style={styles.carWrapper}>
                <Image 
                  source={getVehicleImage()} 
                  style={styles.carImage} 
                  resizeMode="contain"
                />
                {/* Motion lines */}
                <View style={styles.motionLines}>
                  {[...Array(3)].map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.motionLine,
                        {
                          opacity: bounceAnim,
                          transform: [{ scale: bounceAnim }],
                          left: -20 - (i * 15),
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
            
            {/* Road line */}
            <View style={styles.roadLine}>
              <View style={styles.roadDash} />
              <View style={styles.roadDash} />
              <View style={styles.roadDash} />
              <View style={styles.roadDash} />
            </View>
          </View>

          <Text style={styles.successTitle}>Ride Booked! 🎉</Text>
          <Text style={styles.successSubtitle}>
            Your {vehicle.name} is on the way
          </Text>

          {/* ETA Badge */}
          <View style={styles.etaContainer}>
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.etaText}>ETA {booking.estimatedArrival}</Text>
          </View>

          {/* Driver Info */}
          {driver && (
            <View style={styles.driverInfoCard}>
              <View style={styles.driverInfoRow}>
                <Image source={{ uri: driver.photo }} style={styles.driverAvatar} />
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={styles.driverRatingRow}>
                    <Ionicons name="star" size={12} color="#FBBF24" />
                    <Text style={styles.driverRating}>{driver.rating}</Text>
                    <Text style={styles.driverRides}>· {driver.totalRides} rides</Text>
                  </View>
                </View>
                <View style={styles.callButton}>
                  <Ionicons name="call-outline" size={18} color="#0F8A5F" />
                </View>
              </View>
              <View style={styles.vehicleInfoRow}>
                <Ionicons name="car-outline" size={12} color="#94A3B8" />
                <Text style={styles.vehicleInfoText}>{driver.vehicle}</Text>
              </View>
            </View>
          )}

          {/* Booking Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="card-outline" size={16} color="#0F8A5F" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Booking ID</Text>
                <Text style={styles.detailValue}>{booking.bookingId}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="cash-outline" size={16} color="#0F8A5F" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Total Fare</Text>
                <Text style={styles.detailValue}>₹{booking.fare}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.trackButton} onPress={onClose}>
            <LinearGradient
              colors={['#0F8A5F', '#0B6E4C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.trackButtonText}>Track Your Ride</Text>
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeButton} onPress={onClose}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: width - 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  carAnimationContainer: {
    width: '100%',
    height: 100,
    marginBottom: 20,
    overflow: 'hidden',
  },
  carContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
  },
  carWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  carImage: {
    width: 100,
    height: 60,
  },
  motionLines: {
    position: 'absolute',
    right: -30,
    top: 25,
    flexDirection: 'row',
  },
  motionLine: {
    width: 30,
    height: 2,
    backgroundColor: '#0F8A5F',
    position: 'absolute',
    opacity: 0.6,
  },
  roadLine: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  roadDash: {
    width: 20,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F8A5F',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  driverInfoCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBBF24',
    marginLeft: 4,
  },
  driverRides: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  vehicleInfoText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E6F4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  trackButton: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  trackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  homeButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});