import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/** Shared layout shell so every placeholder screen looks consistent. */
export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  body: {
    gap: 12,
  },
});
