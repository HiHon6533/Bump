// =========================================================
// functions/index.js
// Express.js Backend Server - OTP Email Service cho Bump App
// Deploy lên Render.com (miễn phí)
//
// Endpoints:
//   POST /sendOtp      - Tạo OTP → Lưu Supabase → Gửi Gmail
//   POST /verifyOtp    - Xác minh OTP từ Supabase
//   POST /resetPassword - Đổi mật khẩu bằng Supabase Admin API
// =========================================================

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// Cấu hình
// =========================================================
const PORT = process.env.PORT || 3000;
const GMAIL_USER = 'hoangnguyen6533@gmail.com';
const GMAIL_PASS = 'xhph yzjy dyib nkop'; // Gmail App Password

const SUPABASE_URL = 'https://xhumayakhvylygqtyihh.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodW1heWFraHZ5bHlncXR5aWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1MzQzMSwiZXhwIjoyMDg5MzI5NDMxfQ.wXMrL_b3JBIdEB6haz8PMizk2gn6eh0r8ShCcq2Bh1E';

// Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

// =========================================================
// Tiện ích
// =========================================================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildEmailHTML(otp, type) {
  const title = type === 'recovery' ? 'Đặt lại mật khẩu' : 'Xác nhận đăng ký';
  const subtitle =
    type === 'recovery'
      ? 'Dưới đây là mã OTP để đặt lại mật khẩu tài khoản Bump của bạn:'
      : 'Dưới đây là mã OTP để hoàn tất đăng ký tài khoản Bump:';

  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;
                text-align:center;padding:30px;border:1px solid #e5e7eb;
                border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <h1 style="font-size:28px;color:#111827;margin-bottom:4px;">📍 Bump</h1>
      <h2 style="font-size:18px;color:#10B981;margin-bottom:16px;">${title}</h2>
      <p style="font-size:15px;color:#6B7280;margin-bottom:24px;">${subtitle}</p>
      <div style="background:#F3F4F6;display:inline-block;padding:16px 32px;border-radius:12px;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1F2937;">
          ${otp}
        </span>
      </div>
      <p style="font-size:13px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px;">
        Mã này có hiệu lực trong <strong>5 phút</strong>.<br/>
        Nếu bạn không yêu cầu, vui lòng bỏ qua email này.
      </p>
    </div>
  `;
}

// =========================================================
// Health check
// =========================================================
app.get('/', (req, res) => {
  res.json({ status: 'Bump Backend đang hoạt động!', version: '1.0.0' });
});

// =========================================================
// POST /sendOtp
// Body: { email: string, type: 'signup' | 'recovery' }
// =========================================================
app.post('/sendOtp', async (req, res) => {
  const { email, type = 'signup' } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email là bắt buộc.' });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Lưu OTP vào Supabase (ghi đè nếu đã có cho email + type này)
  const { error: dbError } = await supabaseAdmin
    .from('otp_tokens')
    .upsert([{ email, otp, type, expires_at: expiresAt }], {
      onConflict: 'email,type',
    });

  if (dbError) {
    console.error('[sendOtp] DB Error:', dbError.message);
    return res.status(500).json({ error: 'Lỗi hệ thống. Vui lòng thử lại.' });
  }

  // Gửi email qua Gmail
  try {
    await transporter.sendMail({
      from: `"Bump App" <${GMAIL_USER}>`,
      to: email, // <--- Đổi thành email người dùng đăng ký tại đây
      subject: type === 'recovery' ? 'Đặt lại mật khẩu Bump' : 'Xác nhận đăng ký Bump',
      html: buildEmailHTML(otp, type),
    });

    console.log(`[sendOtp] ✅ OTP gửi thành công đến: ${email} (${type})`);
    return res.status(200).json({ success: true, message: 'Mã OTP đã được gửi.' });
  } catch (mailError) {
    console.error('[sendOtp] Mail Error:', mailError.message);
    return res.status(500).json({ error: 'Không thể gửi email. ' + mailError.message });
  }
});

// =========================================================
// POST /verifyOtp
// Body: { email: string, otp: string, type: 'signup' | 'recovery' }
// =========================================================
app.post('/verifyOtp', async (req, res) => {
  const { email, otp, type = 'signup' } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ verified: false, error: 'Email và OTP là bắt buộc.' });
  }

  // Tìm OTP trong Supabase
  const { data, error } = await supabaseAdmin
    .from('otp_tokens')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .eq('type', type)
    .single();

  if (error || !data) {
    console.warn('[verifyOtp] OTP không đúng cho:', email);
    return res.status(200).json({ verified: false, error: 'Mã OTP không đúng.' });
  }

  // Kiểm tra hết hạn
  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin.from('otp_tokens').delete().eq('email', email).eq('type', type);
    console.warn('[verifyOtp] OTP hết hạn cho:', email);
    return res.status(200).json({ verified: false, error: 'Mã OTP đã hết hạn.' });
  }

  // Xoá OTP sau khi dùng (one-time use)
  await supabaseAdmin.from('otp_tokens').delete().eq('email', email).eq('type', type);

  console.log(`[verifyOtp] ✅ Xác minh thành công: ${email} (${type})`);
  return res.status(200).json({ verified: true });
});

// =========================================================
// POST /resetPassword
// Body: { email: string, newPassword: string }
// Phương án A: Supabase Admin API đổi password trực tiếp
// =========================================================
app.post('/resetPassword', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email và mật khẩu mới là bắt buộc.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  // Lấy User ID bằng API nội bộ của Supabase Auth (thông qua generateLink)
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email,
  });

  if (linkError || !linkData?.user) {
    console.error('[resetPassword] Không tìm thấy user:', email);
    return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này.' });
  }

  const userId = linkData.user.id;

  // Đổi mật khẩu bằng Supabase Admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (updateError) {
    console.error('[resetPassword] Lỗi:', updateError.message);
    return res.status(500).json({ error: 'Không thể đổi mật khẩu: ' + updateError.message });
  }

  console.log('[resetPassword] ✅ Đổi mật khẩu thành công cho:', email);
  return res.status(200).json({ success: true });
});

// =========================================================
// Start Server
// =========================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Bump Backend đang chạy tại port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
  });
}

// Export cho Vercel (hoặc các nền tảng serverless khác)
module.exports = app;

