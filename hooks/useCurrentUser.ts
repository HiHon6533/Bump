// =========================================================
// hooks/useCurrentUser.ts
// Hook lấy thông tin user hiện tại từ Supabase DB
// Cache và update realtime nếu cần
// =========================================================

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../services/supabaseConfig';
import { getMyUserId } from '../services/profileService';
import { logoutUser } from '../services/authService';
import { getSessionToken } from '../utils/storage';
import { UserProfile } from '../services/friendService';

export const useCurrentUser = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSessionToken = async (serverToken?: string) => {
    if (!serverToken) return;
    const localToken = await getSessionToken();
    if (localToken && serverToken !== localToken) {
      Alert.alert(
        'Đăng nhập ở nơi khác',
        'Tài khoản của bạn vừa được đăng nhập ở một thiết bị khác. Máy này sẽ tự động đăng xuất.',
        [{ 
          text: 'OK', 
          onPress: async () => {
            await logoutUser();
            router.replace('/login' as any);
          }
        }]
      );
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const myId = await getMyUserId();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', myId)
        .single();
      if (!error && data) {
        setCurrentUser(data as UserProfile);
        checkSessionToken(data.session_token);
      }
    } catch (err) {
      console.log('[useCurrentUser] Lỗi fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Lắng nghe thay đổi profile của chính mình
    let channel: any;
    getMyUserId().then(myId => {
      channel = supabase
        .channel(`public:users:id=eq.${myId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${myId}` },
          (payload) => {
            const newUser = payload.new as any;
            setCurrentUser(newUser);
            checkSessionToken(newUser.session_token);
          }
        )
        .subscribe();
    }).catch(() => {});

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { currentUser, loading, refetch: fetchUser };
};
