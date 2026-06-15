import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Place {
  description: string;
  location: { lat: number; lng: number };
  address: string;
  place_id: number;
}

interface LocationInputRowProps {
  pickupLocation: Place | null;
  destinationLocation: Place | null;
  onPressPickup: () => void;
  onPressDestination: () => void;
  onSwap: () => void;
}

export default function LocationInputRow({
  pickupLocation,
  destinationLocation,
  onPressPickup,
  onPressDestination,
  onSwap,
}: LocationInputRowProps) {
  const showSwap = pickupLocation && destinationLocation;

  return (
    <View style={styles.locationRowsWrapper}>
      <TouchableOpacity style={styles.locationRowCompact} onPress={onPressPickup} activeOpacity={0.7}>
        <View style={styles.locationIconGreen} />
        <View style={styles.locationTextCompact}>
          <Text style={styles.locationLabelCompact}>FROM</Text>
          <Text style={styles.locationValueCompact} numberOfLines={1}>
            {pickupLocation?.description || 'Select pickup'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.locationRowCompact} onPress={onPressDestination} activeOpacity={0.7}>
        <View style={styles.locationIconRed} />
        <View style={styles.locationTextCompact}>
          <Text style={styles.locationLabelCompact}>TO</Text>
          <Text style={[styles.locationValueCompact, !destinationLocation && styles.placeholder]} numberOfLines={1}>
            {destinationLocation?.description || 'Where to?'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {showSwap && (
        <TouchableOpacity style={styles.swapBtnCompact} onPress={onSwap}>
          <Ionicons name="swap-vertical" size={16} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  locationRowsWrapper: { position: 'relative', marginBottom: 8 },
  locationRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationIconGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1e9553',  marginLeft: 5,marginRight:14},
  locationIconRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444',marginLeft: 5, marginRight: 14 },
  locationTextCompact: { flex: 1 },
  locationLabelCompact: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 2 },
  locationValueCompact: { fontSize: 15, fontWeight: '500', color: '#111827' },
  placeholder: { color: '#9CA3AF', fontWeight: '400' },
  swapBtnCompact: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});