// =========================================================
// app/_layout.tsx
// Root layout của ứng dụng - đăng ký tất cả các màn hình.
// Ẩn header cho các màn hình auth để có trải nghiệm tốt hơn.
// =========================================================

import { Stack } from 'expo-router';
import './globals.css';

export default function RootLayout() {
  return (
    <Stack>
      {/* Màn hình chính (Home) */}
      <Stack.Screen name="index" options={{ title: 'Bump', headerShown: false }} />

      {/* Màn hình giới thiệu - ẩn header */}
      <Stack.Screen name="intro" options={{ headerShown: false }} />

      {/* Màn hình xác thực - ẩn header */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
    </Stack>
  );
}
