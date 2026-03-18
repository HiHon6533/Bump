// =========================================================
// app/forgot-password.tsx
// Màn hình quên mật khẩu: nhập email và nhận OTP.
// Sau khi gửi OTP, chuyển sang verify-otp với mode='forgot'.
// =========================================================

import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { sendOTP } from '../services/otpService';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================================================
  // Gửi OTP về email để reset mật khẩu
  // =========================================================
  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      // Gửi OTP 6 chữ số qua Supabase signInWithOtp
      await sendOTP(email.trim(), 'recovery');

      // Chuyển sang màn hình nhập OTP
      router.push({
        pathname: '/verify-otp' as any,
        params: {
          mode: 'forgot',
          email: email.trim(),
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Không thể gửi mã xác nhận',
        error.message || 'Vui lòng kiểm tra email và kết nối mạng.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-20 pb-10">

        {/* ---- Nút quay lại ---- */}
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-blue-500 text-base font-medium">← Quay lại</Text>
        </TouchableOpacity>

        {/* ---- Header ---- */}
        <View className="mb-10">
          <Text className="text-5xl mb-4">🔑</Text>
          <Text className="text-3xl font-bold text-gray-900">Quên</Text>
          <Text className="text-3xl font-bold text-orange-500 mt-1">mật khẩu?</Text>
          <Text className="text-gray-500 mt-3 text-base leading-6">
            Nhập email của bạn, chúng tôi sẽ gửi mã OTP 8 chữ số để xác minh.
          </Text>
        </View>

        {/* ---- Input Email ---- */}
        <View className="mb-8">
          <Text className="text-gray-700 font-semibold mb-2">Email</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
            placeholder="Nhập địa chỉ email đã đăng ký"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* ---- Nút gửi OTP ---- */}
        <TouchableOpacity
          onPress={handleSendOTP}
          disabled={loading}
          className="bg-orange-500 rounded-2xl py-4 items-center"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-bold">📨  Gửi mã OTP</Text>
          )}
        </TouchableOpacity>

        {/* ---- Link quay lại đăng nhập ---- */}
        <View className="flex-row justify-center items-center mt-8">
          <Text className="text-gray-500">Nhớ mật khẩu rồi? </Text>
          <TouchableOpacity onPress={() => router.replace('/login' as any)}>
            <Text className="text-blue-500 font-bold">Đăng nhập</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
