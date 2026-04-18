// =========================================================
// app/index.tsx
// Entry point của ứng dụng.
// Render Splash Screen TRỰC TIẾP (không dùng router.replace)
// để tránh lỗi "navigate before mounting Root Layout".
// Sau khi splash xong → checkAppState() → navigate phù hợp.
// =========================================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isIntroShown } from '../utils/storage';
import { getUserSession } from '../utils/storage';
import { logoutUser } from '../services/authService';
import { Colors } from '../styles/colors';

const { width } = Dimensions.get('window');

// Các trạng thái có thể của màn hình này
type AppState = 'splash' | 'checking' | 'home';

export default function HomeScreen() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>('splash');
  const [userName, setUserName] = useState('');

  // ---- Splash animation values ----
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Chạy splash animation rồi check auth
    runSplashThenCheck();
  }, []);

  // =========================================================
  // Splash animation + sau đó checkAppState
  // =========================================================
  const runSplashThenCheck = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
    ]).start(() => {
      // Sau khi splash xong → chuyển sang checking state
      setAppState('checking');
      checkAppState();
    });
  };

  // =========================================================
  // Kiểm tra trạng thái app và điều hướng
  // =========================================================
  const checkAppState = async () => {
    try {
      const introShown = await isIntroShown();
      if (!introShown) {
        router.replace('/intro' as any);
        return;
      }

      const session = await getUserSession();
      if (!session) {
        router.replace('/login' as any);
        return;
      }

      // Đã đăng nhập → hiển thị Tabs chính (chỉ định rõ tab đầu tiên là map)
      router.replace('/(tabs)/map' as any);
    } catch (error) {
      router.replace('/login' as any);
    }
  };

  // =========================================================
  // Xử lý đăng xuất
  // =========================================================
  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login' as any);
  };

  // =========================================================
  // Render: Splash Screen
  // =========================================================
  if (appState === 'splash') {
    return (
      <View style={splashStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.splashBg} />

        {/* Decorative circles */}
        <View style={splashStyles.circleLarge} />
        <View style={splashStyles.circleMedium} />
        <View style={splashStyles.circleSmall} />

        {/* Logo container */}
        <Animated.View
          style={[
            splashStyles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={splashStyles.logoCircle}>
            <Text style={splashStyles.logoEmoji}>📍</Text>
          </View>

          <Animated.View
            style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}
          >
            <Text style={splashStyles.appName}>Bump</Text>
            <Text style={splashStyles.tagline}>Chia sẻ vị trí với bạn bè</Text>
          </Animated.View>
        </Animated.View>

        {/* Bottom dots */}
        <Animated.View style={[splashStyles.bottomArea, { opacity: fadeAnim }]}>
          <View style={splashStyles.dotsRow}>
            <View style={[splashStyles.dot, splashStyles.dotActive]} />
            <View style={splashStyles.dot} />
            <View style={splashStyles.dot} />
          </View>
          <Text style={splashStyles.version}>Version 1.0.0</Text>
        </Animated.View>
      </View>
    );
  }

  // =========================================================
  // Render: Checking / Loading
  // =========================================================
  if (appState === 'checking') {
    return (
      <View style={homeStyles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={homeStyles.loadingText}>Đang khởi động...</Text>
      </View>
    );
  }

  // Component UI này sẽ hiếm khi được nhìn thấy vì router.replace
  // đã chuyển ngay sang /(tabs). Tạm trả về view rỗng.
  return <View style={homeStyles.homeContainer} />;
}

// =========================================================
// Slash/Loading Styles
// =========================================================
const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.splashBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLarge: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -width * 0.4,
    right: -width * 0.3,
  },
  circleMedium: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  circleSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: 140,
    right: 30,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logoEmoji: { fontSize: 50 },
  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -1,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
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
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  version: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
});

const homeStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: 12, fontSize: 14, color: Colors.textMuted,
  },
  homeContainer: {
    flex: 1, backgroundColor: Colors.white,
  },
});
