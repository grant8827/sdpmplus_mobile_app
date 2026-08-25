import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NoticesProvider, useNotices } from '../context/NoticesContext';
import { LogoutButton } from './LogoutButton';
import { DropoffPickupScreen } from '../screens/parent/DropoffPickupScreen';
import { ClassAttendanceScreen } from '../screens/parent/ClassAttendanceScreen';
import { NoticesScreen } from '../screens/parent/NoticesScreen';

export type ParentTabParamList = {
  DropoffPickup: undefined;
  Class: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

const renderLogoutButton = () => <LogoutButton />;

/** SDP-3 / SDP-4 / SDP-5: Parent's three bottom tabs. */
function ParentTabs() {
  const { unreadCount } = useNotices();

  return (
    <Tab.Navigator screenOptions={{ headerRight: renderLogoutButton }}>
      <Tab.Screen
        name="DropoffPickup"
        component={DropoffPickupScreen}
        options={{ title: 'Dropoff/Pickup' }}
      />
      <Tab.Screen name="Class" component={ClassAttendanceScreen} options={{ title: 'Class' }} />
      <Tab.Screen
        name="Notices"
        component={NoticesScreen}
        options={{
          title: 'Notices',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

export function ParentTabNavigator() {
  return (
    <NoticesProvider>
      <ParentTabs />
    </NoticesProvider>
  );
}
