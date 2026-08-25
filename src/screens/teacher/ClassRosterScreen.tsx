import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { mockAttendance, mockChildren } from '../../mocks/mockData';
import { realtimeService } from '../../services/realtime';
import type { AttendanceRecord, DailyAttendanceStatus } from '../../types';

const STATUS_COLOR: Record<DailyAttendanceStatus, string> = {
  PRESENT: '#16A34A',
  ABSENT: '#DC2626',
  PENDING: '#9CA3AF',
};

const today = new Date().toISOString().slice(0, 10);

/**
 * SDP-8: Teacher Tab 2 - Class Roster (attendance view half of the
 * issue). See ComposeNoticeScreen.tsx for the targeted-notices half.
 */
export function ClassRosterScreen() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance);

  const roster = useMemo(
    () => mockChildren.filter(c => c.teacherId === user?.id),
    [user?.id],
  );

  useEffect(() => {
    return realtimeService.on('attendance:updated', record => {
      setAttendance(prev => {
        const others = prev.filter(
          r => !(r.childId === record.childId && r.date === record.date),
        );
        return [...others, record];
      });
    });
  }, []);

  const statusFor = (childId: string): DailyAttendanceStatus =>
    attendance.find(a => a.childId === childId && a.date === today)?.status ?? 'PENDING';

  return (
    <Screen title="Class Roster" subtitle="Today's attendance for your class.">
      {roster.map(child => (
        <View key={child.id} style={styles.card}>
          <Text style={styles.childName}>{child.fullName}</Text>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[statusFor(child.id)] }]}>
            <Text style={styles.statusText}>{statusFor(child.id)}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childName: {
    fontSize: 16,
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
});
