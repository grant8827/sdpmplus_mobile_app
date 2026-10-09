import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MfaEnroll, mfaStyles } from '../../components/MfaEnroll';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type MfaStatus } from '../../services/api';

/**
 * Menu → Security: two-step verification for this account. Teachers and
 * parents can turn it on (and off again with their password); for admin
 * accounts it's required, so it can't be turned off. Replacing recovery
 * codes is on the website's Security page.
 */
export function SecurityScreen() {
  const { token } = useAuth();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [mode, setMode] = useState<'idle' | 'enrolling' | 'disabling'>('idle');
  const [password, setPassword] = useState('');

  const load = useCallback(() => {
    if (token) api.myMfa(token).then(setStatus).catch(error => Alert.alert('Could not load', error.message));
  }, [token]);
  useEffect(load, [load]);

  const disable = async () => {
    if (!token) return;
    try {
      await api.myMfaDisable(token, password);
      setMode('idle'); setPassword(''); load();
      Alert.alert('Two-step verification is off');
    } catch (error) {
      Alert.alert('Could not turn it off', error instanceof Error ? error.message : 'Request failed');
    }
  };

  return (
    <Screen title="Security" subtitle="Protect your account with a code from your phone as well as your password.">
      {status && (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.heading}>Two-step verification</Text>
            <Text style={[styles.pill, status.enabled ? styles.pillOn : styles.pillOff]}>{status.enabled ? 'On' : 'Off'}</Text>
          </View>
          <Text style={mfaStyles.body}>
            {status.enabled
              ? `${status.recoveryCodesLeft} recovery ${status.recoveryCodesLeft === 1 ? 'code' : 'codes'} left.${status.required ? ' Required for your account.' : ''}`
              : 'When it\'s on, signing in also needs a 6-digit code from an authenticator app.'}
          </Text>

          {mode === 'idle' && !status.enabled && (
            <TouchableOpacity style={mfaStyles.primaryButton} onPress={() => setMode('enrolling')}>
              <Text style={mfaStyles.primaryText}>Turn on</Text>
            </TouchableOpacity>
          )}
          {mode === 'enrolling' && token && (
            <MfaEnroll
              begin={() => api.myMfaSetup(token)}
              confirm={async code => (await api.myMfaConfirm(token, code)).recoveryCodes}
              onDone={() => { setMode('idle'); load(); }}
            />
          )}
          {mode === 'idle' && status.enabled && !status.required && (
            <TouchableOpacity style={mfaStyles.secondaryButton} onPress={() => setMode('disabling')}>
              <Text style={mfaStyles.secondaryText}>Turn off</Text>
            </TouchableOpacity>
          )}
          {mode === 'disabling' && (
            <>
              <TextInput style={styles.input} secureTextEntry placeholder="Your password" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} />
              <TouchableOpacity style={[mfaStyles.primaryButton, styles.danger, !password && mfaStyles.disabled]} disabled={!password} onPress={disable}>
                <Text style={mfaStyles.primaryText}>Turn off two-step verification</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMode('idle'); setPassword(''); }}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E4E9', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 16, fontWeight: '700', color: '#374151' },
  pill: { color: '#fff', fontSize: 12, fontWeight: '600', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  pillOn: { backgroundColor: '#39A844' },
  pillOff: { backgroundColor: '#9CA3AF' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#374151' },
  danger: { backgroundColor: '#DC2626' },
  cancel: { color: '#6B7280', textAlign: 'center', paddingVertical: 8 },
});
