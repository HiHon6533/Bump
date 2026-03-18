// =========================================================
// services/otpService.ts
// Gửi và xác minh OTP qua backend Express.js trên Render.com.
// - sendOTP  → POST /sendOtp  → Gửi Gmail (Nodemailer)
// - verifyOTP → POST /verifyOtp → Kiểm tra Supabase DB
// =========================================================

// Base URL của Render.com backend
const BACKEND_BASE_URL = 'https://bump-7qxj.onrender.com';

// Timeout 60 giây — tránh xoay mãi khi server Render.com free đang ngủ (Cold Start mất khoảng 50s)
const FETCH_TIMEOUT_MS = 60000;

/** Helper: fetch với timeout và kiểm tra JSON */
async function fetchWithTimeout(url: string, options: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    const text = await res.text();

    // Kiểm tra xem server có trả về JSON không
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      console.error('[Fetch] Response không phải JSON:', text.substring(0, 200));
      throw new Error('Server đang khởi động, vui lòng thử lại sau vài giây.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Kết nối quá thời gian chờ (30s). Server đang khởi động, vui lòng thử lại.');
    }
    throw err;
  }
}

// =========================================================
// Gửi OTP — gọi backend
// =========================================================
export const sendOTP = async (
  email: string,
  type: 'signup' | 'recovery' = 'signup'
): Promise<void> => {
  console.log(`[OTP] Đang gửi OTP (${type}) đến:`, email);

  const { ok, data } = await fetchWithTimeout(`${BACKEND_BASE_URL}/sendOtp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type }),
  });

  if (!ok || data.error) {
    console.error('[OTP] Lỗi gửi OTP:', data.error);
    throw new Error(data.error || 'Không thể gửi OTP. Vui lòng thử lại.');
  }

  console.log('[OTP] ✅ OTP đã được gửi thành công!');
};

// =========================================================
// Xác minh OTP — gọi backend
// =========================================================
export const verifyOTP = async (
  email: string,
  otp: string,
  type: 'signup' | 'recovery' = 'signup'
): Promise<boolean> => {
  console.log(`[OTP] Đang xác minh OTP (${type}) cho:`, email);

  const { ok, data } = await fetchWithTimeout(`${BACKEND_BASE_URL}/verifyOtp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, type }),
  });

  if (!ok) {
    console.error('[OTP] Lỗi kết nối backend');
    return false;
  }

  if (!data.verified) {
    console.warn('[OTP] Xác minh thất bại:', data.error);
    return false;
  }

  console.log('[OTP] ✅ Xác minh OTP thành công!');
  return true;
};
