import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Dropdown } from '../../components/Dropdown';
import { Banner, Button, Card, EmptyText, Muted } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type AuditEntry } from '../../services/api';
import { ROLE_LABELS, actionLabel } from '../../utils/auditLabels';
import { formatUtcTimestamp } from '../../utils/utcTime';

function formatDetails(entry: AuditEntry) {
  const parts = Object.entries(entry.details ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  if (entry.ipAddress) parts.push(`IP: ${entry.ipAddress}`);
  return parts.join(' · ');
}

/**
 * Admin Audit Log — same as the website's: a read-only, newest-first
 * history of sensitive actions in this school (sign-ins, record views,
 * pickups, changes). Entries can't be edited or deleted by anyone.
 */
export function AuditLogScreen() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async (before?: AuditEntry) => {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.auditLog(token, { action: action || undefined, before });
      setEntries(current => (before ? [...current, ...page.entries] : page.entries));
      setActions(page.actions);
      setHasMore(page.hasMore);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the audit log');
    } finally {
      setLoading(false);
    }
  }, [token, action]);
  useEffect(() => { load(); }, [load]);

  return (
    <Screen title="Audit Log" subtitle="A permanent record of sensitive actions in this school.">
      <Dropdown label="Action" options={[{ label: 'All actions', value: '' }, ...actions.map(a => ({ label: actionLabel(a), value: a }))]} value={action} onChange={setAction} />
      <Button label={loading ? 'Loading…' : 'Refresh'} variant="secondary" onPress={() => load()} disabled={loading} />
      <Banner text={message} />

      {entries.length === 0 && !loading ? <EmptyText>No entries yet.</EmptyText> : entries.map(entry => (
        <Card key={entry.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.action}>{actionLabel(entry.action)}</Text>
            <Text style={styles.when}>{formatUtcTimestamp(entry.createdAt)}</Text>
          </View>
          <Muted>
            {entry.actorName ?? 'Unknown'}{entry.actorRole ? ` (${ROLE_LABELS[entry.actorRole] ?? entry.actorRole})` : ''}
            {entry.targetLabel ? ` → ${entry.targetLabel}` : ''}
          </Muted>
          {formatDetails(entry) ? <Text style={styles.details}>{formatDetails(entry)}</Text> : null}
        </Card>
      ))}

      {hasMore && <Button label={loading ? 'Loading…' : 'Load older entries'} variant="secondary" onPress={() => load(entries[entries.length - 1])} disabled={loading} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, paddingVertical: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  action: { fontSize: 15, fontWeight: '700', color: '#374151', flexShrink: 1 },
  when: { fontSize: 12, color: '#9CA3AF' },
  details: { fontSize: 12, color: '#6B7280' },
});
