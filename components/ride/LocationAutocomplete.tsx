import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPlaces, type PlaceSuggestion } from '../../utils/openStreetMapService';

interface LocationAutocompleteProps {
  onPickupSelect: (location: any) => void;
  onDestinationSelect: (location: any) => void;
  pickup: any;
  destination: any;
}

export default function LocationAutocomplete({
  onPickupSelect,
  onDestinationSelect,
  pickup,
  destination,
}: LocationAutocompleteProps) {
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickupText, setPickupText] = useState('');
  const [destText, setDestText] = useState('');
// Replace the timeout declaration with this:
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pickup?.description) {
      setPickupText(pickup.description.split(',')[0]);
    }
  }, [pickup]);

  useEffect(() => {
    if (destination?.description) {
      setDestText(destination.description.split(',')[0]);
    }
  }, [destination]);

  useEffect(() => {
    if (activeField && searchQuery.length > 2) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchTimeout.current = setTimeout(() => {
        performSearch();
      }, 500);
    } else if (searchQuery.length === 0) {
      setSearchResults([]);
    }
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, activeField]);

  const performSearch = async () => {
    if (!searchQuery || searchQuery.length < 3) return;
    
    setLoading(true);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: PlaceSuggestion) => {
    Keyboard.dismiss();
    const locationData = {
      description: location.description,
      location: location.location,
      address: location.address,
      place_id: location.place_id,
    };
    
    if (activeField === 'pickup') {
      onPickupSelect(locationData);
      setPickupText(location.description.split(',')[0]);
      setActiveField(null);
    } else if (activeField === 'destination') {
      onDestinationSelect(locationData);
      setDestText(location.description.split(',')[0]);
      setActiveField(null);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderSearchResult = ({ item }: { item: PlaceSuggestion }) => {
    const parts = item.description.split(',');
    const title = parts[0];
    const subtitle = parts.slice(1).join(',').trim();
    
    return (
      <TouchableOpacity
        style={styles.searchResultItem}
        onPress={() => handleLocationSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultIcon}>
          <Ionicons name="location-outline" size={20} color="#666" />
        </View>
        <View style={styles.resultTextContainer}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.resultSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.locationInput}
        onPress={() => setActiveField('pickup')}
        activeOpacity={0.7}
      >
        <View style={styles.inputIcon}>
          <Ionicons name="ellipse" size={12} color="#4CAF50" />
        </View>
        <Text style={[styles.inputText, !pickupText && styles.placeholder]}>
          {pickupText || 'Select pickup location'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.locationInput}
        onPress={() => setActiveField('destination')}
        activeOpacity={0.7}
      >
        <View style={styles.inputIcon}>
          <Ionicons name="location" size={12} color="#F44336" />
        </View>
        <Text style={[styles.inputText, !destText && styles.placeholder]}>
          {destText || 'Where are you going?'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={activeField !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setActiveField(null);
          setSearchQuery('');
          setSearchResults([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setActiveField(null);
              setSearchQuery('');
              setSearchResults([]);
            }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {activeField === 'pickup' ? 'Set pickup location' : 'Where are you going?'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place or address"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={Platform.OS === 'ios'}
              returnKeyType="search"
              onSubmitEditing={performSearch}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          {activeField === 'pickup' ? (
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={() => setActiveField(null)}
            >
              <Ionicons name="navigate" size={24} color="#000" />
              <Text style={styles.currentLocationText}>Use current location</Text>
            </TouchableOpacity>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.loadingText}>Searching places...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.place_id || index}`}
              renderItem={renderSearchResult}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                searchQuery.length > 2 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="location-outline" size={50} color="#ccc" />
                    <Text style={styles.emptyText}>No locations found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                  </View>
                ) : searchQuery.length > 0 && searchQuery.length <= 2 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="information-circle" size={50} color="#ccc" />
                    <Text style={styles.emptyText}>Type at least 3 characters</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inputIcon: {
    width: 30,
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  placeholder: {
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  currentLocationText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultIcon: {
    width: 30,
  },
  resultTextContainer: {
    marginLeft: 5,
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
});