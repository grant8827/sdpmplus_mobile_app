import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MenuScreen } from '../screens/shared/MenuScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { ChangePasswordScreen } from '../screens/shared/ChangePasswordScreen';
import { SecurityScreen } from '../screens/shared/SecurityScreen';
import { PickupPinScreen } from '../screens/shared/PickupPinScreen';
import { FacultyManagementScreen } from '../screens/admin/FacultyManagementScreen';
import { FamilyManagementScreen } from '../screens/admin/FamilyManagementScreen';
import { ClassesScreen } from '../screens/admin/ClassesScreen';
import { SchoolSetupScreen } from '../screens/admin/SchoolSetupScreen';
import { AuditLogScreen } from '../screens/admin/AuditLogScreen';
import { DataPrivacyScreen } from '../screens/admin/DataPrivacyScreen';
import { SubscriptionScreen } from '../screens/admin/SubscriptionScreen';
import { DistrictOverviewScreen } from '../screens/admin/DistrictOverviewScreen';
import { AttendanceScreen as ParentAttendanceScreen } from '../screens/parent/AttendanceScreen';
import { AddGuardianScreen } from '../screens/parent/AddGuardianScreen';

export type MenuStackParamList = {
  MenuHome: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Security: undefined;
  PickupPin: undefined;
  Faculty: undefined;
  Families: undefined;
  Classes: undefined;
  SchoolSetup: undefined;
  AuditLog: undefined;
  DataPrivacy: undefined;
  Subscription: undefined;
  District: undefined;
  Attendance: undefined;
  AddGuardian: undefined;
};

const Stack = createNativeStackNavigator<MenuStackParamList>();

/**
 * Nested stack behind every role's bottom-tab "Menu" entry. Shared by
 * Parent/Teacher/Admin — "Faculty"/"Families" (admin: same sections as
 * the website admin sidebar's Faculty/Families tabs — see
 * frontend/src/navigation/AdminLayout.tsx), "Classes" (admin: add a
 * class + mark attendance), "SchoolSetup" (admin: school profile +
 * hours), "Attendance" (parent: read-only weekly view), and
 * "AddGuardian" (parent: invite a co-guardian onto their account) are
 * all registered here but only ever shown to the role they apply to
 * (see MenuScreen), so there's one stack to maintain instead of three
 * near-identical ones.
 */
export function MenuStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ title: 'Menu' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
      <Stack.Screen name="PickupPin" component={PickupPinScreen} options={{ title: 'Pickup PIN' }} />
      <Stack.Screen name="Faculty" component={FacultyManagementScreen} options={{ title: 'Faculty' }} />
      <Stack.Screen name="Families" component={FamilyManagementScreen} options={{ title: 'Families' }} />
      <Stack.Screen name="Classes" component={ClassesScreen} options={{ title: 'Classes' }} />
      <Stack.Screen name="SchoolSetup" component={SchoolSetupScreen} options={{ title: 'School Setup' }} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} options={{ title: 'Audit Log' }} />
      <Stack.Screen name="DataPrivacy" component={DataPrivacyScreen} options={{ title: 'Data & Privacy' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription' }} />
      <Stack.Screen name="District" component={DistrictOverviewScreen} options={{ title: 'District' }} />
      <Stack.Screen name="Attendance" component={ParentAttendanceScreen} options={{ title: 'Attendance' }} />
      <Stack.Screen name="AddGuardian" component={AddGuardianScreen} options={{ title: 'Add Guardian' }} />
    </Stack.Navigator>
  );
}
