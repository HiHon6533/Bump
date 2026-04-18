// =========================================================
// styles/colors.ts
// Hệ thống màu sắc nâng cấp — vibrant & modern
// =========================================================

export const Colors = {
  // ---- Primary Brand Colors (Xanh dương đậm nổi bật) ----
  primary: '#4F46E5',          // Indigo đậm - màu chính vibrant
  primaryDark: '#3730A3',      // Indigo tối hơn
  primaryLight: '#EEF2FF',     // Indigo nhạt (background)

  // ---- Secondary & Accent ----
  accent: '#EC4899',           // Hồng hot pink
  accentLight: '#FCE7F3',

  // ---- Register Green ----
  success: '#10B981',
  successDark: '#059669',
  successLight: '#D1FAE5',

  // ---- Forgot Orange ----
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FEF3C7',

  // ---- Error Red ----
  error: '#EF4444',
  errorLight: '#FEE2E2',

  // ---- Neutrals ----
  white: '#FFFFFF',
  black: '#0F172A',

  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // ---- Background Gradients ----
  gradientStart: '#EEF2FF',
  gradientEnd: '#FFFFFF',

  // ---- Splash Background ----
  splashBg: '#4F46E5',

  // ---- Input ----
  inputBorder: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputFocusBorder: '#4F46E5',
  inputText: '#0F172A',
  placeholder: '#94A3B8',

  // ---- Cards ----
  cardBg: '#FFFFFF',
  cardShadow: 'rgba(79, 70, 229, 0.08)',

  // ---- Text ----
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textLink: '#4F46E5',
};

// Theme màu cho từng màn hình
export const ScreenTheme = {
  login: {
    color: Colors.primary,
    colorDark: Colors.primaryDark,
    colorLight: Colors.primaryLight,
  },
  register: {
    color: Colors.success,
    colorDark: Colors.successDark,
    colorLight: Colors.successLight,
  },
  forgot: {
    color: Colors.warning,
    colorDark: Colors.warningDark,
    colorLight: Colors.warningLight,
  },
};
