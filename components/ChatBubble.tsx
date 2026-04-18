// =========================================================
// components/ChatBubble.tsx
// Component hiển thị tin nhắn chat (phải = của mình, trái = bạn)
// =========================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/colors';
import { Message } from '../services/chatService';

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  showTimeAbove?: boolean;
}

const formatTimeAbove = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
  
  const timePart = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return timePart;
  } else if (diffDays < 7) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${timePart} ${days[date.getDay()]}`;
  } else {
    return `${timePart} ${date.getDate()}/${date.getMonth() + 1}`;
  }
};

export default function ChatBubble({ message, isMine, showTimeAbove }: ChatBubbleProps) {
  const [showDetailTime, setShowDetailTime] = useState(false);
  const time = new Date(message.created_at).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.wrapper}>
      {showTimeAbove && (
        <Text style={styles.timeAboveText}>{formatTimeAbove(message.created_at)}</Text>
      )}
      <View style={[styles.container, isMine ? styles.containerMine : styles.containerTheirs]}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => setShowDetailTime(!showDetailTime)}
        >
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
              {message.content}
            </Text>
          </View>
        </TouchableOpacity>
        {showDetailTime && (
          <Text style={[styles.timeDetailText, isMine && styles.timeDetailTextMine]}>{time}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  containerMine: {
    alignSelf: 'flex-end',
  },
  containerTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.gray100,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textMine: {
    color: Colors.white,
  },
  textTheirs: {
    color: Colors.textPrimary,
  },
  timeAboveText: {
    alignSelf: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  timeDetailText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    marginHorizontal: 4,
  },
  timeDetailTextMine: {
    alignSelf: 'flex-end',
  },
});
