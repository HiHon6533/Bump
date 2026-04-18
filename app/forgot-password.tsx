// =========================================================
// app/forgot-password.tsx — Layout 2 phần: top (header) + bottom (form)
// KHÔNG thay đổi logic xác thực
// =========================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { sendOTP } from '../services/otpService';
import { Colors } from '../styles/colors';
import { FontSize, Spacing, BorderRadius } from '../styles/globalStyles';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // =========================================================
  // Gửi OTP — KHÔNG THAY ĐỔI LOGIC
  // =========================================================
  const handleSendOTP = async () => {
    if (!email.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ.'); return; }

    setLoading(true);
    try {
      await sendOTP(email.trim(), 'recovery');
      router.push({ pathname: '/verify-otp' as any, params: { mode: 'forgot', email: email.trim() } });
    } catch (error: any) {
      Alert.alert('Không thể gửi mã xác nhận', error.message || 'Vui lòng kiểm tra email và kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.warningLight} />

      {/* ── TOP SECTION ── */}
      <View style={styles.topSection}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <View style={styles.backBadge}>
            <Text style={styles.backArrow}>←</Text>
          </View>
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconEmoji}>🔑</Text>
          </View>
          <Text style={styles.title}>Quên{'\n'}mật khẩu?</Text>
          <Text style={styles.subtitle}>Nhập email của bạn, chúng tôi sẽ gửi mã OTP 6 chữ số để xác minh.</Text>
        </Animated.View>
      </View>

      {/* ── BOTTOM SECTION ── */}
      <View style={styles.bottomSection}>
        <CustomInput
          label="Email"
          placeholder="Nhập địa chỉ email đã đăng ký"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          accentColor={Colors.warning}
        />

        {/* Tip box */}
        <View style={styles.tipBox}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Kiểm tra cả thư mục spam nếu không thấy email.
          </Text>
        </View>

        <CustomButton
          label="📨  Gửi mã OTP"
          onPress={handleSendOTP}
          loading={loading}
          color={Colors.warning}
          style={styles.actionBtn}
        />

        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Nhớ mật khẩu rồi? </Text>
          <TouchableOpacity onPress={() => router.replace('/login' as any)} activeOpacity={0.7}>
            <Text style={[styles.linkText, { color: Colors.warning }]}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const TOP_BG = Colors.warningLight;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TOP_BG },

  topSection: {
    backgroundColor: TOP_BG,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 36,
  },
  backBtn: { marginBottom: 16 },
  backBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  backArrow: { fontSize: 18, color: Colors.textPrimary, fontWeight: '600' },
  iconBadge: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
    elevation: 4,
  },
  iconEmoji: { fontSize: 28 },
  title: {
    fontSize: 32, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.5, lineHeight: 38, marginBottom: 10,
  },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  bottomSection: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    marginTop: -2,
  },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: 14, padding: 14, marginBottom: 20, gap: 10,
  },
  tipIcon: { fontSize: 15 },
  tipText: { flex: 1, fontSize: FontSize.sm, color: Colors.warningDark, lineHeight: 20 },

  actionBtn: { marginBottom: 20 },

  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkText: { fontSize: FontSize.sm, fontWeight: '700' },
});
