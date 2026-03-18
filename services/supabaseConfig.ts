// =========================================================
// services/supabaseConfig.ts
// Cấu hình và khởi tạo Supabase Client cho toàn bộ ứng dụng.
// =========================================================

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Import in-memory storage (Tránh lỗi NativeModule bị null trên môi trường đặc thù)
import { getItem, setItem, removeItem } from '../utils/storage';

const supabaseUrl = 'https://xhumayakhvylygqtyihh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodW1heWFraHZ5bHlncXR5aWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM0MzEsImV4cCI6MjA4OTMyOTQzMX0.uyRkAyKZ08Hi-LhPOAKm-ceOX7OS__aZn883Bvp11dg';

// Khởi tạo Supabase Custom Adapter Storage
const customStorageAdapter = {
  getItem: (key: string) => getItem(key),
  setItem: (key: string, value: string) => setItem(key, value),
  removeItem: (key: string) => removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorageAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
