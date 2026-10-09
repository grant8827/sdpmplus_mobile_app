import React, { useState } from 'react';
import { Switch, Text, View, StyleSheet } from 'react-native';
import { PromptModal } from '../../components/PromptModal';
import { Banner, Button, Card, COLORS, EmptyText, Heading, Muted, Pill, Row, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type GuardianRequest } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' } as const;
const STATUS_LABEL = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' } as const;

/**
 * Families → Pending Approvals: adults a parent asked to have authorized
 * for their children. Approving creates the real guardian link (pickup
 * rights, plus — if switched on — permission to ask for further adults);
 * rejecting leaves them with no access. Either way the parent is told,
 * and decided requests are kept below as history.
 */
export function GuardianRequestsPanel({ requests, onChanged }: { requests: GuardianRequest[]; onChanged: () => Promise<void> }) {
  const { token } = useAuth();
  const [canManage, setCanManage] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [rejecting, setRejecting] = useState<GuardianRequest | null>(null);

  const pending = requests.filter(r => r.status === 'PENDING');
  const decided = requests.filter(r => r.status !== 'PENDING');

  const decide = async (request: GuardianRequest, approve: boolean, note?: string) => {
    if (!token) return;
    setBusy(request.batchId);
    setMessage('');
    try {
      if (approve) await api.approveGuardianRequest(token, request.batchId, Boolean(canManage[request.batchId]));
      else await api.rejectGuardianRequest(token, request.batchId, note || undefined);
      setMessage(`${request.fullName} ${approve ? 'approved' : 'rejected'}. ${request.requestedByName} has been notified.`);
      await onChanged();
    } catch (error) {
      setMessage(errorText(error, 'Could not save the decision'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Banner text={message} onDismiss={() => setMessage('')} />
      {pending.length === 0 && <EmptyText>No adults are waiting for approval.</EmptyText>}
      {pending.map(request => (
        <Card key={request.batchId}>
          <View style={styles.header}>
            <Heading>{request.fullName}</Heading>
            <Pill label="Pending" tone="amber" />
          </View>
          <Text style={styles.line}><Text style={styles.bold}>Relationship: </Text>{request.relationship}</Text>
          <Text style={styles.line}><Text style={styles.bold}>For: </Text>{request.students.join(', ')}</Text>
          <Text style={styles.line}><Text style={styles.bold}>Contact: </Text>{[request.email, request.phone].filter(Boolean).join(' · ')}</Text>
          <Muted>Asked by {request.requestedByName} on {formatUtcTimestamp(request.requestedAt)}</Muted>
          <View style={styles.switchRow}>
            <Switch
              value={Boolean(canManage[request.batchId])}
              onValueChange={value => setCanManage(current => ({ ...current, [request.batchId]: value }))}
              trackColor={{ true: COLORS.blue, false: '#D1D5DB' }}
            />
            <Text style={styles.switchText}>Also allow them to ask for other adults to be added</Text>
          </View>
          <Row>
            <Button label="Approve" small disabled={busy === request.batchId} onPress={() => decide(request, true)} />
            <Button label="Reject" variant="danger" small disabled={busy === request.batchId} onPress={() => setRejecting(request)} />
          </Row>
        </Card>
      ))}

      {decided.length > 0 && <Heading>History</Heading>}
      {decided.map(request => (
        <Card key={request.batchId}>
          <View style={styles.header}>
            <Heading>{request.fullName}</Heading>
            <Pill label={STATUS_LABEL[request.status]} tone={STATUS_TONE[request.status]} />
          </View>
          <Muted>{request.relationship} · for {request.students.join(', ')}</Muted>
          <Muted>Asked by {request.requestedByName} · {formatUtcTimestamp(request.requestedAt)}</Muted>
          {request.decidedByName && <Muted>Decided by {request.decidedByName}{request.decidedAt ? ` · ${formatUtcTimestamp(request.decidedAt)}` : ''}</Muted>}
          {request.decisionNote && <Muted>Note: {request.decisionNote}</Muted>}
        </Card>
      ))}

      <PromptModal
        visible={rejecting !== null}
        title={`Reject ${rejecting?.fullName ?? ''}?`}
        message={`Optionally add a note for ${rejecting?.requestedByName ?? 'the parent'}.`}
        placeholder="Note (optional)"
        submitLabel="Reject"
        destructive
        onCancel={() => setRejecting(null)}
        onSubmit={note => { const request = rejecting; setRejecting(null); if (request) decide(request, false, note); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  line: { fontSize: 14, color: COLORS.slate },
  bold: { fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchText: { flex: 1, fontSize: 14, color: COLORS.slate },
});
