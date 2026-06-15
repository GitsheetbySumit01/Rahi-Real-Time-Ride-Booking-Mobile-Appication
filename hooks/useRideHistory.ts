import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export interface PreviousRide {
  id: string;
  pickup: string;
  pickupLocation?: { lat: number; lng: number } | null;
  destination: string;
  destinationLocation?: { lat: number; lng: number } | null;
  date: string;
  fare: number;
  liked: boolean;
  vehicle: string;
}

export const useRideHistory = () => {
  const [previousRides, setPreviousRides] = useState<PreviousRide[]>([]);

  const loadPreviousRides = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('previousRides');
      if (saved) setPreviousRides(JSON.parse(saved));
    } catch (error) {
      console.warn('Failed to load rides:', error);
    }
  }, []);

  const toggleLikeRide = useCallback(async (rideId: string) => {
    const updatedRides = previousRides.map(ride =>
      ride.id === rideId ? { ...ride, liked: !ride.liked } : ride
    );
    setPreviousRides(updatedRides);
    await AsyncStorage.setItem('previousRides', JSON.stringify(updatedRides));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [previousRides]);

  const addRideToHistory = useCallback(async (ride: Omit<PreviousRide, 'id' | 'date' | 'liked'>) => {
    const newRide: PreviousRide = {
      ...ride,
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      liked: false,
    };
    const updated = [newRide, ...previousRides];
    setPreviousRides(updated);
    await AsyncStorage.setItem('previousRides', JSON.stringify(updated));
  }, [previousRides]);

  return { previousRides, loadPreviousRides, toggleLikeRide, addRideToHistory };
};