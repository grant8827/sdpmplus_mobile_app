import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PasswordInput } from '../../components/ui';

export function ChangePasswordScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword) { Alert.alert('Missing info', 'Enter your current and new password.'); return; }
    if (newPassword.length < 8) { Alert.alert('Too short', 'New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Passwords do not match', 'Confirm the new password again.'); return; }

    setSubmitting(true);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could not change password', error instanceof Error ? error.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Change Password" subtitle="Choose a new password for your account.">
      <View style={styles.card}>
        <PasswordInput style={styles.input} placeholder="Current password" autoComplete="current-password" value={currentPassword} onChangeText={setCurrentPassword} />
        <PasswordInput style={styles.input} placeholder="New password" autoComplete="new-password" value={newPassword} onChangeText={setNewPassword} />
        <PasswordInput style={styles.input} placeholder="Confirm new password" autoComplete="new-password" value={confirmPassword} onChangeText={setConfirmPassword} />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Saving…' : 'Save Password'}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    padding: 16,
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
  button: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
