import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from './ui';
import { useAuth } from '../context/AuthContext';
import { api, type SchoolBranding } from '../services/api';

/**
 * The school's logo and name, at the top of the parent, teacher and
 * administrator dashboards. Shows just the name when the school has no
 * logo, and nothing until it has loaded.
 */
export function SchoolBadge() {
  const { token, activeSchoolId } = useAuth();
  const [school, setSchool] = useState<SchoolBranding | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.mySchool(token).then(next => { if (!cancelled) { setSchool(next); setLogoFailed(false); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, activeSchoolId]);

  if (!school) return null;
  return (
    <View style={styles.badge}>
      {school.logoUrl && !logoFailed ? (
        <Image source={{ uri: school.logoUrl }} style={styles.logo} resizeMode="contain" onError={() => setLogoFailed(true)} accessibilityIgnoresInvertColors />
      ) : null}
      <Text style={styles.name} numberOfLines={2}>{school.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  logo: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.slate },
});
