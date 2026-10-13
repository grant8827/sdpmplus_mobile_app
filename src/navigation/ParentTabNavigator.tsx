import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { NoticesProvider, useNotices } from '../context/NoticesContext';
import { HomeScreen } from '../screens/parent/HomeScreen';
import { DropoffPickupScreen } from '../screens/parent/DropoffPickupScreen';
import { NoticesScreen } from '../screens/parent/NoticesScreen';
import { MenuStackNavigator, type MenuStackParamList } from './MenuStackNavigator';
import { tabIcon } from '../components/TabIcon';

export type ParentTabParamList = {
  Home: undefined;
  DropoffPickup: undefined;
  Messages: undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

// One icon function per tab, in tab order.
const ICONS = ['🏠', '🚗', '💬', '☰'].map(tabIcon);

/** SDP-3 / SDP-4 / SDP-5: Parent's bottom tabs — Home, Dropoff/Pickup, Messages, and Menu (Profile/Change Password/Log Out). */
function ParentTabs() {
  const { unreadCount } = useNotices();
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Location Permission',
        message: 'Enable location to use drop-off and pick-up when you arrive at school.',
        buttonPositive: 'OK',
      }).catch(() => {});
    } else {
      Geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }
  }, []);

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: ICONS[0] }}
      />
      <Tab.Screen
        name="DropoffPickup"
        component={DropoffPickupScreen}
        options={{ title: 'Dropoff/Pickup', tabBarIcon: ICONS[1] }}
      />
      <Tab.Screen
        name="Messages"
        component={NoticesScreen}
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ICONS[2],
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{ title: 'Menu', headerShown: false, tabBarIcon: ICONS[3] }}
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
