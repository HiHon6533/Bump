// =========================================================
// components/ChatCameraModal.tsx
// Modal camera nhỏ cho chat: chụp ảnh / chọn từ thư viện
// =========================================================

import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Colors } from '../styles/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

interface ChatCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onImageReady: (uri: string) => void;
}

export default function ChatCameraModal({ visible, onClose, onImageReady }: ChatCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const handleCapture = async () => {
    if (!cameraRef.current || isTaking) return;
    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPreviewUri(photo.uri);
      }
    } catch (e) {
      console.error('Capture error:', e);
    } finally {
      setIsTaking(false);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0].uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Pick image error:', e);
    }
  };

  const handleSend = () => {
    if (previewUri) {
      onImageReady(previewUri);
      setPreviewUri(null);
      onClose();
    }
  };

  const handleRetake = () => {
    setPreviewUri(null);
  };

  const handleCloseModal = () => {
    setPreviewUri(null);
    onClose();
  };

  // Yêu cầu quyền camera khi modal hiện
  React.useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCloseModal}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
            <Feather name="x" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Camera / Preview */}
        <View style={styles.cameraBox}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" />
          ) : (
            <CameraView
              key={facing}
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              animateShutter={true}
            />
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
          {previewUri ? (
            // Preview mode: Retake / Send
            <View style={styles.previewControls}>
              <TouchableOpacity onPress={handleRetake} style={styles.retakeBtn}>
                <Feather name="refresh-cw" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSend} style={styles.sendImageBtn}>
                <Feather name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            // Camera mode: Gallery / Capture / Flip
            <View style={styles.cameraControls}>
              {/* Gallery */}
              <TouchableOpacity onPress={handlePickFromLibrary} style={styles.sideBtn}>
                <Feather name="image" size={26} color="#fff" />
              </TouchableOpacity>

              {/* Capture */}
              <TouchableOpacity
                onPress={handleCapture}
                style={styles.captureOuter}
                disabled={isTaking}
                activeOpacity={0.7}
              >
                {isTaking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>

              {/* Flip */}
              <TouchableOpacity
                onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                style={styles.sideBtn}
              >
                <Feather name="refresh-cw" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBox: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  controls: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#fff',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  retakeBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendImageBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
