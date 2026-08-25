import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

/** Shown in the header of every role navigator so any session can be ended. */
export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={() => logout()} style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: '#2563EB', fontWeight: '600' }}>Log Out</Text>
    </TouchableOpacity>
  );
}
