import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/teacher/HomeScreen';
import { LiveQueueScreen } from '../screens/teacher/LiveQueueScreen';
import { ClassRosterScreen } from '../screens/teacher/ClassRosterScreen';
import { AttendanceScreen } from '../screens/teacher/AttendanceScreen';
import { MessagesScreen } from '../screens/teacher/MessagesScreen';
import { MenuStackNavigator } from './MenuStackNavigator';
import { tabIcon } from '../components/TabIcon';

export type TeacherTabParamList = {
  Home: undefined;
  Queue: undefined;
  Attendance: undefined;
  Roster: undefined;
  Messages: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

// One icon function per tab, in tab order.
const ICONS = ['🏠', '📋', '✅', '🍎', '💬', '☰'].map(tabIcon);

/** Teacher's bottom tabs — the same sections as the website's teacher tabs, plus Menu (Profile, Security, Log Out). */
export function TeacherTabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: ICONS[0] }}
      />
      <Tab.Screen
        name="Queue"
        component={LiveQueueScreen}
        options={{ title: 'Live Queue', tabBarIcon: ICONS[1] }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: 'Attendance', tabBarIcon: ICONS[2] }}
      />
      <Tab.Screen
        name="Roster"
        component={ClassRosterScreen}
        options={{ title: 'Class', tabBarIcon: ICONS[3] }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages', tabBarIcon: ICONS[4] }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{ title: 'Menu', headerShown: false, tabBarIcon: ICONS[5] }}
      />
    </Tab.Navigator>
  );
}
