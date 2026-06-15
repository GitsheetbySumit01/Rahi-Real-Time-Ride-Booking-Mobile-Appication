import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { bookingService, Booking as BookingType } from '../../services/bookingService'
import * as Haptics from 'expo-haptics'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

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
  warn: '#D97706',
  warnSoft: '#FEF3C7',
  ok: '#0F8A5F',
  okSoft: '#E6F4EE',
}

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 }

// ---------- TYPES ----------
type TabKey = 'upcoming' | 'past' | 'cancelled'

// ---------- HELPERS ----------
const getStatusMeta = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { color: COLORS.ok, bg: COLORS.okSoft, label: 'Confirmed' }
    case 'pending':
      return { color: COLORS.warn, bg: COLORS.warnSoft, label: 'Finding Driver' }
    case 'completed':
      return { color: COLORS.ok, bg: COLORS.okSoft, label: 'Completed' }
    case 'cancelled':
      return { color: COLORS.danger, bg: COLORS.dangerSoft, label: 'Cancelled' }
    default:
      return { color: COLORS.inkSoft, bg: '#F1F5F9', label: status }
  }
}

const getVehicleIcon = (vehicleType?: string): any => {
  switch (vehicleType) {
    case 'auto':
      return 'car-sport'
    case 'bike':
      return 'bicycle'
    case 'cab':
      return 'car'
    case 'premium':
      return 'star'
    case 'suv':
      return 'car-sport'
    default:
      return 'car-outline'
  }
}

// ---------- PRESSABLE WITH SPRING SCALE ----------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const PressableScale: React.FC<{
  onPress?: () => void
  style?: any
  children: React.ReactNode
  scaleTo?: number
}> = ({ onPress, style, children, scaleTo = 0.97 }) => {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(scaleTo, SPRING)
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING)
      }}
      onPress={onPress}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  )
}

// ---------- SHIMMER PULSE ----------
const PulseDot: React.FC<{ color: string; size?: number }> = ({ color, size = 6 }) => {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0.7)

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    )
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900 }),
        withTiming(0.7, { duration: 900 }),
      ),
      -1,
      false,
    )
  }, [])

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
          },
          halo,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

// ---------- ANIMATED TAB INDICATOR ----------
const TabBar: React.FC<{
  activeTab: TabKey
  onChange: (t: TabKey) => void
  counts: { upcoming: number; past: number; cancelled: number }
}> = ({ activeTab, onChange, counts }) => {
  const TABS = [
    { key: 'upcoming' as TabKey, label: 'Upcoming', count: counts.upcoming },
    { key: 'past' as TabKey, label: 'Past', count: counts.past },
    { key: 'cancelled' as TabKey, label: 'Cancelled', count: counts.cancelled },
  ]
  
  const TAB_BAR_PADDING = 20
  const TAB_WIDTH = (SCREEN_WIDTH - TAB_BAR_PADDING * 2) / TABS.length
  
  const activeIndex = TABS.findIndex((t) => t.key === activeTab)
  const translateX = useSharedValue(activeIndex * TAB_WIDTH)

  useEffect(() => {
    translateX.value = withSpring(activeIndex * TAB_WIDTH, SPRING)
  }, [activeIndex, translateX])

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <View style={[styles.tabsContainer, { paddingHorizontal: TAB_BAR_PADDING }]}>
      <View style={styles.tabsTrack}>
        <Animated.View style={[styles.tabPill, { width: TAB_WIDTH - 8 }, pillStyle]}>
          <LinearGradient
            colors={[COLORS.ink, '#1F2937']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {TABS.map((t) => {
          const isActive = activeTab === t.key
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, { width: TAB_WIDTH }]}
              onPress={() => onChange(t.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : COLORS.inkSoft },
                ]}
              >
                {t.label}
              </Text>
              {t.count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : COLORS.brandSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: isActive ? '#FFFFFF' : COLORS.brand },
                    ]}
                  >
                    {t.count}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ---------- STAT CARD ----------
const StatCard: React.FC<{
  label: string
  value: string
  icon: any
}> = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <View style={styles.statIconWrap}>
      <Ionicons name={icon} size={14} color={COLORS.brand} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
)

// ---------- BOOKING CARD ----------
const BookingCard: React.FC<{ 
  item: BookingType 
  onCancel: (booking: BookingType) => void
}> = ({ item, onCancel }) => {
  const meta = getStatusMeta(item.status)
  const vehicleIcon = getVehicleIcon(item.vehicleType)
  const isActive = item.status === 'confirmed' || item.status === 'pending'

  return (
    <View style={styles.cardShadow}>
      <PressableScale style={styles.card} scaleTo={0.98}>
        {/* Ribbon accent on the left */}
        <View
          style={[
            styles.ribbon,
            {
              backgroundColor:
                item.status === 'cancelled'
                  ? COLORS.danger
                  : item.status === 'pending'
                  ? COLORS.warn
                  : COLORS.brand,
            },
          ]}
        />

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <View style={styles.typeIconWrap}>
              <Ionicons name={vehicleIcon} size={13} color={COLORS.brand} />
            </View>
            <Text style={styles.typeText}>{item.vehicleName}</Text>
            {item.vehicleType && (
              <View style={styles.vehicleChip}>
                <Text style={styles.vehicleChipText}>
                  {item.type}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            {item.status === 'pending' ? (
              <PulseDot color={meta.color} size={5} />
            ) : (
              <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
            )}
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Booking ID */}
        <Text style={styles.bookingId}>{item.bookingId}</Text>

        {/* Date row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.inkMuted} />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.inkMuted} />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
          {item.distance && (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Ionicons name="speedometer-outline" size={13} color={COLORS.inkMuted} />
                <Text style={styles.metaText}>{item.distance}</Text>
              </View>
            </>
          )}
        </View>

        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeIndicator}>
            <View style={styles.pickupDot}>
              <View style={styles.pickupDotInner} />
            </View>
            <View style={styles.routeLine}>
              {[...Array(4)].map((_, i) => (
                <View key={i} style={styles.routeDash} />
              ))}
            </View>
            <View style={styles.dropoffPin}>
              <Ionicons name="location" size={10} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.routeDetails}>
            <View style={styles.routeRow}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeText} numberOfLines={1}>
                {item.from}
              </Text>
            </View>
            <View style={styles.routeSpacer} />
            <View style={styles.routeRow}>
              <Text style={styles.routeLabel}>DROP</Text>
              <Text style={styles.routeText} numberOfLines={1}>
                {item.to}
              </Text>
            </View>
          </View>
        </View>

        {/* ETA Banner for confirmed */}
        {item.status === 'confirmed' && item.estimatedArrival && (
          <View style={styles.etaBanner}>
            <LinearGradient
              colors={['#0F8A5F', '#0B6E4C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.etaContent}>
              <PulseDot color="#FFFFFF" size={5} />
              <Text style={styles.etaText}>
                Driver arriving in <Text style={styles.etaBold}>{item.estimatedArrival}</Text>
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        )}

        {/* Driver Info Section - NEW */}
        {item.driver && item.status === 'confirmed' && (
          <View style={styles.driverInfoSection}>
            <View style={styles.driverInfoHeader}>
              <Image source={{ uri: item.driver.photo }} style={styles.driverAvatar} />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{item.driver.name}</Text>
                <View style={styles.driverRatingRow}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.driverRating}>{item.driver.rating}</Text>
                  <Text style={styles.driverRides}>· {item.driver.totalRides} rides</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callDriverButton}>
                <Ionicons name="call" size={18} color={COLORS.brand} />
              </TouchableOpacity>
            </View>
            <View style={styles.vehicleInfoRow}>
              <Ionicons name="car-outline" size={14} color={COLORS.inkMuted} />
              <Text style={styles.vehicleInfoText}>{item.driver.vehicle}</Text>
              <View style={styles.etaBadge}>
                <Text style={styles.etaBadgeText}>ETA {item.estimatedArrival}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Total Fare</Text>
            <Text style={styles.priceAmount}>₹{item.fare}</Text>
          </View>

          {isActive && (
            <PressableScale 
              style={styles.ghostDangerBtn}
              onPress={() => onCancel(item)}
            >
              <Text style={styles.ghostDangerText}>Cancel Ride</Text>
            </PressableScale>
          )}
          {item.status === 'completed' && (
            <PressableScale style={styles.brandBtn}>
              <Text style={styles.brandBtnText}>Rebook</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.brand} />
            </PressableScale>
          )}
          {item.status === 'cancelled' && item.cancelledReason && (
            <View style={styles.reasonChip}>
              <Ionicons name="information-circle-outline" size={13} color={COLORS.danger} />
              <Text style={styles.reasonText}>{item.cancelledReason}</Text>
            </View>
          )}
        </View>

        {/* Surge badge if applicable */}
        {item.surgeMultiplier > 1 && (
          <View style={styles.surgeBadgeCard}>
            <Ionicons name="flash" size={10} color={COLORS.warn} />
            <Text style={styles.surgeTextCard}>{item.surgeMultiplier}x surge</Text>
          </View>
        )}
      </PressableScale>
    </View>
  )
}

// ---------- EMPTY STATE ----------
const EmptyState: React.FC<{ tab: TabKey }> = ({ tab }) => {
  const float = useSharedValue(0)
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
  }, [float])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }))

  const copy = {
    upcoming: { title: 'Ready for your next ride?', text: 'Book a cab, auto or bike in seconds.' },
    past: { title: 'No rides yet', text: 'Your trip history will live here.' },
    cancelled: { title: 'All clean', text: 'No cancelled bookings to show.' },
  }[tab]

  return (
    <View style={styles.emptyContainer}>
      <Animated.View style={[styles.emptyIconContainer, floatStyle]}>
        <LinearGradient
          colors={[COLORS.brandTint, COLORS.brandSoft]}
          style={StyleSheet.absoluteFillObject}
        />
        <Ionicons name="car-sport" size={42} color={COLORS.brand} />
      </Animated.View>
      <Text style={styles.emptyTitle}>{copy.title}</Text>
      <Text style={styles.emptyText}>{copy.text}</Text>
    </View>
  )
}

// ---------- MAIN ----------
const Bookings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [refreshing, setRefreshing] = useState(false)
  const [bookings, setBookings] = useState<BookingType[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingType | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Load bookings from storage
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true)
      const allBookings = await bookingService.getBookings()
      setBookings(allBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // Filter bookings based on active tab
  const getFilteredBookings = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return bookings.filter(b => b.status === 'confirmed' || b.status === 'pending')
      case 'past':
        return bookings.filter(b => b.status === 'completed')
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled')
      default:
        return []
    }
  }, [bookings, activeTab])

  const counts = useMemo(() => ({
    upcoming: bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length,
    past: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }), [bookings])

  const handleTabChange = useCallback((t: TabKey) => {
    setActiveTab(t)
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadBookings()
    setRefreshing(false)
  }, [loadBookings])

  const handleCancelPress = useCallback((booking: BookingType) => {
    setSelectedBooking(booking)
    setCancelModalVisible(true)
  }, [])

  const confirmCancel = useCallback(async () => {
    if (!selectedBooking || cancelling) return
    
    setCancelling(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    
    const success = await bookingService.cancelBooking(
      selectedBooking.id, 
      cancelReason.trim() || 'Cancelled by user'
    )
    
    if (success) {
      await loadBookings()
      Alert.alert('✓ Ride Cancelled', `Your ride to ${selectedBooking.to} has been cancelled.`)
    } else {
      Alert.alert('Error', 'Failed to cancel booking. Please try again.')
    }
    
    setCancelModalVisible(false)
    setSelectedBooking(null)
    setCancelReason('')
    setCancelling(false)
  }, [selectedBooking, cancelReason, cancelling, loadBookings])

  // Calculate stats for past rides
  const pastRides = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings])
  const totalSpent = useMemo(() => pastRides.reduce((sum, b) => sum + b.fare, 0), [pastRides])
  const avgRating = useMemo(() => 4.8, [])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading your rides...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerKicker}>RAHI</Text>
            <Text style={styles.headerTitle}>My Rides</Text>
          </View>
          <View style={styles.headerActions}>
            <PressableScale style={styles.headerBtn} scaleTo={0.9}>
              <Ionicons name="search" size={18} color={COLORS.ink} />
            </PressableScale>
          </View>
        </View>

        <TabBar activeTab={activeTab} onChange={handleTabChange} counts={counts} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        {/* Stats only for past */}
        {activeTab === 'past' && pastRides.length > 0 && (
          <View style={styles.statsRow}>
            <StatCard label="Total Rides" value={pastRides.length.toString()} icon="car-sport" />
            <StatCard label="Total Spent" value={`₹${totalSpent}`} icon="wallet-outline" />
            <StatCard label="Avg Rating" value={avgRating.toString()} icon="star" />
          </View>
        )}

        {/* Section heading */}
        {getFilteredBookings.length > 0 && (
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              {getFilteredBookings.length} {getFilteredBookings.length === 1 ? 'booking' : 'bookings'}
            </Text>
            <View style={styles.sectionDivider} />
          </View>
        )}

        {/* List */}
        {getFilteredBookings.length > 0 ? (
          getFilteredBookings.map((item) => (
            <BookingCard 
              key={item.id} 
              item={item} 
              onCancel={handleCancelPress}
            />
          ))
        ) : (
          <EmptyState tab={activeTab} />
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel this ride to {selectedBooking?.to}?
            </Text>
            
            <Text style={styles.reasonLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Tell us why you're cancelling..."
              placeholderTextColor={COLORS.inkMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              maxLength={100}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Keep Ride</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default Bookings

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.inkSoft,
  },
  headerWrap: {
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 18,
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

  // Tabs
  tabsContainer: {
    marginTop: 8,
  },
  tabsTrack: {
    flexDirection: 'row',
    backgroundColor: '#F2F2EC',
    borderRadius: 16,
    padding: 4,
    position: 'relative',
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.ink,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tab: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    zIndex: 2,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // List
  listContainer: {
    padding: 20,
    paddingBottom: 120,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  // Section heading
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.line,
  },

  // Card
  cardShadow: {
    marginBottom: 14,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 18,
    paddingLeft: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 10,
    color: COLORS.inkMuted,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  vehicleChip: {
    backgroundColor: '#F4F4EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vehicleChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.inkSoft,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
    fontWeight: '500',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.inkMuted,
  },

  // Route
  routeContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  routeIndicator: {
    width: 18,
    alignItems: 'center',
    paddingTop: 4,
  },
  pickupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brand,
  },
  routeLine: {
    flex: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 4,
  },
  routeDash: {
    width: 2,
    height: 3,
    backgroundColor: '#D6D6CC',
    borderRadius: 1,
  },
  dropoffPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeRow: {
    gap: 2,
  },
  routeSpacer: {
    height: 12,
  },
  routeLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.inkMuted,
    letterSpacing: 1,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    letterSpacing: -0.2,
  },

  // ETA Banner
  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  etaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  etaBold: {
    fontWeight: '800',
  },

  // Driver Info Section - NEW
  driverInfoSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  driverInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBBF24',
    marginLeft: 4,
  },
  driverRides: {
    fontSize: 11,
    color: COLORS.inkMuted,
    marginLeft: 6,
  },
  callDriverButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleInfoText: {
    fontSize: 12,
    color: COLORS.inkSoft,
    flex: 1,
  },
  etaBadge: {
    backgroundColor: COLORS.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.brand,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  priceLabel: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
    letterSpacing: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  ghostDangerBtn: {
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  ghostDangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  brandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.brandSoft,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  brandBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '60%',
  },
  reasonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.danger,
  },
  surgeBadgeCard: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warnSoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  surgeTextCard: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.warn,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.inkSoft,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.line,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.inkSoft,
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})