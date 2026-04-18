// =========================================================
// services/chatService.ts
// Chat 1-1: conversations + messages với real-time
// =========================================================

import { supabase } from './supabaseConfig';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
};

export type Conversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  unread_count?: number;
  other_user?: {
    id: string;
    name: string;
    avatar: string;
    online_at?: string;
  };
};

const getMyId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Chưa đăng nhập');
  return session.user.id;
};

// ---- Tạo hoặc lấy conversation với 1 người ----
export const getOrCreateConversation = async (otherUserId: string): Promise<string> => {
  const myId = await getMyId();
  const [u1, u2] = myId < otherUserId ? [myId, otherUserId] : [otherUserId, myId];

  // Kiểm tra đã có conversation chưa
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .maybeSingle();

  if (existing) return existing.id;

  // Tạo mới
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user1_id: u1, user2_id: u2 })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

// ---- Danh sách tất cả conversations của user ----
export const getConversations = async (): Promise<Conversation[]> => {
  const myId = await getMyId();
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, last_message, last_message_at, created_at')
    .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const convs = data ?? [];
  if (convs.length === 0) return [];

  const otherUserIds = convs.map(c => c.user1_id === myId ? c.user2_id : c.user1_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, name, avatar, online_at')
    .in('id', otherUserIds);
  const userMap = new Map((users ?? []).map(u => [u.id, u]));

  // Count unread messages cho từng conversation
  const { data: unreadMsgs } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convs.map(c => c.id))
    .neq('sender_id', myId)
    .eq('is_read', false);

  const unreadCountMap: Record<string, number> = {};
  if (unreadMsgs) {
    unreadMsgs.forEach(msg => {
      unreadCountMap[msg.conversation_id] = (unreadCountMap[msg.conversation_id] || 0) + 1;
    });
  }

  return convs.map(c => {
    const otherId = c.user1_id === myId ? c.user2_id : c.user1_id;
    return { 
      ...c, 
      other_user: userMap.get(otherId),
      unread_count: unreadCountMap[c.id] || 0
    };
  });
};

// ---- Lấy tin nhắn của 1 conversation ----
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

// ---- Gửi tin nhắn ----
export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Message> => {
  const myId = await getMyId();
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: myId, content })
    .select()
    .single();
  if (error) throw error;

  // Cập nhật last_message trong conversation
  await supabase
    .from('conversations')
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
};

// ---- Subscribe tin nhắn mới (real-time) ----
export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: (msg: Message) => void
) => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new as Message)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// ---- Đánh dấu tất cả tin nhắn trong 1 cuộc trò chuyện thành đã đọc ----
export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  const myId = await getMyId();
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', myId)
    .eq('is_read', false);
  
  // Ignore PGRST error if is_read does not exist yet for backward compatibility
  if (error && error.code !== 'PGRST200') {
    console.error("markMessagesAsRead error:", error);
  }
};
