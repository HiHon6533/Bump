// =========================================================
// services/locationHistoryService.ts
// Lưu và truy vấn lịch sử di chuyển từ bảng location_history
// =========================================================

import { supabase } from './supabaseConfig';

export type LocationHistoryPoint = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type LocationSession = {
  id: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  points: LocationHistoryPoint[];
  placeName?: string;
  moments?: any[]; // optional array for attached moments
};

const getMyId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Chưa đăng nhập');
  return session.user.id;
};

// ---- Lưu 1 điểm vị trí vào lịch sử ----
export const saveLocationHistory = async (
  latitude: number,
  longitude: number
): Promise<void> => {
  const myId = await getMyId();
  const { error } = await supabase
    .from('location_history')
    .insert({ user_id: myId, latitude, longitude });
  if (error) throw error;
};

// ---- Lấy lịch sử vị trí (mặc định 24h gần nhất) ----
export const getLocationHistory = async (
  hours: number = 24
): Promise<LocationHistoryPoint[]> => {
  try {
    const myId = await getMyId();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('location_history')
      .select('id, user_id, latitude, longitude, created_at')
      .eq('user_id', myId)
      .gte('created_at', since)
      .neq('latitude', 89.9999) // Bỏ qua tọa độ ảo lưu setting
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.log('getLocationHistory error:', e);
    return [];
  }
};

// ---- Cập nhật quyền riêng tư Lưu Lịch Sử ----
// Sử dụng tọa độ ảo (lat = 89.9999) để đánh dấu trạng thái mà không cần đổi schema DB
export const saveLocationHistoryPrivacy = async (enabled: boolean): Promise<void> => {
  const myId = await getMyId();
  await supabase
    .from('location_history')
    .insert({
      user_id: myId,
      latitude: 89.9999,
      longitude: enabled ? 179.9999 : -179.9999,
    });
};

// ---- Xóa toàn bộ lịch sử ----
export const clearLocationHistory = async (): Promise<void> => {
  const myId = await getMyId();
  const { error } = await supabase
    .from('location_history')
    .delete()
    .eq('user_id', myId);
  if (error) throw error;
};

// ---- Lấy lịch sử vị trí của BẠN BÈ theo ngày ----
export const getFriendLocationHistory = async (
  friendId: string,
  dateStr: string // format: YYYY-MM-DD
): Promise<LocationHistoryPoint[]> => {
  // 1. Kiểm tra setting privacy của bạn bè (tọa độ ảo)
  const { data: pref } = await supabase
    .from('location_history')
    .select('longitude')
    .eq('user_id', friendId)
    .eq('latitude', 89.9999)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isHistoryEnabled = pref ? pref.longitude > 0 : true; // Mặc định là bật
  if (!isHistoryEnabled) {
    return []; // Trả về rỗng nếu bạn bè đang tắt Lưu lịch sử
  }

  // 2. Nếu đang bật, get data bình thường
  const startOfDay = new Date(dateStr + 'T00:00:00');
  const endOfDay = new Date(dateStr + 'T23:59:59');

  const { data, error } = await supabase
    .from('location_history')
    .select('id, user_id, latitude, longitude, created_at')
    .eq('user_id', friendId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .neq('latitude', 89.9999)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

// ---- Gom các điểm gần nhau thành session ----
// Nếu 2 điểm liên tiếp cách nhau < 200m VÀ < 15 phút → cùng session
export const groupLocationSessions = (
  points: LocationHistoryPoint[]
): LocationSession[] => {
  if (points.length === 0) return [];

  const sessions: LocationSession[] = [];
  let currentSession: LocationHistoryPoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distM = haversineMeters(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const timeDiffMs = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    const timeDiffMin = timeDiffMs / (1000 * 60);

    if (distM < 200 && timeDiffMin < 15) {
      // Cùng session
      currentSession.push(curr);
    } else {
      // Kết thúc session cũ, bắt đầu session mới
      sessions.push(buildSession(currentSession));
      currentSession = [curr];
    }
  }

  // push session cuối cùng
  sessions.push(buildSession(currentSession));
  return sessions;
};

// ---- Helper: Haversine tính khoảng cách (mét) ----
const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // mét
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---- Helper: build 1 session từ mảng điểm ----
const buildSession = (points: LocationHistoryPoint[]): LocationSession => {
  const first = points[0];
  const last = points[points.length - 1];
  const durationMs = new Date(last.created_at).getTime() - new Date(first.created_at).getTime();

  // Tọa độ trung bình
  const avgLat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const avgLng = points.reduce((s, p) => s + p.longitude, 0) / points.length;

  return {
    id: first.id,
    latitude: avgLat,
    longitude: avgLng,
    startTime: first.created_at,
    endTime: last.created_at,
    durationMinutes: Math.max(1, Math.round(durationMs / (1000 * 60))),
    points,
  };
};
