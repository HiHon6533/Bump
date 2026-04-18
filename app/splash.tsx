// =========================================================
// app/splash.tsx
// Premium Splash Screen — Pulse Rings + Animated Logo
// =========================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse rings
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start pulse rings immediately
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const p1 = createPulse(pulse1, 0);
    const p2 = createPulse(pulse2, 600);
    const p3 = createPulse(pulse3, 1200);
    p1.start();
    p2.start();
    p3.start();

    // Main entrance animation
    Animated.sequence([
      // Logo bounce in với rotation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Text slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      // Wait
      Animated.delay(1500),
    ]).start(() => {
      p1.stop();
      p2.stop();
      p3.stop();
      router.replace('/index' as any);
    });

    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, []);

  // Interpolations
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  const makePulse = (anim: Animated.Value) => ({
    scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3.5] }),
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.2, 0] }),
  });

  const p1Interp = makePulse(pulse1);
  const p2Interp = makePulse(pulse2);
  const p3Interp = makePulse(pulse3);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F1A" />

      {/* Gradient background */}
      <LinearGradient
        colors={['#0B0F1A', '#1A1040', '#0B0F1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative gradient orbs */}
      <View style={[styles.orb, styles.orbIndigo]} />
      <View style={[styles.orb, styles.orbEmerald]} />

      {/* Pulse Rings */}
      <Animated.View style={[
        styles.pulseCircle,
        { transform: [{ scale: p1Interp.scale }], opacity: p1Interp.opacity, borderColor: '#4F46E5' }
      ]} />
      <Animated.View style={[
        styles.pulseCircle,
        { transform: [{ scale: p2Interp.scale }], opacity: p2Interp.opacity, borderColor: '#818CF8' }
      ]} />
      <Animated.View style={[
        styles.pulseCircle,
        { transform: [{ scale: p3Interp.scale }], opacity: p3Interp.opacity, borderColor: '#A5B4FC' }
      ]} />

      {/* Logo + App name */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { rotate }],
          },
        ]}
      >
        {/* Logo icon with gradient ring */}
        <LinearGradient
          colors={['#818CF8', '#4F46E5', '#3730A3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradientRing}
        >
          <View style={styles.logoInner}>
            <Text style={styles.logoEmoji}>📍</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Text — separate from rotation */}
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        <Text style={styles.appName}>Bump</Text>
        <Text style={styles.tagline}>Chia sẻ vị trí với bạn bè</Text>
      </Animated.View>

      {/* Bottom branding */}
      <Animated.View style={[styles.bottomArea, { opacity: fadeAnim }]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.version}>Version 1.0.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Gradient Orbs ----
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbIndigo: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  orbEmerald: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    bottom: -width * 0.15,
    left: -width * 0.15,
  },

  // ---- Pulse ----
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },

  // ---- Logo ----
  logoContainer: {
    alignItems: 'center',
  },
  logoGradientRing: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 108,
    height: 108,
    borderRadius: 30,
    backgroundColor: '#0D1B2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 54,
  },

  // ---- Text ----
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },

  // ---- Bottom ----
  bottomArea: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#4F46E5',
  },
  version: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
});
