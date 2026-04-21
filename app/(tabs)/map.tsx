// =========================================================
// app/(tabs)/map.tsx
// Màn hình Bản đồ (Trang chủ)
// Tích hợp: UserBottomSheet, MapActionPanel, Polyline lịch sử
// =========================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../styles/colors';
import { useLocation } from '../../hooks/useLocation';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getFriendsLocations, UserLocation, isSharingEnabled } from '../../services/locationService';
import { getFriendIds } from '../../services/friendService';
import { getOrCreateConversation } from '../../services/chatService';
import { MomentData, getMapMoments } from '../../services/momentService';
import MapMarker from '../../components/MapMarker';
import UserBottomSheet from '../../components/UserBottomSheet';
import MapActionPanel from '../../components/MapActionPanel';
import mapStyle from '../../styles/mapStyle.json';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

export default function MapScreen() {
  const {
    location, errorMsg,
    isSharing, setIsSharing,
    saveHistory, setSaveHistory,
    showTrail, setShowTrail,
  } = useLocation();
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const [friendsLocations, setFriendsLocations] = useState<UserLocation[]>([]);
  const mapRef = React.useRef<MapView>(null);

  // UI States
  const [selectedFriend, setSelectedFriend] = useState<UserLocation | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  // Trail data
  const [trailCoords, setTrailCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  // Moments data
  const [moments, setMoments] = useState<MomentData[]>([]);

  // Directions state
  const [directionsRoute, setDirectionsRoute] = useState<{
    coords: { latitude: number; longitude: number }[];
    friendName: string;
    distanceKm: number;
  } | null>(null);

  // Fetch vị trí bạn bè mỗi 10 giây
  useEffect(() => {
    let mounted = true;
    let timer: any;

    const fetchFriends = async () => {
      try {
        const friendIds = await getFriendIds();
        if (friendIds.length > 0) {
          const [locs, mapMoments] = await Promise.all([
            getFriendsLocations(friendIds),
            getMapMoments(friendIds).catch(() => [] as MomentData[])
          ]);
          if (mounted) {
            setFriendsLocations(locs);
            setMoments(mapMoments);
          }
        } else {
          // Chỉ có mình mình
          const mapMoments = await getMapMoments([]).catch(() => []);
          if (mounted) setMoments(mapMoments);
        }
      } catch (e) {
        console.log('Lỗi fetch friend locations / moments:', e);
      }
    };

    fetchFriends();
    timer = setInterval(fetchFriends, 10000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // Trail effect: tích lũy tọa độ khi di chuyển
  useEffect(() => {
    if (showTrail && location) {
      setTrailCoords(prev => [
        ...prev,
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
      ]);
    }
    if (!showTrail) {
      setTrailCoords([]);
    }
  }, [location, showTrail]);

  const handleCenterMap = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleFriendChat = async (friendUserId: string, name: string, avatar: string) => {
    try {
      const convId = await getOrCreateConversation(friendUserId);
      setSelectedFriend(null);
      router.push({ 
        pathname: '/chat/[id]', 
        params: { id: convId, name, avatar } 
      } as any);
    } catch {
      Alert.alert('Lỗi', 'Không thể mở cuộc trò chuyện.');
    }
  };

  if (errorMsg) {
    Alert.alert('Lỗi vị trí', errorMsg);
  }

  // ---- Chỉ đường handler: mở Google Maps ----
  const handleDirections = (friend: UserLocation) => {
    if (!location) return;
    const myLat = location.coords.latitude;
    const myLng = location.coords.longitude;
    const fLat = friend.latitude;
    const fLng = friend.longitude;
    const friendName = friend.user?.name || 'Bạn bè';

    // Mở Google Maps với chế độ chỉ đường
    const url = Platform.select({
      ios: `comgooglemaps://?saddr=${myLat},${myLng}&daddr=${fLat},${fLng}&directionsmode=driving`,
      android: `google.navigation:q=${fLat},${fLng}&mode=d`,
    });

    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${myLat},${myLng}&destination=${fLat},${fLng}&travelmode=driving`;

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Nếu không có Google Maps, mở trên trình duyệt
          Linking.openURL(webUrl);
        }
      });
    } else {
      Linking.openURL(webUrl);
    }

    setSelectedFriend(null);
  };

  const fitToRoute = () => {
    if (!directionsRoute || directionsRoute.coords.length < 2) return;
    const lats = directionsRoute.coords.map(c => c.latitude);
    const lngs = directionsRoute.coords.map(c => c.longitude);
    mapRef.current?.animateToRegion({
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(0.01, (Math.max(...lats) - Math.min(...lats)) * 1.5),
      longitudeDelta: Math.max(0.01, (Math.max(...lngs) - Math.min(...lngs)) * 1.5),
    }, 800);
  };

  const estimateTimeStr = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m · ~${Math.ceil(km * 12)} phút`;
    if (km < 5) return `${km.toFixed(1)}km · ~${Math.ceil(km * 3)} phút`;
    return `${km.toFixed(1)}km · ~${Math.ceil(km * 2)} phút`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {!location ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          customMapStyle={mapStyle}
        >
          {/* Marker bản thân */}
          {isSharing && currentUser && (
            <MapMarker
              isMe
              // onPress={() => { ... }} // Đã bỏ tính năng bấm vào bản thân để xem moment
              location={{
                user_id: currentUser.id,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                is_sharing: true,
                updated_at: new Date().toISOString(),
                user: { name: currentUser.name, avatar: currentUser.avatar }
              }}
            />
          )}

          {/* Markers bạn bè */}
          {friendsLocations.map(loc => {
            return (
              <MapMarker
                key={loc.user_id}
                location={loc}
                onPress={() => setSelectedFriend(loc)}
              />
            );
          })}

          {/* Trail realtime polyline */}
          {showTrail && trailCoords.length > 1 && (
            <Polyline
              coordinates={trailCoords}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
          )}

          {/* Directions route polyline + markers */}
          {directionsRoute && (
            <>
              <Polyline
                coordinates={directionsRoute.coords}
                strokeColor="#1565C0"
                strokeWidth={5}
              />
              <Marker
                coordinate={directionsRoute.coords[0]}
                pinColor="#10B981"
                title="Bạn"
              />
              <Marker
                coordinate={directionsRoute.coords[directionsRoute.coords.length - 1]}
                pinColor="#EF4444"
                title={directionsRoute.friendName}
              />
            </>
          )}
        </MapView>
      )}

      {/* ------ Floating Controls ------ */}
      <SafeAreaView style={styles.controlsArea} pointerEvents="box-none" edges={['top', 'left', 'right']}>
        {/* Toggle Share FAB */}
        <TouchableOpacity
          style={[styles.fab, styles.fabTopRight, !isSharing && styles.fabOff]}
          onPress={() => {
            setIsSharing(!isSharing);
            Alert.alert(
              !isSharing ? 'Đã bật chia sẻ' : 'Đã tắt chia sẻ',
              !isSharing ? 'Bạn bè giờ có thể thấy vị trí của bạn' : 'Bạn bè sẽ không thấy vị trí của bạn nữa'
            );
          }}
          activeOpacity={0.8}
        >
          <Feather name={isSharing ? "eye" : "eye-off"} size={22} color={isSharing ? '#818CF8' : 'rgba(255,255,255,0.4)'} />
        </TouchableOpacity>

        {/* Settings Panel FAB */}
        <TouchableOpacity
          style={[styles.fab, styles.fabTopRight2]}
          onPress={() => setShowPanel(true)}
          activeOpacity={0.8}
        >
          <Feather name="sliders" size={22} color="#818CF8" />
        </TouchableOpacity>

        {/* Center My Location FAB */}
        <TouchableOpacity
          style={[styles.fab, styles.fabBottomRight]}
          onPress={handleCenterMap}
          activeOpacity={0.8}
        >
          <Feather name="navigation" size={22} color="#818CF8" />
        </TouchableOpacity>

        {/* Camera FAB */}
        <TouchableOpacity
          style={[styles.fabMenu, styles.fabCamera]}
          onPress={async () => {
            const sharing = await isSharingEnabled().catch(() => false);
            if (!sharing) {
              Alert.alert('Chưa bật vị trí', 'Vui lòng bật "Lưu lịch sử" hoặc "Chia sẻ vị trí" để chụp khoảnh khắc nhe!');
              return;
            }
            router.push('/camera');
          }}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={26} color={Colors.white} />
        </TouchableOpacity>

        {/* Floating Moment Stack */}
        {moments.length > 0 && (
          <TouchableOpacity
            style={styles.momentStackContainer}
            onPress={() => {
              router.push({
                pathname: '/camera',
                params: { momentsStr: JSON.stringify(moments), initialIndex: "0" }
              } as any);
            }}
            activeOpacity={0.8}
          >
            {moments.slice(0, 3).map((m, index) => (
              <Image 
                key={m.id}
                source={{ uri: m.image_url }}
                style={[
                  styles.momentStackItem, 
                  { 
                    zIndex: 10 - index, 
                    right: index * 10, 
                    bottom: index * 10,
                    borderColor: index === 0 ? '#E1306C' : '#fff'
                  }
                ]}
                contentFit="cover"
              />
            ))}
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* ------ Directions Info Bar ------ */}
      {directionsRoute && (
        <View style={styles.directionsBar}>
          <View style={styles.directionsInfo}>
            <Text style={styles.dirFriendName}>Đến {directionsRoute.friendName}</Text>
            <Text style={styles.dirDistance}>{estimateTimeStr(directionsRoute.distanceKm)}</Text>
          </View>
          <View style={styles.dirActions}>
            <TouchableOpacity style={styles.dirBtn} onPress={fitToRoute} activeOpacity={0.7}>
              <Feather name="maximize" size={16} color={Colors.white} />
              <Text style={styles.dirBtnText}>Fit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dirBtn, styles.dirBtnClear]} onPress={() => setDirectionsRoute(null)} activeOpacity={0.7}>
              <Feather name="x" size={16} color={Colors.white} />
              <Text style={styles.dirBtnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ------ Bottom Sheet (Friend clicked) ------ */}
      {selectedFriend && location && (
        <UserBottomSheet
          friendLocation={selectedFriend}
          myLat={location.coords.latitude}
          myLng={location.coords.longitude}
          onClose={() => setSelectedFriend(null)}
          onChat={() => handleFriendChat(
            selectedFriend.user_id,
            selectedFriend.user?.name || 'Bạn bè',
            selectedFriend.user?.avatar || ''
          )}
          onDirections={() => handleDirections(selectedFriend)}
          onHistory={() => {
            const name = selectedFriend.user?.name || 'Bạn bè';
            const avatar = selectedFriend.user?.avatar || '';
            setSelectedFriend(null);
            router.push({
              pathname: '/history/[userId]',
              params: { userId: selectedFriend.user_id, userName: name, userAvatar: avatar },
            } as any);
          }}
        />
      )}

      {/* ------ Map Action Panel ------ */}
      <MapActionPanel
        visible={showPanel}
        onClose={() => setShowPanel(false)}
        showTrail={showTrail}
        onToggleTrail={setShowTrail}
        saveHistory={saveHistory}
        onToggleSaveHistory={setSaveHistory}
        isSharing={isSharing}
        onToggleSharing={setIsSharing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controlsArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 25, 45, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  fabTopRight: {
    top: 60,
    right: 20,
  },
  fabTopRight2: {
    top: 120,
    right: 20,
  },
  fabBottomRight: {
    bottom: 20,
    right: 20,
  },
  fabOff: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
  },
  // Directions bar
  directionsBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 1000,
  },
  directionsInfo: { flex: 1 },
  dirFriendName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dirDistance: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '600',
    marginTop: 2,
  },
  dirActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dirBtnClear: {
    backgroundColor: '#EF4444',
  },
  dirBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  fabMenu: {
    position: 'absolute',
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 25, 45, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  fabCamera: {
    bottom: 220,
    backgroundColor: Colors.primary,
  },
  momentStackContainer: {
    position: 'absolute',
    right: 16,
    bottom: 290,
    width: 70,
    height: 70,
  },
  momentStackItem: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: '#0D1B2A',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
});
