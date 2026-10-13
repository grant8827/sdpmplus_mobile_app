import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Dropdown } from '../../components/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { api, type GuardianRequestStatus, type MyGuardians } from '../../services/api';
import { Pill } from '../../components/ui';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { showInviteResult } from '../../utils/invite';

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Guardian', 'Other']
  .map(label => ({ label, value: label }));
const emptyForm = { fullName: '', email: '', phone: '', relationship: 'Grandmother' };

const REQUEST_STATUS: Record<GuardianRequestStatus, { label: string; tone: 'amber' | 'green' | 'red' }> = {
  PENDING: { label: 'Waiting for the school', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Not approved', tone: 'red' },
};

/**
 * Lets a parent ask for another adult (e.g. the other parent, or a
 * grandparent) to be authorized for drop-off/pick-up of their children.
 * The school approves or rejects it; the adult gets an email link to set
 * up their own account (nobody chooses a password for them). Below the
 * form, the parent sees where each request stands and who is already
 * authorized — same as the website.
 */
export function AddGuardianScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guardians, setGuardians] = useState<MyGuardians>({ authorized: [], requests: [] });
  const loadGuardians = useCallback(() => {
    if (token) api.myGuardians(token).then(setGuardians).catch(() => {});
  }, [token]);
  useEffect(loadGuardians, [loadGuardians]);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!token) return;
    setMessage('');
    if (!form.fullName.trim() || !form.email.trim()) {
      setMessage('Name and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.inviteGuardian(token, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        relationship: form.relationship,
      });
      setMessage(`Request sent. The school will review it, and you'll get a message once ${form.fullName.trim()} is approved. Until then they can't drop off or pick up.`);
      if (result.emailSent !== undefined) showInviteResult(form.fullName.trim(), result, 'Request sent.');
      setForm(emptyForm);
      loadGuardians();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add guardian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Add Guardian" subtitle="Invite another parent or family member to drop off/pick up your children.">
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Full Name" value={form.fullName} onChangeText={v => set('fullName', v)} />
        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={v => set('email', v)} />
        <TextInput style={styles.input} placeholder="Phone (optional)" keyboardType="phone-pad" value={form.phone} onChangeText={v => set('phone', v)} />
        <Dropdown label="Relationship to your child(ren)" options={RELATIONSHIP_OPTIONS} value={form.relationship} onChange={v => set('relationship', v)} />
        <Text style={styles.hint}>They'll get an email to set up their own account.</Text>

        <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Sending…' : 'Send for Approval'}</Text>
        </TouchableOpacity>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {guardians.requests.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.listTitle}>Your requests</Text>
          {guardians.requests.map(request => (
            <View key={request.batchId} style={styles.listRow}>
              <View style={styles.listHeader}>
                <Text style={styles.listName}>{request.fullName}</Text>
                <Pill label={REQUEST_STATUS[request.status]?.label ?? request.status} tone={REQUEST_STATUS[request.status]?.tone ?? 'amber'} />
              </View>
              <Text style={styles.hint}>{request.relationship} · for {request.students.join(', ')} · asked {formatUtcTimestamp(request.requestedAt)}</Text>
              {request.decisionNote ? <Text style={styles.hint}>School's note: {request.decisionNote}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {guardians.authorized.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.listTitle}>Adults authorized for your children</Text>
          {guardians.authorized.map(adult => (
            <View key={adult.guardianId} style={styles.listRow}>
              <Text style={styles.listName}>{adult.fullName}</Text>
              <Text style={styles.hint}>{adult.relationship} · {adult.students.join(', ')}{adult.canPickUp ? '' : ' · not allowed to pick up'}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  listRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E2E4E9', gap: 4 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  listName: { fontSize: 15, fontWeight: '600', color: '#374151', flexShrink: 1 },
  hint: { fontSize: 13, color: '#6B7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    gap: 10,
  },
  input: {
    backgroundColor: '#F4F8FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  submitButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { color: '#fff', fontWeight: '600' },
  message: { fontSize: 14, color: '#374151' },
});
