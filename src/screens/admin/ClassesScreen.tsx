import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { Banner, Button, COLORS, Card, EmptyText, Heading, Input, Label, Muted, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminSetup, type ClassRow, type TeacherRow } from '../../services/api';
import { nextSchoolYearName } from '../../utils/schoolYear';

type Tab = 'list' | 'add' | 'upgrade';
// The "Upgrade into" choice when next school year doesn't exist yet.
const NEW_YEAR = 'new-year';

/**
 * Admin Classes — same as the website's: every classroom (grade, room,
 * year, teacher, how many students), Add a Class, and Classes Upgrade —
 * move a class's students into a class next year (seen once that year is
 * activated) or, with a warning, into another class this year (seen at
 * once). (Daily attendance lives in Students → Attendance.)
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
  const [targetYearId, setTargetYearId] = useState('');

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
    // Upgrading defaults to next year (or offering to create it), never to an immediate move.
    setTargetYearId(current => (current && current !== NEW_YEAR ? current : planningId || NEW_YEAR));
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const fromOptions = useMemo(() => classes.filter(c => c.schoolYearId === activeYear?.id), [classes, activeYear]);
  // To class: any class (any grade) in the chosen year, except the From class.
  const toOptions = useMemo(() => classes.filter(c => c.schoolYearId === targetYearId && c.id !== fromClassId), [classes, targetYearId, fromClassId]);
  useEffect(() => {
    if (!toOptions.some(c => c.id === toClassId)) setToClassId(toOptions[0]?.id || '');
  }, [toOptions, toClassId]);
  const fromClass = classes.find(c => c.id === fromClassId);
  const toClass = classes.find(c => c.id === toClassId);
  const teacher = teachers.find(t => t.id === teacherId);
  const sameYear = Boolean(activeYear) && targetYearId === activeYear?.id;
  const targetYearName = targetYearId === NEW_YEAR ? nextSchoolYearName(activeYear?.name) : setup?.schoolYears.find(y => y.id === targetYearId)?.name;
  // The class the chosen teacher leaves this year, if any.
  const teacherLeaves = sameYear && teacher?.classId && teacher.classId !== toClassId ? teacher.className : undefined;
  const promotedSoFar = classes.filter(c => c.schoolYearId === nextYear?.id).reduce((sum, c) => sum + c.studentCount, 0);
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

  const createNextYear = () => {
    if (!token) return;
    run(async () => {
      const year = await api.createNextSchoolYear(token);
      setTargetYearId(year.id);
      return year.created ? `${year.name} created. Add its classes, then upgrade students into them.` : `${year.name} is already set up.`;
    });
  };
  const addClassForYear = () => {
    setSchoolYearId(targetYearId);
    setTab('add');
  };

  const promote = async () => {
    if (!token || !fromClassId || !toClassId) return;
    const teacherName = teacher?.fullName;
    const reassigning = teacherId && teacherId !== toClass?.teacherId;
    const ok = sameYear
      ? await confirm(
        'Move students now?',
        [
          `You are upgrading within the current school year (${activeYear?.name}). This takes effect immediately:`,
          `• The students leave "${fromClass?.name}" and join "${toClass?.name}" (Grade ${toClass?.gradeName}) now. Parents see the new grade and teacher right away.`,
          '• Their earlier class for this year is not kept as history. Attendance already recorded is kept.',
          ...(teacherName ? [`• ${teacherName} teaches "${toClass?.name}"${teacherLeaves ? `. "${teacherLeaves}" will have no teacher until you assign one` : ''}.`] : []),
          "• Drop-off and pickup requests that are waiting go to the new class's teacher.",
        ].join('\n'),
        'Move now',
        true,
      )
      : await confirm(
        'Promote students?',
        `Move every active student in "${fromClass?.name}" into "${toClass?.name}" (Grade ${toClass?.gradeName})${teacherName ? `, taught by ${teacherName}` : ''}${reassigning ? `. ${teacherName} teaches that class in ${targetYearName}` : ''}. Parents and teachers see it once ${targetYearName} is activated.`,
        'Promote',
      );
    if (!ok) return;
    run(async () => {
      const result = await api.promoteByClass(token, { fromClassId, toClassId, teacherUserId: teacherId || undefined });
      return result.sameYear
        ? `${result.promoted} student(s) moved to "${toClass?.name}". Parents and the teacher see the change now.`
        : `${result.promoted} student(s) promoted to "${toClass?.name}"${result.skipped ? ` (${result.skipped} already had an enrollment there)` : ''}. Parents and teachers see it once ${targetYearName} is activated.`;
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
            <Dropdown
              label="Upgrade into (school year)"
              options={[
                nextYear ? { label: `${nextYear.name} (next year)`, value: nextYear.id } : { label: `${nextSchoolYearName(activeYear?.name)} (next year) — create it`, value: NEW_YEAR },
                ...(activeYear ? [{ label: `${activeYear.name} (current year)`, value: activeYear.id }] : []),
              ]}
              value={targetYearId}
              onChange={setTargetYearId}
            />
            {targetYearId === NEW_YEAR ? (
              <>
                <Muted>{targetYearName} doesn't exist yet. Create it, add its classes, then upgrade students into them. Nothing changes for parents or teachers until you activate it.</Muted>
                <Button label={busy ? 'Creating…' : `Create ${targetYearName}`} onPress={createNextYear} disabled={busy} />
              </>
            ) : (
              <>
                {fromOptions.length === 0
                  ? <Label>No classes in {activeYear?.name || 'the active year'} yet.</Label>
                  : <Dropdown label="From class" options={fromOptions.map(c => ({ label: `${c.name} (Grade ${c.gradeName})`, value: c.id }))} value={fromClassId} onChange={setFromClassId} />}
                {toOptions.length === 0 ? (
                  <>
                    <Label>No other classes in {targetYearName} yet.</Label>
                    <Button label={`Add a class for ${targetYearName}`} variant="secondary" small onPress={addClassForYear} />
                  </>
                ) : <Dropdown label="To class" options={toOptions.map(c => ({ label: `${c.name} (Grade ${c.gradeName})`, value: c.id }))} value={toClassId} onChange={setToClassId} />}
                <Dropdown
                  label="Teacher"
                  options={[{ label: 'No teacher assigned', value: '' }, ...teachers.filter(t => t.active).map(t => ({ label: `${t.fullName}${t.className ? ` — teaches ${t.className}` : ''}`, value: t.id }))]}
                  value={teacherId}
                  onChange={setTeacherId}
                />
                {sameYear && (
                  <View style={styles.warning} accessibilityRole="alert">
                    <Text style={styles.warningTitle}>You are upgrading within the current school year ({activeYear?.name}). This takes effect immediately:</Text>
                    <Text style={styles.warningText}>• The students leave {fromClass ? `"${fromClass.name}"` : 'the From class'} and join {toClass ? `"${toClass.name}"` : 'the To class'} now. Parents see the new grade and teacher right away.</Text>
                    <Text style={styles.warningText}>• Their earlier class for this year is not kept as history. Attendance already recorded is kept.</Text>
                    {teacher && <Text style={styles.warningText}>• {teacher.fullName} teaches the new class{teacherLeaves ? `; "${teacherLeaves}" will have no teacher until you assign one` : ''}.</Text>}
                    <Text style={styles.warningText}>• Drop-off and pickup requests that are waiting go to the new class's teacher.</Text>
                    <Text style={styles.warningText}>For the end-of-year upgrade, choose next year instead: nothing changes for parents or teachers until you activate the new year.</Text>
                  </View>
                )}
                <Button label={sameYear ? 'Move students now' : 'Update'} onPress={promote} disabled={busy || !fromClassId || !toClassId} />
              </>
            )}
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
  warning: { borderLeftWidth: 4, borderLeftColor: COLORS.amber, paddingLeft: 10, gap: 4 },
  warningTitle: { fontSize: 14, fontWeight: '700', color: COLORS.slate, lineHeight: 20 },
  warningText: { fontSize: 14, color: COLORS.slate, lineHeight: 20 },
});
