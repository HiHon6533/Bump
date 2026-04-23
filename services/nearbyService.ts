// =========================================================
// services/nearbyService.ts
// Lấy danh sách người lạ ở gần (Radar) bằng GPS và Haversine
// =========================================================
import { supabase } from './supabaseConfig';
import { UserLocation } from './locationService';
import { getFriends } from './friendService';

export type NearbyUser = UserLocation & {
  distanceMeters: number;
};

// Tính khoảng cách giữa 2 tọa độ bằng công thức Haversine (đơn vị: mét)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Bán kính trái đất tính bằng mét
  const toRad = (value: number) => (value * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Lấy ID người dùng hiện tại
const getMyId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Chưa đăng nhập');
  return session.user.id;
};

/**
 * Tìm kiếm người lạ đang ở gần trong bán kính cho trước.
 * @param myLat Vĩ độ hiện tại
 * @param myLng Kinh độ hiện tại
 * @param radiusInMeters Bán kính tìm kiếm (mét)
 */
export const findNearbyStrangers = async (
  myLat: number,
  myLng: number,
  radiusInMeters: number = 20
): Promise<NearbyUser[]> => {
  const myId = await getMyId();

  // 1. Lấy danh sách bạn bè để lọc (không hiển thị bạn bè trên radar kết bạn)
  const friends = await getFriends();
  const friendIds = friends.map(f => f.id);

  // Tính sai số GPS tạo Bounding Box (1 độ ~ 111km)
  // Tính ra độ tương đương với bán kính (thêm chút padding an toàn)
  const latDelta = (radiusInMeters + 10) / 111000;
  const lngDelta = (radiusInMeters + 10) / (111000 * Math.cos((myLat * Math.PI) / 180));

  // Chỉ lấy những người online trong vòng 5 phút qua (tránh ghost user khi họ tắt app)
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 2. Fetch danh sách vị trí từ Supabase dùng Bounding Box (cho nhẹ)
  const { data: locations, error } = await supabase
    .from('user_locations')
    .select('user_id, latitude, longitude, is_sharing, updated_at')
    .eq('is_sharing', true)
    .neq('user_id', myId)
    .gte('updated_at', fiveMinsAgo)
    .gte('latitude', myLat - latDelta)
    .lte('latitude', myLat + latDelta)
    .gte('longitude', myLng - lngDelta)
    .lte('longitude', myLng + lngDelta);

  if (error) {
    console.error('[NearbyService] Lỗi khi lấy vị trí:', error.message);
    throw error;
  }

  if (!locations || locations.length === 0) return [];

  // 3. Lọc bằng Haversine chính xác & Lọc bạn bè
  const nearbyUsers: NearbyUser[] = [];
  const nearbyUserIds: string[] = [];

  for (const loc of locations) {
    // Bỏ qua nếu đã là bạn bè
    if (friendIds.includes(loc.user_id)) continue;

    const distance = getDistance(myLat, myLng, loc.latitude, loc.longitude);
    if (distance <= radiusInMeters) {
      nearbyUsers.push({ ...loc, distanceMeters: distance });
      nearbyUserIds.push(loc.user_id);
    }
  }

  if (nearbyUsers.length === 0) return [];

  // 4. Lấy thông tin Name, Avatar của những người lạ đó
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, avatar')
    .in('id', nearbyUserIds);

  if (userError) {
    console.error('[NearbyService] Lỗi khi lấy profile:', userError.message);
    throw userError;
  }

  // Map thông tin user vào danh sách trả về
  nearbyUsers.forEach(nu => {
    const u = users?.find(u => u.id === nu.user_id);
    if (u) {
      nu.user = { name: u.name, avatar: u.avatar };
    }
  });

  // Trả về danh sách được sắp xếp từ gần đến xa
  return nearbyUsers.sort((a, b) => a.distanceMeters - b.distanceMeters);
};
