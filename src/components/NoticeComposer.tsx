import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Dropdown } from './Dropdown';

export interface ParentOption {
  id: string;
  label: string;
}

export type NoticeTarget = { type: 'ALL' } | { type: 'PARENT'; parentUserId: string };

interface NoticeComposerProps {
  /** Label for the "everyone" chip, e.g. "All Class Parents" or "All School Parents". */
  allLabel: string;
  /** Real parents to offer individually via a dropdown. Omitted (or empty) for a broadcast-only composer with no per-parent targeting. */
  parentOptions?: ParentOption[];
  onSend: (target: NoticeTarget, title: string, body: string) => void;
  sendLabel?: string;
}

/** Shared composer UI backing both the teacher's targeted notices and the admin's broadcast. */
export function NoticeComposer({
  allLabel,
  parentOptions = [],
  onSend,
  sendLabel = 'Send Notice',
}: NoticeComposerProps) {
  const [mode, setMode] = useState<'ALL' | 'PARENT'>('ALL');
  const [parentId, setParentId] = useState(parentOptions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // parentOptions usually arrives after an async fetch, past this
  // component's first render — re-sync whenever the list changes and
  // the current selection is no longer (or not yet) valid.
  useEffect(() => {
    if (!parentOptions.some(option => option.id === parentId)) {
      setParentId(parentOptions[0]?.id ?? '');
    }
  }, [parentOptions]);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    if (mode === 'PARENT' && !parentId) return;
    onSend(mode === 'ALL' ? { type: 'ALL' } : { type: 'PARENT', parentUserId: parentId }, title.trim(), body.trim());
    setTitle('');
    setBody('');
    setMode('ALL');
  };

  return (
    <View style={styles.card}>
      {parentOptions.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>Send to</Text>
          <View style={styles.targetRow}>
            <TouchableOpacity
              style={[styles.targetChip, mode === 'ALL' && styles.targetChipActive]}
              onPress={() => setMode('ALL')}
            >
              <Text style={mode === 'ALL' ? styles.targetChipTextActive : styles.targetChipText}>{allLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.targetChip, mode === 'PARENT' && styles.targetChipActive]}
              onPress={() => setMode('PARENT')}
            >
              <Text style={mode === 'PARENT' ? styles.targetChipTextActive : styles.targetChipText}>One Parent</Text>
            </TouchableOpacity>
          </View>
          {mode === 'PARENT' && (
            <Dropdown
              label="Parent"
              options={parentOptions.map(option => ({ label: option.label, value: option.id }))}
              value={parentId}
              onChange={setParentId}
            />
          )}
        </>
      )}

      <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Message"
        value={body}
        onChangeText={setBody}
        multiline
      />

      <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
        <Text style={styles.sendText}>{sendLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  targetChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  targetChipText: {
    color: '#374151',
    fontSize: 13,
  },
  targetChipTextActive: {
    color: '#fff',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#F4F8FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E4E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
});
