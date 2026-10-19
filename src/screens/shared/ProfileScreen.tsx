import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { DeleteSchoolCard } from '../../components/DeleteSchoolCard';
import type { MenuStackParamList } from '../../navigation/MenuStackNavigator';

export function ProfileScreen() {
  const { user, canManageSchool } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList>>();

  return (
    <Screen title="Profile" subtitle="Your account details.">
      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.value}>{user?.fullName}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChangePassword')}>
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>
      {/* Parents only: the 6-digit PIN they enter to request a pickup. */}
      {user?.role === 'parent' && (
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('PickupPin')}>
          <Text style={styles.buttonText}>Pickup PIN</Text>
        </TouchableOpacity>
      )}
      {/* School administrators only: ask for the whole school to be deleted. */}
      {user?.role === 'admin' && canManageSchool && <DeleteSchoolCard />}
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
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
