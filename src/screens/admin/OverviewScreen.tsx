import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '../../components/Screen';
import { SchoolBadge } from '../../components/SchoolBadge';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminOverview } from '../../services/api';
import type { Notice } from '../../types';
import type { AdminTabParamList } from '../../navigation/AdminTabNavigator';
import { takeJustRegistered } from '../../utils/onboarding';

const POLL_MS = 4000;

/**
 * SDP-11 (overview half): schoolwide metrics dashboard. Every tile —
 * including pending requests, now that the queue is a real backend
 * table — comes from the backend, scoped to the signed-in admin's own
 * school. Polls rather than pushing, since there's no
 * websocket/live-update transport yet.
 *
 * Also surfaces admin-targeted notices here rather than as an 8th
 * bottom tab — right now that's just "a parent added a co-guardian",
 * but this is where anything else that should catch an admin's eye
 * without requiring approval belongs.
 */
export function OverviewScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamList>>();
  // Straight after registering a school: on to choosing a plan (free trial or pay).
  useEffect(() => {
    if (takeJustRegistered()) navigation.navigate('Menu', { screen: 'Subscription' });
  }, [navigation]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => {
      api.adminOverview(token).then(next => { if (!cancelled) setOverview(next); }).catch(() => {});
      api.adminNotices(token).then(next => { if (!cancelled) setNotices(next); }).catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const markRead = (noticeId: string) => {
    setNotices(prev => prev.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    if (token) api.markNoticeRead(token, noticeId).catch(() => {});
  };

  return (
    <Screen title="Overview" subtitle="School-wide snapshot.">
      <SchoolBadge />
      <View style={styles.grid}>
        <SummaryTile label="Total Enrolled Students" value={overview?.totalStudents ?? 0} />
        <SummaryTile label="Active Teachers" value={overview?.activeTeachers ?? 0} />
        <SummaryTile label="Present Today" value={overview?.presentToday ?? 0} accentColor="#39A844" />
        <SummaryTile label="Pending Requests" value={overview?.pendingRequests ?? 0} accentColor="#9A6B00" />
      </View>

      {notices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {notices.map(notice => (
            <TouchableOpacity
              key={notice.id}
              style={[styles.card, !notice.read && styles.cardUnread]}
              onPress={() => markRead(notice.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                {!notice.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.noticeBody}>{notice.body}</Text>
              <Text style={styles.noticeMeta}>{new Date(notice.createdAt).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
  },
  cardUnread: {
    borderColor: '#1976D2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flexShrink: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
  },
  noticeBody: {
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
  },
  noticeMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
});
