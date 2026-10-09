import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Dropdown } from '../../components/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { api, type MyAttendanceChild } from '../../services/api';
import { getMonthWeeks, MONTH_NAMES, WEEKDAY_LABELS } from '../../utils/month';

type StoredStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY';
// LATE isn't a stored status — it's PRESENT with the late flag set (the
// student checked in after the school's configured start time), shown
// as its own badge/legend entry so it reads as "L" instead of "✓".
type DisplayStatus = StoredStatus | 'WEEKEND' | 'UNMARKED' | 'LATE';

const STATUS_LABEL: Record<DisplayStatus, string> = {
  PRESENT: '✓', ABSENT: 'X', HOLIDAY: 'H', WEEKEND: 'WK', SICK: 'S', SUSPENDED: 'SP', UNMARKED: '—', LATE: 'L',
};
const STATUS_COLOR: Record<DisplayStatus, string> = {
  PRESENT: '#39A844', ABSENT: '#DC2626', HOLIDAY: '#123B6D', WEEKEND: '#E5E7EB', SICK: '#F5B82E', SUSPENDED: '#111827', UNMARKED: '#F3F4F6', LATE: '#F97316',
};
const STATUS_TEXT_COLOR: Record<DisplayStatus, string> = {
  PRESENT: '#fff', ABSENT: '#fff', HOLIDAY: '#fff', SICK: '#123B6D', SUSPENDED: '#fff', WEEKEND: '#6B7280', UNMARKED: '#9CA3AF', LATE: '#fff',
};
const STATUS_MEANING: Record<DisplayStatus, string> = {
  PRESENT: 'Present — checked in for the day',
  ABSENT: 'Absent',
  HOLIDAY: 'School holiday',
  WEEKEND: 'Weekend',
  SICK: 'Sick',
  SUSPENDED: 'Suspended',
  UNMARKED: 'Not yet marked by the teacher',
  LATE: 'Late — dropped off after the school start time',
};
// Grid only shows the 5 school weekdays — Sat/Sun never render as columns.
const LEGEND_ORDER: DisplayStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY', 'WEEKEND', 'SICK', 'SUSPENDED'];

const POLL_MS = 4000;
const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ label: name, value: i + 1 }));
const YEAR_DROPDOWN_OPTIONS = YEAR_OPTIONS.map(y => ({ label: String(y), value: y }));

/**
 * Reached from the parent's Menu tab — a full month, laid out week by
 * week (weekdays only), for every linked child. Present/Absent/Sick/
 * Suspended/Holiday come from attendance_records (a teacher marks
 * these — this screen is read-only).
 */
export function AttendanceScreen() {
  const { token } = useAuth();
  const [children, setChildren] = useState<MyAttendanceChild[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myAttendance(token).then(next => { if (!cancelled) setChildren(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const weeks = getMonthWeeks(year, month);
  const weekdayLabels = WEEKDAY_LABELS.slice(0, 5);

  const statusFor = (child: MyAttendanceChild, date: string | null): DisplayStatus | null => {
    if (!date) return null;
    const record = child.records.find(r => r.date === date);
    if (!record) return 'UNMARKED';
    return record.status === 'PRESENT' && record.late ? 'LATE' : record.status;
  };

  return (
    <Screen title="Attendance" subtitle="Select a month to see the full record, week by week.">
      <View style={styles.filterRow}>
        <View style={styles.filterCol}>
          <Dropdown label="Month" options={MONTH_OPTIONS} value={month} onChange={setMonth} />
        </View>
        <View style={styles.filterCol}>
          <Dropdown label="Year" options={YEAR_DROPDOWN_OPTIONS} value={year} onChange={setYear} />
        </View>
        <TouchableOpacity style={styles.infoButton} onPress={() => setInfoOpen(true)}>
          <Text style={styles.infoButtonText}>ℹ️ Info</Text>
        </TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <Text style={styles.empty}>No children linked to this account yet.</Text>
      ) : (
        children.map(child => (
          <View key={child.id} style={styles.card}>
            <Text style={styles.childName}>{child.fullName}</Text>
            <Text style={styles.teacherLine}>
              {child.className ? `${child.className}${child.teacherName ? ` · ${child.teacherName}` : ''}` : 'Unassigned'}
              {' — '}{MONTH_NAMES[month - 1]} {year}
            </Text>

            <View style={styles.weekHeader}>
              {weekdayLabels.map(label => (
                <Text key={label} style={styles.weekHeaderCell}>{label}</Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.slice(0, 5).map((day, dayIndex) => {
                  const status = statusFor(child, day.date);
                  return (
                    <View key={dayIndex} style={styles.dayCell}>
                      {day.dayOfMonth !== null && (
                        <>
                          <Text style={styles.dayNumber}>{day.dayOfMonth}</Text>
                          <View style={[styles.dayBadge, { backgroundColor: STATUS_COLOR[status!] }]}>
                            <Text style={[styles.dayBadgeText, { color: STATUS_TEXT_COLOR[status!] }]}>{STATUS_LABEL[status!]}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))
      )}

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setInfoOpen(false)}>
          <View style={styles.infoSheet}>
            <Text style={styles.infoTitle}>What the icons mean</Text>
            {LEGEND_ORDER.map(key => (
              <View key={key} style={styles.infoRow}>
                <View style={[styles.legendSwatch, { backgroundColor: STATUS_COLOR[key] }]}>
                  <Text style={[styles.legendSwatchText, { color: STATUS_TEXT_COLOR[key] }]}>{STATUS_LABEL[key]}</Text>
                </View>
                <Text style={styles.infoRowText}>{STATUS_MEANING[key]}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setInfoOpen(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6B7280', fontSize: 14 },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  filterCol: { flex: 1 },
  infoButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  infoButtonText: { color: '#1976D2', fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    gap: 6,
  },
  childName: { fontSize: 17, fontWeight: '600', color: '#374151' },
  teacherLine: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  weekHeader: { flexDirection: 'row' },
  weekHeaderCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  weekRow: { flexDirection: 'row', marginTop: 6 },
  dayCell: { flex: 1, alignItems: 'center', gap: 3, minHeight: 44 },
  dayNumber: { fontSize: 11, color: '#9CA3AF' },
  dayBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  infoSheet: { backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '85%', gap: 12 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoRowText: { fontSize: 14, color: '#374151', flexShrink: 1 },
  legendSwatch: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  legendSwatchText: { fontSize: 11, fontWeight: '700' },
  closeButton: { marginTop: 8, backgroundColor: '#1976D2', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontWeight: '600' },
});
