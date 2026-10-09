import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { PhotoPicker } from '../../components/PhotoPicker';
import { AttendanceList } from '../../components/AttendanceList';
import { SummaryTile } from '../../components/SummaryTile';
import { Avatar, Banner, Button, COLORS, Card, EmptyText, Heading, Input, Muted, Pill, Row, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminSetup, type AttendanceRow, type AttendanceSummary, type SettableAttendanceStatus, type Student } from '../../services/api';
import { showInviteResult } from '../../utils/invite';

interface DraftChild {
  firstName: string;
  lastName: string;
  studentNumber: string;
  dateOfBirth: string;
  gradeLevelId: string;
  classId: string;
  daycare: boolean;
  photoDataUrl: string;
}
const emptyChild = (gradeLevelId = ''): DraftChild => ({ firstName: '', lastName: '', studentNumber: '', dateOfBirth: '', gradeLevelId, classId: '', daycare: false, photoDataUrl: '' });
const emptyParent = { guardianId: '', fullName: '', email: '', phone: '' };
const todayIso = () => new Date().toISOString().slice(0, 10);

type Tab = 'list' | 'attendance' | 'register';

/**
 * Admin Students — same as the website's: the student list (filter by
 * grade, search, suspend / export / remove), today's attendance for any
 * classroom with school-wide tiles, and Register — one or more children
 * at once, linked to an existing parent or a new one (who gets an email
 * to set up their account). Front desk staff can view and mark
 * attendance but not register or change students.
 */
export function StudentManagementScreen() {
  const { token, canManageSchool } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [setup, setSetup] = useState<AdminSetup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [gradeFilter, setGradeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const [children, setChildren] = useState<DraftChild[]>([emptyChild()]);
  const [parent, setParent] = useState(emptyParent);

  const activeYear = setup?.schoolYears.find(y => y.status === 'ACTIVE');

  const load = useCallback(async () => {
    if (!token) return;
    const [nextSetup, nextStudents] = await Promise.all([api.adminSetup(token), api.students(token)]);
    setSetup(nextSetup);
    setStudents(nextStudents);
    setChildren(current => current.map(c => (c.gradeLevelId ? c : { ...c, gradeLevelId: nextSetup.gradeLevels[0]?.id || '' })));
    setAttendanceClassId(current => current || nextSetup.classes[0]?.id || '');
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const loadAttendance = useCallback(async () => {
    if (!token) return;
    const [rows, nextSummary] = await Promise.all([
      attendanceClassId ? api.adminAttendance(token, attendanceClassId) : Promise.resolve([]),
      api.adminAttendanceSummary(token),
    ]);
    setAttendanceRows(rows);
    setSummary(nextSummary);
  }, [token, attendanceClassId]);
  useEffect(() => {
    if (tab === 'attendance') loadAttendance().catch(error => setMessage(error.message));
  }, [tab, loadAttendance]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students
      .filter(s => !gradeFilter || s.gradeLevelId === gradeFilter)
      .filter(s => !term || s.fullName.toLowerCase().includes(term));
  }, [students, gradeFilter, search]);

  const classesFor = (gradeLevelId: string) =>
    setup?.classes.filter(c => c.schoolYearId === activeYear?.id && c.gradeLevelId === gradeLevelId) ?? [];
  const updateChild = (index: number, patch: Partial<DraftChild>) =>
    setChildren(current => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setMessage('');
    try {
      const done = await action();
      if (done) setMessage(done);
      await load();
    } catch (error) {
      setMessage(errorText(error, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const mark = async (row: AttendanceRow, status: SettableAttendanceStatus) => {
    if (!token) return;
    try {
      await api.markAttendance(token, row.studentId, todayIso(), status);
      await loadAttendance();
    } catch (error) {
      setMessage(errorText(error, 'Could not mark attendance'));
    }
  };

  const register = () => {
    if (!token) return;
    const valid = children.filter(c => c.firstName.trim() && c.lastName.trim());
    if (valid.length === 0) { setMessage('Add at least one child with a first and last name.'); return; }
    if (!activeYear) { setMessage('No active school year is set up.'); return; }
    const missingClass = valid.find(c => !c.gradeLevelId || !c.classId);
    if (missingClass) { setMessage(`Choose a grade and class for ${missingClass.firstName || 'each child'}.`); return; }
    if (!parent.guardianId && parent.email.trim() && !parent.fullName.trim()) { setMessage("Enter the new parent's full name."); return; }
    run(async () => {
      // One at a time: the first child creates a new parent's account and
      // the rest link to it — that only works if each finishes first.
      for (const child of valid) {
        const result = await api.addStudent(token, {
          firstName: child.firstName.trim(),
          lastName: child.lastName.trim(),
          studentNumber: child.studentNumber.trim() || undefined,
          dateOfBirth: child.dateOfBirth.trim() || undefined,
          photoDataUrl: child.photoDataUrl || undefined,
          schoolYearId: activeYear.id,
          gradeLevelId: child.gradeLevelId,
          classId: child.classId,
          daycare: child.daycare,
          guardian: parent.guardianId
            ? { id: parent.guardianId, relationship: 'Parent' }
            : parent.email.trim()
              ? { fullName: parent.fullName.trim(), email: parent.email.trim(), phone: parent.phone.trim() || undefined, relationship: 'Parent' }
              : undefined,
        });
        if (result.emailSent !== undefined) showInviteResult(parent.fullName.trim(), result, 'Parent account created.');
      }
      setChildren([emptyChild(setup?.gradeLevels[0]?.id || '')]);
      setParent(emptyParent);
      setTab('list');
      return `${valid.length} ${valid.length === 1 ? 'student' : 'students'} added${parent.guardianId || parent.email.trim() ? ' and parent linked' : ''}.`;
    });
  };

  const exportRecord = (student: Student) => {
    if (!token) return;
    run(async () => {
      const record = await api.exportStudent(token, student.id);
      await Share.share({ title: `${student.fullName} record`, message: JSON.stringify(record, null, 2) });
    });
  };
  const toggleSuspend = (student: Student) => {
    if (!token) return;
    const next = student.enrollmentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    run(async () => { await api.setStudentStatus(token, student.id, next); return `${student.fullName} ${next === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`; });
  };
  const remove = async (student: Student) => {
    if (!token) return;
    const ok = await confirm(
      `Remove ${student.fullName}?`,
      "They'll disappear from class lists and the queue. You can restore them, or delete their record permanently, from Data & Privacy.",
      'Remove',
      true,
    );
    if (ok) run(async () => { await api.deleteStudent(token, student.id); return `${student.fullName} was removed.`; });
  };

  const gradeOptions = setup?.gradeLevels.map(g => ({ label: g.name, value: g.id })) ?? [];
  const tabs = [
    { key: 'list' as Tab, label: 'Students' },
    { key: 'attendance' as Tab, label: 'Attendance' },
    ...(canManageSchool ? [{ key: 'register' as Tab, label: 'Register' }] : []),
  ];

  return (
    <Screen title="Students" subtitle="Enrollment and daily attendance.">
      <SubTabs tabs={tabs} active={tab} onChange={setTab} />
      <Banner text={message} onDismiss={() => setMessage('')} />

      {tab === 'list' && (
        <>
          <Dropdown label="Grade" options={[{ label: 'All grades', value: '' }, ...gradeOptions]} value={gradeFilter} onChange={setGradeFilter} />
          <Input placeholder="Search for a student…" value={search} onChangeText={setSearch} />
          {visible.length === 0 ? (
            <EmptyText>{search.trim() ? `No student matches "${search.trim()}".` : gradeFilter ? 'No students in this grade.' : 'No students enrolled yet.'}</EmptyText>
          ) : visible.map(student => {
            const suspended = student.enrollmentStatus === 'SUSPENDED';
            return (
              <Card key={student.id}>
                <View style={styles.header}>
                  <Avatar uri={student.photoUrl} name={student.firstName} />
                  <View style={styles.headerText}>
                    <Text style={styles.name}>{student.fullName}</Text>
                    <Muted>{student.gradeName}{student.className ? ` · ${student.className}` : ''}</Muted>
                  </View>
                  <Pill label={suspended ? 'Suspended' : 'Active'} tone={suspended ? 'amber' : 'green'} />
                </View>
                <Muted>Parent(s): {student.guardians.length ? student.guardians.map(g => g.fullName).join(', ') : 'No parent linked'}</Muted>
                {canManageSchool && (
                  <Row>
                    <Button label={suspended ? 'Reactivate' : 'Suspend'} variant="secondary" small onPress={() => toggleSuspend(student)} disabled={busy} />
                    <Button label="Export" variant="secondary" small onPress={() => exportRecord(student)} disabled={busy} />
                    <Button label="Remove" variant="danger" small onPress={() => remove(student)} disabled={busy} />
                  </Row>
                )}
              </Card>
            );
          })}
        </>
      )}

      {tab === 'attendance' && (
        <>
          {summary && (
            <View style={styles.tiles}>
              <SummaryTile label="Present Today" value={summary.present} accentColor={COLORS.green} />
              <SummaryTile label="Absent Today" value={summary.absent} accentColor={COLORS.red} />
              <SummaryTile label="Sick Today" value={summary.sick} accentColor={COLORS.amberText} />
              <SummaryTile label="Late Today" value={summary.late} accentColor="#7C3AED" />
            </View>
          )}
          {setup?.classes.length ? (
            <Dropdown label="Classroom" options={setup.classes.map(c => ({ label: c.name, value: c.id }))} value={attendanceClassId} onChange={setAttendanceClassId} />
          ) : <EmptyText>No classes yet.</EmptyText>}
          <AttendanceList rows={attendanceRows} onMark={mark} />
        </>
      )}

      {tab === 'register' && (
        <>
          {children.map((child, index) => (
            <Card key={index}>
              <View style={styles.header}>
                <Heading>{children.length > 1 ? `Child ${index + 1}` : 'Student'}</Heading>
                {children.length > 1 && (
                  <Button label="Remove" variant="secondary" small onPress={() => setChildren(current => current.filter((_, i) => i !== index))} />
                )}
              </View>
              <PhotoPicker value={child.photoDataUrl} name={child.firstName} onChange={photoDataUrl => updateChild(index, { photoDataUrl })} disabled={busy} />
              <Input placeholder="First name" value={child.firstName} onChangeText={firstName => updateChild(index, { firstName })} />
              <Input placeholder="Last name" value={child.lastName} onChangeText={lastName => updateChild(index, { lastName })} />
              <Input placeholder="Student number (optional)" value={child.studentNumber} onChangeText={studentNumber => updateChild(index, { studentNumber })} />
              <Input placeholder="Date of birth, YYYY-MM-DD (optional)" value={child.dateOfBirth} onChangeText={dateOfBirth => updateChild(index, { dateOfBirth })} keyboardType="numbers-and-punctuation" />
              <Dropdown label="Grade" options={gradeOptions} value={child.gradeLevelId} onChange={gradeLevelId => updateChild(index, { gradeLevelId, classId: '' })} />
              <Dropdown
                label="Class"
                options={[{ label: 'Choose a class', value: '' }, ...classesFor(child.gradeLevelId).map(c => ({ label: c.name, value: c.id }))]}
                value={child.classId}
                onChange={classId => updateChild(index, { classId })}
              />
              <View style={styles.switchRow}>
                <Switch value={child.daycare} onValueChange={daycare => updateChild(index, { daycare })} trackColor={{ true: COLORS.blue, false: '#D1D5DB' }} />
                <Text style={styles.switchText}>Daycare (extended time)</Text>
              </View>
            </Card>
          ))}
          <Button label="+ Add Another Child" variant="secondary" onPress={() => setChildren(current => [...current, emptyChild(setup?.gradeLevels[0]?.id || '')])} />

          <Card>
            <Heading>Parent / Guardian</Heading>
            <Muted>Link an existing parent, or create a new one. Applies to every child above.</Muted>
            <Dropdown
              label="Parent"
              options={[{ label: 'Create a new parent account', value: '' }, ...(setup?.guardians ?? []).map(g => ({ label: `${g.fullName} (${g.email})`, value: g.id }))]}
              value={parent.guardianId}
              onChange={guardianId => setParent(p => ({ ...p, guardianId }))}
            />
            {!parent.guardianId && (
              <>
                <Input placeholder="Parent full name" value={parent.fullName} onChangeText={fullName => setParent(p => ({ ...p, fullName }))} />
                <Input placeholder="Parent email" autoCapitalize="none" keyboardType="email-address" value={parent.email} onChangeText={email => setParent(p => ({ ...p, email }))} />
                <Input placeholder="Phone (optional)" keyboardType="phone-pad" value={parent.phone} onChangeText={phone => setParent(p => ({ ...p, phone }))} />
                <Muted>The parent gets an email with a link to choose their own password. Photos can be added on the website.</Muted>
              </>
            )}
            <Button label={busy ? 'Adding…' : children.length > 1 ? `Add ${children.length} Students` : 'Add Student'} onPress={register} disabled={busy} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: '#374151' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchText: { fontSize: 14, color: '#374151' },
});
