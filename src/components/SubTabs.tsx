import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface SubTabDef<T extends string> {
  key: T;
  label: string;
}

/** Small pill-style tab switcher within a screen (e.g. Drop-off / Pick-up). */
export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SubTabDef<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.row}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, active === tab.key && styles.activeTab]}
          onPress={() => onChange(tab.key)}
        >
          <Text style={active === tab.key ? styles.activeText : styles.text}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  activeTab: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  text: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  activeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
