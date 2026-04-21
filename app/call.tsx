// =========================================================
// app/call.tsx
// Màn hình cuộc gọi thoại và video 1-1 (ZegoCloud)
// =========================================================

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG, ONE_ON_ONE_VOICE_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from '../services/callConfig';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ callID: string; userID: string; userName: string; isVideo: string }>();
  
  // Tránh render khi thiếu param (gây crash app)
  const isReady = params.callID && params.userID && params.userName;
  const [init, setInit] = useState(false);

  useEffect(() => {
    // Trì hoãn một chút để UI load mượt
    if (isReady) {
      setTimeout(() => setInit(true), 200);
    }
  }, [isReady]);

  if (!isReady || !init) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị kết nối...</Text>
      </View>
    );
  }

  const isVideoCall = params.isVideo === 'true';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ZegoUIKitPrebuiltCall
        appID={ZEGO_APP_ID}
        appSign={ZEGO_APP_SIGN}
        userID={params.userID}
        userName={params.userName}
        callID={params.callID}
        
        config={{
          // Chọn config phù hợp (voice hoặc video)
          ...(isVideoCall ? ONE_ON_ONE_VIDEO_CALL_CONFIG : ONE_ON_ONE_VOICE_CALL_CONFIG),
          onCallEnd: (callID: string, reason: string, duration: number) => {
            console.log(`Call ended: id=${callID}, reason=${reason}, duration=${duration}s`);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          },
          // Thêm các config giao diện (tùy chỉnh màu sắc nếu muốn)
          bottomMenuBarConfig: {
            maxCount: 5,
            buttons: [
              'toggleCameraButton',
              'toggleMicrophoneButton',
              'hangUpButton',
              'switchAudioOutputButton',
              'switchCameraButton',
            ],
          },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // ZegoCloud thường dùng nền đen
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
  }
});
