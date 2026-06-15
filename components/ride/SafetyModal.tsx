import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SafetyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SafetyModal({ visible, onClose }: SafetyModalProps) {
  const emergencyNumbers = [
    { name: 'Police', number: '100', icon: 'shield' },
    { name: 'Ambulance', number: '102', icon: 'medkit' },
    { name: 'Women Helpline', number: '1091', icon: 'woman' },
    { name: 'Ride Support', number: '1800-123-4567', icon: 'headset' },
  ];

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Safety & Emergency</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.safetyTips}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.tipText}>Share your trip details with family</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.tipText}>Verify driver and vehicle details</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.tipText}>Stay alert during the ride</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.tipText}>Use emergency contact if needed</Text>
          </View>
        </View>

        <View style={styles.emergencyContacts}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {emergencyNumbers.map((contact, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactButton}
              onPress={() => handleCall(contact.number)}
            >
              <Ionicons name={contact.icon as any} size={24} color="#F44336" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
              </View>
              <Ionicons name="call" size={20} color="#4CAF50" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your safety is our priority. In case of emergency, contact local authorities.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  safetyTips: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emergencyContacts: {
    padding: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  contactNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});