import { Stack } from 'expo-router';
import './globals.css';

export default function RootLayout() {
  return (
    <Stack>
      {/* Màn hình chính sau khi đăng nhập */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="chat/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'card', 
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="history/[userId]" 
        options={{ 
          headerShown: false,
          presentation: 'card', 
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="history/map-detail" 
        options={{ 
          headerShown: false,
          presentation: 'card', 
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="camera" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal', 
          animation: 'slide_from_bottom'
        }} 
      />
      {/* Màn hình chính (Home) */}
      <Stack.Screen name="index" options={{ title: 'Tibro', headerShown: false }} />

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

