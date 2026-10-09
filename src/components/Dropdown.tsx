import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface DropdownOption<T> {
  label: string;
  value: T;
}

/**
 * A real tap-to-open dropdown (button + modal overlay list), built on
 * React Native's built-in Modal rather than @react-native-picker/picker
 * or similar — no new native dependency/rebuild, consistent with how
 * TabIcon avoided a vector-icon library.
 */
export function Dropdown<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerLabel}>{label}</Text>
        <View style={styles.triggerValueRow}>
          <Text style={styles.triggerValue}>{selected?.label ?? 'Select'}</Text>
          <Text style={styles.chevron}>▾</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={o => String(o.value)}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.value === value && styles.optionActive]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: '#F4F8FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerLabel: { fontSize: 13, color: '#6B7280' },
  triggerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  triggerValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chevron: { fontSize: 12, color: '#6B7280' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    width: '80%',
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  list: { maxHeight: 320 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionActive: { backgroundColor: '#EFF6FF' },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextActive: { color: '#1976D2', fontWeight: '700' },
});
