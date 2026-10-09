import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Dropdown } from '../../components/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { showInviteResult } from '../../utils/invite';

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Guardian', 'Other']
  .map(label => ({ label, value: label }));
const emptyForm = { fullName: '', email: '', phone: '', relationship: 'Grandmother' };

/**
 * Lets a parent ask for another adult (e.g. the other parent, or a
 * grandparent) to be authorized for drop-off/pick-up of their children.
 * The school approves or rejects it; the adult gets an email link to set
 * up their own account (nobody chooses a password for them).
 */
export function AddGuardianScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
