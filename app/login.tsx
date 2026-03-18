// =========================================================
// app/login.tsx
// Màn hình đăng nhập với Email và Password.
// Sử dụng Supabase Authentication qua authService.
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
import { loginUser } from '../services/authService';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =========================================================
  // Xử lý đăng nhập
  // =========================================================
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(email.trim(), password);
      // loginUser ném lỗi nếu thất bại, nếu thành công thì navigate
      if (user) {
        router.replace('/');
      }
    } catch (error: any) {
      // Supabase trả về message tiếng Anh, map sang thông báo thân thiện
      const msg: string = error?.message ?? '';
      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';

      if (
        msg.includes('Invalid login credentials') ||
        msg.includes('invalid_credentials')
      ) {
        message = 'Email hoặc mật khẩu không đúng.';
      } else if (msg.includes('Email not confirmed')) {
        message = 'Tài khoản chưa được xác minh. Vui lòng kiểm tra email.';
      } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
        message = 'Quá nhiều lần thử. Vui lòng thử lại sau.';
      } else if (msg.includes('User not found')) {
        message = 'Không tìm thấy tài khoản với email này.';
      } else if (msg) {
        message = msg;
      }

      Alert.alert('Đăng nhập thất bại', message);
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
        <View className="flex-1 px-6 pt-20 pb-10">

          {/* ---- Header ---- */}
          <View className="mb-10">
            <Text className="text-4xl font-bold text-gray-900">👋 Chào mừng</Text>
            <Text className="text-4xl font-bold text-blue-500 mt-1">trở lại!</Text>
            <Text className="text-gray-500 mt-3 text-base">
              Đăng nhập để tiếp tục chia sẻ vị trí cùng bạn bè.
            </Text>
          </View>

          {/* ---- Form đăng nhập ---- */}
          <View className="gap-4">

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
                  placeholder="Nhập mật khẩu"
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

            {/* Link Quên mật khẩu */}
            <TouchableOpacity
              onPress={() => router.push('/forgot-password' as any)}
              className="self-end"
            >
              <Text className="text-blue-500 font-medium">Quên mật khẩu?</Text>
            </TouchableOpacity>

          </View>

          {/* ---- Nút Đăng nhập ---- */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-blue-500 rounded-2xl py-4 items-center mt-8"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-bold">Đăng Nhập</Text>
            )}
          </TouchableOpacity>

          {/* ---- Link sang Đăng ký ---- */}
          <View className="flex-row justify-center items-center mt-6">
            <Text className="text-gray-500">Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/register' as any)}>
              <Text className="text-blue-500 font-bold">Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
