// =========================================================
// services/otpService.ts
// Gửi và xác minh OTP qua Firebase Functions backend.
// - sendOTP  → Gọi Firebase Function "sendOtp" → Gửi Gmail (Nodemailer)
// - verifyOTP → Gọi Firebase Function "verifyOtp" → Kiểm tra Supabase DB
// =========================================================

// Base URL của Firebase Functions (Gen 1 - us-central1)
const FIREBASE_FUNCTIONS_BASE =
  'https://us-central1-bump-97da0.cloudfunctions.net';

// =========================================================
// Gửi OTP — gọi Firebase Function backend
// =========================================================
export const sendOTP = async (
  email: string,
  type: 'signup' | 'recovery' = 'signup'
): Promise<void> => {
  console.log(`[OTP] Đang yêu cầu backend gửi OTP (${type}) đến:`, email);

  const res = await fetch(`${FIREBASE_FUNCTIONS_BASE}/sendOtp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error('[OTP] Lỗi gửi OTP:', data.error);
    throw new Error(data.error || 'Không thể gửi OTP. Vui lòng thử lại.');
  }

  console.log('[OTP] OTP đã được gửi thành công qua backend!');
};

// =========================================================
// Xác minh OTP — gọi Firebase Function backend
// =========================================================
export const verifyOTP = async (
  email: string,
  otp: string,
  type: 'signup' | 'recovery' = 'signup'
): Promise<boolean> => {
  console.log(`[OTP] Đang xác minh OTP (${type}) cho:`, email);

  const res = await fetch(`${FIREBASE_FUNCTIONS_BASE}/verifyOtp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, type }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[OTP] Lỗi kết nối backend:', res.status);
    return false;
  }

  if (!data.verified) {
    console.warn('[OTP] Xác minh thất bại:', data.error);
    return false;
  }

  console.log('[OTP] Xác minh OTP thành công!');
  return true;
};
