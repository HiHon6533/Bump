// =========================================================
// components/MapActionPanel.tsx
// Floating control panel trên bản đồ với các toggle
// Trail, Status, Footprints, Locations
// =========================================================

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Switch, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../styles/colors';

interface MapActionPanelProps {
  visible: boolean;
  onClose: () => void;
  // Toggles
  showTrail: boolean;
  onToggleTrail: (v: boolean) => void;
  saveHistory: boolean;
  onToggleSaveHistory: (v: boolean) => void;
  isSharing: boolean;
  onToggleSharing: (v: boolean) => void;
}

type ToggleItemProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

const ToggleItem = ({ icon, iconColor, iconBg, label, desc, value, onChange }: ToggleItemProps) => (
  <View style={styles.toggleItem}>
    <View style={[styles.toggleIcon, { backgroundColor: iconBg }]}>
      <Feather name={icon as any} size={18} color={iconColor} />
    </View>
    <View style={styles.toggleInfo}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.toggleDesc}>{desc}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
      thumbColor={value ? Colors.primary : Colors.gray400}
    />
  </View>
);

export default function MapActionPanel(props: MapActionPanelProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [props.visible]);

  if (!props.visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={props.onClose} activeOpacity={1}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      </TouchableOpacity>

      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Điều khiển bản đồ</Text>
          <TouchableOpacity onPress={props.onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Toggle Items */}
        <ToggleItem
          icon="radio" iconColor="#1565C0" iconBg="#E3F2FD"
          label="Chia sẻ vị trí" desc="Bạn bè có thể thấy bạn"
          value={props.isSharing} onChange={props.onToggleSharing}
        />
        <ToggleItem
          icon="activity" iconColor="#2E7D32" iconBg="#E8F5E9"
          label="Đường đi realtime" desc="Hiển thị trail khi di chuyển"
          value={props.showTrail} onChange={props.onToggleTrail}
        />
        <ToggleItem
          icon="save" iconColor="#6A1B9A" iconBg="#F3E5F5"
          label="Lưu lịch sử" desc="Tự động lưu vị trí di chuyển"
          value={props.saveHistory} onChange={props.onToggleSaveHistory}
        />
        {!props.saveHistory && (
          <View style={styles.noteRow}>
            <Feather name="info" size={14} color={Colors.warning} />
            <Text style={styles.noteText}>Bạn đang không lưu lịch sử di chuyển</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end', zIndex: 998,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '800', color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  toggleIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15, fontWeight: '700', color: Colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 12, color: Colors.textMuted, marginTop: 2,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
  },
});
