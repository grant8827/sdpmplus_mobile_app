import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { QueueItem } from '../types';

/**
 * Shared card list for a live queue (already filtered to one request type
 * by the caller's tab): who is asking, for which child, and Confirm /
 * Decline. onApprove/onDecline reject with the server's message, which is
 * shown on the card.
 */
export function QueueList({
  items,
  onApprove,
  onDecline,
}: {
  items: QueueItem[];
  onApprove: (item: QueueItem) => Promise<void>;
  onDecline: (item: QueueItem) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) return <Text style={styles.empty}>No pending requests.</Text>;

  const run = async (item: QueueItem, action: () => Promise<void>) => {
    setBusy(item.id);
    setErrors(current => ({ ...current, [item.id]: '' }));
    try { await action(); }
    catch (error) { setErrors(current => ({ ...current, [item.id]: error instanceof Error ? error.message : 'Something went wrong' })); }
    finally { setBusy(null); }
  };

  return (
    <>
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            {item.childPhotoUrl ? (
              <Image source={{ uri: item.childPhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{item.childName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.nameCol}>
              <Text style={styles.childName}>{item.childName}</Text>
              <Text style={styles.className}>{item.className || 'Unassigned'}</Text>
            </View>
            <Text style={styles.requestType}>
              {item.requestType === 'DROP_OFF' ? 'Drop-off' : 'Pick-up'}
            </Text>
          </View>
          <Text style={styles.parentName}>Parent: {item.parentName}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.requestedAt).toLocaleTimeString()}
          </Text>

          {errors[item.id] ? <Text style={styles.error}>{errors[item.id]}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmButton, busy === item.id && styles.disabledButton]}
              disabled={busy === item.id}
              onPress={() => run(item, () => onApprove(item))}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} disabled={busy === item.id} onPress={() => run(item, () => onDecline(item))}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nameCol: { flex: 1, marginLeft: 10 },
  childName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  className: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  requestType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  parentName: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', gap: 8 },
  confirmButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: { opacity: 0.5 },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 10 },
});
