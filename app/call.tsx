// =========================================================
// app/call.tsx
// Màn hình cuộc gọi thoại và video 1-1 (ZegoCloud)
// =========================================================

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Lazy import ZegoCloud để tránh crash trên Expo Go
let ZegoUIKitPrebuiltCall: any = null;
let ONE_ON_ONE_VIDEO_CALL_CONFIG: any = null;
let ONE_ON_ONE_VOICE_CALL_CONFIG: any = null;
let ZEGO_APP_ID: number = 0;
let ZEGO_APP_SIGN: string = '';
let zegoAvailable = false;

try {
  const zegoUI = require('@zegocloud/zego-uikit-prebuilt-call-rn');
  ZegoUIKitPrebuiltCall = zegoUI.ZegoUIKitPrebuiltCall;
  ONE_ON_ONE_VIDEO_CALL_CONFIG = zegoUI.ONE_ON_ONE_VIDEO_CALL_CONFIG;
  ONE_ON_ONE_VOICE_CALL_CONFIG = zegoUI.ONE_ON_ONE_VOICE_CALL_CONFIG;
  const callCfg = require('../services/callConfig');
  ZEGO_APP_ID = callCfg.ZEGO_APP_ID;
  ZEGO_APP_SIGN = callCfg.ZEGO_APP_SIGN;
  zegoAvailable = true;
} catch (e) {
  console.log('[Call] ZegoCloud không khả dụng trên Expo Go');
}

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ callID: string; userID: string; userName: string; isVideo: string }>();
  
  const isReady = params.callID && params.userID && params.userName;
  const [init, setInit] = useState(false);

  useEffect(() => {
    if (isReady) {
      setTimeout(() => setInit(true), 200);
    }
  }, [isReady]);

  // Nếu ZegoCloud không khả dụng (Expo Go)
  if (!zegoAvailable) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="phone-off" size={48} color={Colors.textMuted} />
        <Text style={[styles.loadingText, { marginTop: 16 }]}>
          Tính năng gọi điện không khả dụng trên Expo Go
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          ...(isVideoCall ? ONE_ON_ONE_VIDEO_CALL_CONFIG : ONE_ON_ONE_VOICE_CALL_CONFIG),
          onCallEnd: (callID: string, reason: string, duration: number) => {
            console.log(`Call ended: id=${callID}, reason=${reason}, duration=${duration}s`);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          },
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
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
  }
});
