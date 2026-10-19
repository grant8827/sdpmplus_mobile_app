import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api, type SchoolDeletionRequest } from '../services/api';
import type { MenuStackParamList } from '../navigation/MenuStackNavigator';
import { Button, COLORS, Card, Heading, Input, Muted, PasswordInput, confirm, errorText } from './ui';

const STATUS: Record<string, string> = { REQUESTED: 'Received', UNDER_REVIEW: 'Being reviewed', APPROVED: 'Approved', PROCESSING: 'Being carried out' };
const day = (stamp: string) => new Date(`${stamp.replace(' ', 'T')}Z`).toLocaleDateString();

/**
 * Profile → Delete school account (school administrators only), same as
 * the website's: sends a request to delete the whole school to the
 * SDPMPlus team, who carry it out within 30 days. The school keeps
 * working until then, and the request can be withdrawn while it is
 * being reviewed.
 */
export function DeleteSchoolCard() {
  const { token, schools, activeSchoolId } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList>>();
  const schoolName = (schools.find(s => s.schoolId === activeSchoolId) ?? schools[0])?.schoolName ?? '';
  const [request, setRequest] = useState<SchoolDeletionRequest | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.schoolDeletionRequest(token).then(result => setRequest(result.request)).catch(() => setRequest(null));
  }, [token, activeSchoolId]);

  const submit = async () => {
    if (!token) return;
    if (confirmName.trim().toLowerCase() !== schoolName.trim().toLowerCase()) { setMessage(`Type the school's name, ${schoolName}, to confirm.`); return; }
    if (!password) { setMessage('Enter your password.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const result = await api.requestSchoolDeletion(token, { confirmName, password, reason: reason.trim() || undefined });
      setRequest(result.request);
      setOpen(false);
      setConfirmName(''); setPassword(''); setReason('');
      setMessage('Your request to delete the school has been sent.');
    } catch (error) {
      setMessage(errorText(error, 'Could not send the request'));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!token || !(await confirm('Withdraw the request?', 'Your school will not be deleted.', 'Withdraw'))) return;
    setBusy(true);
    setMessage('');
    try {
      await api.withdrawSchoolDeletion(token);
      setRequest(null);
      setMessage('Request withdrawn. Your school will not be deleted.');
    } catch (error) {
      setMessage(errorText(error, 'Could not withdraw the request'));
    } finally {
      setBusy(false);
    }
  };

  if (request === undefined) return null;
  return (
    <Card style={styles.card}>
      <Heading>Delete school account</Heading>
      {request ? (
        <>
          <Text style={styles.text}>
            {request.requesterName} asked for {schoolName} to be deleted on {day(request.createdAt)}. Status: {STATUS[request.status] ?? request.status}.
            The SDPMPlus team will complete it by {day(request.dueAt)}. Until then everything keeps working.
          </Text>
          <Button label="Download data (Data & Privacy)" variant="secondary" small onPress={() => navigation.navigate('DataPrivacy')} />
          {request.canWithdraw
            ? <Button label="Withdraw request" variant="secondary" onPress={withdraw} disabled={busy} />
            : <Muted>The request has been approved and can no longer be withdrawn here. Contact SDPMPlus support if this is a mistake.</Muted>}
        </>
      ) : !open ? (
        <>
          <Text style={styles.text}>
            Permanently delete {schoolName} and everything in it: students, parents, teachers and staff accounts, classes, attendance, messages and photos. This can't be undone.
          </Text>
          <Button label="Delete school account…" variant="danger" onPress={() => { setOpen(true); setMessage(''); }} />
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.text}>• Your request goes to the SDPMPlus team, who delete the school within 30 days.</Text>
          <Text style={styles.text}>• Until then the school keeps working, so you can download your data from Data & Privacy.</Text>
          <Text style={styles.text}>• You can withdraw the request here while it is being reviewed.</Text>
          <Text style={styles.text}>• Once deleted, every account, student record, class, attendance record, message and photo is gone for good. Cancel your subscription separately under Upgrade Plan.</Text>
          <Muted>Type {schoolName} to confirm</Muted>
          <Input value={confirmName} onChangeText={setConfirmName} autoCapitalize="none" autoCorrect={false} />
          <PasswordInput placeholder="Your password" value={password} onChangeText={setPassword} autoComplete="current-password" />
          <Input placeholder="Why are you leaving? (optional)" value={reason} onChangeText={setReason} multiline />
          <Button label="Cancel" variant="secondary" onPress={() => { setOpen(false); setMessage(''); }} disabled={busy} />
          <Button label={busy ? 'Sending…' : 'Request deletion'} variant="danger" onPress={submit} disabled={busy} />
        </View>
      )}
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 4, borderLeftColor: COLORS.red, gap: 10 },
  form: { gap: 10 },
  text: { fontSize: 14, color: COLORS.slate, lineHeight: 20 },
});
