import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { MfaSignInStep } from '../../components/MfaSignInStep';
import { LogoPicker } from '../../components/LogoPicker';
import { api, ApiError } from '../../services/api';
import { isMfaChallenge, type MfaChallenge } from '../../types';

// Admins must use two-step verification, so registering normally answers
// with a setup challenge: the new admin sets up their authenticator app
// here (MfaSignInStep) before landing in the dashboard.
export function RegisterSchoolScreen() {
  const { adoptSession } = useAuth(),
    [schoolName, setSchool] = useState(''),
    [campusName, setCampus] = useState(''),
    [address, setAddress] = useState(''),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [logoDataUrl, setLogo] = useState(''),
    [saving, setSaving] = useState(false),
    [challenge, setChallenge] = useState<MfaChallenge | null>(null),
    // After the form, the email address is confirmed with a 6-digit code
    // sent to it; `codeStep` is that second screen.
    [codeStep, setCodeStep] = useState(false),
    [emailCode, setEmailCode] = useState(''),
    [notice, setNotice] = useState('');
  const register = async (code?: string) => {
    const result = await api.registerSchool({
      schoolName: schoolName.trim(),
      campusName: campusName.trim(),
      campusAddress: address.trim() || undefined,
      adminFullName: name.trim(),
      email: email.trim(),
      password,
      logoDataUrl: logoDataUrl || undefined,
      emailCode: code,
    });
    if (isMfaChallenge(result)) setChallenge(result);
    else await adoptSession(result);
  };
  const submitCode = async () => {
    if (!/^\d{6}$/.test(emailCode))
      return Alert.alert('Enter the code', 'Enter the 6-digit code from the email.');
    setSaving(true);
    setNotice('');
    try {
      await register(emailCode);
    } catch (e) {
      Alert.alert('Could not register school', e instanceof Error ? e.message : 'Request failed');
      // A problem with the code keeps them here; anything else sends
      // them back to the form to fix it.
      if (e instanceof ApiError && e.code?.startsWith('EMAIL_CODE_')) setEmailCode('');
      else setCodeStep(false);
    } finally {
      setSaving(false);
    }
  };
  const resendCode = async () => {
    setSaving(true);
    setNotice('');
    try {
      await api.sendRegistrationCode(email.trim());
      setEmailCode('');
      setNotice('A new code is on its way. Only the newest code works.');
    } catch (e) {
      Alert.alert('Could not send a new code', e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };
  const submit = async () => {
    if (
      !schoolName.trim() ||
      !campusName.trim() ||
      !name.trim() ||
      !email.trim() ||
      !password
    )
      return Alert.alert(
        'Missing information',
        'School, campus, name, email, and password are required.',
      );
    if (password.length < 8)
      return Alert.alert('Invalid password', 'Use at least 8 characters.');
    if (password !== confirm) return Alert.alert('Passwords do not match');
    setSaving(true);
    try {
      const sent = await api.sendRegistrationCode(email.trim());
      if (sent.required) {
        setEmailCode('');
        setNotice('');
        setCodeStep(true);
      } else {
        await register();
      }
    } catch (e) {
      Alert.alert(
        'Could not register school',
        e instanceof Error ? e.message : 'Request failed',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    challenge ? (
      <Screen title="Almost done" subtitle="Your school is registered. One last step:">
        <MfaSignInStep
          challenge={challenge}
          onSignedIn={adoptSession}
          onRestart={message => {
            setChallenge(null);
            Alert.alert('Please sign in', `${message} Your school was created — sign in to finish.`);
          }}
        />
      </Screen>
    ) : codeStep ? (
      <Screen title="Confirm your email" subtitle={`We emailed a 6-digit code to ${email.trim()}. Enter it to finish registering ${schoolName.trim()}.`}>
        <TextInput
          style={[s.input, s.code]}
          placeholder="000000"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={emailCode}
          onChangeText={text => setEmailCode(text.replace(/\D/g, '').slice(0, 6))}
        />
        <Text style={s.hint}>The code works for 10 minutes. Check your spam folder if it hasn't arrived.</Text>
        {notice ? <Text style={s.hint}>{notice}</Text> : null}
        <TouchableOpacity style={s.button} disabled={saving} onPress={submitCode}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.white}>Confirm and register</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={saving} onPress={resendCode}>
          <Text style={s.link}>Send a new code</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={saving} onPress={() => setCodeStep(false)}>
          <Text style={s.link}>Change details</Text>
        </TouchableOpacity>
      </Screen>
    ) : (
    <Screen
      title="Register your school"
      subtitle="Set up your campus and administrator account."
    >
      <TextInput
        style={s.input}
        placeholder="School name"
        value={schoolName}
        onChangeText={setSchool}
      />
      <TextInput
        style={s.input}
        placeholder="Campus name"
        value={campusName}
        onChangeText={setCampus}
      />
      <TextInput
        style={s.input}
        placeholder="Campus address (optional)"
        value={address}
        onChangeText={setAddress}
      />
      <Text style={s.label}>School logo (optional)</Text>
      <LogoPicker value={logoDataUrl} onChange={setLogo} disabled={saving} />
      <Text style={s.hint}>
        Shown on the dashboard for your parents, teachers and staff. You can
        add or change it later in School Setup.
      </Text>
      <Text style={s.label}>Administrator account</Text>
      <TextInput
        style={s.input}
        placeholder="Full name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={s.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={s.input}
        placeholder="Confirm password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <TouchableOpacity style={s.button} disabled={saving} onPress={submit}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.white}>Register School</Text>
        )}
      </TouchableOpacity>
    </Screen>
    )
  );
}
const s = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  label: { fontWeight: '700', color: '#374151', marginTop: 8 },
  hint: { color: '#6B7280', fontSize: 13 },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  link: { color: '#1976D2', fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
  button: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  white: { color: '#fff', fontWeight: '700' },
});
