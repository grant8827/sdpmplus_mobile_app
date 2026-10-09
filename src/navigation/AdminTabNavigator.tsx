import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OverviewScreen } from '../screens/admin/OverviewScreen';
import { LiveQueueScreen } from '../screens/admin/LiveQueueScreen';
import { MessagesScreen } from '../screens/admin/MessagesScreen';
import { StudentManagementScreen } from '../screens/admin/StudentManagementScreen';
import { MenuStackNavigator } from './MenuStackNavigator';
import { TabIcon } from '../components/TabIcon';
import { useAuth } from '../context/AuthContext';

export type AdminTabParamList = {
  Overview: undefined;
  Queue: undefined;
  Students: undefined;
  Messages: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

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
        options={{ tabBarIcon: ({ size, focused }) => <TabIcon emoji="📊" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Queue"
        component={LiveQueueScreen}
        options={{ title: 'Live Queue', tabBarIcon: ({ size, focused }) => <TabIcon emoji="📋" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Students"
        component={StudentManagementScreen}
        options={{ tabBarIcon: ({ size, focused }) => <TabIcon emoji="🎓" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: ({ size, focused }) => <TabIcon emoji="💬" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{ title: 'Menu', headerShown: false, tabBarIcon: ({ size, focused }) => <TabIcon emoji="☰" size={size} focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
