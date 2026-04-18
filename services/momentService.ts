// =========================================================
// services/momentService.ts
// Xử lý upload ảnh Moment và các logic liên quan
// =========================================================

import { supabase } from './supabaseConfig';
import * as ImageManipulator from 'expo-image-manipulator';

export type MomentData = {
  id: string;
  user_id: string;
  image_url: string;
  latitude: number;
  longitude: number;
  caption?: string;
  created_at: string;
  user?: {
    id?: string;
    name: string;
    avatar: string;
  };
};

// ---- Lấy ID người dùng hiện tại ----
const getMyId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Chưa đăng nhập');
  return session.user.id;
};

// ---- Nén ảnh trước khi upload ----
const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }], // Resize width, keep aspect ratio
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
};

// ---- Đăng Moment mới ----
export const postMoment = async (
  imageUri: string,
  latitude: number,
  longitude: number,
  caption?: string
): Promise<MomentData> => {
  const myId = await getMyId();
  
  // 1. Nén ảnh
  const compressedUri = await compressImage(imageUri);

  // 2. Chuẩn bị FormData để tránh lỗi mạng trên React Native
  const timestamp = Date.now();
  const filePath = `${myId}/moment_${timestamp}.jpg`;
  const formData = new FormData();
  formData.append('file', {
    uri: compressedUri,
    name: `moment_${timestamp}.jpg`,
    type: 'image/jpeg',
  } as any);

  // 3. Upload ảnh lên bucket 'moments'
  const { error: uploadError } = await supabase.storage
    .from('moments')
    .upload(filePath, formData, { upsert: false });
    
  if (uploadError) throw new Error(`Lỗi tải ảnh lên: ${uploadError.message}`);

  // Lấy Public URL
  const { data: urlData } = supabase.storage.from('moments').getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  // 4. Lưu vào bảng moments
  const { data, error: dbError } = await supabase
    .from('moments')
    .insert({
      user_id: myId,
      image_url: publicUrl,
      latitude,
      longitude,
      caption: caption || null,
    })
    .select()
    .single();

  if (dbError) throw new Error(`Lỗi lưu dữ liệu: ${dbError.message}`);

  return data;
};

// ---- Lấy danh sách Moment hiển thị trên Map (24h qua) ----
export const getMapMoments = async (friendIds: string[]): Promise<MomentData[]> => {
  const myId = await getMyId();
  const targetIds = [...friendIds, myId];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .in('user_id', targetIds)
    .gte('created_at', since);

  if (error) throw error;

  const moments = data ?? [];
  if (moments.length === 0) return [];

  // Lấy thông tin user (thủ công thay vì join để tránh lỗi schema config)
  const uids = [...new Set(moments.map(m => m.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, name, avatar')
    .in('id', uids);
    
  const userMap = new Map((users ?? []).map(u => [u.id, u]));

  return moments.map(row => {
    const u = userMap.get(row.user_id);
    return {
      ...row,
      user: u ? { id: u.id, name: u.name, avatar: u.avatar } : undefined,
    };
  });
};

// ---- Lấy Moments của một người theo ngày (cho Timeline) ----
export const getMomentsByDate = async (
  userId: string,
  dateStr: string // format: YYYY-MM-DD
): Promise<MomentData[]> => {
  const startOfDay = new Date(dateStr + 'T00:00:00');
  const endOfDay = new Date(dateStr + 'T23:59:59');

  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
};
