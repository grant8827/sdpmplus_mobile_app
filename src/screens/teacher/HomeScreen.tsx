import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SchoolBadge } from '../../components/SchoolBadge';
import { QuickAction } from '../../components/QuickAction';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type AttendanceRow } from '../../services/api';
import type { QueueItem } from '../../types';
import { getFriendlyDate, getTimeOfDayGreeting } from '../../utils/greeting';
import type { TeacherTabParamList } from '../../navigation/TeacherTabNavigator';

const POLL_MS = 4000;

/** Teacher's Home tab — greeting, today's class snapshot, shortcuts into the other tabs. */
export function HomeScreen() {
  const { user, token } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TeacherTabParamList>>();
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => {
      api.teacherQueue(token).then(next => { if (!cancelled) setPending(next); }).catch(() => {});
      api.teacherAttendance(token).then(next => { if (!cancelled) setAttendance(next); }).catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const presentCount = attendance.filter(row => row.status === 'PRESENT').length;
  const absentCount = attendance.filter(row => row.status === 'ABSENT').length;

  return (
    <Screen title={`${getTimeOfDayGreeting()}, ${user?.fullName ?? ''}`} subtitle={getFriendlyDate()}>
      <SchoolBadge />
      <View style={styles.grid}>
        <SummaryTile label="Pending Requests" value={pending.length} accentColor="#9A6B00" />
        <SummaryTile label="Present Today" value={presentCount} accentColor="#39A844" />
        <SummaryTile label="Absent Today" value={absentCount} accentColor="#DC2626" />
      </View>

      <QuickAction
        title="Live Queue"
        subtitle="Approve incoming drop-off & pick-up requests"
        badge={pending.length}
        onPress={() => navigation.navigate('Queue')}
      />
      <QuickAction
        title="Attendance"
        subtitle="Mark today's attendance, or look back by month"
        onPress={() => navigation.navigate('Attendance')}
      />
      <QuickAction
        title="Class"
        subtitle="Who's in your class"
        onPress={() => navigation.navigate('Roster')}
      />
      <QuickAction
        title="Messages"
        subtitle="Read messages, or message your class or a parent"
        onPress={() => navigation.navigate('Messages')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
