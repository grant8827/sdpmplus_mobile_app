import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Notice } from '../types';
import { COLORS, EmptyText } from './ui';

/**
 * An inbox: one card per message, unread ones outlined in blue with a
 * dot. Tapping a card marks it read. Shared by the admin Overview and
 * Messages screens and the teacher's Messages screen.
 */
export function NoticeCards({
  notices,
  onRead,
  showSender = true,
  emptyText = 'No messages yet.',
}: {
  notices: Notice[];
  onRead: (noticeId: string) => void;
  showSender?: boolean;
  emptyText?: string;
}) {
  if (notices.length === 0) return <EmptyText>{emptyText}</EmptyText>;
  return (
    <>
      {notices.map(notice => (
        <TouchableOpacity key={notice.id} style={[styles.card, !notice.read && styles.unread]} onPress={() => onRead(notice.id)}>
          <View style={styles.header}>
            <Text style={styles.title}>{notice.title}</Text>
            {!notice.read && <View style={styles.dot} />}
          </View>
          <Text style={styles.body}>{notice.body}</Text>
          <Text style={styles.meta}>
            {showSender && notice.senderName ? `${notice.senderName}${notice.senderRole ? ` (${notice.senderRole})` : ''} · ` : ''}
            {new Date(notice.createdAt).toLocaleString()}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  unread: { borderColor: COLORS.blue },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.slate, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue },
  body: { fontSize: 14, color: COLORS.slate, marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 12, color: COLORS.faint, marginTop: 10 },
});
