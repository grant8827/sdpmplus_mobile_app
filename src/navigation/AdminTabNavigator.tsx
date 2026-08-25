import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OverviewScreen } from '../screens/admin/OverviewScreen';
import { FacultyManagementScreen } from '../screens/admin/FacultyManagementScreen';
import { FamilyManagementScreen } from '../screens/admin/FamilyManagementScreen';
import { BroadcastScreen } from '../screens/admin/BroadcastScreen';
import { LogoutButton } from './LogoutButton';

export type AdminTabParamList = {
  Overview: undefined;
  Faculty: undefined;
  Families: undefined;
  Broadcast: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const renderLogoutButton = () => <LogoutButton />;

/** SDP-9 / SDP-10 / SDP-11: Admin console. */
export function AdminTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerRight: renderLogoutButton }}>
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Faculty" component={FacultyManagementScreen} />
      <Tab.Screen name="Families" component={FamilyManagementScreen} />
      <Tab.Screen name="Broadcast" component={BroadcastScreen} />
    </Tab.Navigator>
  );
}
