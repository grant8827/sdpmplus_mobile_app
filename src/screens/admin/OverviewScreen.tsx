import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { mockAdminMetrics } from '../../mocks/mockData';
import { realtimeService } from '../../services/realtime';
import type { AdminOverviewMetrics } from '../../types';

/** SDP-11 (overview half): schoolwide metrics dashboard. */
export function OverviewScreen() {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics>(mockAdminMetrics);

  // Keep "Present Today" and "Pending Requests" live as queue/attendance
  // events land, rather than requiring a manual refresh.
  useEffect(() => {
    const unsubApproved = realtimeService.on('queue:request-approved', () => {
      setMetrics(m => ({ ...m, pendingRequests: Math.max(0, m.pendingRequests - 1) }));
    });
    const unsubNewRequest = realtimeService.on('queue:new-request', () => {
      setMetrics(m => ({ ...m, pendingRequests: m.pendingRequests + 1 }));
    });
    const unsubAttendance = realtimeService.on('attendance:updated', record => {
      if (record.status === 'PRESENT') {
        setMetrics(m => ({ ...m, presentToday: m.presentToday + 1 }));
      }
    });
    return () => {
      unsubApproved();
      unsubNewRequest();
      unsubAttendance();
    };
  }, []);

  const tiles: { label: string; value: number }[] = [
    { label: 'Total Enrolled Students', value: metrics.totalEnrolledStudents },
    { label: 'Active Teachers', value: metrics.activeTeachers },
    { label: 'Present Today', value: metrics.presentToday },
    { label: 'Pending Requests', value: metrics.pendingRequests },
  ];

  return (
    <Screen title="Overview" subtitle="School-wide snapshot.">
      <View style={styles.grid}>
        {tiles.map(tile => (
          <View key={tile.label} style={styles.tile}>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
  },
  tileValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  tileLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
});
