import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SummaryTileProps {
  label: string;
  value: number | string;
  accentColor?: string;
}

/** Stat tile used on Home screens and Admin's Overview. */
export function SummaryTile({ label, value, accentColor = '#111827' }: SummaryTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
});
