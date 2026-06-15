import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vehicleTypes } from '../../constants/vehicleTypes';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

interface VehicleCarouselProps {
  selectedVehicle: any;
  onSelectVehicle: (vehicle: any) => void;
  fare: number;
}

export default function VehicleCarousel({
  selectedVehicle,
  onSelectVehicle,
  fare,
}: VehicleCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  const getVehicleFare = (vehicle: any) => {
    // This is a simplified calculation
    return Math.round(fare * (vehicle.perKmRate / 15));
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (vehicleTypes[index] && vehicleTypes[index].id !== selectedVehicle.id) {
      onSelectVehicle(vehicleTypes[index]);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContent}
      >
        {vehicleTypes.map((vehicle, index) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[
              styles.card,
              selectedVehicle.id === vehicle.id && styles.selectedCard,
            ]}
            onPress={() => onSelectVehicle(vehicle)}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name={vehicle.icon as any} size={40} color="#000" />
              </View>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.vehiclePrice}>
                ₹{getVehicleFare(vehicle)}
              </Text>
              <Text style={styles.vehicleCapacity}>
                <Ionicons name="people" size={12} color="#666" /> {vehicle.capacity} seats
              </Text>
              {selectedVehicle.id === vehicle.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
  },
  card: {
    width: CARD_WIDTH - 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#000',
    borderWidth: 2,
    backgroundColor: '#fafafa',
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  vehiclePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  vehicleCapacity: {
    fontSize: 12,
    color: '#666',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});