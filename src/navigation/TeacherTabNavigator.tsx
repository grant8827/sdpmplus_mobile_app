import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/teacher/HomeScreen';
import { LiveQueueScreen } from '../screens/teacher/LiveQueueScreen';
import { ClassRosterScreen } from '../screens/teacher/ClassRosterScreen';
import { AttendanceScreen } from '../screens/teacher/AttendanceScreen';
import { MessagesScreen } from '../screens/teacher/MessagesScreen';
import { MenuStackNavigator } from './MenuStackNavigator';
import { TabIcon } from '../components/TabIcon';

export type TeacherTabParamList = {
  Home: undefined;
  Queue: undefined;
  Attendance: undefined;
  Roster: undefined;
  Messages: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

/** Teacher's bottom tabs — the same sections as the website's teacher tabs, plus Menu (Profile, Security, Log Out). */
export function TeacherTabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: ({ size, focused }) => <TabIcon emoji="🏠" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Queue"
        component={LiveQueueScreen}
        options={{ title: 'Live Queue', tabBarIcon: ({ size, focused }) => <TabIcon emoji="📋" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: 'Attendance', tabBarIcon: ({ size, focused }) => <TabIcon emoji="✅" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Roster"
        component={ClassRosterScreen}
        options={{ title: 'Class', tabBarIcon: ({ size, focused }) => <TabIcon emoji="🍎" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages', tabBarIcon: ({ size, focused }) => <TabIcon emoji="💬" size={size} focused={focused} /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{ title: 'Menu', headerShown: false, tabBarIcon: ({ size, focused }) => <TabIcon emoji="☰" size={size} focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
