// components/DriverFindingScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// ---------- THEME - Premium Rapido Green ----------
const COLORS = {
  brand: '#0F8A5F',
  brandDark: '#0A5A3D',
  brandLight: '#10B981',
  brandSoft: '#E6F4EE',
  brandUltraLight: '#F0F9F4',
  danger: '#E11D48',
  ink: '#1A1A2E',
  inkSoft: '#475569',
  inkMuted: '#94A3B8',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  line: '#E8EDF2',
  shadow: '#000000',
}

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 }

// ---------- RADAR DIMENSIONS ----------
const RADAR_SIZE = Math.min(SCREEN_WIDTH * 0.78, 320)
const RADAR_CENTER = RADAR_SIZE / 2

// ---------- TYPES ----------
type SearchStatus = 'searching' | 'found' | 'timeout'

interface DriverFindingScreenProps {
  visible: boolean
  onComplete: (found: boolean) => void
  vehicleType?: 'Bike' | 'Auto' | 'Cab' | string
  pickupLocation?: string
  destinationLocation?: string
}

// ---------- PRESSABLE SCALE ----------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
const PressableScale: React.FC<{
  onPress?: () => void
  style?: any
  children: React.ReactNode
  scaleTo?: number
}> = ({ onPress, style, children, scaleTo = 0.96 }) => {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withSpring(scaleTo, SPRING))}
      onPressOut={() => (scale.value = withSpring(1, SPRING))}
      onPress={onPress}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  )
}

// ---------- RADAR PULSE RING ----------
const PulseRing: React.FC<{ delay: number; active: boolean }> = ({ delay, active }) => {
  const scale = useSharedValue(0.3)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (!active) {
      scale.value = 0.3
      opacity.value = 0
      return
    }
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.8, { duration: 2400, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      ),
    )
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 200 }),
          withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      ),
    )
  }, [active])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        animStyle,
        {
          width: RADAR_SIZE,
          height: RADAR_SIZE,
          borderRadius: RADAR_SIZE / 2,
        },
      ]}
    />
  )
}

// ---------- RADAR SWEEP ----------
const RadarSweep: React.FC<{ active: boolean }> = ({ active }) => {
  const rotate = useSharedValue(0)

  useEffect(() => {
    if (!active) {
      rotate.value = 0
      return
    }
    rotate.value = withRepeat(
      withTiming(360, { duration: 2500, easing: Easing.linear }),
      -1,
      false,
    )
  }, [active])

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }))

  return (
    <Animated.View style={[styles.sweepWrap, sweepStyle]}>
      <LinearGradient
        colors={['transparent', 'transparent', `${COLORS.brandLight}00`, `${COLORS.brandLight}40`, `${COLORS.brandLight}80`]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 0 }}
        style={styles.sweepGradient}
      />
    </Animated.View>
  )
}

// ---------- FLOATING DRIVER DOT ----------
type DotPos = { x: number; y: number; delay: number; size: number; hasRipple?: boolean }

const DriverDot: React.FC<{ pos: DotPos; active: boolean }> = ({ pos, active }) => {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.6)
  const rippleScale = useSharedValue(1)
  const rippleOpacity = useSharedValue(0)

  useEffect(() => {
    if (!active) {
      opacity.value = 0
      return
    }
    opacity.value = withDelay(
      pos.delay,
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: 600 }),
          withTiming(0.35, { duration: 1400 }),
        ),
        -1,
        false,
      ),
    )
    scale.value = withDelay(
      pos.delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(0.85, { duration: 1400 }),
        ),
        -1,
        false,
      ),
    )

    if (pos.hasRipple) {
      rippleScale.value = withDelay(
        pos.delay,
        withRepeat(
          withSequence(
            withTiming(1.5, { duration: 1000 }),
            withTiming(1, { duration: 1000 }),
          ),
          -1,
          false,
        ),
      )
      rippleOpacity.value = withDelay(
        pos.delay,
        withRepeat(
          withSequence(
            withTiming(0.4, { duration: 500 }),
            withTiming(0, { duration: 1500 }),
          ),
          -1,
          false,
        ),
      )
    }
  }, [active])

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }))

  return (
    <>
      {pos.hasRipple && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.driverDotRipple,
            {
              left: pos.x - 20,
              top: pos.y - 20,
              width: 40,
              height: 40,
              borderRadius: 20,
            },
            rippleStyle,
          ]}
        />
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.driverDot,
          {
            left: pos.x - pos.size / 2,
            top: pos.y - pos.size / 2,
            width: pos.size,
            height: pos.size,
            borderRadius: pos.size / 2,
          },
          dotStyle,
        ]}
      />
    </>
  )
}

// ---------- ANIMATED STATUS DOTS ----------
const StatusDots: React.FC = () => {
  const d1 = useSharedValue(0.3)
  const d2 = useSharedValue(0.3)
  const d3 = useSharedValue(0.3)

  useEffect(() => {
    const cfg = { duration: 500, easing: Easing.inOut(Easing.ease) }
    d1.value = withRepeat(
      withSequence(withTiming(1, cfg), withTiming(0.3, cfg)),
      -1,
      false,
    )
    d2.value = withDelay(
      180,
      withRepeat(
        withSequence(withTiming(1, cfg), withTiming(0.3, cfg)),
        -1,
        false,
      ),
    )
    d3.value = withDelay(
      360,
      withRepeat(
        withSequence(withTiming(1, cfg), withTiming(0.3, cfg)),
        -1,
        false,
      ),
    )
  }, [])

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }))
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }))
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }))

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
      <Animated.View style={[styles.dot, s3]} />
    </View>
  )
}

// ---------- MAIN ----------
export const DriverFindingScreen: React.FC<DriverFindingScreenProps> = ({
  visible,
  onComplete,
  vehicleType = 'Bike',
  pickupLocation = 'Your location',
  destinationLocation = 'Destination',
}) => {
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('searching')
  const [searchStep, setSearchStep] = useState(0)
  const [searchRadius, setSearchRadius] = useState(1)
  const [driverDistance, setDriverDistance] = useState(2.5)
  const [driversChecked, setDriversChecked] = useState(0)
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(3)

  const searchDuration = useRef(Math.random() * 4000 + 4000)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const progress = useSharedValue(0)

  const driverDots: DotPos[] = useMemo(() => {
    const dots: DotPos[] = []
    const dotCount = 8
    for (let i = 0; i < dotCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 25 + Math.random() * (RADAR_CENTER - 45)
      dots.push({
        x: RADAR_CENTER + Math.cos(angle) * r,
        y: RADAR_CENTER + Math.sin(angle) * r,
        delay: i * 180,
        size: 7 + Math.random() * 5,
        hasRipple: Math.random() > 0.7,
      })
    }
    return dots
  }, [visible])

  useEffect(() => {
    if (visible) {
      startSearching()
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [visible])

  const startSearching = () => {
    setSearchStatus('searching')
    setSearchStep(0)
    setSearchRadius(1)
    setDriversChecked(0)
    setEstimatedWaitTime(3)
    progress.value = 0
    progress.value = withTiming(1, {
      duration: searchDuration.current,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    })

    let step = 0
    intervalRef.current = setInterval(() => {
      step++
      setSearchStep(step)
      setSearchRadius((prev) => Math.min(prev + 1.8, 12))
      setDriverDistance(parseFloat((Math.random() * 1.5 + 0.5).toFixed(1)))
      setDriversChecked((prev) => Math.min(prev + 15 + Math.floor(Math.random() * 10), 150))
      setEstimatedWaitTime((prev) => Math.max(1, prev - 0.3))

      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      }

      if (step > 3 && Math.random() > 0.65) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        foundDriver()
      }
    }, Math.floor(searchDuration.current / 6))

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (Math.random() > 0.15) {
        foundDriver()
      } else {
        timeoutDriver()
      }
    }, searchDuration.current)
  }

  const foundDriver = () => {
    setSearchStatus('found')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setTimeout(() => onComplete(true), 1600)
  }

  const timeoutDriver = () => {
    setSearchStatus('timeout')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    setTimeout(() => onComplete(false), 2000)
  }

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  const vehicleIcon: keyof typeof Ionicons.glyphMap = useMemo(() => {
    const t = vehicleType.toLowerCase()
    if (t.includes('bike')) return 'bicycle'
    if (t.includes('auto')) return 'car-sport'
    if (t.includes('cab')) return 'car'
    return 'car-sport-outline'
  }, [vehicleType])

  const getStatusMessage = () => {
    if (searchStatus === 'searching') {
      const messages = [
        'Finding your captain',
        'Checking availability',
        `Searching within ${searchRadius.toFixed(0)} km`,
        `${driversChecked}+ captains nearby`,
        'Connecting you now',
      ]
      return messages[Math.min(searchStep, messages.length - 1)]
    }
    if (searchStatus === 'found') return 'Captain Found!'
    return 'No Captains Available'
  }

  const getSubMessage = () => {
    if (searchStatus === 'searching') {
      const subs = [
        'Finding the fastest route for you',
        'Most captains are 2-5 mins away',
        `${driverDistance.toFixed(1)} km away • ${estimatedWaitTime.toFixed(0)} min ETA`,
        'Premium ride experience awaits',
        'Finalizing your booking',
      ]
      return subs[Math.min(Math.floor(searchStep / 1.5), subs.length - 1)]
    }
    if (searchStatus === 'found') return `Your ${vehicleType} will arrive in ${Math.floor(driverDistance * 2)} minutes`
    return 'Please try again or choose another vehicle'
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FB', '#F0F9F4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Decorative Background Pattern */}
        <View style={styles.bgPattern} pointerEvents="none">
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.bgCircle,
                {
                  width: SCREEN_WIDTH * (0.3 + i * 0.1),
                  height: SCREEN_WIDTH * (0.3 + i * 0.1),
                  right: -SCREEN_WIDTH * 0.2,
                  top: SCREEN_HEIGHT * (0.1 + i * 0.12),
                },
              ]}
            />
          ))}
        </View>

        {/* Top brand strip */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.brandStrip}>
          <View style={styles.brandPill}>
            <LinearGradient
              colors={[COLORS.brandLight, COLORS.brand]}
              style={styles.brandDotGradient}
            />
            <Text style={styles.brandKicker}>RAHI</Text>
          </View>
          {searchStatus === 'searching' && (
            <View style={styles.driversBadge}>
              <View style={styles.driversBadgeDot} />
              <Text style={styles.driversCheckedText}>
                {driversChecked}+ nearby
              </Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.content}>
          {/* RADAR */}
          {searchStatus === 'searching' && (
            <Animated.View
              entering={FadeIn.duration(400).springify()}
              style={styles.radarContainer}
            >
              {/* Outer glow */}
              <View style={styles.radarGlow} />

              {/* Concentric circles */}
              {[1, 0.75, 0.5, 0.25].map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.gridCircle,
                    {
                      width: RADAR_SIZE * s,
                      height: RADAR_SIZE * s,
                      borderRadius: (RADAR_SIZE * s) / 2,
                    },
                  ]}
                />
              ))}

              {/* Crosshairs */}
              <View style={[styles.crosshair, { width: RADAR_SIZE, height: 1 }]} />
              <View style={[styles.crosshair, { width: 1, height: RADAR_SIZE }]} />

              {/* Driver dots */}
              {driverDots.map((pos, i) => (
                <DriverDot key={i} pos={pos} active />
              ))}

              <RadarSweep active />
              <PulseRing delay={0} active />
              <PulseRing delay={700} active />
              <PulseRing delay={1400} active />

              {/* Center vehicle icon */}
              <Animated.View
                entering={FadeIn.delay(200).springify().damping(15)}
                style={styles.centerIcon}
              >
                <LinearGradient
                  colors={[COLORS.brand, COLORS.brandDark]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.centerIconInner}>
                  <Ionicons name={vehicleIcon} size={34} color="#FFFFFF" />
                </View>
              </Animated.View>
            </Animated.View>
          )}

          {/* FOUND state */}
          {searchStatus === 'found' && (
            <Animated.View
              entering={FadeIn.duration(400).springify().damping(14)}
              style={styles.statusIconLarge}
            >
              <LinearGradient
                colors={[COLORS.brand, COLORS.brandDark]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.checkmarkContainer}>
                <Ionicons name="checkmark" size={64} color="#FFFFFF" />
              </View>
              <View style={styles.statusIconGlow} />
            </Animated.View>
          )}

          {/* TIMEOUT state */}
          {searchStatus === 'timeout' && (
            <Animated.View
              entering={FadeIn.duration(400).springify().damping(14)}
              style={[styles.statusIconLarge, styles.timeoutIcon]}
            >
              <LinearGradient
                colors={[COLORS.danger, '#9F1239']}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="close" size={64} color="#FFFFFF" />
            </Animated.View>
          )}

          {/* Status Text */}
          <Animated.View
            key={`status-${searchStep}-${searchStatus}`}
            entering={FadeIn.duration(350)}
            style={styles.statusBlock}
          >
            <Text style={styles.statusText}>{getStatusMessage()}</Text>
            <View style={styles.subStatusRow}>
              <Text style={styles.subStatusText}>{getSubMessage()}</Text>
              {searchStatus === 'searching' && <StatusDots />}
            </View>
          </Animated.View>

          {/* Progress bar with enhanced design */}
          {searchStatus === 'searching' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, progressStyle]}>
                  <LinearGradient
                    colors={[COLORS.brand, COLORS.brandLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              </View>
              <View style={styles.progressInfo}>
                <View style={styles.progressInfoItem}>
                  <View style={styles.progressDot} />
                  <Text style={styles.progressInfoText}>
                    Radius: {searchRadius.toFixed(0)} km
                  </Text>
                </View>
                <View style={styles.progressInfoItem}>
                  <View style={[styles.progressDot, styles.progressDotActive]} />
                  <Text style={styles.progressInfoText}>
                    Nearest: {driverDistance.toFixed(1)} km
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Route card */}
          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(16)}
            style={styles.routeCard}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', '#FFFFFF']}
              style={StyleSheet.absoluteFillObject}
              borderRadius={24}
            />
            <View style={styles.routeIndicator}>
              <View style={styles.pickupDot}>
                <View style={styles.pickupDotInner} />
              </View>
              <View style={styles.routeLine}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.routeDash} />
                ))}
              </View>
              <View style={styles.dropPin}>
                <Ionicons name="location" size={10} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.routeDetails}>
              <View>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeText} numberOfLines={1}>
                  {pickupLocation}
                </Text>
              </View>
              <View style={styles.routeDivider} />
              <View>
                <Text style={styles.routeLabel}>TO</Text>
                <Text style={styles.routeText} numberOfLines={1}>
                  {destinationLocation}
                </Text>
              </View>
            </View>

            {/* Vehicle type badge */}
            <View style={styles.vehicleBadge}>
              <Ionicons name={vehicleIcon} size={12} color={COLORS.brand} />
              <Text style={styles.vehicleBadgeText}>{vehicleType}</Text>
            </View>
          </Animated.View>

          {/* Cancel Button */}
          {searchStatus === 'searching' && (
            <Animated.View entering={FadeInDown.delay(300)}>
              <PressableScale
                style={styles.cancelButton}
                onPress={() => onComplete(false)}
                scaleTo={0.96}
              >
                <Ionicons name="close" size={18} color={COLORS.inkSoft} />
                <Text style={styles.cancelButtonText}>Cancel Search</Text>
              </PressableScale>
            </Animated.View>
          )}

          {/* Try Again Button for timeout */}
          {searchStatus === 'timeout' && (
            <Animated.View entering={FadeInDown.delay(300)}>
              <PressableScale
                style={styles.tryAgainButton}
                onPress={() => {
                  setSearchStatus('searching')
                  startSearching()
                }}
                scaleTo={0.96}
              >
                <Ionicons name="refresh" size={18} color={COLORS.white} />
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </PressableScale>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: COLORS.brandSoft,
    opacity: 0.3,
  },

  // Top brand strip
  brandStrip: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.brandSoft,
  },
  brandDotGradient: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandKicker: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brand,
    letterSpacing: 1.5,
  },
  driversBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.brandUltraLight,
  },
  driversBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandLight,
  },
  driversCheckedText: {
    fontSize: 12,
    color: COLORS.brand,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Radar
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  radarGlow: {
    position: 'absolute',
    width: RADAR_SIZE + 20,
    height: RADAR_SIZE + 20,
    borderRadius: (RADAR_SIZE + 20) / 2,
    backgroundColor: 'rgba(15,138,95,0.08)',
  },
  gridCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(15,138,95,0.15)',
  },
  crosshair: {
    position: 'absolute',
    backgroundColor: 'rgba(15,138,95,0.06)',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: COLORS.brandLight,
  },
  sweepWrap: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    overflow: 'hidden',
  },
  sweepGradient: {
    flex: 1,
  },
  driverDot: {
    position: 'absolute',
    backgroundColor: COLORS.brandLight,
    shadowColor: COLORS.brandLight,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  driverDotRipple: {
    position: 'absolute',
    backgroundColor: COLORS.brandLight,
    opacity: 0,
  },
  centerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.surface,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  centerIconInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Found / timeout state
  statusIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  timeoutIcon: {
    shadowColor: COLORS.danger,
  },
  checkmarkContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(15,138,95,0.2)',
  },

  // Status block
  statusBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  statusText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subStatusText: {
    fontSize: 14,
    color: COLORS.inkSoft,
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.inkMuted,
  },

  // Progress
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.inkMuted,
  },
  progressDotActive: {
    backgroundColor: COLORS.brand,
  },
  progressInfoText: {
    fontSize: 10,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },

  // Route card
  routeCard: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    position: 'relative',
  },
  routeIndicator: {
    width: 16,
    alignItems: 'center',
    paddingTop: 2,
  },
  pickupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(15,138,95,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandLight,
  },
  routeLine: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 4,
    minHeight: 24,
  },
  routeDash: {
    width: 2,
    height: 4,
    backgroundColor: COLORS.inkMuted,
    borderRadius: 1,
  },
  dropPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.inkMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeText: {
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: '500',
  },
  routeDivider: {
    height: 1,
    backgroundColor: COLORS.line,
  },
  vehicleBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.brandSoft,
    borderRadius: 20,
  },
  vehicleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.brand,
  },

  // Cancel
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 15,
    color: COLORS.inkSoft,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Try Again
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: COLORS.brand,
  },
  tryAgainButtonText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})

export default DriverFindingScreen