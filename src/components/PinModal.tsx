import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, COLORS, Input, Label } from './ui';
import { digitsOnly, pinProblem } from '../utils/pin';

/**
 * The popup a parent sees when they tap Pick Up: enter their 6-digit
 * pickup PIN — or, the first time, create one (typed twice). "Forgot
 * PIN?" emails them a link to choose a new one. `onSubmit` rejects with
 * the server's message (wrong PIN, tries left, locked), shown here.
 *
 * The boxes are marked as one-time codes: two masked boxes in a row make
 * iOS offer a "strong password", which stops the second one taking input.
 */
export function PinModal({
  visible,
  mode,
  childName,
  onSubmit,
  onForgot,
  onClose,
}: {
  visible: boolean;
  mode: 'create' | 'enter';
  childName: string;
  onSubmit: (pin: string) => Promise<void>;
  onForgot: () => Promise<string>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Every time it opens (or switches between enter and create) it starts empty.
  useEffect(() => { setPin(''); setConfirm(''); setError(''); setNotice(''); setBusy(false); }, [visible, mode]);

  const submit = async () => {
    const problem = mode === 'create' ? pinProblem(pin, confirm) : (/^\d{6}$/.test(pin) ? null : 'Enter your 6-digit PIN.');
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPin('');
      setConfirm('');
      setBusy(false);
    }
  };
  const forgot = async () => {
    setError('');
    try { setNotice(await onForgot()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the email'); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{mode === 'create' ? 'Create your pickup PIN' : 'Enter your pickup PIN'}</Text>
          <Text style={styles.message}>
            {mode === 'create'
              ? `Choose a 6-digit PIN that only you know. You'll enter it each time you request a pickup. Then we'll send the pickup request for ${childName}.`
              : `To request the pickup for ${childName}.`}
          </Text>
          <Label>{mode === 'create' ? 'New PIN (6 digits)' : 'PIN'}</Label>
          <Input
            style={styles.pin}
            value={pin}
            onChangeText={text => setPin(digitsOnly(text))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
            autoComplete="off"
            textContentType="oneTimeCode"
          />
          {mode === 'create' && (
            <>
              <Label>Type it again</Label>
              <Input style={styles.pin} value={confirm} onChangeText={text => setConfirm(digitsOnly(text))} keyboardType="number-pad" secureTextEntry maxLength={6} autoComplete="off" textContentType="oneTimeCode" />
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onClose} disabled={busy} style={styles.flex} />
            <Button label={busy ? 'Sending…' : mode === 'create' ? 'Save & request' : 'Request pickup'} onPress={submit} disabled={busy} style={styles.flex} />
          </View>
          {mode === 'enter' && (
            <TouchableOpacity onPress={forgot} accessibilityRole="button">
              <Text style={styles.forgot}>Forgot PIN?</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.slate },
  message: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  pin: { fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  error: { color: COLORS.red, fontSize: 14 },
  notice: { color: COLORS.slate, fontSize: 14, backgroundColor: 'rgba(57, 168, 68, 0.1)', borderLeftWidth: 4, borderLeftColor: COLORS.green, borderRadius: 8, padding: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
  forgot: { textAlign: 'center', color: COLORS.blue, fontWeight: '600', fontSize: 14, paddingVertical: 6 },
});
