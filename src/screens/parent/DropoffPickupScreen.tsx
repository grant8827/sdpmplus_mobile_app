import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { mockChildren } from '../../mocks/mockData';
import { realtimeService } from '../../services/realtime';
import type { Child, QueueItem } from '../../types';
import { CHILD_STATUS_COLOR, CHILD_STATUS_LABEL } from '../../utils/childStatus';

/**
 * SDP-3: Parent Tab 1 - Drop-off & Pick-up Screen.
 *
 * TODO once backend exists:
 * - Replace mockChildren with a fetch scoped to the logged-in parent.
 * - (Optional/Geofence AC) gate the buttons on GPS proximity to the
 *   school zone — not implemented here pending scope confirmation.
 */
export function DropoffPickupScreen() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>(() =>
    mockChildren.filter(c => c.parentId === user?.id),
  );

  // Reflect teacher approvals back onto this screen in real time.
  useEffect(() => {
    return realtimeService.on('queue:request-approved', ({ childId }) => {
      setChildren(prev =>
        prev.map(c => {
          if (c.id !== childId) return c;
          if (c.status === 'DROPOFF_REQUESTED') return { ...c, status: 'PRESENT' };
          if (c.status === 'PICKUP_REQUESTED') return { ...c, status: 'PICKED_UP' };
          return c;
        }),
      );
    });
  }, []);

  const requestDropOff = (child: Child) => {
    setChildren(prev =>
      prev.map(c => (c.id === child.id ? { ...c, status: 'DROPOFF_REQUESTED' } : c)),
    );
    const queueItem: QueueItem = {
      id: `${child.id}-dropoff-${Date.now()}`,
      childId: child.id,
      childName: child.fullName,
      parentName: user?.fullName ?? 'Parent',
      requestType: 'DROP_OFF',
      requestedAt: new Date().toISOString(),
    };
    realtimeService.emit('queue:new-request', queueItem);
  };

  const requestPickUp = (child: Child) => {
    setChildren(prev =>
      prev.map(c => (c.id === child.id ? { ...c, status: 'PICKUP_REQUESTED' } : c)),
    );
    const queueItem: QueueItem = {
      id: `${child.id}-pickup-${Date.now()}`,
      childId: child.id,
      childName: child.fullName,
      parentName: user?.fullName ?? 'Parent',
      requestType: 'PICK_UP',
      requestedAt: new Date().toISOString(),
    };
    realtimeService.emit('queue:new-request', queueItem);
  };

  return (
    <Screen
      title="Drop-off & Pick-up"
      subtitle="Alert your child's teacher when you arrive."
    >
      {children.length === 0 ? (
        <Text style={styles.empty}>No children linked to this account yet.</Text>
      ) : (
        children.map(child => (
          <View key={child.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.childName}>{child.fullName}</Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: CHILD_STATUS_COLOR[child.status] },
                ]}
              >
                <Text style={styles.statusText}>
                  {CHILD_STATUS_LABEL[child.status]}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.dropOffButton,
                  child.status !== 'AT_HOME' && styles.disabledButton,
                ]}
                disabled={child.status !== 'AT_HOME'}
                onPress={() => requestDropOff(child)}
              >
                <Text style={styles.actionText}>Drop Off</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.pickUpButton,
                  child.status !== 'PRESENT' && styles.disabledButton,
                ]}
                disabled={child.status !== 'PRESENT'}
                onPress={() => requestPickUp(child)}
              >
                <Text style={styles.actionText}>Pick Up</Text>
              </TouchableOpacity>
            </View>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  childName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1D23',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dropOffButton: {
    backgroundColor: '#2563EB',
  },
  pickUpButton: {
    backgroundColor: '#7C3AED',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
