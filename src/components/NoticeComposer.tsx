import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface TargetOption {
  id: string;
  label: string;
}

interface NoticeComposerProps {
  /** Selectable audiences, e.g. "All Class Parents" plus individual parents (SDP-8), or omitted entirely for a schoolwide-only broadcast (SDP-11). */
  targetOptions: TargetOption[];
  defaultTargetId: string;
  onSend: (targetId: string, title: string, body: string) => void;
  sendLabel?: string;
}

/** Shared composer UI backing both SDP-8 (teacher targeted notices) and SDP-11 (admin broadcast). */
export function NoticeComposer({
  targetOptions,
  defaultTargetId,
  onSend,
  sendLabel = 'Send Notice',
}: NoticeComposerProps) {
  const [target, setTarget] = useState(defaultTargetId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    onSend(target, title.trim(), body.trim());
    setTitle('');
    setBody('');
    setTarget(defaultTargetId);
  };

  return (
    <View style={styles.card}>
      {targetOptions.length > 1 && (
        <>
          <Text style={styles.fieldLabel}>Send to</Text>
          <View style={styles.targetRow}>
            {targetOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[styles.targetChip, target === option.id && styles.targetChipActive]}
                onPress={() => setTarget(option.id)}
              >
                <Text style={target === option.id ? styles.targetChipTextActive : styles.targetChipText}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
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
    backgroundColor: '#F5F6F8',
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
    backgroundColor: '#2563EB',
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
