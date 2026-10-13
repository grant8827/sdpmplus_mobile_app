import React from 'react';
import { StyleSheet, Text } from 'react-native';

/**
 * Bottom-tab icons, rendered as emoji rather than a vector-icon font —
 * matches the emoji already used throughout the app (Screen headers,
 * QuickAction cards, the marketing site) and needs no new native
 * dependency/rebuild, unlike react-native-vector-icons or similar.
 */
export function TabIcon({ emoji, size, focused }: { emoji: string; size: number; focused: boolean }) {
  return <Text style={[{ fontSize: size }, focused ? styles.focused : styles.dimmed]}>{emoji}</Text>;
}

/**
 * The `tabBarIcon` for one tab. Called once per tab at the top of a
 * navigator file, so the tab bar gets the same function on every render
 * instead of a new one each time.
 */
export const tabIcon = (emoji: string) =>
  function Icon({ size, focused }: { size: number; focused: boolean }) {
    return <TabIcon emoji={emoji} size={size} focused={focused} />;
  };

const styles = StyleSheet.create({
  focused: { opacity: 1 },
  dimmed: { opacity: 0.5 },
});
