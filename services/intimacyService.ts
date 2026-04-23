// =========================================================
// services/intimacyService.ts
// Quản lý Chỉ số Thân mật (Intimacy Score) giữa 2 người dùng
// - Tính điểm khi: Chat, Reaction, Gặp mặt (Bump)
// - Hệ thống cấp độ: 🌱 Người quen → 🌿 Bạn bè → 🔥 Bạn thân → 👑 Tri kỷ
// =========================================================
import { supabase } from './supabaseConfig';
import { createNotification } from './notificationService';

// ---- Định nghĩa các cấp độ tình bạn ----
export type IntimacyLevel = {
  level: number;
  emoji: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  glowColor: string;
};

export const INTIMACY_LEVELS: IntimacyLevel[] = [
  { level: 1, emoji: '🌱', label: 'Người quen',  minScore: 0,    maxScore: 100,  color: '#6B7A99', glowColor: 'rgba(107,122,153,0.3)' },
  { level: 2, emoji: '🌿', label: 'Bạn bè',      minScore: 101,  maxScore: 500,  color: '#34D399', glowColor: 'rgba(52,211,153,0.3)'  },
  { level: 3, emoji: '🔥', label: 'Bạn thân',    minScore: 501,  maxScore: 2000, color: '#FB923C', glowColor: 'rgba(251,146,60,0.3)'  },
  { level: 4, emoji: '👑', label: 'Tri kỷ',      minScore: 2001, maxScore: Infinity, color: '#FBBF24', glowColor: 'rgba(251,191,36,0.3)' },
];

// ---- Kiểu dữ liệu intimacy record ----
export type IntimacyRecord = {
  id?: string;
  user_id_1: string;      // luôn là user có ID nhỏ hơn (để tránh duplicate)
  user_id_2: string;
  score: number;
  last_bumped_at?: string;
  updated_at?: string;
};

// ---- Helpers ----
const getMyId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Chưa đăng nhập');
  return session.user.id;
};

/** Sắp xếp 2 user ID để tránh duplicate (A,B) và (B,A) */
const sortIds = (id1: string, id2: string): [string, string] =>
  id1 < id2 ? [id1, id2] : [id2, id1];

// ---- Lấy thông tin thân mật với 1 người bạn ----
export const getIntimacy = async (friendId: string): Promise<IntimacyRecord | null> => {
  const myId = await getMyId();
  const [uid1, uid2] = sortIds(myId, friendId);

  const { data, error } = await supabase
    .from('friendship_intimacy')
    .select('*')
    .eq('user_id_1', uid1)
    .eq('user_id_2', uid2)
    .maybeSingle();

  if (error) console.error('[intimacy] getIntimacy error:', error);
  return data ?? null;
};

// ---- Lấy tất cả điểm thân mật của người dùng hiện tại ----
export const getAllIntimacies = async (): Promise<Map<string, number>> => {
  const myId = await getMyId();

  const { data, error } = await supabase
    .from('friendship_intimacy')
    .select('user_id_1, user_id_2, score')
    .or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`);

  if (error) {
    console.error('[intimacy] getAllIntimacies error:', error);
    return new Map();
  }

  const result = new Map<string, number>();
  (data ?? []).forEach(row => {
    const friendId = row.user_id_1 === myId ? row.user_id_2 : row.user_id_1;
    result.set(friendId, row.score ?? 0);
  });
  return result;
};

// ---- Thêm điểm thân mật (upsert) ----
export const addIntimacyScore = async (
  friendId: string,
  points: number,
): Promise<number> => {
  const myId = await getMyId();
  const [uid1, uid2] = sortIds(myId, friendId);

  // Lấy điểm hiện tại
  const current = await getIntimacy(friendId);
  const currentScore = current?.score ?? 0;
  const newScore = currentScore + points;

  const { data, error } = await supabase
    .from('friendship_intimacy')
    .upsert(
      {
        user_id_1: uid1,
        user_id_2: uid2,
        score: newScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id_1,user_id_2' }
    )
    .select('score')
    .single();

  if (error) {
    console.error('[intimacy] addIntimacyScore error:', error);
    return currentScore;
  }
  return data?.score ?? newScore;
};

// ---- Cộng điểm khi gửi tin nhắn (giới hạn 20đ/ngày) ----
export const addChatScore = async (friendId: string): Promise<void> => {
  try {
    await addIntimacyScore(friendId, 1);
  } catch (e) {
    console.log('[intimacy] addChatScore error:', e);
  }
};

// ---- Cộng điểm khi react Moment (giới hạn 5 lần/ngày) ----
export const addReactionScore = async (friendId: string): Promise<void> => {
  try {
    await addIntimacyScore(friendId, 5);
  } catch (e) {
    console.log('[intimacy] addReactionScore error:', e);
  }
};

// ---- Thực hiện "Bump!" (cộng 50 điểm, giới hạn 1 lần/ngày) ----
export const performBump = async (friendId: string): Promise<{ success: boolean; newScore: number }> => {
  const myId = await getMyId();
  const [uid1, uid2] = sortIds(myId, friendId);

  // Kiểm tra đã bump hôm nay chưa
  const current = await getIntimacy(friendId);
  if (current?.last_bumped_at) {
    const lastBump = new Date(current.last_bumped_at);
    const now = new Date();
    const sameDay =
      lastBump.getDate() === now.getDate() &&
      lastBump.getMonth() === now.getMonth() &&
      lastBump.getFullYear() === now.getFullYear();
    if (sameDay) {
      return { success: false, newScore: current.score };
    }
  }

  const currentScore = current?.score ?? 0;
  const newScore = currentScore + 50;

  const { data, error } = await supabase
    .from('friendship_intimacy')
    .upsert(
      {
        user_id_1: uid1,
        user_id_2: uid2,
        score: newScore,
        last_bumped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id_1,user_id_2' }
    )
    .select('score')
    .single();

  if (error) {
    console.error('[intimacy] performBump error:', error);
    return { success: false, newScore: currentScore };
  }

  // Gửi thông báo Bump cho người kia
  createNotification(friendId, 'intimacy_bump', {
    points: 50,
    newScore: data?.score ?? newScore,
  }).catch(() => {});

  return { success: true, newScore: data?.score ?? newScore };
};

// ---- Lấy cấp độ tình bạn dựa trên điểm ----
export const getIntimacyLevel = (score: number): IntimacyLevel => {
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    if (score >= INTIMACY_LEVELS[i].minScore) {
      return INTIMACY_LEVELS[i];
    }
  }
  return INTIMACY_LEVELS[0];
};

// ---- Tính % tiến trình đến cấp độ tiếp theo ----
export const getProgressToNextLevel = (score: number): { percent: number; nextLevel: IntimacyLevel | null; pointsLeft: number } => {
  const currentLevel = getIntimacyLevel(score);
  const nextLevel = INTIMACY_LEVELS.find(l => l.level === currentLevel.level + 1) ?? null;

  if (!nextLevel) return { percent: 100, nextLevel: null, pointsLeft: 0 };

  const range = nextLevel.minScore - currentLevel.minScore;
  const progress = score - currentLevel.minScore;
  const percent = Math.min(100, Math.round((progress / range) * 100));
  const pointsLeft = nextLevel.minScore - score;

  return { percent, nextLevel, pointsLeft };
};
