import React from 'react';
import { Text } from 'react-native';

/**
 * Bottom-tab icons, rendered as emoji rather than a vector-icon font —
 * matches the emoji already used throughout the app (Screen headers,
 * QuickAction cards, the marketing site) and needs no new native
 * dependency/rebuild, unlike react-native-vector-icons or similar.
 */
export function TabIcon({ emoji, size, focused }: { emoji: string; size: number; focused: boolean }) {
  return <Text style={{ fontSize: size, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}
