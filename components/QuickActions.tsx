import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QuickActions() {
  return (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickActionBtn}>
        <View style={styles.quickIconBg}>
          <Ionicons name="home" size={22} color="#00B14F" />
        </View>
        <Text style={styles.quickLabel}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickActionBtn}>
        <View style={styles.quickIconBg}>
          <Ionicons name="briefcase" size={22} color="#00B14F" />
        </View>
        <Text style={styles.quickLabel}>Work</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickActionBtn}>
        <View style={styles.quickIconBg}>
          <Ionicons name="star" size={22} color="#00B14F" />
        </View>
        <Text style={styles.quickLabel}>Saved</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 4, marginBottom: 8 },
  quickActionBtn: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 12, gap: 6 },
  quickIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '500', color: '#374151' },
});