import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { realtimeService } from '../../services/realtime';
import type { QueueItem } from '../../types';

/**
 * SDP-6: Teacher Tab 1 - Live Drop-off & Pick-up Queue with Green Highlight.
 * SDP-7: Approving a drop-off auto-marks attendance and syncs the
 * parent's Class tab — done here by emitting `attendance:updated` and
 * `queue:request-approved` for the same action, so both parent
 * screens (SDP-3, SDP-4) stay in sync without a page reload.
 *
 * TODO: scope the incoming feed to this teacher's own roster once the
 * backend attaches a teacherId to each request.
 */
export function LiveQueueScreen() {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    return realtimeService.on('queue:new-request', item => {
      setQueue(prev => [item, ...prev]);
    });
  }, []);

  const approve = (item: QueueItem) => {
    setQueue(prev => prev.filter(q => q.id !== item.id));

    realtimeService.emit('queue:request-approved', {
      queueItemId: item.id,
      childId: item.childId,
    });

    if (item.requestType === 'DROP_OFF') {
      realtimeService.emit('attendance:updated', {
        childId: item.childId,
        date: new Date().toISOString().slice(0, 10),
        status: 'PRESENT',
      });
    }
  };

  return (
    <Screen title="Live Queue" subtitle="Incoming drop-off and pick-up requests.">
      {queue.length === 0 ? (
        <Text style={styles.empty}>No pending requests.</Text>
      ) : (
        queue.map(item => (
          <View
            key={item.id}
            style={[
              styles.card,
              item.requestType === 'PICK_UP' && styles.pickUpHighlight,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.childName}>{item.childName}</Text>
              <Text style={styles.requestType}>
                {item.requestType === 'DROP_OFF' ? 'Drop-off' : 'Pick-up'}
              </Text>
            </View>
            <Text style={styles.parentName}>Parent: {item.parentName}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.requestedAt).toLocaleTimeString()}
            </Text>

            <TouchableOpacity style={styles.approveButton} onPress={() => approve(item)}>
              <Text style={styles.approveText}>Approve / Confirm</Text>
            </TouchableOpacity>
          </View>
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
  // SDP-6 AC: pick-up requests MUST highlight bright green.
  pickUpHighlight: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  childName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D23',
  },
  requestType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1D23',
  },
  parentName: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  approveButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveText: {
    color: '#fff',
    fontWeight: '600',
  },
});
