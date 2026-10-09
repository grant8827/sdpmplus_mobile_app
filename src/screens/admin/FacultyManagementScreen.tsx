import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { PhotoPicker } from '../../components/PhotoPicker';
import { Avatar, Banner, Button, Card, ChipRow, EmptyText, Heading, Input, Label, Muted, Pill, Row, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type ClassRow, type StaffRole, type StaffRow } from '../../services/api';
import { showInviteResult } from '../../utils/invite';

const ROLE_LABELS: Record<StaffRow['role'], string> = { teacher: 'Teacher', school_admin: 'Admin', staff: 'Front Desk / Office Staff' };
const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
  { value: 'front_desk', label: 'Front Desk / Office' },
];
const emptyForm = { fullName: '', email: '', classId: '', role: 'teacher' as StaffRole, photoDataUrl: '' };

type Tab = 'staff' | 'add';

/**
 * Admin Faculty screen — same as the website's: the Staff tab lists
 * everyone with a staff account (teachers, admins, front desk) with
 * suspend / invite / reset two-step / delete actions, and a teacher can
 * be edited (name, classroom). Add Staff creates one with a role picker;
 * nobody types a password for someone else — the new person gets an
 * email link to choose their own.
 */
export function FacultyManagementScreen() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>('staff');
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editClassId, setEditClassId] = useState('');
  // undefined = photo not touched; '' = removed; a data URL = replaced.
  const [editPhoto, setEditPhoto] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [nextStaff, nextClasses] = await Promise.all([api.staff(token), api.classes(token)]);
    setStaff(nextStaff);
    setClasses(nextClasses);
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const freeClasses = useMemo(() => classes.filter(c => !c.teacherId || c.teacherId === editing?.id), [classes, editing]);
  const classOptions = [{ label: 'No classroom assigned yet', value: '' }, ...freeClasses.map(c => ({ label: c.name, value: c.id }))];

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

  const add = () => {
    if (!token) return;
    if (!form.fullName.trim() || !form.email.trim()) { setMessage('Full name and email are required.'); return; }
    run(async () => {
      const result = await api.addStaff(token, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        photoDataUrl: form.photoDataUrl || undefined,
        classId: form.role === 'teacher' ? form.classId || undefined : undefined,
      });
      const roleLabel = ROLE_LABELS[form.role === 'admin' ? 'school_admin' : form.role === 'front_desk' ? 'staff' : 'teacher'];
      const added = result.restored
        ? `${form.fullName.trim()} was on your staff before and has been added back as ${roleLabel}.`
        : `${form.fullName.trim()} was added as ${roleLabel}.`;
      showInviteResult(form.fullName.trim(), result, added);
      setForm(emptyForm);
      setTab('staff');
      return added;
    });
  };

  const startEdit = (member: StaffRow) => {
    setEditing(member);
    setEditName(member.fullName);
    setEditClassId(member.classId || '');
    setEditPhoto(undefined);
  };
  const saveEdit = () => {
    if (!token || !editing) return;
    if (!editName.trim()) { setMessage('Name is required.'); return; }
    run(async () => {
      await api.updateTeacher(token, editing.id, { fullName: editName.trim(), classId: editClassId || null, photoDataUrl: editPhoto });
      setEditing(null);
      return `${editName.trim()} updated.`;
    });
  };

  const toggleSuspend = (member: StaffRow) => {
    if (!token) return;
    run(async () => {
      await api.setStaffStatus(token, member.id, !member.active);
      return `${member.fullName} ${member.active ? 'suspended' : 'reactivated'}.`;
    });
  };
  const sendLink = (member: StaffRow) => {
    if (!token) return;
    run(async () => { showInviteResult(member.fullName, await api.sendAccountLink(token, member.id), member.needsSetup ? 'Invite sent.' : 'Reset link sent.'); });
  };
  const resetMfa = async (member: StaffRow) => {
    if (!token) return;
    const ok = await confirm('Reset two-step verification?', `Only do this after confirming who is asking. ${member.fullName} will be signed out and set it up again at their next sign-in.`, 'Reset');
    if (ok) run(async () => { await api.resetStaffMfa(token, member.id); return `Two-step verification reset for ${member.fullName}.`; });
  };
  const remove = async (member: StaffRow) => {
    if (!token) return;
    const ok = await confirm(`Delete ${member.fullName}?`, 'They lose access to this school. You can add them back later with the same email.', 'Delete', true);
    if (ok) run(async () => { await api.deleteStaff(token, member.id); return `${member.fullName} was removed.`; });
  };

  return (
    <Screen title="Faculty" subtitle="Manage teachers, admins, and office staff.">
      <SubTabs tabs={[{ key: 'staff', label: 'Staff' }, { key: 'add', label: 'Add Staff' }]} active={tab} onChange={setTab} />
      <Banner text={message} onDismiss={() => setMessage('')} />

      {tab === 'add' && (
        <Card>
          <Heading>Add Staff</Heading>
          <Label>Role</Label>
          <ChipRow options={ROLE_OPTIONS} value={form.role} onChange={role => setForm(f => ({ ...f, role }))} />
          <PhotoPicker value={form.photoDataUrl} name={form.fullName} onChange={photoDataUrl => setForm(f => ({ ...f, photoDataUrl }))} disabled={busy} />
          <Input placeholder="Full name" value={form.fullName} onChangeText={fullName => setForm(f => ({ ...f, fullName }))} />
          <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={email => setForm(f => ({ ...f, email }))} />
          {form.role === 'teacher' && (
            <Dropdown label="Classroom" options={classOptions} value={form.classId} onChange={classId => setForm(f => ({ ...f, classId }))} />
          )}
          <Muted>They'll get an email with a link to choose their own password.</Muted>
          <Button label={busy ? 'Adding…' : 'Add Staff'} onPress={add} disabled={busy} />
        </Card>
      )}

      {tab === 'staff' && editing && (
        <Card>
          <Heading>Edit {editing.fullName}</Heading>
          <PhotoPicker value={editPhoto ?? editing.photoUrl ?? ''} name={editName} onChange={setEditPhoto} disabled={busy} />
          <Input placeholder="Full name" value={editName} onChangeText={setEditName} />
          <Dropdown label="Classroom" options={classOptions} value={editClassId} onChange={setEditClassId} />
          <Row>
            <Button label="Save" onPress={saveEdit} disabled={busy} small />
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(null)} small />
          </Row>
        </Card>
      )}

      {tab === 'staff' && (staff.length === 0 ? <EmptyText>No staff added yet.</EmptyText> : staff.map(member => {
        const isMe = member.id === user?.id;
        return (
          <Card key={member.id}>
            <View style={styles.header}>
              <Avatar uri={member.photoUrl} name={member.fullName} />
              <View style={styles.headerText}>
                <Text style={styles.name}>{member.fullName}{isMe ? ' (you)' : ''}</Text>
                <Muted>{ROLE_LABELS[member.role]}{member.className ? ` · ${member.className}` : ''}</Muted>
                <Muted>{member.email}</Muted>
              </View>
              <Pill label={member.active ? 'Active' : 'Suspended'} tone={member.active ? 'green' : 'amber'} />
            </View>
            {member.needsSetup && <Muted>Invited — hasn't set up their account yet.</Muted>}
            {!isMe && (
              <Row>
                {member.role === 'teacher' && <Button label="Edit" variant="secondary" small onPress={() => startEdit(member)} />}
                <Button label={member.active ? 'Suspend' : 'Reactivate'} variant="secondary" small onPress={() => toggleSuspend(member)} disabled={busy} />
                {member.active && <Button label={member.needsSetup ? 'Resend invite' : 'Email reset link'} variant="secondary" small onPress={() => sendLink(member)} disabled={busy} />}
                {member.mfaEnabled && <Button label="Reset 2-step" variant="secondary" small onPress={() => resetMfa(member)} disabled={busy} />}
                <Button label="Delete" variant="danger" small onPress={() => remove(member)} disabled={busy} />
              </Row>
            )}
          </Card>
        );
      }))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: '#374151' },
});
