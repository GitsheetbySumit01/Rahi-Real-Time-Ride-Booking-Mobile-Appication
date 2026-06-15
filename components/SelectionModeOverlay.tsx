import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PIN_CIRCLE = 40;
const PIN_TIP = 12;
const PIN_TOTAL = PIN_CIRCLE + PIN_TIP;

interface SelectionModeOverlayProps {
  visible: boolean;
  mode: 'pickup' | 'destination' | null;
  address: string;
  isGeocoding: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  pinColor: string;
}

export default function SelectionModeOverlay({
  visible,
  mode,
  address,
  isGeocoding,
  onConfirm,
  onCancel,
  pinColor,
}: SelectionModeOverlayProps) {
  const insets = useSafeAreaInsets();

  if (!visible || !mode) return null;

  const isPickupMode = mode === 'pickup';

  return (
    <>
      {/* Header */}
      <View style={[styles.selectionHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onCancel} style={styles.selectionHeaderCancelBtn}>
          <Text style={styles.selectionHeaderCancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.selectionHeaderCenter}>
          <View style={[styles.selectionModeDot, { backgroundColor: pinColor }]} />
          <Text style={styles.selectionHeaderTitle}>
            {isPickupMode ? 'Set Pickup' : 'Set Drop'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onConfirm}
          style={[styles.selectionConfirmHeaderBtn, isGeocoding && { opacity: 0.5 }]}
          disabled={isGeocoding}
        >
          <Text style={styles.selectionConfirmHeaderText}>Confirm</Text>
        </TouchableOpacity>
      </View>

      {/* Pin */}
      <View style={styles.pinContainer} pointerEvents="none">
        <View style={[styles.pinPulseRing, { borderColor: pinColor }]} />
        <View style={[styles.pinCircle, { backgroundColor: pinColor }]}>
          <Ionicons name="location" size={20} color="#fff" />
        </View>
        <View style={[styles.pinTip, { borderTopColor: pinColor }]} />
        <View style={styles.pinShadow} />
      </View>

      {/* Instruction Bubble */}
      <View style={styles.pinInstructionWrapper} pointerEvents="none">
        <View style={styles.pinInstructionBubble}>
          <Text style={styles.pinInstructionText}>
            {isPickupMode ? 'Move map to set pickup' : 'Move map to set drop'}
          </Text>
        </View>
      </View>

      {/* Bottom Bar with Address */}
      <View style={[styles.selectionBottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.selectionAddressRow}>
          <View style={[styles.selectionAddressDot, { backgroundColor: pinColor }]} />
          <View style={styles.selectionAddressTextWrapper}>
            {isGeocoding ? (
              <View style={styles.selectionLoadingRow}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.selectionLoadingText}>Finding address…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.selectionAddressMain} numberOfLines={1}>
                  {address.split(',')[0] || 'Move the map…'}
                </Text>
                <Text style={styles.selectionAddressSub} numberOfLines={1}>
                  {address.split(',').slice(1, 3).join(',').trim() || ' '}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  selectionHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  selectionHeaderCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  selectionHeaderCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  selectionHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionModeDot: { width: 10, height: 10, borderRadius: 5 },
  selectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  selectionConfirmHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  selectionConfirmHeaderText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pinContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -PIN_CIRCLE / 2,
    top: '50%',
    marginTop: -PIN_TOTAL,
    alignItems: 'center',
    zIndex: 25,
  },
  pinPulseRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: PIN_CIRCLE + 10,
    height: PIN_CIRCLE + 10,
    borderRadius: (PIN_CIRCLE + 10) / 2,
    borderWidth: 2,
    opacity: 0.3,
  },
  pinCircle: {
    width: PIN_CIRCLE,
    height: PIN_CIRCLE,
    borderRadius: PIN_CIRCLE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: PIN_TIP,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  pinShadow: { width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 2 },
  pinInstructionWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -(PIN_TOTAL + 36),
    alignItems: 'center',
    zIndex: 24,
  },
  pinInstructionBubble: {
    backgroundColor: 'rgba(0,0,0,0.68)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pinInstructionText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  selectionBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20,
  },
  selectionAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectionAddressDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  selectionAddressTextWrapper: { flex: 1 },
  selectionLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionLoadingText: { fontSize: 13, color: '#999' },
  selectionAddressMain: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  selectionAddressSub: { fontSize: 12, color: '#888' },
});