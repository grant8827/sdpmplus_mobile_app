import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { SentNotice } from '../types';
import { COLORS, EmptyText, errorText } from './ui';

/**
 * The Sent tab of every Messages screen (admin, teacher, parent): what
 * the signed-in user sent, and to whom. Loads on mount, so opening the
 * tab right after sending shows the new message.
 */
export function SentNotices() {
  const { token } = useAuth();
  const [sent, setSent] = useState<SentNotice[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.sentNotices(token)
      .then(next => { if (!cancelled) setSent(next); })
      .catch(err => { if (!cancelled) setError(errorText(err, 'Could not load sent messages')); });
    return () => { cancelled = true; };
  }, [token]);

  if (error) return <EmptyText>{error}</EmptyText>;
  if (!sent) return <EmptyText>Loading…</EmptyText>;
  if (sent.length === 0) return <EmptyText>You haven't sent any messages yet.</EmptyText>;

  return (
    <>
      {sent.map(notice => (
        <View key={notice.id} style={styles.card}>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.body}>{notice.body}</Text>
          <Text style={styles.meta}>To: {notice.recipient} · {new Date(notice.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.slate },
  body: { fontSize: 14, color: COLORS.slate, marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 12, color: COLORS.faint, marginTop: 10 },
});
