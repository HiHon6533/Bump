// =========================================================
// app/verify-otp.tsx
// Màn hình xác minh OTP — xử lý 2 luồng:
//   mode='register' → Verify OTP → signUp Supabase → Lưu Profile → Login
//   mode='forgot'   → Verify OTP → Đặt lại mật khẩu qua Firebase Function → Login
// =========================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyOTP, sendOTP } from '../services/otpService';
import {
  registerUser,
  saveUserProfile,
  resetPasswordOnBackend,
} from '../services/authService';
import { supabase } from '../services/supabaseConfig';

// Thời gian đếm ngược OTP: 5 phút = 300 giây
const OTP_COUNTDOWN_SECONDS = 300;

export default function VerifyOTPScreen() {
  const router = useRouter();

  const { mode, email, name, password } = useLocalSearchParams<{
    mode: 'register' | 'forgot';
    email: string;
    name?: string;
    password?: string;
  }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ---- State cho màn hình đặt lại mật khẩu (mode='forgot') ----
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // ---- Countdown ----
  const [countdown, setCountdown] = useState(OTP_COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
    return () => stopCountdown();
  }, []);

  const startCountdown = () => {
    setCountdown(OTP_COUNTDOWN_SECONDS);
    stopCountdown();
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
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

  // =========================================================
  // Gửi lại OTP
  // =========================================================
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await sendOTP(email, mode === 'register' ? 'signup' : 'recovery');
      startCountdown();
      Alert.alert('Thành công', 'Mã OTP mới đã được gửi đến email của bạn.');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setResending(false);
    }
  };

  // =========================================================
  // Xác minh OTP
  // =========================================================
  const handleVerifyOTP = async () => {
    if (loading) return;

    if (otp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số của mã OTP.');
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyOTP(email, otp, mode === 'register' ? 'signup' : 'recovery');

      if (!isValid) {
        Alert.alert('OTP không hợp lệ', 'Mã OTP sai hoặc đã hết hạn. Vui lòng thử lại.');
        return;
      }

      if (mode === 'register') {
        // Bước 1: Tạo tài khoản Supabase (email confirmation phải TẮT)
        const userId = await registerUser(email!, password!);

        // Bước 2: Lưu tên vào bảng users
        await saveUserProfile(userId, name!, email!);

        // Bước 3: Đăng xuất để user đăng nhập bằng email/password
        await supabase.auth.signOut();

        Alert.alert(
          'Thành công! 🎉',
          'Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.',
          [{ text: 'Đăng nhập', onPress: () => router.replace('/login' as any) }]
        );

      } else if (mode === 'forgot') {
        // OTP đúng → hiện form đặt mật khẩu mới
        stopCountdown();
        setOtpVerified(true);
      }

    } catch (err: any) {
      console.error('[VerifyOTP] Lỗi:', err);
      Alert.alert('Lỗi', err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Đặt lại mật khẩu (mode='forgot') qua Firebase Function
  // =========================================================
  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Lỗi', 'Xác nhận mật khẩu không khớp.');
      return;
    }

    setResettingPassword(true);
    try {
      // Gọi Firebase Function để Admin đổi password trực tiếp
      await resetPasswordOnBackend(email!, newPassword);

      Alert.alert(
        'Đổi mật khẩu thành công! 🎉',
        'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.',
        [{ text: 'Đăng Nhập', onPress: () => router.replace('/login' as any) }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi đổi mật khẩu', error.message || 'Hệ thống đang bận. Vui lòng thử lại.');
    } finally {
      setResettingPassword(false);
    }
  };

  // =========================================================
  // Render: Form đặt mật khẩu mới (mode='forgot' sau khi OTP xác minh)
  // =========================================================
  if (otpVerified && mode === 'forgot') {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          <View className="mb-10 mt-10">
            <Text className="text-5xl mb-4">🔐</Text>
            <Text className="text-3xl font-bold text-gray-900">Đặt lại</Text>
            <Text className="text-3xl font-bold text-orange-500 mt-1">mật khẩu</Text>
            <Text className="text-base text-gray-500 mt-3">
              OTP đã xác minh. Hãy tạo mật khẩu mới cho tài khoản của bạn.
            </Text>
          </View>

          <View className="gap-4 mb-8">
            <View>
              <Text className="text-gray-700 font-semibold mb-2">Mật khẩu mới</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <View>
              <Text className="text-gray-700 font-semibold mb-2">Xác nhận mật khẩu</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={resettingPassword}
            className="bg-orange-500 rounded-2xl py-4 items-center"
            style={{ opacity: resettingPassword ? 0.7 : 1 }}
          >
            {resettingPassword ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-bold">Lưu mật khẩu mới</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // =========================================================
  // Render: Form nhập OTP
  // =========================================================
  const accentColor = mode === 'register' ? 'text-green-500' : 'text-orange-500';
  const btnClass = mode === 'register' ? 'bg-green-500' : 'bg-orange-500';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-20 pb-10">

        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-blue-500 text-base font-medium">← Quay lại</Text>
        </TouchableOpacity>

        <View className="mb-10">
          <Text className="text-5xl mb-4">✉️</Text>
          <Text className="text-3xl font-bold text-gray-900">Xác minh</Text>
          <Text className={`text-3xl font-bold mt-1 ${accentColor}`}>mã OTP</Text>
          <Text className="text-gray-500 mt-3 text-base leading-6">
            Mã xác nhận 6 chữ số đã được gửi đến{'\n'}
            <Text className="text-gray-800 font-semibold">{email}</Text>
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-semibold mb-2">Mã OTP</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-4 text-gray-900 bg-gray-50 text-2xl tracking-widest text-center font-bold"
            placeholder="_ _ _ _ _ _"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
        </View>

        <View className="flex-row justify-center items-center mb-8">
          {countdown > 0 ? (
            <Text className="text-gray-500">
              Mã hết hạn sau{'  '}
              <Text className="text-red-500 font-bold">{formatCountdown()}</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResendOTP} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text className="text-blue-500 font-bold">🔄  Gửi lại OTP</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleVerifyOTP}
          disabled={loading || otp.length < 6}
          className={`${btnClass} rounded-2xl py-4 items-center`}
          style={{ opacity: loading || otp.length < 6 ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">✅  Xác Minh OTP</Text>
          )}
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}
