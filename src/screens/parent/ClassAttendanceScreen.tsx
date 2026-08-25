import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { mockAttendance, mockChildren, mockTeachers } from '../../mocks/mockData';
import { realtimeService } from '../../services/realtime';
import type { AttendanceRecord, DailyAttendanceStatus } from '../../types';
import { getCurrentWeekdayDates } from '../../utils/week';

const STATUS_COLOR: Record<DailyAttendanceStatus, string> = {
  PRESENT: '#16A34A',
  ABSENT: '#DC2626',
  PENDING: '#D1D5DB',
};

const STATUS_LABEL: Record<DailyAttendanceStatus, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  PENDING: '—',
};

/**
 * SDP-4: Parent Tab 2 - Class Roster & Weekly Attendance.
 * "Screen automatically updates when a teacher confirms drop-off for
 * the day" — handled via the `attendance:updated` real-time event,
 * which SDP-7 (auto-mark-present on approval) is expected to emit.
 */
export function ClassAttendanceScreen() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance);
  const week = getCurrentWeekdayDates();
  const children = mockChildren.filter(c => c.parentId === user?.id);

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

  return (
    <Screen title="Class & Attendance" subtitle="Weekly view, Monday through Friday.">
      {children.map(child => {
        const teacher = mockTeachers.find(t => t.id === child.teacherId);
        return (
          <View key={child.id} style={styles.card}>
            <Text style={styles.childName}>{child.fullName}</Text>
            <Text style={styles.teacherLine}>
              {teacher ? `${teacher.fullName} · ${teacher.roomName}` : 'Unassigned'}
            </Text>

            <View style={styles.grid}>
              {week.map(({ label, date }) => {
                const record = attendance.find(
                  a => a.childId === child.id && a.date === date,
                );
                const status = record?.status ?? 'PENDING';
                return (
                  <View key={date} style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{label}</Text>
                    <View
                      style={[styles.dayBadge, { backgroundColor: STATUS_COLOR[status] }]}
                    >
                      <Text style={styles.dayBadgeText}>{STATUS_LABEL[status]}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
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
  },
  childName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1D23',
  },
  teacherLine: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
