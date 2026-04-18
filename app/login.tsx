// =========================================================
// app/login.tsx — Layout 2 phần: top (header) + bottom (form)
// KHÔNG thay đổi logic xác thực
// Hỗ trợ Login bằng email hoặc username
// =========================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { loginUser } from '../services/authService';
import { supabase } from '../services/supabaseConfig';
import { Colors } from '../styles/colors';
import { FontSize, Spacing, BorderRadius } from '../styles/globalStyles';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

export default function LoginScreen() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
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
  // Xử lý đăng nhập — Hỗ trợ email HOẶC username
  // =========================================================
  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email/username và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      let email = emailOrUsername.trim();

      // Nếu không chứa @, coi như là username → query DB lấy email
      if (!email.includes('@')) {
        const { data, error } = await supabase
          .from('users')
          .select('email')
          .eq('username', email)
          .maybeSingle();
        if (error || !data?.email) {
          Alert.alert('Lỗi', 'Không tìm thấy tài khoản với username này.');
          setLoading(false);
          return;
        }
        email = data.email;
      }

      const user = await loginUser(email, password);
      if (user) router.replace('/');
    } catch (error: any) {
      const msg: string = error?.message ?? '';
      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
        message = 'Email/username hoặc mật khẩu không đúng.';
      else if (msg.includes('Email not confirmed'))
        message = 'Tài khoản chưa được xác minh. Vui lòng kiểm tra email.';
      else if (msg.includes('too many requests') || msg.includes('rate limit'))
        message = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
      else if (msg.includes('User not found'))
        message = 'Không tìm thấy tài khoản với email này.';
      else if (msg) message = msg;
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primaryLight} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── TOP SECTION (màu nền) ── */}
          <View style={styles.topSection}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconEmoji}>👋</Text>
              </View>
              <Text style={styles.title}>Chào mừng{'\n'}trở lại!</Text>
              <Text style={styles.subtitle}>Đăng nhập để tiếp tục chia sẻ vị trí cùng bạn bè.</Text>
            </Animated.View>
          </View>

          {/* ── BOTTOM SECTION (trắng) ── */}
          <View style={styles.bottomSection}>
            <CustomInput
              label="Email hoặc Username"
              placeholder="Nhập email hoặc tên đăng nhập"
              autoCapitalize="none"
              autoCorrect={false}
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              accentColor={Colors.primary}
            />
            <CustomInput
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              isPassword
              value={password}
              onChangeText={setPassword}
              accentColor={Colors.primary}
            />

            <TouchableOpacity
              onPress={() => router.push('/forgot-password' as any)}
              style={styles.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <CustomButton
              label="Đăng Nhập"
              onPress={handleLogin}
              loading={loading}
              color={Colors.primary}
              style={styles.actionBtn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/register' as any)} activeOpacity={0.7}>
                <Text style={[styles.linkText, { color: Colors.primary }]}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const TOP_BG = Colors.primaryLight;
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
    elevation: 4,
  },
  iconEmoji: { fontSize: 28 },
  title: {
    fontSize: 32, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.5, lineHeight: 38, marginBottom: 10,
  },
  subtitle: {
    fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22,
  },

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

  forgotBtn: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 },
  forgotText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },

  actionBtn: { marginTop: 12 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
  dividerText: { fontSize: FontSize.sm, color: Colors.textMuted },

  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkText: { fontSize: FontSize.sm, fontWeight: '700' },
});
