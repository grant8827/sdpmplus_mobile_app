import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api, ApiError } from '../services/api';
import type { AuthSession, MfaChallenge } from '../types';
import { MfaEnroll, mfaStyles } from './MfaEnroll';

/**
 * The second step of signing in, after a correct password: enter the
 * code from the authenticator app (or a recovery code), or — for an
 * account that must use two-step verification and hasn't yet — set it up
 * now. onSignedIn gets the finished session; onRestart fires when this
 * half-finished sign-in expired or had too many wrong codes.
 */
export function MfaSignInStep({ challenge, onSignedIn, onRestart }: {
  challenge: MfaChallenge;
  onSignedIn: (session: AuthSession) => void;
  onRestart: (message: string) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<AuthSession | null>(null);

  const restartIfExpired = (err: unknown) => {
    if (err instanceof ApiError && err.status === 410) onRestart(err.message);
  };

  if (challenge.mfaSetupRequired) {
    return (
      <View style={styles.column}>
        <Text style={styles.title}>Set up two-step verification</Text>
        <Text style={styles.subtitle}>Your account protects student information, so it needs a code from your phone as well as your password.</Text>
        <MfaEnroll
          begin={() => api.mfaSetup(challenge.mfaToken)}
          confirm={async value => {
            const { recoveryCodes, ...session } = await api.mfaSetupConfirm(challenge.mfaToken, value);
            setPendingSession(session);
            return recoveryCodes;
          }}
          onDone={() => { if (pendingSession) onSignedIn(pendingSession); }}
          onError={restartIfExpired}
        />
      </View>
    );
  }

  if (notice && pendingSession) {
    return (
      <View style={styles.column}>
        <Text style={styles.title}>Recovery code used</Text>
        <Text style={styles.subtitle}>{notice}</Text>
        <TouchableOpacity style={mfaStyles.primaryButton} onPress={() => onSignedIn(pendingSession)}>
          <Text style={mfaStyles.primaryText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const { recoveryCodesLeft, ...session } = await api.mfaVerify(challenge.mfaToken, code);
      if (recoveryCodesLeft !== undefined) {
        setPendingSession(session);
        setNotice(`You signed in with a recovery code. You have ${recoveryCodesLeft} left — if your phone is lost, set up two-step verification again from Menu → Security, or ask an administrator to reset it.`);
        return;
      }
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work');
      setCode('');
      restartIfExpired(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.column}>
      <Text style={styles.title}>Enter your code</Text>
      <Text style={styles.subtitle}>Open your authenticator app and enter the 6-digit code for School Drop-off & Pick-up. Lost your phone? Enter a recovery code instead.</Text>
      <TextInput
        style={mfaStyles.codeInput}
        autoFocus
        autoCapitalize="characters"
        textContentType="oneTimeCode"
        maxLength={11}
        placeholder="6-digit code or recovery code"
        placeholderTextColor="#9CA3AF"
        value={code}
        onChangeText={text => setCode(text.trim())}
      />
      {error ? <Text style={mfaStyles.error}>{error}</Text> : null}
      <TouchableOpacity style={[mfaStyles.primaryButton, (busy || code.length < 6) && mfaStyles.disabled]} disabled={busy || code.length < 6} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={mfaStyles.primaryText}>Verify</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#374151' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});
