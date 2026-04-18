// =========================================================
// app/verify-otp.tsx — Layout 2 phần: top (header) + bottom (form)
// KHÔNG thay đổi logic xác thực
// =========================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet,
  Animated, ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyOTP, sendOTP } from '../services/otpService';
import { registerUser, saveUserProfile, resetPasswordOnBackend } from '../services/authService';
import { supabase } from '../services/supabaseConfig';
import { Colors } from '../styles/colors';
import { FontSize, Spacing, BorderRadius } from '../styles/globalStyles';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';

const OTP_COUNTDOWN_SECONDS = 300;

export default function VerifyOTPScreen() {
  const router = useRouter();

  const { mode, email, username, password } = useLocalSearchParams<{
    mode: 'register' | 'forgot';
    email: string;
    username?: string;
    password?: string;
  }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [countdown, setCountdown] = useState(OTP_COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    startCountdown();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    return () => stopCountdown();
  }, []);

  const startCountdown = () => {
    setCountdown(OTP_COUNTDOWN_SECONDS);
    stopCountdown();
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { stopCountdown(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ====================== LOGIC KHÔNG THAY ĐỔI ======================

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await sendOTP(email, mode === 'register' ? 'signup' : 'recovery');
      startCountdown();
      Alert.alert('Thành công', 'Mã OTP mới đã được gửi đến email của bạn.');
    } catch { Alert.alert('Lỗi', 'Không thể gửi OTP. Vui lòng thử lại.'); }
    finally { setResending(false); }
  };

  const handleVerifyOTP = async () => {
    if (loading) return;
    if (otp.length !== 6) { Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số của mã OTP.'); return; }
    setLoading(true);
    try {
      const isValid = await verifyOTP(email, otp, mode === 'register' ? 'signup' : 'recovery');
      if (!isValid) { Alert.alert('OTP không hợp lệ', 'Mã OTP sai hoặc đã hết hạn. Vui lòng thử lại.'); return; }
      if (mode === 'register') {
        const userId = await registerUser(email!, password!);
        await saveUserProfile(userId, username!, email!);
        await supabase.auth.signOut();
        Alert.alert('Thành công! 🎉', 'Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.', [{ text: 'Đăng nhập', onPress: () => router.replace('/login' as any) }]);
      } else if (mode === 'forgot') {
        stopCountdown();
        setOtpVerified(true);
      }
    } catch (err: any) {
      console.error('[VerifyOTP] Lỗi:', err);
      Alert.alert('Lỗi', err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) { Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (newPassword !== confirmNewPassword) { Alert.alert('Lỗi', 'Xác nhận mật khẩu không khớp.'); return; }
    setResettingPassword(true);
    try {
      await resetPasswordOnBackend(email!, newPassword);
      Alert.alert('Đổi mật khẩu thành công! 🎉', 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.', [{ text: 'Đăng Nhập', onPress: () => router.replace('/login' as any) }]);
    } catch (error: any) {
      Alert.alert('Lỗi đổi mật khẩu', error.message || 'Hệ thống đang bận. Vui lòng thử lại.');
    } finally { setResettingPassword(false); }
  };

  // ====================== THEME ======================
  const accent = mode === 'register' ? Colors.success : Colors.warning;
  const topBg = mode === 'register' ? Colors.successLight : Colors.warningLight;

  // ======================================================
  // Render: Đặt lại mật khẩu mới (sau khi OTP verify)
  // ======================================================
  if (otpVerified && mode === 'forgot') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: Colors.warningLight }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.warningLight} />

        {/* TOP SECTION */}
        <View style={[styles.topSection, { backgroundColor: Colors.warningLight }]}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={[styles.iconBadge, { shadowColor: Colors.warning }]}>
              <Text style={styles.iconEmoji}>🔐</Text>
            </View>
            <Text style={styles.title}>Đặt lại{'\n'}mật khẩu</Text>
            <Text style={styles.subtitle}>OTP đã xác minh. Hãy tạo mật khẩu mới cho tài khoản của bạn.</Text>
          </Animated.View>
        </View>

        {/* BOTTOM SECTION */}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={styles.bottomSection}>
              <CustomInput label="Mật khẩu mới" placeholder="Tối thiểu 6 ký tự" isPassword value={newPassword} onChangeText={setNewPassword} accentColor={Colors.warning} />
              <CustomInput label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu mới" isPassword value={confirmNewPassword} onChangeText={setConfirmNewPassword} accentColor={Colors.warning} />
              <CustomButton label="Lưu mật khẩu mới" onPress={handleResetPassword} loading={resettingPassword} color={Colors.warning} style={styles.actionBtn} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ======================================================
  // Render: Nhập OTP
  // ======================================================
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: topBg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={topBg} />

      {/* TOP SECTION */}
      <View style={[styles.topSection, { backgroundColor: topBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <View style={styles.backBadge}>
            <Text style={styles.backArrow}>←</Text>
          </View>
        </TouchableOpacity>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.iconBadge, { shadowColor: accent }]}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </View>
          <Text style={styles.title}>Xác minh{'\n'}mã OTP</Text>
          <Text style={styles.subtitle}>
            Mã xác nhận 6 chữ số đã được gửi đến{'\n'}
            <Text style={[styles.emailHighlight, { color: accent }]}>{email}</Text>
          </Text>
        </Animated.View>
      </View>

      {/* BOTTOM SECTION */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.bottomSection}>
            {/* OTP Input */}
            <Text style={styles.inputLabel}>Nhập mã OTP</Text>
            <TextInput
              style={[styles.otpInput, { borderColor: otp.length === 6 ? accent : Colors.inputBorder }]}
              placeholder="●●●●●●"
              placeholderTextColor={Colors.placeholder}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />

            {/* Countdown / Resend */}
            <View style={styles.countdownRow}>
              {countdown > 0 ? (
                <View style={[styles.countdownBadge, { backgroundColor: topBg }]}>
                  <Text style={styles.countdownIcon}>⏱</Text>
                  <Text style={[styles.countdownText, { color: accent }]}>
                    Mã hết hạn sau  <Text style={styles.countdownBold}>{formatCountdown()}</Text>
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resending}
                  style={[styles.resendBtn, { borderColor: accent }]}
                  activeOpacity={0.7}
                >
                  {resending
                    ? <ActivityIndicator size="small" color={accent} />
                    : <Text style={[styles.resendText, { color: accent }]}>🔄  Gửi lại OTP</Text>
                  }
                </TouchableOpacity>
              )}
            </View>

            <CustomButton
              label="✅  Xác Minh OTP"
              onPress={handleVerifyOTP}
              loading={loading}
              disabled={otp.length < 6}
              color={accent}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  // ── Top section ──
  topSection: {
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
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
    elevation: 4,
  },
  iconEmoji: { fontSize: 28 },
  title: {
    fontSize: 32, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.5, lineHeight: 38, marginBottom: 10,
  },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },
  emailHighlight: { fontWeight: '700' },

  // ── Bottom section ──
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

  inputLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  otpInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingLeft: 32, // Cộng thêm dư dả để kéo chữ sang giữa
    paddingRight: 8, // Trừ bớt để cân bằng lại khoảng trắng dư ở đuôi chữ
    paddingVertical: 18,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    fontWeight: '800',
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    marginBottom: 20,
  },

  countdownRow: { alignItems: 'center', marginBottom: 24 },
  countdownBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, gap: 6,
  },
  countdownIcon: { fontSize: 14 },
  countdownText: { fontSize: FontSize.sm },
  countdownBold: { fontWeight: '800' },
  resendBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8, gap: 6,
  },
  resendText: { fontSize: FontSize.sm, fontWeight: '700' },

  actionBtn: { marginTop: 8 },

  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  linkLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkText: { fontSize: FontSize.sm, fontWeight: '700' },
});
