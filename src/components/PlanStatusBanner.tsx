import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { SchoolSubscriptionView } from '../services/api';
import type { AdminTabParamList } from '../navigation/AdminTabNavigator';
import { addStudentBlocked } from '../utils/planStatus';
import { Button, COLORS } from './ui';

/**
 * A warning at the top of the admin Overview and Students screens when
 * the plan is lapsed, full, or nearly full, with a button to the plan
 * page. Drop-off, pickup and attendance keep working regardless; only
 * adding students stops. Same as the website's.
 */
export function PlanStatusBanner({ plan }: { plan: SchoolSubscriptionView | null }) {
  const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamList>>();
  if (!plan) return null;
  const blocked = addStudentBlocked(plan);
  const nearlyFull = !blocked && plan.level === 'CLOSE'
    ? `Your plan is ${plan.percentUsed}% full: ${plan.remaining} more ${plan.remaining === 1 ? 'student fits' : 'students fit'}.`
    : null;
  const text = blocked ?? nearlyFull;
  if (!text) return null;
  return (
    <View style={[styles.card, { borderLeftColor: blocked ? COLORS.red : COLORS.amber }]} accessibilityRole={blocked ? 'alert' : undefined}>
      <Text style={styles.text}>{text}{blocked ? ' Drop-off, pickup, attendance and everything else keep working.' : ''}</Text>
      <Button label="Upgrade Plan" small onPress={() => navigation.navigate('Menu', { screen: 'Subscription' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, gap: 10 },
  text: { fontSize: 14, color: COLORS.slate, lineHeight: 20 },
});
