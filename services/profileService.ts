// =========================================================
// services/profileService.ts
// Xem và cập nhật thông tin cá nhân + upload avatar
// =========================================================

import { supabase } from './supabaseConfig';
import { UserProfile } from './friendService';

const getMyId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Chưa đăng nhập');
  return session.user.id;
};

// ---- Lấy profile theo userId ----
export const getProfile = async (userId?: string): Promise<UserProfile | null> => {
  const id = userId ?? (await getMyId());
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, avatar, username, online_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ---- Cập nhật thông tin cá nhân ----
export const updateProfile = async (
  updates: Partial<{ name: string; username: string; avatar: string }>
): Promise<void> => {
  const myId = await getMyId();
  const { error } = await supabase
    .from('users')
    .update({ ...updates })
    .eq('id', myId);
  if (error) throw error;
};

// ---- Upload avatar lên Supabase Storage ----
export const uploadAvatar = async (uri: string): Promise<string> => {
  const myId = await getMyId();
  const ext = uri.split('.').pop() ?? 'jpg';
  const filePath = `${myId}/avatar.${ext}`;

  // Dùng FormData thay vì fetch Blob để tránh lỗi Network Request Failed trên React Native
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: `avatar.${ext}`,
    type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
  } as any);

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, formData, {
      upsert: true,
    });
  if (error) throw error;

  // Lấy public URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // cache-bust

  // Cập nhật vào DB
  await updateProfile({ avatar: publicUrl });
  return publicUrl;
};

// ---- Cập nhật trạng thái online ----
export const updateOnlineStatus = async (): Promise<void> => {
  const myId = await getMyId();
  await supabase
    .from('users')
    .update({ online_at: new Date().toISOString() })
    .eq('id', myId);
};

// ---- Lấy ID hiện tại ----
export const getMyUserId = getMyId;
