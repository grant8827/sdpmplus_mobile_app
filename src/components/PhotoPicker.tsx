import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, COLORS } from './ui';
import { pickImage } from '../utils/pickImage';

/**
 * A person's photo (student or staff) with buttons to choose one from
 * the phone's photos or remove it. `value` is anything an Image can
 * show; choosing calls `onChange` with a data URL, removing with ''.
 * A photo is always optional.
 */
export function PhotoPicker({ value, name, onChange, disabled }: { value: string; name: string; onChange: (dataUrl: string) => void; disabled?: boolean }) {
  const [error, setError] = useState('');
  const choose = async () => {
    setError('');
    try {
      const picked = await pickImage({ maxSide: 800, allowed: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], typeMessage: 'The photo must be a PNG, JPEG, WEBP or GIF image.' });
      if (picked) onChange(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that photo.');
    }
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Avatar uri={value || null} name={name || '?'} size={64} />
        <View style={styles.actions}>
          <Button label={value ? 'Change photo' : 'Add photo (optional)'} variant="secondary" small onPress={choose} disabled={disabled} />
          {value ? <Button label="Remove" variant="secondary" small onPress={() => { setError(''); onChange(''); }} disabled={disabled} /> : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actions: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: COLORS.red, fontSize: 14 },
});
