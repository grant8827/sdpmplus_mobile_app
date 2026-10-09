import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Dropdown } from './Dropdown';
import type { AttendanceRow, SettableAttendanceStatus } from '../services/api';

const STATUS_LABEL: Record<AttendanceRow['status'], string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  SICK: 'Sick',
  SUSPENDED: 'Suspended',
  HOLIDAY: 'Holiday',
  WEEKEND: 'Weekend (WK)',
  UNMARKED: 'Not marked',
};
const STATUS_COLOR: Record<AttendanceRow['status'], string> = {
  PRESENT: '#39A844',
  ABSENT: '#DC2626',
  SICK: '#F5B82E',
  SUSPENDED: '#111827',
  HOLIDAY: '#123B6D',
  WEEKEND: '#E5E7EB',
  UNMARKED: '#9CA3AF',
};
const STATUS_TEXT_COLOR: Record<AttendanceRow['status'], string> = {
  PRESENT: '#fff', ABSENT: '#fff', SICK: '#123B6D', SUSPENDED: '#fff', HOLIDAY: '#fff',
  WEEKEND: '#374151', UNMARKED: '#fff',
};
// Every date defaults to WEEKEND (Sat/Sun) or UNMARKED (weekday) until a
// teacher/admin picks something from this list — including picking
// Weekend back explicitly, e.g. after having overridden a Saturday.
const SETTABLE_STATUSES: SettableAttendanceStatus[] = ['PRESENT', 'ABSENT', 'SICK', 'SUSPENDED', 'HOLIDAY', 'WEEKEND'];
const DROPDOWN_OPTIONS = SETTABLE_STATUSES.map(status => ({ label: STATUS_LABEL[status], value: status }));

/** Shared attendance roster list — mirrors the website's AttendanceList (frontend/src/components/AttendanceList.tsx). */
export function AttendanceList({ rows, onMark }: { rows: AttendanceRow[]; onMark: (row: AttendanceRow, status: SettableAttendanceStatus) => void }) {
  if (rows.length === 0) return <Text style={styles.empty}>No students to show.</Text>;

  return (
    <>
      {rows.map(row => (
        <View key={row.studentId} style={styles.card}>
          <View style={styles.header}>
            {row.photoUrl ? (
              <Image source={{ uri: row.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{row.fullName.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.name}>{row.fullName}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: STATUS_COLOR[row.status] }]}>
            <Text style={[styles.pillText, { color: STATUS_TEXT_COLOR[row.status] }]}>{STATUS_LABEL[row.status]}</Text>
          </View>
          <Dropdown<AttendanceRow['status']>
            label="Status"
            options={DROPDOWN_OPTIONS}
            value={row.status}
            onChange={status => onMark(row, status as SettableAttendanceStatus)}
          />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6B7280', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  name: { fontSize: 16, fontWeight: '600', color: '#374151' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
});
