// =========================================================
// app/intro.tsx
// Màn hình giới thiệu ứng dụng - hiển thị lần đầu tiên mở app.
// Gồm 3 trang slide với nội dung giới thiệu chức năng.
// =========================================================

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { setIntroShown } from '../utils/storage';
// NativeWind v4 không cần import styled - dùng className trực tiếp

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---- Dữ liệu nội dung từng trang slide ----
const slides = [
  {
    id: '1',
    title: 'Chia Sẻ Vị Trí',
    description:
      'Tự động chia sẻ vị trí của bạn với bạn bè và những người xung quanh theo thời gian thực.',
    emoji: '📍',
    bg: '#E8F4FD',
    accent: '#2196F3',
  },
  {
    id: '2',
    title: 'Kết Nối Người Lân Cận',
    description:
      'Khám phá và kết nối với những người đang ở gần bạn. Xây dựng mạng lưới xã hội dựa trên vị trí địa lý.',
    emoji: '🤝',
    bg: '#F0FDF4',
    accent: '#22C55E',
  },
  {
    id: '3',
    title: 'Bump & Chia Sẻ',
    description:
      'Chia sẻ thông tin nhanh chóng chỉ bằng cách "bump" điện thoại với người khác. Đơn giản như chạm tay!',
    emoji: '⚡',
    bg: '#FEF9EB',
    accent: '#F59E0B',
  },
];

type Slide = typeof slides[0];

// =========================================================
// Component hiển thị từng trang slide
// =========================================================
function SlideItem({ item }: { item: Slide }) {
  return (
    <View
      style={{ width: SCREEN_WIDTH, backgroundColor: item.bg }}
      className="flex-1 items-center justify-center px-8"
    >
      {/* Icon emoji lớn */}
      <Text style={{ fontSize: 100 }}>{item.emoji}</Text>

      {/* Tiêu đề */}
      <Text
        style={{ color: item.accent }}
        className="text-3xl font-bold text-center mt-8 mb-4"
      >
        {item.title}
      </Text>

      {/* Mô tả */}
      <Text className="text-base text-gray-600 text-center leading-6">
        {item.description}
      </Text>
    </View>
  );
}

// =========================================================
// Component chấm chỉ trang (pagination dots)
// =========================================================
function PaginationDots({
  currentIndex,
  accent,
}: {
  currentIndex: number;
  accent: string;
}) {
  return (
    <View className="flex-row justify-center items-center py-4">
      {slides.map((_, index) => (
        <View
          key={index}
          style={{
            width: currentIndex === index ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: currentIndex === index ? accent : '#CBD5E1',
            marginHorizontal: 4,
          }}
        />
      ))}
    </View>
  );
}

// =========================================================
// Màn hình Intro chính
// =========================================================
export default function IntroScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Màu accent của slide hiện tại
  const currentAccent = slides[currentIndex].accent;
  const isLastSlide = currentIndex === slides.length - 1;

  // ---- Xử lý khi cuộn slide ----
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  // ---- Chuyển sang slide tiếp theo ----
  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  // ---- Bỏ qua intro ----
  const handleSkip = async () => {
    await handleFinish();
  };

  // ---- Hoàn thành intro ----
  const handleFinish = async () => {
    await setIntroShown(); // Đánh dấu đã xem intro
    router.replace('/login' as any); // Chuyển đến màn hình Login
  };

  return (
    <View className="flex-1 bg-white">
      {/* ---- Nút Skip (ẩn khi ở slide cuối) ---- */}
      {!isLastSlide && (
        <View className="absolute top-12 right-6 z-10">
          <TouchableOpacity onPress={handleSkip} className="py-2 px-4">
            <Text className="text-gray-500 text-base font-medium">Bỏ qua</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---- Danh sách slide ngang ---- */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      />

      {/* ---- Phần điều hướng phía dưới ---- */}
      <View className="pb-10 px-8 bg-white">
        {/* Dots pagination */}
        <PaginationDots currentIndex={currentIndex} accent={currentAccent} />

        {/* Nút Next / Bắt đầu */}
        <TouchableOpacity
          onPress={handleNext}
          style={{ backgroundColor: currentAccent }}
          className="rounded-2xl py-4 items-center mt-2"
        >
          <Text className="text-white text-lg font-bold">
            {isLastSlide ? '🚀  Bắt Đầu' : 'Tiếp Theo →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
