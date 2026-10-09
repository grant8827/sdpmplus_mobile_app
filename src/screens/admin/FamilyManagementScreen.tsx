import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Banner, Button, Card, EmptyText, Heading, Input, Muted, Pill, Row, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type Guardian, type GuardianRequest } from '../../services/api';
import { showInviteResult } from '../../utils/invite';
import { GuardianRequestsPanel } from './GuardianRequestsPanel';

type Tab = 'list' | 'add' | 'approvals';

/**
 * Admin Families — same as the website's: the parent list (suspend,
 * resend invite / reset link, delete), Add Parent (they get an email to
 * choose their own password), and Pending Approvals for adults a parent
 * asked to have authorized. Front desk staff see the list read-only.
 * Children are linked to a parent from Students → Register.
 */
export function FamilyManagementScreen() {
  const { token, canManageSchool } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setGuardians(await api.guardians(token));
    if (canManageSchool) setRequests(await api.guardianRequests(token));
  }, [token, canManageSchool]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const term = search.trim().toLowerCase();
  const visible = guardians.filter(g => !term || g.fullName.toLowerCase().includes(term) || g.email.toLowerCase().includes(term));

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
    if (!fullName.trim() || !email.trim()) { setMessage('Full name and email are required.'); return; }
    run(async () => {
      const name = fullName.trim();
      const result = await api.addGuardian(token, { fullName: name, email: email.trim(), phone: phone.trim() || undefined });
      setFullName(''); setPhone(''); setEmail('');
      setTab('list');
      if (result.emailSent === undefined) return `${name} already had an account and was added to this school. We let them know by email.`;
      showInviteResult(name, result);
      return 'Parent registered.';
    });
  };

  const toggleSuspend = (guardian: Guardian) => {
    if (!token) return;
    run(async () => { await api.setGuardianActive(token, guardian.id, !guardian.active); return `${guardian.fullName} ${guardian.active ? 'suspended' : 'reactivated'}.`; });
  };
  const sendLink = (guardian: Guardian) => {
    if (!token) return;
    run(async () => { showInviteResult(guardian.fullName, await api.sendAccountLink(token, guardian.userId), guardian.needsSetup ? 'Invite sent.' : 'Reset link sent.'); });
  };
  const remove = async (guardian: Guardian) => {
    if (!token) return;
    const ok = await confirm(`Delete ${guardian.fullName}?`, 'This removes them from the school and unlinks their children.', 'Delete', true);
    if (ok) run(async () => { await api.deleteGuardian(token, guardian.id); return `${guardian.fullName} was removed.`; });
  };

  const tabs = [
    { key: 'list' as Tab, label: 'Parents' },
    ...(canManageSchool ? [
      { key: 'add' as Tab, label: 'Add Parent' },
      { key: 'approvals' as Tab, label: `Approvals${pendingCount ? ` (${pendingCount})` : ''}` },
    ] : []),
  ];

  return (
    <Screen title="Families" subtitle="Register parents and manage their accounts.">
      <SubTabs tabs={tabs} active={tab} onChange={setTab} />
      {tab !== 'approvals' && <Banner text={message} onDismiss={() => setMessage('')} />}

      {tab === 'add' && (
        <Card>
          <Heading>Add Parent</Heading>
          <Input placeholder="Full name" value={fullName} onChangeText={setFullName} />
          <Input placeholder="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Muted>They'll get an email with a link to choose their own password. Children are linked to a parent from Students → Register.</Muted>
          <Button label={busy ? 'Saving…' : 'Register Parent'} onPress={add} disabled={busy} />
        </Card>
      )}

      {tab === 'approvals' && <GuardianRequestsPanel requests={requests} onChanged={load} />}

      {tab === 'list' && (
        <>
          <Input placeholder="Search by name or email…" value={search} onChangeText={setSearch} autoCapitalize="none" />
          {visible.length === 0 ? <EmptyText>{term ? `No parent matches "${search.trim()}".` : 'No parents registered yet.'}</EmptyText> : visible.map(guardian => (
            <Card key={guardian.id}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.name}>{guardian.fullName}</Text>
                  <Muted>{[guardian.email, guardian.phone].filter(Boolean).join(' · ')}</Muted>
                </View>
                <Pill label={guardian.active ? 'Active' : 'Suspended'} tone={guardian.active ? 'green' : 'amber'} />
              </View>
              <Muted>Children: {guardian.children.length ? guardian.children.map(c => c.fullName).join(', ') : 'None linked'}</Muted>
              {guardian.needsSetup && <Muted>Invited — hasn't set up their account yet.</Muted>}
              {canManageSchool && (
                <Row>
                  <Button label={guardian.active ? 'Suspend' : 'Reactivate'} variant="secondary" small onPress={() => toggleSuspend(guardian)} disabled={busy} />
                  {guardian.active && <Button label={guardian.needsSetup ? 'Resend invite' : 'Email reset link'} variant="secondary" small onPress={() => sendLink(guardian)} disabled={busy} />}
                  <Button label="Delete" variant="danger" small onPress={() => remove(guardian)} disabled={busy} />
                </Row>
              )}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: '#374151' },
});
