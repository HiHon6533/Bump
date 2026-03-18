// =========================================================
// app/register.tsx
// Màn hình đăng ký tài khoản mới.
// Luồng: Nhập thông tin → Gửi OTP (signInWithOtp) → Verify OTP → Set Password
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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendOTP } from '../services/otpService';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // =========================================================
  // Gửi OTP đến email và chuyển sang màn hình xác minh
  // =========================================================
  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      // Gửi OTP 8 chữ số qua Supabase signInWithOtp
      await sendOTP(email.trim(), 'signup');

      // Chuyển sang màn verify-otp, truyền kèm password để set sau khi verify
      router.push({
        pathname: '/verify-otp',
        params: {
          mode: 'register',
          email: email.trim(),
          name: name.trim(),
          password,
        },
      });
    } catch (error: any) {
      Alert.alert('Lỗi gửi mã OTP', error.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-16 pb-10">

          {/* ---- Header ---- */}
          <View className="mb-8">
            <Text className="text-4xl font-bold text-gray-900">Tạo</Text>
            <Text className="text-4xl font-bold text-green-500 mt-1">tài khoản</Text>
            <Text className="text-gray-500 mt-3 text-base">
              Gia nhập cộng đồng Bump và bắt đầu chia sẻ vị trí!
            </Text>
          </View>

          {/* ---- Form đăng ký ---- */}
          <View className="gap-4">

            {/* Input Họ tên */}
            <View>
              <Text className="text-gray-700 font-semibold mb-2">Họ và tên</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Nhập họ và tên của bạn"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Input Email */}
            <View>
              <Text className="text-gray-700 font-semibold mb-2">Email</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 text-base"
                placeholder="Nhập địa chỉ email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Input Password */}
            <View>
              <Text className="text-gray-700 font-semibold mb-2">Mật khẩu</Text>
              <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                <TextInput
                  className="flex-1 px-4 py-3.5 text-gray-900 text-base"
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="px-4"
                >
                  <Text className="text-gray-500 text-base">
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Input Xác nhận Password */}
            <View>
              <Text className="text-gray-700 font-semibold mb-2">Xác nhận mật khẩu</Text>
              <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                <TextInput
                  className="flex-1 px-4 py-3.5 text-gray-900 text-base"
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  className="px-4"
                >
                  <Text className="text-gray-500 text-base">
                    {showConfirm ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>

          {/* ---- Nút Gửi OTP ---- */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="bg-green-500 rounded-2xl py-4 items-center mt-8"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-bold">📨  Gửi mã xác nhận</Text>
            )}
          </TouchableOpacity>

          {/* ---- Link sang Đăng nhập ---- */}
          <View className="flex-row justify-center items-center mt-6">
            <Text className="text-gray-500">Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-blue-500 font-bold">Đăng nhập</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
