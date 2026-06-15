import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InputMethodSheetProps {
  visible: boolean;
  field: 'pickup' | 'destination' | null;
  onClose: () => void;
  onSearch: () => void;
  onMapSelect: () => void;
}

export default function InputMethodSheet({
  visible,
  field,
  onClose,
  onSearch,
  onMapSelect,
}: InputMethodSheetProps) {
  const insets = useSafeAreaInsets();

  if (!field) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.inputMethodSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          Set {field === 'pickup' ? 'Pickup' : 'Drop'} Location
        </Text>

        {/* Search Option */}
        <TouchableOpacity style={styles.sheetOption} onPress={onSearch}>
          <View style={[styles.sheetOptionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="search" size={22} color="#4F46E5" />
          </View>
          <View style={styles.sheetOptionText}>
            <Text style={styles.sheetOptionTitle}>Search for a place</Text>
            <Text style={styles.sheetOptionSub}>Type an address or landmark</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        {/* Map Selection Option */}
        <TouchableOpacity style={styles.sheetOption} onPress={onMapSelect}>
          <View style={[styles.sheetOptionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="map" size={22} color="#16A34A" />
          </View>
          <View style={styles.sheetOptionText}>
            <Text style={styles.sheetOptionTitle}>Choose on map</Text>
            <Text style={styles.sheetOptionSub}>Pin an exact location on the map</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  inputMethodSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: { flex: 1 },
  sheetOptionTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  sheetOptionSub: { fontSize: 12, color: '#888' },
  sheetCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
});