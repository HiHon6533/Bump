// =========================================================
// utils/storage.ts
// Lưu trữ dữ liệu hoàn toàn bằng Pure JavaScript.
// KHÔNG sử dụng native module (AsyncStorage, SecureStore...).
// → Hoạt động ngay trong Expo Go và mọi dev build.
//
// Cách hoạt động:
//   - Dữ liệu lưu trong biến module-level (Map)
//   - Tồn tại trong suốt phiên chạy app (mất khi tắt app)
//   - Phù hợp cho development; thay bằng native storage khi production
// =========================================================

// Kho lưu trữ in-memory (pure JS, không cần native)
const memoryStore = new Map<string, string>();

// ---- Key constants ----
const INTRO_SHOWN_KEY = 'bump_intro_shown';
const USER_SESSION_KEY = 'bump_user_session';

// =========================================================
// Các hàm tiện ích cơ bản
// =========================================================

/** Lưu một giá trị string */
export const setItem = async (key: string, value: string): Promise<void> => {
  memoryStore.set(key, value);
};

/** Đọc một giá trị string */
export const getItem = async (key: string): Promise<string | null> => {
  return memoryStore.get(key) ?? null;
};

/** Xoá một giá trị */
export const removeItem = async (key: string): Promise<void> => {
  memoryStore.delete(key);
};

// =========================================================
// Quản lý trạng thái đã xem Intro
// =========================================================

/** Đánh dấu người dùng đã xem màn hình Intro */
export const setIntroShown = async (): Promise<void> => {
  await setItem(INTRO_SHOWN_KEY, 'true');
};

/** Kiểm tra người dùng đã xem Intro chưa */
export const isIntroShown = async (): Promise<boolean> => {
  const value = await getItem(INTRO_SHOWN_KEY);
  return value === 'true';
};

// =========================================================
// Quản lý Session đăng nhập
// =========================================================

/** Lưu UID người dùng sau khi đăng nhập thành công */
export const saveUserSession = async (uid: string): Promise<void> => {
  await setItem(USER_SESSION_KEY, uid);
};

/** Lấy UID người dùng từ session đã lưu */
export const getUserSession = async (): Promise<string | null> => {
  return await getItem(USER_SESSION_KEY);
};

/** Xoá session khi người dùng đăng xuất */
export const clearUserSession = async (): Promise<void> => {
  await removeItem(USER_SESSION_KEY);
};
