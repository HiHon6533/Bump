import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../styles/colors';
import { supabase } from '../services/supabaseConfig';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useRouter } from 'expo-router';

interface CallSignal {
  id: string;
  caller_id: string;
  receiver_id: string;
  caller_name: string;
  caller_avatar: string;
  call_id: string;
  is_video: boolean;
  created_at: string;
}

export default function IncomingCallModal() {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('[IncomingCallModal] ✅ Bắt đầu polling call_signals cho user:', currentUser.id);

    // Polling mỗi 2 giây — đơn giản, đáng tin cậy 100%
    const checkForCalls = async () => {
      try {
        if (incomingCall) {
          // Kiểm tra xem cuộc gọi còn đang "ringing" không (nếu người gọi huỷ thì nó sẽ biến mất hoặc status != ringing)
          const { data: checkData } = await supabase
            .from('call_signals')
            .select('status')
            .eq('id', incomingCall.id)
            .single();

          if (!checkData || checkData.status !== 'ringing') {
            console.log('[IncomingCallModal] Người gọi đã cúp máy!');
            Vibration.cancel();
            setIncomingCall(null);
          }
          return; // Đã có cuộc gọi rồi thì không cần query cái mới
        }

        const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
        
        const { data, error } = await supabase
          .from('call_signals')
          .select('*')
          .eq('receiver_id', currentUser.id)
          .gte('created_at', fifteenSecondsAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.log('[IncomingCallModal] Lỗi query:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const signal = data[0] as CallSignal;
          
          // Chỉ hiện chuông nếu status là ringing
          if ((signal as any).status === 'ringing') {
            console.log('[IncomingCallModal] 🔔 PHÁT HIỆN CUỘC GỌI ĐẾN từ:', signal.caller_name);
            
            setIncomingCall(signal);
            Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500, 200, 500]);
          }
        }
      } catch (e) {
        // Im lặng - tránh spam log
      }
    };

    // Chạy ngay lần đầu
    checkForCalls();
    // Sau đó poll mỗi 2 giây
    pollingRef.current = setInterval(checkForCalls, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [currentUser?.id]);

  const handleAccept = async () => {
    if (!incomingCall || !currentUser) return;
    
    // Tắt rung
    Vibration.cancel();
    
    // Đánh dấu là đã bắt máy trên DB (để máy gọi chuyển sang /call)
    await supabase.from('call_signals').update({ status: 'accepted' }).eq('id', incomingCall.id);
    
    // Chuyển hướng vào màn hình gọi
    router.push({
      pathname: '/call',
      params: {
        callID: incomingCall.call_id,
        userID: currentUser.id,
        userName: currentUser.name || 'User',
        isVideo: incomingCall.is_video ? 'true' : 'false',
      }
    });
    
    // Đóng popup
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    
    // Tắt rung
    Vibration.cancel();
    
    // Đánh dấu từ chối
    await supabase.from('call_signals').update({ status: 'declined' }).eq('id', incomingCall.id);
    
    // Đóng popup
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <Modal
      visible={!!incomingCall}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.blurBackground} />
        
        <View style={styles.contentContainer}>
          <Text style={styles.callLabel}>
            {incomingCall.is_video ? 'CUỘC GỌI VIDEO ĐẾN...' : 'CUỘC GỌI THOẠI ĐẾN...'}
          </Text>
          
          <View style={styles.avatarContainer}>
            {incomingCall.caller_avatar ? (
              <Image source={{ uri: incomingCall.caller_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {incomingCall.caller_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.callerName}>{incomingCall.caller_name}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <View style={styles.buttonWrapper}>
            <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={handleDecline}>
              <Feather name="phone-off" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Từ chối</Text>
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAccept}>
              <Feather name={incomingCall.is_video ? "video" : "phone"} size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Bắt máy</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'space-between',
    paddingTop: height * 0.15,
    paddingBottom: height * 0.1,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E1E1E',
    opacity: 0.95,
  },
  contentContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  callLabel: {
    color: '#aaa',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 40,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.white,
  },
  callerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  actionButton: {
    width: 75,
    height: 75,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  buttonLabel: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },
});
