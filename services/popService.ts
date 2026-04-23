import { supabase } from './supabaseConfig';

export interface PopData {
  id: string;
  sender_id: string;
  receiver_id: string;
  emoji: string;
  count: number;
  created_at: string;
  is_seen: boolean;
}

// Kiểm tra response có phải là lỗi HTML không (bảng chưa tồn tại, Cloudflare error...)
const isHtmlError = (error: any): boolean => {
  if (!error) return false;
  const msg = error?.message || '';
  return typeof msg === 'string' && msg.trim().startsWith('<!DOCTYPE');
};

// Gửi pop
export const sendPops = async (receiverId: string, emoji: string, count: number) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const myId = session.user.id;

    const { error } = await supabase
      .from('map_pops')
      .insert({
        sender_id: myId,
        receiver_id: receiverId,
        emoji,
        count
      });

    if (error) {
      if (isHtmlError(error)) {
        console.warn('[Pops] Bảng map_pops chưa tồn tại. Chạy SQL trong Supabase để tạo bảng.');
        return;
      }
      console.error('Error sending pops:', error);
      return;
    }

    // Tạo notification cho người nhận
    const { createNotification } = await import('./notificationService');
    await createNotification(receiverId, 'emoji_pop', { emoji, count }).catch(() => {});
  } catch (e) {
    console.warn('[Pops] sendPops error (bảng có thể chưa tồn tại):', e);
  }
};

// Lấy danh sách pop chưa đọc
export const getUnseenPops = async (): Promise<PopData[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const myId = session.user.id;

    const { data, error } = await supabase
      .from('map_pops')
      .select('*')
      .eq('receiver_id', myId)
      .eq('is_seen', false);

    if (error) {
      const errMsg = error?.message || '';
      const errCode = error?.code || '';
      // Bảng chưa tồn tại / HTML error → bỏ qua
      if (isHtmlError(error) || errCode === '42P01' || errMsg.includes('relation') || errMsg.includes('does not exist')) {
        console.warn('[Pops] Bảng map_pops chưa tồn tại. Cần chạy SQL migration trong Supabase.');
        return [];
      }
      // Log chi tiết lỗi để debug
      console.warn('[Pops] getUnseenPops error:', errCode, errMsg, JSON.stringify(error));
      return [];
    }
    return data || [];
  } catch (e: any) {
    // Bỏ qua lỗi network / bảng chưa có
    const msg = e?.message || String(e);
    if (!msg || msg.includes('DOCTYPE') || msg.includes('fetch')) return [];
    console.warn('[Pops] getUnseenPops exception:', msg);
    return [];
  }
};

// Đánh dấu đã đọc
export const markPopsAsSeen = async (popIds: string[]) => {
  if (popIds.length === 0) return;
  try {
    const { error } = await supabase
      .from('map_pops')
      .update({ is_seen: true })
      .in('id', popIds);

    if (error) {
      if (isHtmlError(error) || error.code === '42P01') {
        console.warn('[Pops] Bảng map_pops chưa tồn tại.');
        return;
      }
      console.error('Error marking pops as seen:', error);
    }
  } catch (e) {
    console.warn('[Pops] markPopsAsSeen error:', e);
  }
};
