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
  Easing,
  interpolateColor,
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
  gold: '#D4AF37',
};

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

// ---------- PRESSABLE SCALE ----------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PressableScale: React.FC<{
  onPress?: () => void;
  style?: any;
  children: React.ReactNode;
  scaleTo?: number;
  testID?: string;
}> = ({ onPress, style, children, scaleTo = 0.97, testID }) => {
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

// ---------- CUSTOM SWITCH ----------
const CustomSwitch: React.FC<{
  value: boolean;
  onValueChange: (v: boolean) => void;
}> = ({ value, onValueChange }) => {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#E5E5DE', COLORS.ink]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 22 }],
  }));

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <Animated.View style={[styles.switchTrack, trackStyle]}>
        <Animated.View style={[styles.switchThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};

// ---------- ROTATING AVATAR RING ----------
const AvatarRing: React.FC = () => {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  return (
    <Animated.View style={[styles.avatarRing, ringStyle]}>
      <LinearGradient
        colors={[COLORS.brand, COLORS.gold, COLORS.brand, '#0B6E4C', COLORS.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
};

// ---------- LOGOUT CONFIRMATION SHEET ----------
const LogoutSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ visible, onClose, onConfirm }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOut.duration(200)}
        style={styles.modalSheet}
      >
        <View style={styles.modalHandle} />

        <View style={styles.modalIconWrap}>
          <Ionicons name="log-out-outline" size={28} color={COLORS.danger} />
        </View>

        <Text style={styles.modalTitle}>Sign out of Rahi?</Text>
        <Text style={styles.modalSubtitle}>
          You'll need to sign in again to book rides and view your history.
        </Text>

        <View style={styles.modalActions}>
          <PressableScale style={styles.modalCancelBtn} onPress={onClose} scaleTo={0.97}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </PressableScale>
          <PressableScale style={styles.modalConfirmBtn} onPress={onConfirm} scaleTo={0.97}>
            <Text style={styles.modalConfirmText}>Sign Out</Text>
          </PressableScale>
        </View>
      </Animated.View>
    </Pressable>
  </Modal>
);

// ---------- MENU ITEM ----------
type MenuEntry = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
};

const MenuRow: React.FC<{ item: MenuEntry; isLast: boolean; delay?: number }> = ({
  item,
  isLast,
  delay = 0,
}) => (
  <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)}>
    <PressableScale style={styles.menuItem} scaleTo={0.99}>
      <View style={styles.menuLeft}>
        <View
          style={[
            styles.menuIcon,
            { backgroundColor: item.iconBg ?? COLORS.brandSoft },
          ]}
        >
          <Ionicons name={item.icon} size={18} color={item.iconColor ?? COLORS.brand} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.menuRight}>
        {item.badge && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
      </View>
    </PressableScale>
    {!isLast && <View style={styles.menuDivider} />}
  </Animated.View>
);

// ---------- MAIN ----------
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationAccess, setLocationAccess] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  const accountMenu: MenuEntry[] = [
    {
      icon: 'card-outline',
      title: 'Payment Methods',
      subtitle: 'UPI, cards, wallet',
      iconBg: COLORS.brandSoft,
      iconColor: COLORS.brand,
      badge: '3',
    },
    {
      icon: 'location-outline',
      title: 'Saved Places',
      subtitle: 'Home, Work, and more',
      iconBg: '#FEF3C7',
      iconColor: '#92400E',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Safety',
      subtitle: 'Trusted contacts, SOS, share trip',
      iconBg: COLORS.dangerSoft,
      iconColor: COLORS.danger,
    },
    {
      icon: 'language-outline',
      title: 'Language',
      subtitle: 'English (India)',
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
    },
  ];

  const supportMenu: MenuEntry[] = [
    {
      icon: 'help-circle-outline',
      title: 'Help Center',
      subtitle: 'FAQs and live support',
      iconBg: '#F2F2EC',
      iconColor: COLORS.ink,
    },
    {
      icon: 'star-outline',
      title: 'Rate Rahi',
      subtitle: 'Loving the app? Let us know',
      iconBg: COLORS.accentSoft,
      iconColor: COLORS.accent,
    },
    {
      icon: 'document-text-outline',
      title: 'Legal',
      subtitle: 'Terms, Privacy & Policies',
      iconBg: '#F2F2EC',
      iconColor: COLORS.ink,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View>
            <Text style={styles.headerKicker}>RAAHI</Text>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <View style={styles.headerActions}>
            <PressableScale style={styles.headerBtn} scaleTo={0.9}>
              <Ionicons name="share-outline" size={18} color={COLORS.ink} />
            </PressableScale>
            <PressableScale style={styles.headerBtn} scaleTo={0.9}>
              <Ionicons name="settings-outline" size={18} color={COLORS.ink} />
            </PressableScale>
          </View>
        </Animated.View>

        {/* Hero Profile Card */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(550).springify().damping(16)}
          style={styles.heroCardShadow}
        >
          <View style={styles.heroCard}>
            {/* Top section: black gradient with avatar */}
            <View style={styles.heroTop}>
              <LinearGradient
                colors={['#0B0F19', '#1A1A2E', '#0F1421']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.heroOrb1} />
              <View style={styles.heroOrb2} />

              {/* Tier badge */}
              <View style={styles.tierBadge}>
                <Ionicons name="diamond" size={11} color={COLORS.gold} />
                <Text style={styles.tierText}>RAAHI GOLD</Text>
              </View>

              {/* Edit profile button */}
              <PressableScale style={styles.editProfileBtn} scaleTo={0.94}>
                <Ionicons name="pencil" size={13} color="#FFFFFF" />
                <Text style={styles.editProfileText}>Edit</Text>
              </PressableScale>
            </View>

            {/* Avatar overlapping the boundary */}
            <View style={styles.avatarWrap}>
              <AvatarRing />
              <View style={styles.avatar}>
                <LinearGradient
                  colors={[COLORS.brand, '#0B6E4C']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.avatarInitials}>AS</Text>
              </View>
              <PressableScale style={styles.cameraBtn} scaleTo={0.88}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </PressableScale>
              {/* verified tick */}
              <View style={styles.verifiedTick}>
                <Ionicons name="checkmark" size={11} color="#FFFFFF" />
              </View>
            </View>

            {/* Bottom section: light */}
            <View style={styles.heroBottom}>
              <Text style={styles.userName}>Ashish</Text>
              <View style={styles.contactRow}>
                <View style={styles.contactPill}>
                  <Ionicons name="mail-outline" size={11} color={COLORS.inkSoft} />
                  <Text style={styles.contactText}>Ashish.kumar@example.com</Text>
                </View>
              </View>
              <View style={styles.contactRow}>
                <View style={styles.contactPill}>
                  <Ionicons name="call-outline" size={11} color={COLORS.inkSoft} />
                  <Text style={styles.contactText}>+91 98765 43210</Text>
                </View>
                <View style={styles.contactPill}>
                  <Ionicons name="location-outline" size={11} color={COLORS.inkSoft} />
                  <Text style={styles.contactText}>Bangalore</Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>24</Text>
                  <Text style={styles.statLabel}>Rides</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.statInline}>
                    <Ionicons name="star" size={13} color={COLORS.accent} />
                    <Text style={styles.statNumber}>4.9</Text>
                  </View>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>₹342</Text>
                  <Text style={styles.statLabel}>Saved</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Loyalty Progress */}
        <Animated.View
          entering={FadeInDown.delay(220).springify().damping(16)}
          style={styles.loyaltyCard}
        >
          <View style={styles.loyaltyHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.loyaltyLabel}>Progress to Platinum</Text>
              <Text style={styles.loyaltyValue}>6 rides away</Text>
            </View>
            <View style={styles.loyaltyBadge}>
              <Text style={styles.loyaltyBadgeText}>24 / 30</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              entering={FadeIn.delay(700).duration(800)}
              style={[styles.progressFill, { width: '80%' }]}
            >
              <LinearGradient
                colors={[COLORS.brand, '#0B6E4C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
          <Text style={styles.loyaltyHint}>
            Unlock premium support, priority drivers & ₹500 monthly cashback.
          </Text>
        </Animated.View>

        {/* Preferences */}
        <Animated.View
          entering={FadeInDown.delay(300).springify().damping(16)}
          style={styles.sectionWrap}
        >
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.sectionCard}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.brandSoft }]}>
                  <Ionicons name="notifications-outline" size={18} color={COLORS.brand} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Push Notifications</Text>
                  <Text style={styles.menuSubtitle}>Trip updates and offers</Text>
                </View>
              </View>
              <CustomSwitch value={notifications} onValueChange={setNotifications} />
            </View>
            <View style={styles.menuDivider} />

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#F2F2EC' }]}>
                  <Ionicons name="moon-outline" size={18} color={COLORS.ink} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Dark Mode</Text>
                  <Text style={styles.menuSubtitle}>Easier on the eyes at night</Text>
                </View>
              </View>
              <CustomSwitch value={darkMode} onValueChange={setDarkMode} />
            </View>
            <View style={styles.menuDivider} />

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="navigate-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Precise Location</Text>
                  <Text style={styles.menuSubtitle}>For accurate pickup</Text>
                </View>
              </View>
              <CustomSwitch value={locationAccess} onValueChange={setLocationAccess} />
            </View>
          </View>
        </Animated.View>

        {/* Account */}
        <View style={styles.sectionWrap}>
          <Animated.Text
            entering={FadeIn.delay(420)}
            style={styles.sectionLabel}
          >
            Account
          </Animated.Text>
          <View style={styles.sectionCard}>
            {accountMenu.map((item, idx) => (
              <MenuRow
                key={item.title}
                item={item}
                isLast={idx === accountMenu.length - 1}
                delay={440 + idx * 60}
              />
            ))}
          </View>
        </View>

        {/* Support */}
        <View style={styles.sectionWrap}>
          <Animated.Text entering={FadeIn.delay(720)} style={styles.sectionLabel}>
            Support
          </Animated.Text>
          <View style={styles.sectionCard}>
            {supportMenu.map((item, idx) => (
              <MenuRow
                key={item.title}
                item={item}
                isLast={idx === supportMenu.length - 1}
                delay={740 + idx * 60}
              />
            ))}
          </View>
        </View>

        {/* Logout */}
        <Animated.View
          entering={FadeInUp.delay(940).springify().damping(16)}
          style={styles.logoutWrap}
        >
          <PressableScale
            style={styles.logoutButton}
            scaleTo={0.97}
            onPress={() => setShowLogout(true)}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </PressableScale>
        </Animated.View>

        {/* Brand footer */}
        <Animated.View entering={FadeIn.delay(1000)} style={styles.footer}>
          <Text style={styles.footerBrand}>RAAHI</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 · Made in India</Text>
        </Animated.View>
      </ScrollView>

      <LogoutSheet
        visible={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={() => {
          setShowLogout(false);
          // session clearing logic
        }}
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
    paddingBottom: 10,
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

  // Hero
  heroCardShadow: {
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  heroTop: {
    height: 110,
    paddingHorizontal: 18,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.brand,
    opacity: 0.18,
    top: -90,
    right: -60,
  },
  heroOrb2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gold,
    opacity: 0.08,
    bottom: -30,
    left: -20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Avatar
  avatarWrap: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -56,
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.surface,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  verifiedTick: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.surface,
  },

  // Hero bottom
  heroBottom: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F4F4EE',
  },
  contactText: {
    fontSize: 11.5,
    color: COLORS.inkSoft,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 18,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.inkMuted,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.line,
  },

  // Loyalty card
  loyaltyCard: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loyaltyLabel: {
    fontSize: 11,
    color: COLORS.inkMuted,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  loyaltyValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  loyaltyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.brandSoft,
  },
  loyaltyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brand,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2F2EC',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loyaltyHint: {
    fontSize: 12,
    color: COLORS.inkSoft,
    lineHeight: 17,
  },

  // Sections
  sectionWrap: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },

  // Preferences / Menu shared
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    minWidth: 22,
    alignItems: 'center',
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginLeft: 14 + 38 + 12,
  },

  // Switch
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  // Logout
  logoutWrap: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.dangerSoft,
  },
  logoutText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.danger,
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 4,
  },
  footerBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.line,
    letterSpacing: 6,
  },
  footerVersion: {
    fontSize: 11,
    color: COLORS.inkMuted,
    letterSpacing: 0.3,
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
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13.5,
    color: COLORS.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});