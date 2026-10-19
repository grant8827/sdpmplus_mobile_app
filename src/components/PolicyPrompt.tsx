import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { usePolicyAcknowledgment } from '../utils/policyAcknowledgment';
import type { AdminTabParamList } from '../navigation/AdminTabNavigator';
import { Button, COLORS } from './ui';

// Closed for this sign-in (and this school) only; opening the app again,
// or signing in again, brings it back until someone confirms.
let closedFor = '';

/**
 * The popup a school administrator sees when the app opens, until someone
 * at the school confirms reading the Legal & Policies documents (and
 * again when one is updated). Same as the website's: Cancel closes it
 * for now, Open goes to Legal & Policies to read and confirm.
 */
export function PolicyPrompt() {
  const { token, activeSchoolId } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamList>>();
  const { current } = usePolicyAcknowledgment();
  const sessionKey = `${token ?? ''}|${activeSchoolId ?? ''}`;
  const [, setClosed] = useState(0);
  if (current !== false || closedFor === sessionKey) return null;

  const close = () => { closedFor = sessionKey; setClosed(value => value + 1); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">Please read our Legal & Policies</Text>
          <Text style={styles.text}>
            Before using SDPMPlus, please read the agreements and policies that cover your school: privacy, student data, terms of service, security and data handling. When you have read them, confirm it at the top of the Legal & Policies page.
          </Text>
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={close} style={styles.flex} />
            <Button label="Open Legal & Policies" onPress={() => { close(); navigation.navigate('Menu', { screen: 'Legal' }); }} style={styles.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.slate },
  text: { fontSize: 14, color: COLORS.slate, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
