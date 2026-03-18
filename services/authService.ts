// =========================================================
// services/authService.ts
// Xử lý xác thực người dùng qua Supabase Auth + Firebase Functions.
//
// Luồng đăng ký:
//   sendOTP (Firebase) → verifyOTP (Firebase) → registerUser (Supabase signUp) → saveUserProfile
//
// Luồng quên mật khẩu:
//   sendOTP (Firebase) → verifyOTP (Firebase) → resetPasswordOnBackend (Firebase Admin)
// =========================================================

import { supabase } from './supabaseConfig';
import { saveUserSession, clearUserSession } from '../utils/storage';

const FIREBASE_FUNCTIONS_BASE = 'https://bump-kohl.vercel.app';

// =========================================================
// Đăng ký tài khoản mới (Gọi sau khi verifyOTP thành công)
// Supabase "Confirm email" phải được TẮT trong Dashboard
// =========================================================
export const registerUser = async (
  email: string,
  password: string
): Promise<string> => {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw new Error(`Lỗi tạo tài khoản: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Không thể tạo tài khoản. Vui lòng thử lại.');
  }

  return data.user.id;
};

// =========================================================
// Lưu thông tin profile vào bảng users (Postgres)
// =========================================================
export const saveUserProfile = async (
  userId: string,
  name: string,
  email: string
): Promise<void> => {
  const { error: dbError } = await supabase
    .from('users')
    .upsert([{ id: userId, name, email, avatar: '', created_at: new Date() }]);

  if (dbError) {
    console.error('Lỗi khi lưu thông tin User vào DB:', dbError.message);
  }

  await saveUserSession(userId);
};

// =========================================================
// Đăng nhập bằng Email & Password
// =========================================================
export const loginUser = async (
  email: string,
  password: string
): Promise<{ id: string; email: string | undefined }> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Đăng nhập thất bại. Không tìm thấy thông tin người dùng.');
  }

  await saveUserSession(data.user.id);
  return { id: data.user.id, email: data.user.email };
};

// =========================================================
// Đăng xuất
// =========================================================
export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut();
  await clearUserSession();
};

// =========================================================
// Đặt lại mật khẩu qua Firebase Functions (Phương án A)
// Gọi sau khi verifyOTP thành công với type='recovery'
// Firebase Function dùng Supabase Admin API để đổi password
// =========================================================
export const resetPasswordOnBackend = async (
  email: string,
  newPassword: string
): Promise<void> => {
  const res = await fetch(`${FIREBASE_FUNCTIONS_BASE}/resetPassword`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
  }
};
