// =========================================================
// app/chat/[id].tsx
// Màn hình chi tiết cuộc trò chuyện (Real-time Messaging)
// =========================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../styles/colors';
import { getMessages, sendMessage, subscribeToMessages, markMessagesAsRead, Message } from '../../services/chatService';
import { supabase } from '../../services/supabaseConfig';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import ChatBubble from '../../components/ChatBubble';
import { Image } from 'react-native';

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name: string; avatar: string }>();
  const { currentUser } = useCurrentUser();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    
    // 1. Fetch tin nhắn cũ & mark read
    getMessages(id).then(data => {
      setMessages(data);
      scrollToBottom();
      // Đánh dấu đã đọc khi mở chat
      markMessagesAsRead(id).catch(e => console.log('Mark read error:', e));
    }).catch(console.error);

    // 2. Lắng nghe tin nhắn mới realtime
    const unsubscribe = subscribeToMessages(id, (newMsg) => {
      setMessages(prev => {
        // Tránh duplicate nếu mình vừa gửi xong (Supabase cũng bắn lại event)
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 50);

      // Nếu người kia vừa gửi tới lúc mình đang mở, mark read luôn
      if (newMsg.sender_id !== currentUser?.id) {
        markMessagesAsRead(id).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !id) return;
    const textToSend = inputText.trim();
    setInputText(''); // Clear input ngay lập tức cho mượt
    
    try {
      const sentMsg = await sendMessage(id, textToSend);
      // Tự cập nhật local list để thấy ngay
      setMessages(prev => {
        if (prev.find(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setTimeout(scrollToBottom, 50);
    } catch (e) {
      console.log('Error send message:', e);
    }
  };

  const handleStartCall = async (isVideo: boolean) => {
    if (!currentUser || !id) return;
    
    // Tìm receiverId và thông tin receiver thông qua bảng conversations
    // (Bảng conversations hiện không có avatar/name trực tiếp, nên ta có thể lấy từ db
    // hoặc dùng params từ route)
    const { data: conv } = await supabase.from('conversations').select('user1_id, user2_id').eq('id', id).single();
    if (conv) {
      const receiverId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
      
      // INSERT vào bảng call_signals → postgres_changes sẽ tự bắn tín hiệu tới người nhận
      const { data: signal, error } = await supabase.from('call_signals').insert({
        caller_id: currentUser.id,
        receiver_id: receiverId,
        caller_name: currentUser.name || 'User',
        caller_avatar: currentUser.avatar || '',
        call_id: id,
        is_video: isVideo,
        status: 'ringing'
      }).select('id').single();
      
      if (error) {
        console.log('[Call] Lỗi gửi tín hiệu gọi:', error.message);
        return; // Dừng nếu lỗi
      } else {
        console.log('[Call] ✅ Đã gửi tín hiệu gọi tới:', receiverId);
        
        // Chuyển người gọi vào phòng chờ (CallingScreen)
        router.push({
          pathname: '/calling',
          params: { 
            callID: id, 
            userID: currentUser.id, 
            userName: currentUser.name || 'User',
            receiverName: name || 'Người dùng', // Lấy từ route params của chat screen
            receiverAvatar: avatar || '',     // Lấy từ route params của chat screen
            signalId: signal.id,
            isVideo: isVideo ? 'true' : 'false' 
          }
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarText}>
                  {name ? name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <Text style={styles.headerName}>{name}</Text>
          </View>
          
          {/* Nút gọi điện / video */}
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => handleStartCall(false)} style={styles.actionBtn}>
              <Feather name="phone" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleStartCall(true)} style={styles.actionBtn}>
              <Feather name="video" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* List tin nhắn */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          renderItem={({ item, index }) => {
            const isMine = currentUser?.id === item.sender_id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            let showTimeAbove = false;
            
            if (!prevMsg) {
              showTimeAbove = true;
            } else {
              const diffMs = new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime();
              if (diffMs > 10 * 60 * 1000) {
                showTimeAbove = true; // Lớn hơn 10 phút
              }
            }

            return (
              <ChatBubble 
                message={item} 
                isMine={isMine} 
                showTimeAbove={showTimeAbove}
              />
            );
          }}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.black },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.black,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarPlaceholder: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
  headerName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 8, marginLeft: 8 },
  
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.black,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  }
});
