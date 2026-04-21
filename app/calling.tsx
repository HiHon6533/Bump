// =========================================================
// app/calling.tsx
// Màn hình chờ người nhận bắt máy (Outgoing Call Screen)
// Polling call_signals để phát hiện khi nào người kia chấp nhận
// =========================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../styles/colors';
import { supabase } from '../services/supabaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { sendMessage } from '../services/chatService';

export default function CallingScreen() {
  const router = useRouter();
  const { callID, userID, userName, receiverName, receiverAvatar, signalId, isVideo } = 
    useLocalSearchParams<{
      callID: string;
      userID: string;
      userName: string;
      receiverName: string;
      receiverAvatar: string;
      signalId: string;
      isVideo: string;
    }>();

  const [status, setStatus] = useState<'ringing' | 'accepted' | 'declined'>('ringing');
  const [elapsed, setElapsed] = useState(0);
  const pollingRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Đếm giây chờ
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Poll trạng thái call_signal mỗi 1.5 giây
  useEffect(() => {
    if (!signalId) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('call_signals')
          .select('status')
          .eq('id', signalId)
          .single();

        if (error || !data) {
          // Signal bị xóa (người nhận từ chối hoặc hết hạn)
          console.log('[Calling] Signal không tìm thấy, quay lại');
          setStatus('declined');
          return;
        }

        if (data.status === 'accepted') {
          console.log('[Calling] ✅ Người nhận đã bắt máy!');
          setStatus('accepted');
        } else if (data.status === 'declined') {
          console.log('[Calling] ❌ Người nhận từ chối');
          setStatus('declined');
        }
      } catch (e) {
        // Im lặng
      }
    };

    pollingRef.current = setInterval(checkStatus, 1500);
    return () => clearInterval(pollingRef.current);
  }, [signalId]);

  useEffect(() => {
    if (status === 'accepted') {
      // Dọn dẹp
      clearInterval(pollingRef.current);
      clearInterval(timerRef.current);
      
      // Xóa signal (dọn rác)
      if (signalId) {
        supabase.from('call_signals').delete().eq('id', signalId).then(() => {});
      }

      // Chuyển vào phòng gọi ZegoCloud
      router.replace({
        pathname: '/call',
        params: {
          callID: callID,
          userID: userID,
          userName: userName,
          isVideo: isVideo,
        }
      });
    } else if (status === 'declined') {
      handleEndCall('receiver_declined');
    }
  }, [status]);

  // Tự động timeout sau 45 giây
  useEffect(() => {
    if (elapsed >= 45 && status === 'ringing') {
      handleEndCall('timeout');
    }
  }, [elapsed]);

  const handleEndCall = async (reason: 'caller_canceled' | 'receiver_declined' | 'timeout') => {
    clearInterval(pollingRef.current);
    clearInterval(timerRef.current);
    
    // Xóa signal
    if (signalId) {
      await supabase.from('call_signals').delete().eq('id', signalId);
    }
    
    // Gửi tin nhắn vào chat
    try {
      let msgContent = `📞 Cuộc gọi ${isVideo === 'true' ? 'video' : 'thoại'} nhỡ`;
      if (reason === 'receiver_declined') {
        msgContent = `📞 Cuộc gọi ${isVideo === 'true' ? 'video' : 'thoại'} bị từ chối`;
      }
      await sendMessage(callID, msgContent);
    } catch(e) {
      console.log('Error sending missed call message:', e);
    }

    router.back();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.statusText}>
          {isVideo === 'true' ? 'Đang gọi video...' : 'Đang gọi...'}
        </Text>

        <View style={styles.avatarContainer}>
          {receiverAvatar ? (
            <Image source={{ uri: receiverAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(receiverName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.receiverName}>{receiverName || 'Đang gọi'}</Text>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>

        {/* Hiệu ứng animation chấm chấm */}
        <Text style={styles.waitingDots}>Đang chờ bắt máy...</Text>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => handleEndCall('caller_canceled')}>
          <Feather name="phone-off" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.cancelLabel}>Huỷ</Text>
      </View>
    </SafeAreaView>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  statusText: {
    color: '#aaa',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 40,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  avatar: {
    width: 142,
    height: 142,
    borderRadius: 71,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
  },
  receiverName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  waitingDots: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  bottomContainer: {
    alignItems: 'center',
    paddingBottom: height * 0.08,
  },
  cancelButton: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  cancelLabel: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },
});
