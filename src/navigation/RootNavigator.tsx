import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ParentTabNavigator } from './ParentTabNavigator';
import { TeacherTabNavigator } from './TeacherTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';

const AuthStack = createNativeStackNavigator();

/**
 * SDP-1 AC: "App automatically routes users upon login" — Parent ->
 * ParentTabNavigator, Teacher -> TeacherTabNavigator, Admin ->
 * AdminTabNavigator. Session restore/expiry is handled by AuthContext;
 * this component only reacts to its output.
 */
export function RootNavigator() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      ) : user.role === 'parent' ? (
        <ParentTabNavigator />
      ) : user.role === 'teacher' ? (
        <TeacherTabNavigator />
      ) : (
        <AdminTabNavigator />
      )}
    </NavigationContainer>
  );
}
