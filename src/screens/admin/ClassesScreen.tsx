import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { Banner, Button, Card, EmptyText, Heading, Input, Label, Muted, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminSetup, type ClassRow, type TeacherRow } from '../../services/api';

type Tab = 'list' | 'add' | 'upgrade';

/**
 * Admin Classes — same as the website's: every classroom (grade, room,
 * year, teacher, how many students), Add a Class, and Classes Upgrade —
 * move a class's students into next year's class, then make next year
 * the current one. (Daily attendance lives in Students → Attendance.)
 */
export function ClassesScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [setup, setSetup] = useState<AdminSetup | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');
  const [campusId, setCampusId] = useState('');

  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const activeYear = setup?.schoolYears.find(y => y.status === 'ACTIVE');
  const nextYear = setup?.schoolYears.find(y => y.status === 'PLANNING');

  const load = useCallback(async () => {
    if (!token) return;
    const [nextSetup, nextClasses, nextTeachers] = await Promise.all([api.adminSetup(token), api.classes(token), api.teachers(token)]);
    setSetup(nextSetup);
    setClasses(nextClasses);
    setTeachers(nextTeachers);
    const activeId = nextSetup.schoolYears.find(y => y.status === 'ACTIVE')?.id || '';
    const planningId = nextSetup.schoolYears.find(y => y.status === 'PLANNING')?.id;
    setSchoolYearId(current => current || activeId);
    setGradeLevelId(current => current || nextSetup.gradeLevels[0]?.id || '');
    setFromClassId(current => current || nextClasses.find(c => c.schoolYearId === activeId)?.id || '');
    setToClassId(current => current || nextClasses.find(c => c.schoolYearId === planningId)?.id || '');
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const fromOptions = useMemo(() => classes.filter(c => c.schoolYearId === activeYear?.id), [classes, activeYear]);
  const toOptions = useMemo(() => classes.filter(c => c.schoolYearId === nextYear?.id), [classes, nextYear]);
  const toClass = classes.find(c => c.id === toClassId);
  const promotedSoFar = toOptions.reduce((sum, c) => sum + c.studentCount, 0);
  // Pre-fill the teacher with the To class's current one; the admin can change it.
  useEffect(() => { setTeacherId(toClass?.teacherId || ''); }, [toClass?.teacherId, toClassId]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await action());
      await load();
    } catch (error) {
      setMessage(errorText(error, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const addClass = () => {
    if (!token) return;
    if (!name.trim()) { setMessage('Class name is required.'); return; }
    if (!gradeLevelId || !schoolYearId) { setMessage('Grade and school year are required.'); return; }
    run(async () => {
      await api.addClass(token, { name: name.trim(), gradeLevelId, roomName: roomName.trim() || undefined, schoolYearId, campusId: campusId || undefined });
      setName(''); setRoomName('');
      setTab('list');
      return `${name.trim()} added.`;
    });
  };

  const promote = async () => {
    if (!token || !fromClassId || !toClassId) return;
    const fromClass = classes.find(c => c.id === fromClassId);
    const teacherName = teachers.find(t => t.id === teacherId)?.fullName;
    const reassigning = teacherId && teacherId !== toClass?.teacherId;
    const ok = await confirm(
      'Promote students?',
      `Move every active student in "${fromClass?.name}" into "${toClass?.name}" (Grade ${toClass?.gradeName})${teacherName ? `, taught by ${teacherName}` : ''}${reassigning ? '. This moves that teacher off their current class' : ''}.`,
      'Promote',
    );
    if (!ok) return;
    run(async () => {
      const result = await api.promoteByClass(token, { fromClassId, toClassId, teacherUserId: teacherId || undefined });
      return `${result.promoted} student(s) promoted to "${toClass?.name}"${result.skipped ? ` (${result.skipped} already had an enrollment there)` : ''}.`;
    });
  };

  const activate = async () => {
    if (!token || !nextYear) return;
    const ok = await confirm(
      `Make ${nextYear.name} the current year?`,
      `${activeYear?.name ?? 'The current year'} will close, and parents and teachers will see the new grades, classes and teachers the next time they sign in.`,
      'Activate',
    );
    if (ok) run(async () => { await api.activateSchoolYear(token, nextYear.id); return `${nextYear.name} is now the active school year.`; });
  };

  const gradeOptions = setup?.gradeLevels.map(g => ({ label: g.name, value: g.id })) ?? [];
  const yearOptions = setup?.schoolYears.map(y => ({ label: `${y.name}${y.status === 'ACTIVE' ? ' (active)' : ''}`, value: y.id })) ?? [];

  return (
    <Screen title="Classes" subtitle="Set up classrooms — name, grade, and room.">
      <SubTabs tabs={[{ key: 'list', label: 'Classes' }, { key: 'add', label: 'Add a Class' }, { key: 'upgrade', label: 'Upgrade' }]} active={tab} onChange={setTab} />
      <Banner text={message} onDismiss={() => setMessage('')} />

      {tab === 'list' && (classes.length === 0 ? <EmptyText>No classes set up yet.</EmptyText> : classes.map(c => (
        <Card key={c.id}>
          <View style={styles.header}>
            <Text style={styles.name}>{c.name}</Text>
            <Text style={styles.count}>{c.studentCount} student{c.studentCount === 1 ? '' : 's'}</Text>
          </View>
          <Muted>Grade {c.gradeName}{c.roomName ? ` · ${c.roomName}` : ''} · {c.schoolYearName}</Muted>
          <Muted>Teacher: {c.teacherName || 'Unassigned'}</Muted>
        </Card>
      )))}

      {tab === 'add' && (
        <Card>
          <Heading>New class</Heading>
          <Input placeholder="Class name (e.g. Grade 1 - Room 12)" value={name} onChangeText={setName} />
          <Input placeholder="Room name (optional)" value={roomName} onChangeText={setRoomName} />
          <Dropdown label="Grade" options={gradeOptions} value={gradeLevelId} onChange={setGradeLevelId} />
          <Dropdown label="School year" options={yearOptions} value={schoolYearId} onChange={setSchoolYearId} />
          {setup && setup.campuses.length > 1 && (
            <Dropdown
              label="Location"
              options={[{ label: 'Primary location', value: '' }, ...setup.campuses.map(c => ({ label: c.name, value: c.id }))]}
              value={campusId}
              onChange={setCampusId}
            />
          )}
          <Button label={busy ? 'Adding…' : 'Add Class'} onPress={addClass} disabled={busy} />
        </Card>
      )}

      {tab === 'upgrade' && (
        <>
          <Card>
            <Heading>Promote Students</Heading>
            <Muted>{activeYear?.name ?? 'Current year'} → {nextYear?.name ?? 'next year (not set up yet)'}</Muted>
            {fromOptions.length === 0
              ? <Label>No classes in {activeYear?.name || 'the active year'} yet.</Label>
              : <Dropdown label="From class" options={fromOptions.map(c => ({ label: c.name, value: c.id }))} value={fromClassId} onChange={setFromClassId} />}
            {toOptions.length === 0
              ? <Label>No classes set up for {nextYear?.name || 'next year'} yet. Add them in "Add a Class".</Label>
              : <Dropdown label="To class" options={toOptions.map(c => ({ label: `${c.name} (Grade ${c.gradeName})`, value: c.id }))} value={toClassId} onChange={setToClassId} />}
            <Dropdown
              label="Teacher"
              options={[{ label: 'No teacher assigned', value: '' }, ...teachers.map(t => ({ label: t.fullName, value: t.id }))]}
              value={teacherId}
              onChange={setTeacherId}
            />
            <Button label="Update" onPress={promote} disabled={busy || !fromClassId || !toClassId} />
          </Card>

          {nextYear && (
            <Card>
              <Heading>Activate School Year</Heading>
              <Muted>{promotedSoFar} student{promotedSoFar === 1 ? '' : 's'} promoted into {nextYear.name} so far.</Muted>
              <Muted>Once every class has been promoted, make {nextYear.name} the current year. {activeYear?.name} will close.</Muted>
              <Button label={busy ? 'Activating…' : `Activate ${nextYear.name}`} onPress={activate} disabled={busy} />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#374151', flexShrink: 1 },
  count: { fontSize: 13, fontWeight: '600', color: '#1976D2' },
});
