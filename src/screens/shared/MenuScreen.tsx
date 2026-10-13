import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Dropdown } from '../../components/Dropdown';
import { useAuth } from '../../context/AuthContext';
import type { MenuStackParamList } from '../../navigation/MenuStackNavigator';

type MenuTarget = keyof MenuStackParamList;

/**
 * Landing screen behind every role's bottom-tab "Menu" entry: account
 * items (Profile, Security, Log Out) for everyone, plus the admin
 * sections that don't fit in the tab bar — the same ones as the website
 * (frontend/src/navigation/AdminLayout.tsx). Front desk staff only get
 * Families; district admins also get District and a school picker.
 * "Attendance" and "Add Guardian" only show for parents.
 */
export function MenuScreen() {
  const { user, logout, canManageSchool, isDistrictAdmin, schools, activeSchoolId, setActiveSchool } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList>>();

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const item = (target: MenuTarget, label: string) => (
    <TouchableOpacity key={target} style={styles.row} onPress={() => navigation.navigate(target)}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <Screen title="Menu" subtitle={user?.fullName}>
      {schools.length > 1 && activeSchoolId && (
        <>
          <Dropdown
            label="Working in"
            options={schools.map(s => ({ label: s.schoolName, value: s.schoolId }))}
            value={activeSchoolId}
            onChange={setActiveSchool}
          />
        </>
      )}

      {user?.role === 'admin' && (
        <>
          <Text style={styles.section}>School</Text>
          {isDistrictAdmin && item('District', 'District')}
          {canManageSchool && item('Faculty', 'Faculty')}
          {canManageSchool && item('Classes', 'Classes')}
          {item('Families', 'Families')}
          {canManageSchool && item('SchoolSetup', 'School Setup')}
          {canManageSchool && item('AuditLog', 'Audit Log')}
          {canManageSchool && item('DataPrivacy', 'Data & Privacy')}
          {canManageSchool && item('Subscription', 'Subscription')}
        </>
      )}

      {user?.role === 'parent' && (
        <>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Attendance')}>
            <Text style={styles.rowText}>Class & Attendance</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AddGuardian')}>
            <Text style={styles.rowText}>Add Guardian</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.section}>Account</Text>
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.rowText}>Profile</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Security')}>
        <Text style={styles.rowText}>Security</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.row, styles.logoutRow]} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  logoutRow: {
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
