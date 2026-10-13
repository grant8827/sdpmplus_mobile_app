import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { OverviewScreen } from '../screens/admin/OverviewScreen';
import { LiveQueueScreen } from '../screens/admin/LiveQueueScreen';
import { MessagesScreen } from '../screens/admin/MessagesScreen';
import { StudentManagementScreen } from '../screens/admin/StudentManagementScreen';
import { MenuStackNavigator, type MenuStackParamList } from './MenuStackNavigator';
import { tabIcon } from '../components/TabIcon';
import { useAuth } from '../context/AuthContext';

export type AdminTabParamList = {
  Overview: undefined;
  Queue: undefined;
  Students: undefined;
  Messages: undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

// One icon function per tab, in tab order.
const ICONS = ['📊', '📋', '🎓', '💬', '☰'].map(tabIcon);

/**
 * Admin console — the same sections as the website's admin tabs (see
 * frontend/src/navigation/AdminLayout.tsx). The four used all day get a
 * bottom tab; Faculty, Families, Classes, School Setup, Audit Log, Data
 * & Privacy and District live behind Menu (see MenuScreen), since a
 * phone's tab bar can't fit them all.
 */
export function AdminTabNavigator() {
  const { activeSchoolId } = useAuth();
  return (
    // Rebuilt when the admin switches school, so every tab reloads that school's data.
    <Tab.Navigator key={activeSchoolId ?? 'single-school'}>
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{ tabBarIcon: ICONS[0] }}
      />
      <Tab.Screen
        name="Queue"
        component={LiveQueueScreen}
        options={{ title: 'Live Queue', tabBarIcon: ICONS[1] }}
      />
      <Tab.Screen
        name="Students"
        component={StudentManagementScreen}
        options={{ tabBarIcon: ICONS[2] }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: ICONS[3] }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{ title: 'Menu', headerShown: false, tabBarIcon: ICONS[4] }}
      />
    </Tab.Navigator>
  );
}
