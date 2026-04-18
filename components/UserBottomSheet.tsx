// =========================================================
// components/UserBottomSheet.tsx
// Bottom sheet khi click vào marker bạn bè trên bản đồ:
// Avatar, tên, khoảng cách, nút Nhắn tin + Chỉ đường
// =========================================================

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Dimensions, Platform, PanResponder,
} from 'react-native';
import { useRef, useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../styles/colors';
import { UserLocation } from '../services/locationService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = 280; // Chiều cao ước tính của bottom sheet

// ---- Haversine formula: tính khoảng cách giữa 2 tọa độ (km) ----
export const haversineDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---- Ước tính thời gian di chuyển (km/h trung bình) ----
const estimateTime = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m · ~${Math.ceil(km * 12)} phút đi bộ`;
  if (km < 5) return `${km.toFixed(1)} km · ~${Math.ceil(km * 3)} phút xe máy`;
  return `${km.toFixed(1)} km · ~${Math.ceil(km * 2)} phút ô tô`;
};

interface Props {
  friendLocation: UserLocation;
  myLat: number;
  myLng: number;
  onClose: () => void;
  onChat: () => void;
  onHistory?: () => void;
  onDirections?: () => void;
}

export default function UserBottomSheet({ friendLocation, myLat, myLng, onClose, onChat, onHistory, onDirections }: Props) {
  const distance = haversineDistance(myLat, myLng, friendLocation.latitude, friendLocation.longitude);

  const name = friendLocation.user?.name || 'Bạn bè';
  const avatar = friendLocation.user?.avatar;

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation mở sheet
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }),
    ]).start();
  }, []);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  // Vuốt để tắt
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SHEET_HEIGHT / 2 || gestureState.vy > 1.5) {
          closeSheet();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={styles.overlay}>
      <Animated.View style={[styles.backdropContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={closeSheet} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* User Info */}
        <View style={styles.userRow}>
          <View style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.distanceText}>{estimateTime(distance)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onChat} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>  
              <Feather name="message-circle" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.actionLabel}>Nhắn tin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onDirections} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Feather name="navigation" size={20} color="#1565C0" />
            </View>
            <Text style={styles.actionLabel}>Chỉ đường</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={closeSheet} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Feather name="map-pin" size={20} color="#E65100" />
            </View>
            <Text style={styles.actionLabel}>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</Text>
          </TouchableOpacity>

          {onHistory && (
            <TouchableOpacity style={styles.actionBtn} onPress={onHistory} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="clock" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.actionLabel}>Lịch sử</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    justifyContent: 'flex-end', zIndex: 999,
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center', marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22, fontWeight: 'bold', color: Colors.primary,
  },
  userInfo: {
    marginLeft: 14, flex: 1,
  },
  userName: {
    fontSize: 18, fontWeight: '800', color: Colors.textPrimary,
  },
  distanceText: {
    fontSize: 13, color: Colors.textSecondary, marginTop: 4,
  },
  actions: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center', gap: 6,
  },
  actionIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
  },
  avatarWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatarMomentWrapper: {
    borderWidth: 3,
    borderColor: '#E1306C',
    padding: 2,
  },
});
