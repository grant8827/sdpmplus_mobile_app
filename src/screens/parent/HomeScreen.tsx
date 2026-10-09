import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '../../components/Screen';
import { SchoolBadge } from '../../components/SchoolBadge';
import { QuickAction } from '../../components/QuickAction';
import { useAuth } from '../../context/AuthContext';
import { useNotices } from '../../context/NoticesContext';
import type { Child } from '../../types';
import { CHILD_STATUS_COLOR, CHILD_STATUS_LABEL, CHILD_STATUS_TEXT_COLOR } from '../../utils/childStatus';
import { getFriendlyDate, getTimeOfDayGreeting } from '../../utils/greeting';
import type { ParentTabParamList } from '../../navigation/ParentTabNavigator';
import { api } from '../../services/api';

const POLL_MS = 4000;

/**
 * Parent's Home tab — greeting, at-a-glance child status, shortcuts
 * into the other tabs. Polls /me/students so a teacher's (or admin's)
 * approval from any device shows up here without a manual refresh.
 */
export function HomeScreen() {
  const { user, token } = useAuth();
  const { unreadCount } = useNotices();
  const navigation = useNavigation<BottomTabNavigationProp<ParentTabParamList>>();
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myStudents(token).then(next => { if (!cancelled) setChildren(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <Screen title={`${getTimeOfDayGreeting()}, ${firstName}`} subtitle={getFriendlyDate()}>
      <SchoolBadge />
      <Text style={styles.sectionTitle}>Your children</Text>
      {children.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>No children linked to this account yet.</Text>
        </View>
      ) : (
        children.map(child => (
          <View key={child.id} style={[styles.card, styles.childCard]}>
            {child.photoUrl ? (
              <Image source={{ uri: child.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{child.fullName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.fullName}</Text>
              <Text style={styles.childClass}>{child.className || 'Unassigned'}</Text>
            </View>
            <View
              style={[styles.statusPill, { backgroundColor: CHILD_STATUS_COLOR[child.status] }]}
            >
              <Text style={[styles.statusText, { color: CHILD_STATUS_TEXT_COLOR[child.status] }]}>{CHILD_STATUS_LABEL[child.status]}</Text>
            </View>
          </View>
        ))
      )}

      <QuickAction
        title="Drop-off & Pick-up"
        subtitle="Alert the teacher when you arrive"
        onPress={() => navigation.navigate('DropoffPickup')}
      />
      <QuickAction
        title="Notices"
        subtitle="Announcements from school and teachers"
        badge={unreadCount}
        onPress={() => navigation.navigate('Notices')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  childInfo: { flex: 1 },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  childClass: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
});
