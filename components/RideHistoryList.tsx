import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PreviousRide } from '../hooks/useRideHistory';

interface RideHistoryListProps {
  rides: PreviousRide[];
  onRidePress: (ride: PreviousRide) => void;  // ✅ Now receives full ride object
  onToggleLike: (id: string) => void;
  onViewAll?: () => void;
}

export default function RideHistoryList({ rides, onRidePress, onToggleLike, onViewAll }: RideHistoryListProps) {
  const recentRides = rides.slice(0, 3);

  if (recentRides.length === 0) return null;

  return (
    <View style={styles.recentSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent destination</Text>
        {rides.length > 3 && onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        )}
      </View>
      {recentRides.map((ride, index) => (
        <TouchableOpacity
          key={ride.id}
          style={[styles.compactRideCard, index === recentRides.length - 1 && { borderBottomWidth: 0 }]}
          onPress={() => onRidePress(ride)}  // ✅ Pass full ride object
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <View style={styles.compactRideTextContainer}>
            <Text style={styles.compactRideTitle} numberOfLines={1}>
              {ride.destination}
            </Text>
            <Text style={styles.compactRideSubtitle} numberOfLines={1}>
              {ride.pickup}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onToggleLike(ride.id)} style={styles.compactLikeBtn}>
            <Ionicons name={ride.liked ? 'heart' : 'heart-outline'} size={18} color={ride.liked ? '#F44336' : '#9CA3AF'} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  recentSection: { marginTop: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  viewAllText: { fontSize: 13, color: '#00B14F', fontWeight: '500' },
  compactRideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  compactRideTextContainer: { flex: 1 },
  compactRideTitle: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 2 },
  compactRideSubtitle: { fontSize: 12, color: '#6B7280' },
  compactLikeBtn: { padding: 8 },
});