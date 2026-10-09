import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useNotices } from '../../context/NoticesContext';

/** SDP-5: Parent Tab 3 - School Notices & Announcements. */
export function NoticesScreen() {
  const { notices, markRead } = useNotices();

  return (
    <Screen title="Notices" subtitle="Announcements from the school and your child's teacher.">
      {notices.length === 0 ? (
        <Text style={styles.empty}>No notices yet.</Text>
      ) : (
        notices
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(notice => (
            <TouchableOpacity
              key={notice.id}
              style={[styles.card, !notice.read && styles.cardUnread]}
              onPress={() => markRead(notice.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                {!notice.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.noticeBody}>{notice.body}</Text>
              <Text style={styles.noticeMeta}>
                {notice.senderName} ({notice.senderRole}) ·{' '}
                {new Date(notice.createdAt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
  },
  cardUnread: {
    borderColor: '#1976D2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flexShrink: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
  },
  noticeBody: {
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
  },
  noticeMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
});
