import React, { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { PromptModal } from '../../components/PromptModal';
import { Banner, Button, Card, EmptyText, Heading, Input, Label, Muted, Row, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type RemovedStudent, type RetentionSettings } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

/**
 * Admin Data & Privacy — same as the website's: export the school's or
 * a removed student's data (handed to the phone's share sheet as JSON),
 * restore or permanently erase removed students, and set how long
 * records are kept. Every export and erasure is in the Audit Log.
 */
export function DataPrivacyScreen() {
  const { token } = useAuth();
  const [removed, setRemoved] = useState<RemovedStudent[]>([]);
  const [retention, setRetention] = useState<RetentionSettings | null>(null);
  const [studentDays, setStudentDays] = useState('');
  const [queueDays, setQueueDays] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  // Permanent deletion: type the name, then an optional reason.
  const [erasing, setErasing] = useState<RemovedStudent | null>(null);
  const [typedName, setTypedName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [nextRemoved, nextRetention] = await Promise.all([api.removedStudents(token), api.retention(token)]);
    setRemoved(nextRemoved);
    setRetention(nextRetention);
    setStudentDays(nextRetention.removedStudentRetentionDays?.toString() ?? '');
    setQueueDays(nextRetention.queueHistoryRetentionDays?.toString() ?? '');
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const act = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setMessage('');
    try {
      const done = await action();
      if (done) setMessage(done);
      await load();
    } catch (error) {
      setMessage(errorText(error, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const share = (title: string, data: unknown) => Share.share({ title, message: JSON.stringify(data, null, 2) });

  const saveRetention = () => act(async () => {
    const parse = (value: string) => (value.trim() === '' ? null : Number(value));
    await api.saveRetention(token!, { removedStudentRetentionDays: parse(studentDays), queueHistoryRetentionDays: parse(queueDays) });
    return 'Retention settings saved. They are applied automatically every day.';
  });

  const runNow = async () => {
    if (!retention) return;
    const ok = await confirm(
      'Apply retention now?',
      `This permanently deletes ${retention.wouldDeleteNow.removedStudents} removed student(s) and ${retention.wouldDeleteNow.pickupHistory} old drop-off/pickup record(s).`,
      'Delete',
      true,
    );
    if (ok) act(async () => {
      const result = await api.runRetention(token!);
      return `Deleted ${result.studentsDeleted} removed student(s) and ${result.pickupHistoryDeleted} old drop-off/pickup record(s).`;
    });
  };

  const finishErase = (reason: string) => {
    const student = erasing;
    const name = typedName ?? '';
    setErasing(null);
    setTypedName(null);
    if (!student) return;
    act(async () => {
      await api.permanentlyDeleteStudent(token!, student.id, name, reason || undefined);
      return `${student.fullName} was permanently deleted.`;
    });
  };

  return (
    <Screen title="Data & Privacy" subtitle="Export records, handle deletion requests, and set how long data is kept.">
      <Banner text={message} onDismiss={() => setMessage('')} />

      <Card>
        <Heading>Export</Heading>
        <Muted>All of this school's records (students, parents, staff, classes, attendance, drop-off/pickup history) as JSON, through your phone's share sheet. To export one student, use Export on the Students tab.</Muted>
        <Button label="Export school data" variant="secondary" disabled={busy} onPress={() => act(async () => { await share('School data', await api.exportSchool(token!)); })} />
      </Card>

      <Card>
        <Heading>Removed students</Heading>
        <Muted>Students removed from the Students tab stay on file until you restore them, delete them permanently, or the retention period runs out.</Muted>
        {removed.length === 0 ? <EmptyText>No removed students.</EmptyText> : removed.map(student => (
          <Card key={student.id} style={styles.inner}>
            <Text style={styles.name}>{student.fullName}{student.studentNumber ? ` · #${student.studentNumber}` : ''}</Text>
            <Muted>Removed {formatUtcTimestamp(student.removedAt)}</Muted>
            <Muted>{student.purgeAfter ? `Deleted automatically after ${formatUtcTimestamp(student.purgeAfter)}` : 'Kept until deleted'}</Muted>
            <Row>
              <Button label="Export" variant="secondary" small disabled={busy} onPress={() => act(async () => { await share(`${student.fullName} record`, await api.exportStudent(token!, student.id)); })} />
              <Button label="Restore" variant="secondary" small disabled={busy} onPress={() => act(async () => { await api.restoreStudent(token!, student.id); return `${student.fullName} was restored.`; })} />
              <Button label="Delete permanently" variant="danger" small disabled={busy} onPress={() => setErasing(student)} />
            </Row>
          </Card>
        ))}
      </Card>

      {retention && (
        <Card>
          <Heading>Retention</Heading>
          <Muted>Match your school's or district's records policy. Leave a box empty to keep those records until they're deleted by hand. The minimum is {retention.minimumDays} days. The audit log is not affected.</Muted>
          <Label>Permanently delete removed students after (days)</Label>
          <Input keyboardType="number-pad" placeholder="Keep" value={studentDays} onChangeText={v => setStudentDays(v.replace(/\D/g, ''))} />
          <Label>Delete finished drop-off/pickup records older than (days)</Label>
          <Input keyboardType="number-pad" placeholder="Keep" value={queueDays} onChangeText={v => setQueueDays(v.replace(/\D/g, ''))} />
          <Row>
            <Button label="Save" disabled={busy} onPress={saveRetention} />
            <Button
              label="Apply now"
              variant="danger"
              disabled={busy || (retention.wouldDeleteNow.removedStudents === 0 && retention.wouldDeleteNow.pickupHistory === 0)}
              onPress={runNow}
            />
          </Row>
          <Muted>With the saved settings, the next daily run would delete {retention.wouldDeleteNow.removedStudents} removed student(s) and {retention.wouldDeleteNow.pickupHistory} old drop-off/pickup record(s).</Muted>
        </Card>
      )}

      <PromptModal
        visible={erasing !== null && typedName === null}
        title={`Permanently delete ${erasing?.fullName ?? ''}?`}
        message="This erases their record, attendance, pickup history and guardian links, and can't be undone. Export it first if you may need it. Type the student's full name to confirm."
        placeholder="Student's full name"
        submitLabel="Next"
        destructive
        onCancel={() => setErasing(null)}
        onSubmit={setTypedName}
      />
      <PromptModal
        visible={erasing !== null && typedName !== null}
        title="Reason (optional)"
        message='Kept in the audit log, e.g. "Parent deletion request".'
        placeholder="Reason"
        submitLabel="Delete permanently"
        destructive
        onCancel={() => { setErasing(null); setTypedName(null); }}
        onSubmit={finishErase}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 12, gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: '#374151' },
});
