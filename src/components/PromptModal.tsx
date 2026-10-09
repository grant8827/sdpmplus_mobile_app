import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, COLORS, Input } from './ui';

/**
 * A text prompt that works on both iOS and Android (Alert.prompt is
 * iOS-only) — e.g. a rejection note, or typing a student's name to
 * confirm a permanent deletion. `onSubmit` gets the trimmed text.
 */
export function PromptModal({
  visible,
  title,
  message,
  placeholder,
  submitLabel = 'OK',
  destructive,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  submitLabel?: string;
  destructive?: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  useEffect(() => { if (visible) setText(''); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Input value={text} onChangeText={setText} placeholder={placeholder} autoFocus />
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} style={styles.flex} />
            <Button label={submitLabel} variant={destructive ? 'danger' : 'primary'} onPress={() => onSubmit(text.trim())} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.slate },
  message: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
});
