import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- THEME ----------
const COLORS = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  ink: '#0B0F19',
  inkSoft: '#475569',
  inkMuted: '#94A3B8',
  line: '#ECECE6',
  brand: '#0F8A5F',
  brandSoft: '#E6F4EE',
  brandTint: '#F1F9F5',
  accent: '#F59E0B',
  accentSoft: '#FEF3C7',
  danger: '#E11D48',
  dangerSoft: '#FFE4E6',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
};

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };
const CURRENCY = '₹';

// ---------- TYPES ----------
interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  category: 'ride' | 'topup' | 'refund' | 'cashback';
  status: 'success' | 'pending' | 'failed';
}

// ---------- PRESSABLE WITH SPRING SCALE ----------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PressableScale: React.FC<{
  onPress?: () => void;
  style?: any;
  children: React.ReactNode;
  scaleTo?: number;
  testID?: string;
}> = ({ onPress, style, children, scaleTo = 0.96, testID }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedPressable
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={onPress}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

// ---------- ANIMATED BALANCE COUNTER ----------
const AnimatedBalance: React.FC<{ value: number; visible: boolean }> = ({ value, visible }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  // Fix: Use an animated style to update the value
  useAnimatedStyle(() => {
    runOnJS(setDisplayValue)(Math.floor(progress.value));
    return {};
  });

  if (!visible) {
    return <Text style={styles.balanceAmount}>•••••</Text>;
  }

  const formatted = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [whole, decimal] = formatted.split('.');

  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceCurrency}>{CURRENCY}</Text>
      <Text style={styles.balanceAmount}>{whole}</Text>
      <Text style={styles.balanceDecimal}>.{decimal}</Text>
    </View>
  );
};

// ---------- PULSE GLOW ----------
const PulseGlow: React.FC = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1000 }),
        withTiming(0.6, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.liveRingWrap}>
      <Animated.View style={[styles.liveRing, ringStyle]} />
      <View style={styles.liveDot} />
    </View>
  );
};

// ---------- ADD MONEY MODAL ----------
const AddMoneyModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}> = ({ visible, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const quickAmounts = [100, 250, 500, 1000, 2000, 5000];

  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOut.duration(200)}
          style={styles.modalSheet}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Money</Text>
          <Text style={styles.modalSubtitle}>Choose an amount to top up</Text>

          <View style={styles.amountGrid}>
            {quickAmounts.map((amt, idx) => {
              const isActive = selected === amt;
              return (
                <Animated.View
                  key={amt}
                  entering={FadeInUp.delay(idx * 40).springify().damping(15)}
                  style={styles.amountCellWrap}
                >
                  <PressableScale
                    style={[
                      styles.amountCell,
                      isActive && styles.amountCellActive,
                    ]}
                    scaleTo={0.94}
                    onPress={() => setSelected(amt)}
                  >
                    <Text
                      style={[
                        styles.amountCellText,
                        isActive && styles.amountCellTextActive,
                      ]}
                    >
                      {CURRENCY}
                      {amt.toLocaleString('en-IN')}
                    </Text>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>

          <PressableScale
            style={[styles.modalConfirm, !selected && styles.modalConfirmDisabled]}
            onPress={() => {
              if (selected) {
                onConfirm(selected);
              }
            }}
            scaleTo={0.97}
          >
            <LinearGradient
              colors={selected ? [COLORS.ink, '#1F2937'] : ['#D6D6CC', '#D6D6CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.modalConfirmText}>
              {selected ? `Add ${CURRENCY}${selected.toLocaleString('en-IN')}` : 'Select amount'}
            </Text>
            {selected && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </PressableScale>

          <PressableScale style={styles.modalCancel} onPress={onClose} scaleTo={0.97}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </PressableScale>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ---------- TRANSACTION CATEGORY META ----------
const getCategoryMeta = (category: Transaction['category'], type: Transaction['type']) => {
  if (type === 'credit') {
    if (category === 'cashback') return { icon: 'gift-outline' as const, color: COLORS.accent, bg: COLORS.accentSoft };
    if (category === 'refund') return { icon: 'return-down-back-outline' as const, color: COLORS.blue, bg: COLORS.blueSoft };
    return { icon: 'arrow-down-outline' as const, color: COLORS.brand, bg: COLORS.brandSoft };
  }
  if (category === 'ride') return { icon: 'car-sport-outline' as const, color: COLORS.ink, bg: '#F2F2EC' };
  return { icon: 'arrow-up-outline' as const, color: COLORS.ink, bg: '#F2F2EC' };
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ---------- QUICK ACTION ----------
const QuickAction: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  primary?: boolean;
  delay?: number;
}> = ({ icon, label, onPress, primary, delay = 0 }) => (
  <Animated.View
    entering={FadeInUp.delay(delay).springify().damping(15)}
    style={{ flex: 1 }}
  >
    <PressableScale style={styles.quickAction} onPress={onPress} scaleTo={0.93}>
      <View
        style={[
          styles.quickIcon,
          primary && { backgroundColor: COLORS.ink },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={primary ? '#FFFFFF' : COLORS.ink}
        />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </PressableScale>
  </Animated.View>
);

// ---------- PROMO CARD ----------
const PROMOS = [
  {
    id: 'p1',
    title: 'First ride',
    text: 'Get 20% off',
    code: 'FIRST20',
    icon: 'gift-outline' as const,
    bg: ['#0B0F19', '#1F2937'] as const,
    accent: COLORS.accent,
  },
  {
    id: 'p2',
    title: 'Wallet reload',
    text: 'Add ₹500 get ₹50',
    code: 'TOPUP50',
    icon: 'wallet-outline' as const,
    bg: ['#0F8A5F', '#0B6E4C'] as const,
    accent: '#FBBF24',
  },
  {
    id: 'p3',
    title: 'Refer a friend',
    text: 'Earn ₹100 each',
    code: 'REFER100',
    icon: 'people-outline' as const,
    bg: ['#7C2D12', '#9A3412'] as const,
    accent: '#FED7AA',
  },
];

const PromoCard: React.FC<{ promo: (typeof PROMOS)[0]; index: number }> = ({ promo, index }) => (
  <Animated.View
    entering={FadeInDown.delay(200 + index * 80).springify().damping(15)}
  >
    <PressableScale style={styles.promoCard} scaleTo={0.96}>
      <LinearGradient
        colors={promo.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.promoOrb1} />
      <View style={styles.promoOrb2} />

      <View style={styles.promoIconWrap}>
        <Ionicons name={promo.icon} size={20} color={promo.accent} />
      </View>
      <View style={{ flex: 1 }} />
      <Text style={styles.promoTitle}>{promo.title}</Text>
      <Text style={styles.promoText}>{promo.text}</Text>
      <View style={styles.promoCodeWrap}>
        <Text style={styles.promoCodeText}>{promo.code}</Text>
      </View>
    </PressableScale>
  </Animated.View>
);

// ---------- MAIN ----------
export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(1245.5);
  const [visible, setVisible] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      amount: 255.0,
      type: 'debit',
      category: 'ride',
      description: 'Ride to Indiranagar',
      date: '2024-01-15',
      status: 'success',
    },
    {
      id: '2',
      amount: 500.0,
      type: 'credit',
      category: 'topup',
      description: 'Added via UPI',
      date: '2024-01-14',
      status: 'success',
    },
    {
      id: '3',
      amount: 50.0,
      type: 'credit',
      category: 'cashback',
      description: 'Cashback · TOPUP50',
      date: '2024-01-14',
      status: 'success',
    },
    {
      id: '4',
      amount: 187.5,
      type: 'debit',
      category: 'ride',
      description: 'Airport Transfer',
      date: '2024-01-10',
      status: 'success',
    },
    {
      id: '5',
      amount: 80.0,
      type: 'credit',
      category: 'refund',
      description: 'Cancellation refund',
      date: '2024-01-08',
      status: 'pending',
    },
  ]);

  const processAddMoney = useCallback(
    (amount: number) => {
      setShowAddModal(false);
      setTimeout(() => {
        setBalance((prev) => prev + amount);
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          amount,
          type: 'credit',
          category: 'topup',
          description: 'Added via UPI',
          date: new Date().toISOString().split('T')[0],
          status: 'success',
        };
        setTransactions((prev) => [newTransaction, ...prev]);
      }, 250);
    },
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View>
            <Text style={styles.headerKicker}>RAAHI</Text>
            <Text style={styles.headerTitle}>Wallet</Text>
          </View>
          <View style={styles.headerActions}>
            <PressableScale style={styles.headerBtn} scaleTo={0.9} onPress={() => setVisible((v) => !v)}>
              <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.ink} />
            </PressableScale>
            <PressableScale style={styles.headerBtn} scaleTo={0.9}>
              <Ionicons name="card-outline" size={18} color={COLORS.ink} />
            </PressableScale>
          </View>
        </Animated.View>

        {/* Hero Balance Card */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(550).springify().damping(16)}
          style={styles.balanceCardShadow}
        >
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['#0B0F19', '#1A1A2E', '#0F1421']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.cardOrb1} />
            <View style={styles.cardOrb2} />
            <View style={styles.cardGrid}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={styles.cardGridLine} />
              ))}
            </View>

            <View style={styles.balanceTopRow}>
              <View>
                <View style={styles.liveBadge}>
                  <PulseGlow />
                  <Text style={styles.liveBadgeText}>RAAHI WALLET</Text>
                </View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              <View style={styles.chipDecoration}>
                <View style={styles.chipInner} />
              </View>
            </View>

            <View style={styles.balanceWrap}>
              <AnimatedBalance value={balance} visible={visible} />
            </View>

            <View style={styles.balanceMeta}>
              <View style={styles.balanceMetaItem}>
                <Ionicons name="trending-up" size={12} color={COLORS.brand} />
                <Text style={styles.balanceMetaText}>Spent ₹442 this month</Text>
              </View>
              <View style={styles.balanceMetaDot} />
              <Text style={styles.balanceMetaText}>•••• 4521</Text>
            </View>

            <View style={styles.balanceActions}>
              <PressableScale
                style={styles.primaryCta}
                onPress={() => setShowAddModal(true)}
                scaleTo={0.96}
              >
                <View style={styles.primaryCtaIcon}>
                  <Ionicons name="add" size={16} color={COLORS.ink} />
                </View>
                <Text style={styles.primaryCtaText}>Add Money</Text>
              </PressableScale>
              <PressableScale style={styles.ghostCta} scaleTo={0.96}>
                <Ionicons name="arrow-up-outline" size={16} color="#FFFFFF" />
                <Text style={styles.ghostCtaText}>Send</Text>
              </PressableScale>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="qr-code-outline" label="Scan & Pay" primary delay={250} />
          <QuickAction icon="receipt-outline" label="Bills" delay={310} />
          <QuickAction icon="repeat-outline" label="Auto Top-up" delay={370} />
          <QuickAction icon="time-outline" label="Schedule" delay={430} />
        </View>

        {/* Promos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Offers for you</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoScroll}
            decelerationRate="fast"
            snapToInterval={172}
          >
            {PROMOS.map((p, idx) => (
              <PromoCard key={p.id} promo={p} index={idx} />
            ))}
          </ScrollView>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Filter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionList}>
            {transactions.map((tx, idx) => {
              const meta = getCategoryMeta(tx.category, tx.type);
              return (
                <Animated.View
                  key={tx.id}
                  entering={FadeInDown.delay(450 + idx * 70).springify().damping(15)}
                  layout={Layout.springify()}
                  style={[
                    styles.transactionItem,
                    idx === transactions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.transactionIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDesc}>{tx.description}</Text>
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionDate}>{formatDate(tx.date)}</Text>
                      {tx.status === 'pending' && (
                        <>
                          <View style={styles.transactionMetaDot} />
                          <View style={styles.pendingPill}>
                            <Text style={styles.pendingText}>Pending</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text
                      style={[
                        styles.amountText,
                        { color: tx.type === 'credit' ? COLORS.brand : COLORS.ink },
                      ]}
                    >
                      {tx.type === 'credit' ? '+' : '−'}
                      {CURRENCY}
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <AddMoneyModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={processAddMoney}
      />
    </View>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerKicker: {
    fontSize: 11,
    letterSpacing: 4,
    color: COLORS.brand,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  // Balance card
  balanceCardShadow: {
    marginHorizontal: 20,
    marginTop: 18,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  balanceCard: {
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    minHeight: 220,
  },
  cardOrb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.brand,
    opacity: 0.18,
    top: -100,
    right: -70,
  },
  cardOrb2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.brand,
    opacity: 0.08,
    bottom: -50,
    left: -30,
  },
  cardGrid: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    opacity: 0.04,
  },
  cardGridLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  liveRingWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brand,
  },
  balanceLabel: {
    fontSize: 12.5,
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  chipDecoration: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    opacity: 0.85,
    padding: 4,
  },
  chipInner: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: '#B8941F',
    opacity: 0.6,
  },
  balanceWrap: {
    marginBottom: 14,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  balanceCurrency: {
    fontSize: 22,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 8,
    marginRight: 4,
  },
  balanceAmount: {
    fontSize: 46,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  balanceDecimal: {
    fontSize: 22,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 2,
  },
  balanceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  balanceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  balanceMetaText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  balanceMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#475569',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryCtaIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  ghostCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghostCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 8,
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
    textAlign: 'center',
  },

  // Section
  section: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.brand,
  },

  // Promo
  promoScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 6,
  },
  promoCard: {
    width: 160,
    height: 180,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    shadowColor: COLORS.ink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  promoOrb1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    opacity: 0.06,
    top: -30,
    right: -30,
  },
  promoOrb2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    opacity: 0.05,
    bottom: -20,
    left: -10,
  },
  promoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  promoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  promoCodeWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  promoCodeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Transactions
  transactionList: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 3,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionDate: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
    fontWeight: '500',
  },
  transactionMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.inkMuted,
  },
  pendingPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.accentSoft,
  },
  pendingText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,15,25,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.line,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.inkSoft,
    marginBottom: 20,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  amountCellWrap: {
    width: (SCREEN_WIDTH - 44 - 20) / 3,
  },
  amountCell: {
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.line,
  },
  amountCellActive: {
    backgroundColor: COLORS.brandSoft,
    borderColor: COLORS.brand,
  },
  amountCellText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  amountCellTextActive: {
    color: COLORS.brand,
  },
  modalConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalConfirmDisabled: {
    opacity: 0.8,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modalCancel: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
});