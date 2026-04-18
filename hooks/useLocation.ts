// =========================================================
// hooks/useLocation.ts
// Hook lắng nghe vị trí GPS của thiết bị và tự động
// push lên Supabase mỗi 15 giây (nếu đang bật chia sẻ)
// + Lưu lịch sử di chuyển (nếu bật saveHistory)
// + Persist settings vào AsyncStorage
// =========================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { updateMyLocation, isSharingEnabled } from '../services/locationService';
import { saveLocationHistory, saveLocationHistoryPrivacy } from '../services/locationHistoryService';

const KEYS = {
  IS_SHARING: 'bump_is_sharing',
  SAVE_HISTORY: 'bump_save_history',
  SHOW_TRAIL: 'bump_show_trail',
};

export const useLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [showTrail, setShowTrail] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Dùng ref để callback watchPosition luôn đọc giá trị mới nhất
  const isSharingRef = useRef(isSharing);
  const saveHistoryRef = useRef(saveHistory);
  useEffect(() => { isSharingRef.current = isSharing; }, [isSharing]);
  useEffect(() => { saveHistoryRef.current = saveHistory; }, [saveHistory]);

  // ---- Load settings từ SecureStore + DB khi mount ----
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [storedSharing, storedHistory, storedTrail] = await Promise.all([
          SecureStore.getItemAsync(KEYS.IS_SHARING),
          SecureStore.getItemAsync(KEYS.SAVE_HISTORY),
          SecureStore.getItemAsync(KEYS.SHOW_TRAIL),
        ]);

        if (storedSharing !== null) setIsSharing(storedSharing === 'true');
        else {
          // Fallback: sync từ DB lần đầu
          try {
            const dbSharing = await isSharingEnabled();
            setIsSharing(dbSharing);
          } catch {}
        }
        if (storedHistory !== null) setSaveHistory(storedHistory === 'true');
        if (storedTrail !== null) setShowTrail(storedTrail === 'true');
      } catch (e) {
        console.log('Load settings error:', e);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // ---- Persist settings khi thay đổi ----
  const updateIsSharing = useCallback(async (v: boolean) => {
    setIsSharing(v);
    SecureStore.setItemAsync(KEYS.IS_SHARING, String(v)).catch(() => {});
  }, []);

  const updateSaveHistory = useCallback(async (v: boolean) => {
    setSaveHistory(v);
    SecureStore.setItemAsync(KEYS.SAVE_HISTORY, String(v)).catch(() => {});
    // Đồng bộ cờ privacy lên DB ngay lập tức
    saveLocationHistoryPrivacy(v).catch(() => {});
  }, []);

  const updateShowTrail = useCallback(async (v: boolean) => {
    setShowTrail(v);
    SecureStore.setItemAsync(KEYS.SHOW_TRAIL, String(v)).catch(() => {});
  }, []);

  // ---- Bắt đầu theo dõi vị trí (chỉ chạy 1 lần) ----
  useEffect(() => {
    let mounted = true;

    const startWatching = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Quyền truy cập vị trí bị từ chối');
        return;
      }

      try {
        let currentLoc;
        try {
          currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        } catch (e) {
          console.warn("getCurrentPositionAsync failed, trying last known position:", e);
          currentLoc = await Location.getLastKnownPositionAsync();
        }

        if (!currentLoc) {
          if (mounted) setErrorMsg('Không lấy được vị trí giả lập trên GPS');
          return;
        }

        if (mounted) setLocation(currentLoc);

        // Push ban đầu (dùng ref để đọc giá trị mới nhất)
        if (isSharingRef.current) {
          updateMyLocation(currentLoc.coords.latitude, currentLoc.coords.longitude).catch(console.error);
        }
        if (saveHistoryRef.current) {
          saveLocationHistory(currentLoc.coords.latitude, currentLoc.coords.longitude).catch(console.error);
        }

        // Lắng nghe thay đổi vị trí
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 10,
          },
          (loc) => {
            if (mounted) setLocation(loc);
            // Dùng ref → luôn đọc đúng giá trị hiện tại
            if (isSharingRef.current) {
              updateMyLocation(loc.coords.latitude, loc.coords.longitude).catch(console.error);
            }
            if (saveHistoryRef.current) {
              saveLocationHistory(loc.coords.latitude, loc.coords.longitude).catch(console.error);
            }
          }
        );
      } catch (err) {
        console.error("Lỗi lấy vị trí tổng thể:", err);
        if (mounted) setErrorMsg('Thiết bị chưa bật định vị GPS');
      }
    };

    startWatching();

    return () => {
      mounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []); // Chỉ chạy 1 lần, không phụ thuộc isSharing/saveHistory

  return {
    location,
    errorMsg,
    settingsLoaded,
    isSharing,
    setIsSharing: updateIsSharing,
    saveHistory,
    setSaveHistory: updateSaveHistory,
    showTrail,
    setShowTrail: updateShowTrail,
  };
};
