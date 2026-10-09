import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, COLORS } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

/**
 * Platform administrators (people who run SDPMPlus) use the website, not
 * the app — the platform tools are website-only. Shown instead of a
 * school dashboard when such an account signs in here.
 */
export function PlatformOnWebScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Platform administration is on the website</Text>
      <Text style={styles.body}>
        {user?.fullName ? `${user.fullName}, your` : 'Your'} account is a platform administrator account. Manage schools, audit logs and support sessions at sdpmplus.com.
      </Text>
      <Button label="Open sdpmplus.com" onPress={() => Linking.openURL('https://www.sdpmplus.com/login').catch(() => {})} />
      <Button label="Log Out" variant="secondary" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.navy },
  body: { fontSize: 15, lineHeight: 22, color: COLORS.slate },
});
