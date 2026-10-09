import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { AttendanceList } from '../../components/AttendanceList';
import { Banner, Button, COLORS, Card, EmptyText, Input, Muted } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type AttendanceRow, type SettableAttendanceStatus, type TeacherAttendanceStudent } from '../../services/api';
import { MONTH_NAMES, getMonthWeeks } from '../../utils/month';

const todayIso = () => new Date().toISOString().slice(0, 10);

type StoredStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY';
// LATE isn't stored: it's PRESENT with the late flag (checked in after
// the school's start time), shown as its own "L" badge.
type DisplayStatus = StoredStatus | 'WEEKEND' | 'UNMARKED' | 'LATE';

// Same icons and colors as the website and the parent's attendance view,
// so a teacher and a parent read the same record the same way.
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
  UNMARKED: 'Not yet marked',
  LATE: 'Late — dropped off after the start time',
};
const LEGEND_ORDER: DisplayStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY', 'WEEKEND', 'SICK', 'SUSPENDED'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => ({ label: String(y), value: y }));
const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ label: name, value: i + 1 }));

type Tab = 'today' | 'history';

function Badge({ status }: { status: DisplayStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] }]}>
      <Text style={[styles.badgeText, { color: STATUS_TEXT_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

/**
 * Teacher Attendance — same as the website's two tabs: mark today's
 * attendance for the class, and Attendance History, a month-by-month,
 * week-by-week record for every student in the class.
 */
export function AttendanceScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [students, setStudents] = useState<TeacherAttendanceStudent[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [legendOpen, setLegendOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) api.teacherAttendance(token).then(setRows).catch(error => setMessage(error.message));
  }, [token]);
  useEffect(() => {
    if (token && tab === 'history') api.teacherAttendanceHistory(token).then(setStudents).catch(error => setMessage(error.message));
  }, [token, tab]);

  const mark = async (row: AttendanceRow, status: SettableAttendanceStatus) => {
    if (!token) return;
    setMessage('');
    try {
      await api.markAttendance(token, row.studentId, todayIso(), status);
      setRows(await api.teacherAttendance(token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark attendance');
    }
  };

  const weeks = getMonthWeeks(year, month);
  const statusFor = (student: TeacherAttendanceStudent, date: string): DisplayStatus => {
    const record = student.records.find(r => r.date === date);
    if (!record) return 'UNMARKED';
    return record.status === 'PRESENT' && record.late ? 'LATE' : record.status;
  };
  const term = search.trim().toLowerCase();
  const visible = students.filter(s => s.fullName.toLowerCase().includes(term));

  return (
    <Screen title="Attendance" subtitle={tab === 'today' ? "Mark today's attendance for your class." : 'Pick a month to see the full record, week by week.'}>
      <SubTabs tabs={[{ key: 'today', label: 'Today' }, { key: 'history', label: 'History' }]} active={tab} onChange={setTab} />
      <Banner text={message} onDismiss={() => setMessage('')} />

      {tab === 'today' && <AttendanceList rows={rows} onMark={mark} />}

      {tab === 'history' && (
        <>
          <View style={styles.pickers}>
            <View style={styles.flex}><Dropdown label="Month" options={MONTH_OPTIONS} value={month} onChange={setMonth} /></View>
            <View style={styles.flex}><Dropdown label="Year" options={YEAR_OPTIONS} value={year} onChange={setYear} /></View>
          </View>
          <Button label="ℹ️ What the icons mean" variant="secondary" small onPress={() => setLegendOpen(true)} />
          <Input placeholder="Search for a student…" value={search} onChangeText={setSearch} />

          {students.length === 0 ? <EmptyText>No students in this class yet.</EmptyText>
            : visible.length === 0 ? <EmptyText>No student matches "{search.trim()}".</EmptyText>
            : visible.map(student => (
              <Card key={student.id}>
                <Text style={styles.name}>{student.fullName}</Text>
                <Muted>{MONTH_NAMES[month - 1]} {year}</Muted>
                <View style={styles.weekRow}>
                  {WEEKDAYS.map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
                </View>
                {weeks.map((week, weekIndex) => (
                  <View key={weekIndex} style={styles.weekRow}>
                    {week.slice(0, 5).map((day, dayIndex) => (
                      <View key={dayIndex} style={styles.dayCell}>
                        {day.date && (
                          <>
                            <Text style={styles.dayNumber}>{day.dayOfMonth}</Text>
                            <Badge status={statusFor(student, day.date)} />
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </Card>
            ))}
        </>
      )}

      <Modal visible={legendOpen} transparent animationType="fade" onRequestClose={() => setLegendOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setLegendOpen(false)}>
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>What the icons mean</Text>
            {LEGEND_ORDER.map(key => (
              <View key={key} style={styles.legendRow}>
                <Badge status={key} />
                <Text style={styles.legendText}>{STATUS_MEANING[key]}</Text>
              </View>
            ))}
            <Button label="Close" onPress={() => setLegendOpen(false)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickers: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.slate },
  weekRow: { flexDirection: 'row', marginTop: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  dayCell: { flex: 1, alignItems: 'center', gap: 3, minHeight: 44 },
  dayNumber: { fontSize: 11, color: COLORS.muted },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  legend: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 12 },
  legendTitle: { fontSize: 17, fontWeight: '700', color: COLORS.slate },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendText: { flex: 1, fontSize: 14, color: COLORS.slate },
});
