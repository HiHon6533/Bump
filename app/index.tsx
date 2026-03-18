// =========================================================
// app/index.tsx
// Entry point của ứng dụng.
// Kiểm tra trạng thái intro và đăng nhập,
// sau đó điều hướng đến màn hình phù hợp.
// =========================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { isIntroShown } from '../utils/storage';
import { getUserSession, clearUserSession } from '../utils/storage';
import { logoutUser } from '../services/authService';

export default function HomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    checkAppState();
  }, []);

  // =========================================================
  // Kiểm tra trạng thái app khi khởi động
  // =========================================================
  const checkAppState = async () => {
    try {
      // Kiểm tra đã xem intro chưa
      const introShown = await isIntroShown();
      if (!introShown) {
        // Chưa xem intro → chuyển đến màn hình giới thiệu
        router.replace('/intro' as any);
        return;
      }

      // Kiểm tra đã đăng nhập chưa
      const session = await getUserSession();
      if (!session) {
        // Chưa đăng nhập → chuyển đến màn hình login
        router.replace('/login' as any);
        return;
      }

      // Đã đăng nhập → hiển thị Home
      setUserName(session);
    } catch (error) {
      // Nếu có lỗi, chuyển về login
      router.replace('/login' as any);
    } finally {
      setChecking(false);
    }
  };

  // =========================================================
  // Xử lý đăng xuất
  // =========================================================
  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login' as any);
  };

  // Hiển thị loading trong khi kiểm tra
  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-4">Đang khởi động...</Text>
      </View>
    );
  }

  // =========================================================
  // Màn hình Home (placeholder) - thay bằng UI thật sau
  // =========================================================
  return (
    <View className="flex-1 items-center justify-center bg-blue-50 px-8">
      {/* Logo / Icon */}
      <Text style={{ fontSize: 80 }}>📍</Text>

      {/* Tiêu đề */}
      <Text className="text-4xl font-bold text-blue-600 mt-4">Bump</Text>
      <Text className="text-gray-500 text-base mt-2 text-center">
        Chia sẻ vị trí với những người xung quanh
      </Text>

      {/* Thông tin đăng nhập */}
      <View className="bg-white rounded-2xl p-6 mt-8 w-full shadow-sm">
        <Text className="text-gray-600 text-center">✅ Đã đăng nhập thành công!</Text>
        <Text className="text-gray-400 text-sm text-center mt-1" numberOfLines={1}>
          UID: {userName}
        </Text>
      </View>

      {/* Nút Đăng xuất */}
      <TouchableOpacity
        onPress={handleLogout}
        className="mt-8 bg-red-500 rounded-2xl py-3 px-10"
      >
        <Text className="text-white font-bold text-base">🚪  Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}