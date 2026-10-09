import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button, COLORS } from './ui';
import { pickImage } from '../utils/pickImage';

/**
 * Shows the school's logo (or an empty box) with buttons to choose one
 * from the phone's photos or remove it. `value` is anything an Image
 * can show; choosing calls `onChange` with a data URL (scaled down to
 * 512px), removing calls it with ''.
 */
export function LogoPicker({ value, onChange, disabled }: { value: string; onChange: (dataUrl: string) => void; disabled?: boolean }) {
  const [error, setError] = useState('');

  const choose = async () => {
    setError('');
    try {
      const picked = await pickImage({ maxSide: 512, allowed: ['image/png', 'image/jpeg', 'image/webp'], typeMessage: 'The logo must be a PNG, JPEG or WEBP image.' });
      if (picked) onChange(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that image.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {value
          ? <Image source={{ uri: value }} style={styles.logo} resizeMode="contain" accessibilityLabel="School logo" accessibilityIgnoresInvertColors />
          : <View style={[styles.logo, styles.empty]}><Text style={styles.emptyText}>No logo</Text></View>}
        <View style={styles.actions}>
          <Button label={value ? 'Change logo' : 'Choose logo'} variant="secondary" small onPress={choose} disabled={disabled} />
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
  logo: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  empty: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', backgroundColor: 'transparent' },
  emptyText: { color: COLORS.muted, fontSize: 12 },
  actions: { flex: 1, gap: 8, alignItems: 'flex-start' },
  error: { color: COLORS.red, fontSize: 14 },
});
