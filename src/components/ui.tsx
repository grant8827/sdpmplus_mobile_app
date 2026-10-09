import React from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

/**
 * Small shared building blocks for the admin and teacher screens, in the
 * brand palette: blue for actions, green for success/active, amber for
 * waiting/suspended, red only for warnings and destructive actions.
 */
export const COLORS = {
  navy: '#123B6D',
  blue: '#1976D2',
  green: '#39A844',
  amber: '#F5B82E',
  amberText: '#9A6B00',
  red: '#DC2626',
  slate: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  border: '#E2E4E9',
  bg: '#F4F8FC',
};

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';
export function Button({
  label,
  onPress,
  variant = 'primary',
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant], small && styles.small, disabled && styles.disabled, style]}
    >
      <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText, small && styles.smallText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={COLORS.faint} {...props} style={[styles.input, props.multiline && styles.textArea, props.style]} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function EmptyText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

/** A status pill: green = active/approved, amber = suspended/pending, red = rejected. */
export function Pill({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'grey' }) {
  const background = { green: COLORS.green, amber: COLORS.amber, red: COLORS.red, blue: COLORS.blue, grey: '#E5E7EB' }[tone];
  const color = tone === 'amber' ? COLORS.navy : tone === 'grey' ? COLORS.slate : '#fff';
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** A one-line notice at the top of a screen (result of the last action, or an error). */
export function Banner({ text, onDismiss }: { text: string; onDismiss?: () => void }) {
  if (!text) return null;
  return (
    <TouchableOpacity activeOpacity={onDismiss ? 0.7 : 1} onPress={onDismiss} style={styles.banner}>
      <Text style={styles.bannerText}>{text}</Text>
    </TouchableOpacity>
  );
}

/** Pick one of a few options as chips (wraps onto more lines as needed). */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={active ? styles.chipTextActive : styles.chipText}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/** A person's photo, or their first initial in a circle. */
export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name: string; size?: number }) {
  const dims = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={dims} />;
  return (
    <View style={[dims, styles.avatarPlaceholder]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{name.charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

/** Yes/no confirmation; resolves true when the person confirms. */
export function confirm(title: string, message: string, confirmLabel = 'OK', destructive = false): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  button: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: COLORS.blue },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  danger: { backgroundColor: COLORS.red },
  small: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryText: { color: COLORS.slate },
  smallText: { fontSize: 13 },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.slate,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  label: { fontSize: 13, color: COLORS.muted },
  heading: { fontSize: 16, fontWeight: '700', color: COLORS.slate },
  muted: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  empty: { fontSize: 14, color: COLORS.muted, textAlign: 'center', paddingVertical: 16 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  banner: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderLeftColor: COLORS.blue },
  bannerText: { fontSize: 14, color: COLORS.slate, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  chipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  chipText: { color: COLORS.slate, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  avatarPlaceholder: { backgroundColor: '#DCE8F7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.navy, fontWeight: '700' },
});
