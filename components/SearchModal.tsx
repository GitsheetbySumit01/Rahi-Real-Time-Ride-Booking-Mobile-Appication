import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchPlaces } from '../utils/openStreetMapService';

interface RecentPlace {
  id: string;
  title: string;
  address: string;
  location: { lat: number; lng: number };
}

interface SearchModalProps {
  visible: boolean;
  field: 'pickup' | 'destination' | null;
  onClose: () => void;
  onSelectLocation: (place: any) => void;
}

export default function SearchModal({ visible, field, onClose, onSelectLocation }: SearchModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent places when modal opens
  useEffect(() => {
    if (visible) {
      loadRecentPlaces();
    } else {
      // Reset search when modal closes
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [visible]);

  const loadRecentPlaces = async () => {
    try {
      const saved = await AsyncStorage.getItem('recentPlaces');
      if (saved) setRecentPlaces(JSON.parse(saved));
    } catch (error) {
      console.warn('Failed to load recent places:', error);
    }
  };

  const saveRecentPlace = async (place: any) => {
    try {
      if (!place?.description) return;
      const rp: RecentPlace = {
        id: Date.now().toString(),
        title: place.description.split(',')[0],
        address: place.description,
        location: place.location,
      };
      const updated = [rp, ...recentPlaces.filter(p => p.title !== rp.title)].slice(0, 10);
      setRecentPlaces(updated);
      await AsyncStorage.setItem('recentPlaces', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent place:', error);
    }
  };

  const searchLocation = async (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (text.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        const results = await searchPlaces(text);
        setSearchResults(results || []);
        setSearching(false);
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectLocation = async (place: any) => {
    // Check if location is in India
    if (place.country && !['India', 'IN'].includes(place.country)) {
      Alert.alert(
        '🚫 International Location',
        'Sorry, we currently only operate within India.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Save to recent places
    await saveRecentPlace(place);
    
    // Pass back to parent
    onSelectLocation(place);
  };

  const handleSelectRecentPlace = (place: RecentPlace) => {
    const selectedPlace = {
      description: place.address,
      location: place.location,
      address: place.address,
      place_id: parseInt(place.id, 10),
    };
    onSelectLocation(selectedPlace);
  };

  const clearRecentPlaces = async () => {
    Alert.alert(
      'Clear Recent Places',
      'Are you sure you want to clear your search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setRecentPlaces([]);
            await AsyncStorage.removeItem('recentPlaces');
          },
        },
      ]
    );
  };

  const getFieldColor = () => {
    return field === 'pickup' ? '#43A047' : '#E53935';
  };

  const getFieldTitle = () => {
    return field === 'pickup' ? 'Set Pickup Location' : 'Where to?';
  };

  const getFieldPlaceholder = () => {
    return field === 'pickup' ? 'Search pickup location' : 'Search destination';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{getFieldTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <View style={[styles.searchFieldDot, { backgroundColor: getFieldColor() }]} />
          <TextInput
            style={styles.searchInput}
            placeholder={getFieldPlaceholder()}
            value={searchQuery}
            onChangeText={searchLocation}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <ScrollView 
          style={styles.searchScroll} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : searchQuery.length > 0 ? (
            // Search Results
            searchResults.length > 0 ? (
              searchResults.map((item, index) => (
                <TouchableOpacity
                  key={item.place_id || index}
                  style={styles.searchItem}
                  onPress={() => handleSelectLocation(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchIcon}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                  </View>
                  <View style={styles.searchContent}>
                    <Text style={styles.searchTitle} numberOfLines={1}>
                      {item.description?.split(',')[0] || item.title || 'Unknown'}
                    </Text>
                    <Text style={styles.searchSubtitle} numberOfLines={2}>
                      {item.description?.split(',').slice(1).join(',').trim() || item.address || ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try a different address or landmark</Text>
              </View>
            )
          ) : (
            // Recent Places
            <View style={styles.recentContainer}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent places</Text>
                {recentPlaces.length > 0 && (
                  <TouchableOpacity onPress={clearRecentPlaces}>
                    <Text style={styles.clearText}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {recentPlaces.length > 0 ? (
                recentPlaces.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recentItem}
                    onPress={() => handleSelectRecentPlace(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentIcon}>
                      <Ionicons name="time-outline" size={20} color="#666" />
                    </View>
                    <View style={styles.recentContent}>
                      <Text style={styles.recentItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.recentItemAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No recent places</Text>
                  <Text style={styles.emptySubtitle}>Your recent searches will appear here</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  searchFieldDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchScroll: {
    flex: 1,
  },
  searchLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  searchLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContent: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  searchSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  recentContainer: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  clearText: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  recentItemAddress: {
    fontSize: 12,
    color: '#999',
  },
});