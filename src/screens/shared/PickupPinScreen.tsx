import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Screen } from '../../components/Screen';
import { Banner, Button, COLORS, Card, Input, Label, Muted, Pill } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { digitsOnly, pinProblem } from '../../utils/pin';

/**
 * Profile → Pickup PIN (parents): create the 6-digit pickup PIN if it
 * isn't set, change it (needs the current PIN), or get a "Forgot PIN?"
 * email with a link to choose a new one.
 */
export function PickupPinScreen() {
  const { token } = useAuth();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) api.myPin(token).then(r => setHasPin(r.hasPin)).catch(error => setMessage(error.message));
  }, [token]);

  const save = async () => {
    if (!token || hasPin === null) return;
    const problem = (hasPin && !/^\d{6}$/.test(current)) ? 'Enter your current 6-digit PIN.' : pinProblem(pin, confirm);
    if (problem) { setMessage(problem); return; }
    setBusy(true);
    setMessage('');
    try {
      if (hasPin) await api.changePin(token, current, pin); else await api.createPin(token, pin);
      setMessage(hasPin ? 'Your pickup PIN was changed.' : 'Your pickup PIN is set.');
      setHasPin(true);
      setCurrent(''); setPin(''); setConfirm('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the PIN');
      setCurrent('');
    } finally {
      setBusy(false);
    }
  };
  const forgot = async () => {
    if (!token) return;
    try { setMessage((await api.forgotPin(token)).message); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send the email'); }
  };

  const pinField = { keyboardType: 'number-pad' as const, secureTextEntry: true, maxLength: 6, autoComplete: 'off' as const, textContentType: 'oneTimeCode' as const, style: styles.pin };

  return (
    <Screen title="Pickup PIN" subtitle="The 6-digit PIN you enter each time you request a pickup.">
      <Banner text={message} onDismiss={() => setMessage('')} />
      {hasPin !== null && (
        <Card>
          <Pill label={hasPin ? 'PIN is set' : 'No PIN yet'} tone={hasPin ? 'green' : 'amber'} />
          <Muted>Keep it to yourself: it shows a pickup request really came from you.</Muted>
          {hasPin && (
            <>
              <Label>Current PIN</Label>
              <Input {...pinField} value={current} onChangeText={text => setCurrent(digitsOnly(text))} />
            </>
          )}
          <Label>{hasPin ? 'New PIN (6 digits)' : 'PIN (6 digits)'}</Label>
          <Input {...pinField} value={pin} onChangeText={text => setPin(digitsOnly(text))} />
          <Label>Type it again</Label>
          <Input {...pinField} value={confirm} onChangeText={text => setConfirm(digitsOnly(text))} />
          <Button label={busy ? 'Saving…' : hasPin ? 'Change PIN' : 'Create PIN'} onPress={save} disabled={busy} />
          {hasPin && (
            <TouchableOpacity onPress={forgot} accessibilityRole="button">
              <Text style={styles.forgot}>Forgot PIN?</Text>
            </TouchableOpacity>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pin: { fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  forgot: { textAlign: 'center', color: COLORS.blue, fontWeight: '600', fontSize: 14, paddingVertical: 6 },
});
