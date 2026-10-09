import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { MfaEnrollment } from '../services/api';

/**
 * Setting up an authenticator app on this phone: "Open authenticator
 * app" hands the otpauth:// link straight to it (or the key can be typed
 * in), then the user enters the 6-digit code it shows to prove it works.
 * `begin`/`confirm` are the sign-in or signed-in variants of the same
 * API. Afterwards shows the one-time recovery codes; onDone once saved.
 */
export function MfaEnroll({ begin, confirm, onDone, onError }: {
  begin: () => Promise<MfaEnrollment>;
  confirm: (code: string) => Promise<string[]>;
  onDone: () => void;
  onError?: (error: unknown) => void;
}) {
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    begin().then(setEnrollment).catch(err => { setError(err instanceof Error ? err.message : 'Could not start setup'); onError?.(err); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openApp = async () => {
    if (!enrollment) return;
    try { await Linking.openURL(enrollment.otpauthUri); }
    catch { Alert.alert('No authenticator app found', 'Install Google Authenticator or Microsoft Authenticator, or type the key below into your app.'); }
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try { setRecoveryCodes(await confirm(code)); }
    catch (err) { setError(err instanceof Error ? err.message : 'That code did not work'); setCode(''); onError?.(err); }
    finally { setBusy(false); }
  };

  if (recoveryCodes) return <RecoveryCodes codes={recoveryCodes} onDone={onDone} />;

  return (
    <View style={styles.column}>
      <Text style={styles.body}>1. Install an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, …).</Text>
      <Text style={styles.body}>2. Add this account to it:</Text>
      {enrollment ? (
        <>
          <TouchableOpacity style={styles.secondaryButton} onPress={openApp}>
            <Text style={styles.secondaryText}>Open authenticator app</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Or type this key into the app:</Text>
          <Text selectable style={styles.key}>{enrollment.secret.match(/.{1,4}/g)?.join(' ')}</Text>
        </>
      ) : <ActivityIndicator />}
      <Text style={styles.body}>3. Enter the 6-digit code the app shows:</Text>
      <TextInput
        style={styles.codeInput}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        placeholder="6-digit code"
        placeholderTextColor="#9CA3AF"
        value={code}
        onChangeText={text => setCode(text.replace(/\D/g, '').slice(0, 6))}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.primaryButton, (busy || code.length !== 6) && styles.disabled]} disabled={busy || code.length !== 6} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Turn on two-step verification</Text>}
      </TouchableOpacity>
    </View>
  );
}

/** Shown once after setup: each code signs in once if the phone is lost. The server only keeps hashes. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const share = () => Share.share({ message: `School Drop-off & Pick-up recovery codes (each works once):\n\n${codes.join('\n')}` }).catch(() => {});
  return (
    <View style={styles.column}>
      <Text style={styles.body}>
        <Text style={styles.bold}>Save these recovery codes somewhere safe.</Text> If you lose your phone, each code lets you sign in once. They won't be shown again.
      </Text>
      <View style={styles.codes}>
        {codes.map(code => <Text key={code} selectable style={styles.codeItem}>{code}</Text>)}
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={share}>
        <Text style={styles.secondaryText}>Save or share…</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
        <Text style={styles.primaryText}>I've saved these codes</Text>
      </TouchableOpacity>
    </View>
  );
}

export const mfaStyles = StyleSheet.create({
  codeInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 12,
    fontSize: 20, letterSpacing: 4, textAlign: 'center', color: '#374151', backgroundColor: '#fff',
  },
  primaryButton: { backgroundColor: '#1976D2', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: '#1976D2', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#1976D2', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  error: { color: '#DC2626', fontSize: 13 },
  body: { fontSize: 14, color: '#374151', lineHeight: 20 },
});

const styles = StyleSheet.create({
  ...mfaStyles,
  column: { gap: 12 },
  bold: { fontWeight: '700' },
  hint: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  key: { fontSize: 16, fontFamily: 'Menlo', textAlign: 'center', letterSpacing: 1, color: '#374151' },
  codes: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, rowGap: 6 },
  codeItem: { width: '50%', fontFamily: 'Menlo', fontSize: 15, color: '#374151' },
});
