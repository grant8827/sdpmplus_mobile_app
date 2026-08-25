import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LiveQueueScreen } from '../screens/teacher/LiveQueueScreen';
import { ClassRosterScreen } from '../screens/teacher/ClassRosterScreen';
import { ComposeNoticeScreen } from '../screens/teacher/ComposeNoticeScreen';
import { LogoutButton } from './LogoutButton';

export type TeacherTabParamList = {
  Queue: undefined;
  Roster: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const renderLogoutButton = () => <LogoutButton />;

/** SDP-6 / SDP-8: Teacher's bottom tabs. */
export function TeacherTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerRight: renderLogoutButton }}>
      <Tab.Screen name="Queue" component={LiveQueueScreen} options={{ title: 'Live Queue' }} />
      <Tab.Screen name="Roster" component={ClassRosterScreen} options={{ title: 'Class' }} />
      <Tab.Screen name="Notices" component={ComposeNoticeScreen} options={{ title: 'Notices' }} />
    </Tab.Navigator>
  );
}
