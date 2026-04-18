// =========================================================
// app/register.tsx — Layout 2 phần: top (header) + bottom (form)
// KHÔNG thay đổi logic xác thực
// =========================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, ScrollView, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { sendOTP } from '../services/otpService';
import { supabase } from '../services/supabaseConfig';
import { Colors } from '../styles/colors';
import { FontSize, Spacing } from '../styles/globalStyles';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) { Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập.'); return; }
    if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) { Alert.alert('Lỗi', 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu chấm (.) và dấu gạch dưới (_), không có khoảng trắng.'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { Alert.alert('Lỗi', 'Email không hợp lệ.'); return; }
    if (password.length < 6) { Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (password !== confirmPassword) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.'); return; }

    setLoading(true);
    try {
      // KIỂM TRA TÊN ĐĂNG NHẬP (USERNAME) ĐÃ TỒN TẠI HAY CHƯA
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error('Không thể kiểm tra tên đăng nhập. Vui lòng thử lại.');
      }
      if (data) {
        Alert.alert('Tên đăng nhập đã tồn tại', 'Vui lòng chọn một tên đăng nhập khác.');
        setLoading(false);
        return;
      }

      await sendOTP(email.trim(), 'signup');
      router.push({ pathname: '/verify-otp', params: { mode: 'register', email: email.trim(), username: trimmedUsername, password } });
    } catch (error: any) {
      Alert.alert('Lỗi gửi mã OTP', error.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.successLight} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── TOP SECTION ── */}
          <View style={styles.topSection}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconEmoji}>🚀</Text>
              </View>
              <Text style={styles.title}>Tạo{'\n'}tài khoản</Text>
              <Text style={styles.subtitle}>Gia nhập cộng đồng Bump và bắt đầu chia sẻ vị trí!</Text>
            </Animated.View>
          </View>

          {/* ── BOTTOM SECTION ── */}
          <View style={styles.bottomSection}>
            <CustomInput label="Tên đăng nhập" placeholder="Nhập tên đăng nhập (vd: hihon123)" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} accentColor={Colors.success} />
            <CustomInput label="Email" placeholder="Nhập địa chỉ email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} accentColor={Colors.success} />
            <CustomInput label="Mật khẩu" placeholder="Tối thiểu 6 ký tự" isPassword value={password} onChangeText={setPassword} accentColor={Colors.success} />
            <CustomInput label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" isPassword value={confirmPassword} onChangeText={setConfirmPassword} accentColor={Colors.success} />

            <CustomButton label="📨  Gửi mã xác nhận" onPress={handleRegister} loading={loading} color={Colors.success} style={styles.actionBtn} />

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={[styles.linkText, { color: Colors.success }]}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const TOP_BG = Colors.successLight;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TOP_BG },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  topSection: {
    backgroundColor: TOP_BG,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 36,
  },
  iconBadge: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.success,
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

  actionBtn: { marginTop: 8 },

  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  linkLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkText: { fontSize: FontSize.sm, fontWeight: '700' },
});
