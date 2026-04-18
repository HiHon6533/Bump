// =========================================================
// app/camera.tsx
// Màn hình chụp ảnh khoảnh khắc (Moment)
// =========================================================

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../styles/colors';
import * as Location from 'expo-location';
import { postMoment, MomentData } from '../services/momentService';
import { isSharingEnabled } from '../services/locationService';
import { sendReaction, subscribeToReactions, fetchReactionsWithUsers, MomentReaction, ReactionWithUser } from '../services/momentReactionService';
import { supabase } from '../services/supabaseConfig';
import EmojiReaction from '../components/EmojiReaction';
import ReactionAvatars from '../components/ReactionAvatars';
import ReactionListModal from '../components/ReactionListModal';

export default function CameraScreen() {
  const router = useRouter();
  const { momentsStr, initialIndex } = useLocalSearchParams<{ momentsStr?: string; initialIndex?: string }>();
  
  const parsedMoments: MomentData[] = momentsStr ? JSON.parse(momentsStr) : [];
  
  const [mode, setMode] = useState<'view' | 'capture'>(parsedMoments.length > 0 ? 'view' : 'capture');
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex ? parseInt(initialIndex, 10) : 0);
  
  const currentMoment = parsedMoments[currentIndex];

  const handleNextMoment = () => {
    if (currentIndex < parsedMoments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.back();
    }
  };

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [incomingEmoji, setIncomingEmoji] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionWithUser[]>([]);
  const [showReactionModal, setShowReactionModal] = useState(false);

  // Safe area insets — dùng thủ công để layout nhất quán dù mở camera từ đâu
  const insets = useSafeAreaInsets();

  // Lấy ID của mình để check "You" vs "Bạn bè"
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyId(data.session?.user?.id || null);
    });
  }, []);

  // Subscribe to reactions on the current moment
  useEffect(() => {
    if (mode !== 'view' || !currentMoment) return;
    const unsub = subscribeToReactions(currentMoment.id, (reaction: MomentReaction) => {
      setIncomingEmoji(reaction.emoji);
      setTimeout(() => setIncomingEmoji(null), 2000);
      // Reload danh sách reactions khi có reaction mới
      fetchReactionsWithUsers(currentMoment.id).then(setReactions);
    });
    // Load ban đầu khi mở moment của chính mình
    fetchReactionsWithUsers(currentMoment.id).then(setReactions);
    return () => unsub();
  }, [mode, currentIndex]);

  const handleSendReaction = (emoji: string) => {
    if (!currentMoment) return;
    sendReaction(currentMoment.id, emoji);
  };

  // Khi tải lên, check xem user có bật "Lưu lịch sử" không
  useEffect(() => {
    isSharingEnabled().catch(() => {}).then(() => {
      // Logic requirement: Chỉ hiển thị/lưu moment nếu bật lưu lịch sử.
      // Dựa trên useLocation hook, ta cần đảm bảo app có tracking vị trí để lấy tọa độ.
      setCanPost(true);
    });
  }, []);

  if (!permission) {
    return <View style={styles.container} />; // Loading permissions
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="chevron-left" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>Đội Giao Thông Cần Camera 📸</Text>
          <Text style={styles.subText}>Cấp quyền để chia sẻ khoảnh khắc với bạn bè rôm rả hơn nhé.</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
            <Text style={styles.btnText}>Cấp quyền Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Chụp ảnh
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: false,
        });
        if (photo?.uri) setPhotoUri(photo.uri);
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể chụp ảnh!');
      }
    }
  };

  const handlePost = async () => {
    if (!photoUri) return;
    setIsUploading(true);
    try {
      // 1. Lấy vị trí ngay lập tức
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      // 2. Upload
      await postMoment(photoUri, loc.coords.latitude, loc.coords.longitude, caption);
      
      Alert.alert('Thành công', 'Khoảnh khắc của bạn đã được đăng!', [
        { text: 'Xong', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.log('Post moment error:', error);
      Alert.alert('Lỗi đăng ảnh', error.message || 'Xin vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReply = () => {
    if (!currentMoment || !currentMoment.user?.id) return;
    // Chuyển sang màn chat với user này, truyền theo currentMoment.image_url
    router.push({
      pathname: '/chat/[id]',
      params: { 
        id: currentMoment.user.id,
        replyMomentUrl: currentMoment.image_url
      }
    });
  };

  return (
    // Dùng View thường + absoluteFillObject thay vì SafeAreaView
    // để layout KHÔNG bị ảnh hưởng bởi context tab navigator khi mở từ Map
    <View style={styles.container}>

      {/* ===== HEADER (padding top = inset từ safe area thực tế) ===== */}
      <View style={[styles.header, { paddingTop: insets.top + 8, height: 56 + insets.top }]}>
        <TouchableOpacity 
          onPress={() => photoUri ? setPhotoUri(null) : router.back()} 
          style={styles.iconBtn}
          disabled={isUploading}
        >
          <Feather name={photoUri ? "arrow-left" : "chevron-left"} size={28} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter} />

        {mode === 'view' ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="x" size={24} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* ===== PHOTO BOX (giống nhau cả 2 mode) ===== */}
      <View style={styles.photoContainer}>
        <View style={styles.photoBox}>
          {mode === 'view' && currentMoment ? (
            <TouchableOpacity style={styles.fill} activeOpacity={1} onPress={handleNextMoment}>
              <Image source={{ uri: currentMoment.image_url }} style={styles.fill} contentFit="cover" />
              {currentMoment.caption && (
                <View style={styles.captionBadgeDisplay}>
                  <Text style={styles.captionTextDisplay}>{currentMoment.caption}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : photoUri ? (
            <View style={styles.fill}>
              <Image source={{ uri: photoUri }} style={styles.fill} contentFit="cover" />
              <View style={styles.captionInputContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Thêm chú thích..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={50}
                  autoCorrect={false}
                />
              </View>
            </View>
          ) : (
            <CameraView ref={cameraRef} style={styles.fill} facing="back" animateShutter={true} />
          )}
        </View>
      </View>

      {/* ===== INFO + ACTIVITY (chỉ hiện MODE VIEW) ===== */}
      {mode === 'view' && currentMoment && (
        <View style={styles.metaArea}>
          <View style={styles.userInfoArea}>
            <Text style={styles.infoName}>
              {myId === currentMoment.user_id ? 'You' : (currentMoment.user?.name || 'Bạn bè')}
            </Text>
            <Text style={styles.infoTime}>
              {new Date(currentMoment.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
            </Text>
          </View>
          <View style={styles.activityArea}>
            {myId === currentMoment.user_id ? (
              // === XEM MOMENT CỦA MÌNH: Hiện avatar người đã react ===
              <ReactionAvatars
                reactions={reactions}
                onPress={() => setShowReactionModal(true)}
              />
            ) : (
              // === XEM MOMENT NGƯỜI KHÁC: Giữ nguyên ===
              <EmojiReaction onReaction={handleSendReaction} />
            )}
          </View>
        </View>
      )}

      {/* ===== FOOTER (cùng vị trí, cùng chiều cao cả 2 mode) ===== */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {mode === 'view' ? (
          // Footer cho mode VIEW: camera btn (chụp phản hồi) + reply btn
          <View style={styles.footerRow}>
            <View style={styles.footerSide} />
            <TouchableOpacity style={styles.captureOuter} onPress={() => setMode('capture')}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.footerSide}>
              {myId !== currentMoment?.user_id && (
                <TouchableOpacity style={styles.replyBtn} onPress={handleReply}>
                  <Feather name="message-circle" size={24} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : photoUri ? (
          // Footer cho mode PREVIEW: Chụp lại + Đăng
          <View style={styles.previewControls}>
            <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.cancelBtn} disabled={isUploading}>
              <Text style={styles.cancelText}>Chụp lại</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePost} style={styles.postBtn} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />
              ) : (
                <Feather name="send" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.postText}>{isUploading ? 'Đang tải...' : 'Đăng Khoảnh Khắc'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Footer cho mode CAPTURE: Nút chụp ảnh chính giữa
          <View style={styles.footerRow}>
            <View style={styles.footerSide} />
            <TouchableOpacity style={styles.captureOuter} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.footerSide} />
          </View>
        )}
      </View>

      {/* ===== OVERLAY LOADING ===== */}
      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.loadingText}>Đang nén ảnh...</Text>
        </View>
      )}

      {/* ===== REACTION LIST MODAL (xem moment của mình) ===== */}
      <ReactionListModal
        visible={showReactionModal}
        reactions={reactions}
        onClose={() => setShowReactionModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, // Chiếm toàn màn hình bất kể dù mở từ đâu
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',     // Nằm dưới cùa header box (trên icon mười)
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,           // Khoảng trống phíd dưới icon
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  audienceText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  contentWrapper: { display: 'none' }, // unused - kept to avoid style references breaking
  mainBox: { display: 'none' }, // unused
  fullScreen: { display: 'none' }, // unused
  
  // ========= UNIFIED PHOTO LAYOUT =========
  photoContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  photoBox: {
    width: '100%',
    aspectRatio: 3 / 4,   // Cố định tỉ lệ: cả view + capture + preview đều giống nhau
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // ========= META AREA (view mode only) =========
  metaArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 4,
    alignItems: 'center',      // Căn giữa toàn bộ meta block
  },
  userInfoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',   // Tên + giờ căn giữa
    gap: 8,
    marginBottom: 4,
  },
  infoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '500',
  },
  activityArea: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',   // Emoji row căn giữa
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  activityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // =========================================
  // ===== UNIFIED FOOTER ====================
  footer: {
    height: 100,            // Cố định chiều cao footer cả 2 mode đều dùng
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 'auto',      // Đẩy footer xuống đáy bất kể nội dung phía trên
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  footerSide: {
    flex: 1,
    alignItems: 'flex-end', // Reply btn sẽ align phải
    justifyContent: 'center',
  },
  captureOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },
  replyBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Giữ lại các button cũ mà preview mode dùng:
  captureContainerSmall: { display: 'none' }, // replaced by captureOuter
  captureBtnSmall: { display: 'none' },       // replaced by captureInner
  captureContainer: { display: 'none' },      // replaced by captureOuter
  captureBtnInner: { display: 'none' },       // replaced by captureInner
  closeFloatingBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  captionInputContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  captionInput: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 16,
    fontWeight: '600',
    minWidth: '50%',
    textAlign: 'center',
  },
  captionBadgeDisplay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  captionTextDisplay: {
    backgroundColor: 'rgba(230, 90, 0, 0.85)',
    color: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 16,
    fontWeight: 'bold',
    overflow: 'hidden',
    textAlign: 'center',
  },
  bottomArea: {
    height: 150,
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  authorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  authorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 6,
  },
  authorTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  viewBottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
  },
  fakeInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginRight: 12,
  },
  fakeInputText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  replyCameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewControls: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cancelText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    backgroundColor: Colors.primary,
  },
  postText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  messageBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  messageText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  btnText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: Colors.white,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  momentUserBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  momentTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
});
