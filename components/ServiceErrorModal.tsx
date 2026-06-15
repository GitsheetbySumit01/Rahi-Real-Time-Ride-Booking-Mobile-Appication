import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ServiceErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function ServiceErrorModal({ visible, title, message, onClose }: ServiceErrorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.errorModalContainer}>
          <Ionicons name="location-outline" size={60} color="#FF9800" />
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={onClose}>
            <Text style={styles.errorButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  errorModalContainer: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 12, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, width: '100%' },
  errorButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});