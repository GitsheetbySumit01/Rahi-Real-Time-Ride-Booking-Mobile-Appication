// components/AppLoadingScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AppLoadingScreenProps {
  onFinish: () => void;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  onFinish,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Circle animations
  const circle1Scale = useRef(new Animated.Value(1)).current;
  const circle1Opacity = useRef(new Animated.Value(0.05)).current;
  const circle2Scale = useRef(new Animated.Value(1)).current;
  const circle2Opacity = useRef(new Animated.Value(0.08)).current;
  const circle3Scale = useRef(new Animated.Value(1)).current;
  const circle3Opacity = useRef(new Animated.Value(0.04)).current;
  const circle4Scale = useRef(new Animated.Value(1)).current;
  const circle4Opacity = useRef(new Animated.Value(0.03)).current;

  // Rotate animations for circles
  const rotate1 = useRef(new Animated.Value(0)).current;
  const rotate2 = useRef(new Animated.Value(0)).current;
  const rotate3 = useRef(new Animated.Value(0)).current;
  const rotate4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimations();
    startCircleAnimations();

    // Progress bar animation (3.5 seconds to complete)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    }).start();

    // Shimmer animation for the progress bar
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();

  }, []);

  const startAnimations = () => {
    // Logo fade in and scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Main content fade
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startCircleAnimations = () => {
    // Circle 1 - Large, slow pulse (clockwise rotation)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circle1Scale, {
            toValue: 1.15,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle1Opacity, {
            toValue: 0.12,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotate1, {
            toValue: 1,
            duration: 20000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(circle1Scale, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle1Opacity, {
            toValue: 0.05,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: -1 }
    ).start();

    // Circle 2 - Medium, opposite pulse timing (counter-clockwise)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circle2Scale, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle2Opacity, {
            toValue: 0.04,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotate2, {
            toValue: 360,
            duration: 15000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(circle2Scale, {
            toValue: 1.2,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle2Opacity, {
            toValue: 0.1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: -1 }
    ).start();

    // Circle 3 - Small, faster pulse (clockwise)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circle3Scale, {
            toValue: 1.25,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle3Opacity, {
            toValue: 0.1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotate3, {
            toValue: 360,
            duration: 12000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(circle3Scale, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle3Opacity, {
            toValue: 0.04,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: -1 }
    ).start();

    // Circle 4 - Extra small, rapid pulse (counter-clockwise)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circle4Scale, {
            toValue: 1.3,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle4Opacity, {
            toValue: 0.08,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotate4, {
            toValue: 360,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(circle4Scale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(circle4Opacity, {
            toValue: 0.03,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: -1 }
    ).start();
  };

  // Fixed rotation interpolations - using 0 to 360 instead of negative values
  const rotate1Interpolate = rotate1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotate2Interpolate = rotate2.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '-360deg'],
  });

  const rotate3Interpolate = rotate3.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const rotate4Interpolate = rotate4.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '-360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerLeft = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-100%', '100%', '300%'],
  });

  // Loading messages that change over time
  const [messageIndex, setMessageIndex] = useState(0);
  const loadingMessages = [
    "Loading your experience...",
    "Finding best routes...",
    "Checking available drivers...",
    "Almost there...",
  ];

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1000);
    
    return () => clearInterval(messageInterval);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F8A5F" />
      
      <LinearGradient
        colors={['#0F8A5F', '#0B6E4C', '#0A5A3D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated Circles Background */}
      <Animated.View
        style={[
          styles.circle1,
          {
            transform: [{ scale: circle1Scale }, { rotate: rotate1Interpolate }],
            opacity: circle1Opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          {
            transform: [{ scale: circle2Scale }, { rotate: rotate2Interpolate }],
            opacity: circle2Opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle3,
          {
            transform: [{ scale: circle3Scale }, { rotate: rotate3Interpolate }],
            opacity: circle3Opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle4,
          {
            transform: [{ scale: circle4Scale }, { rotate: rotate4Interpolate }],
            opacity: circle4Opacity,
          },
        ]}
      />

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo Image */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
              style={styles.logoBackground}
            />
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.Text style={[styles.appName, { opacity: textFade }]}>
          RAHI
        </Animated.Text>
        
        <Animated.Text style={[styles.tagline, { opacity: textFade }]}>
          Your Ride, Your Way
        </Animated.Text>

        {/* Premium Golden Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth },
              ]}
            >
              <LinearGradient
                colors={['#D4AF37', '#FFD700', '#FDB931', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    left: shimmerLeft,
                  },
                ]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            </Animated.View>
          </View>
          <View style={styles.progressGlow} />
        </View>

        {/* Loading Text */}
        <Animated.Text style={[styles.loadingText, { opacity: textFade }]}>
          {loadingMessages[messageIndex]}
        </Animated.Text>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F8A5F',
  },
  circle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#FFFFFF',
    top: -150,
    right: -150,
  },
  circle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FFFFFF',
    bottom: -100,
    left: -100,
  },
  circle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    top: '30%',
    right: -80,
  },
  circle4: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
    bottom: '20%',
    right: '20%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  logoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginBottom: 48,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    opacity: 0.5,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  shimmerGradient: {
    flex: 1,
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  version: {
    position: 'absolute',
    bottom: 30,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
});

export default AppLoadingScreen;