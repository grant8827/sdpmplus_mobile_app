import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { SentNotices } from '../../components/SentNotices';
import { NoticeComposer, type NoticeTarget } from '../../components/NoticeComposer';
import { Banner, Button, Card, EmptyText, Input, Muted } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNotices } from '../../context/NoticesContext';
import { api } from '../../services/api';

type Tab = 'messages' | 'unread' | 'sent' | 'compose';
type ComposeTarget = 'teacher' | 'admin';

/**
 * Parent → Messages, same as the website's: announcements from the
 * school and teachers (tap one to mark it read), and Compose to message
 * one of their children's teachers or the school office.
 */
export function NoticesScreen() {
  const { token } = useAuth();
  const { notices, markRead } = useNotices();
  const [tab, setTab] = useState<Tab>('messages');
  const [composeTarget, setComposeTarget] = useState<ComposeTarget>('teacher');
  const [teachers, setTeachers] = useState<{ id: string; label: string }[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState('');

  // The teachers a parent can write to are the ones their children have.
  useEffect(() => {
    if (!token) return;
    api.myStudents(token)
      .then(children => {
        const byId = new Map<string, string>();
        for (const child of children) if (child.teacherId) byId.set(child.teacherId, child.teacherName || 'Teacher');
        setTeachers(Array.from(byId, ([id, label]) => ({ id, label })));
      })
      .catch(() => {});
  }, [token]);
  useEffect(() => {
    if (!teachers.some(t => t.id === teacherId)) setTeacherId(teachers[0]?.id ?? '');
  }, [teachers, teacherId]);

  const sendToTeacher = async () => {
    if (!token || !teacherId) return;
    if (!title.trim() || !body.trim()) { setSendMessage('Add a title and a message.'); return; }
    setSendMessage('');
    setSending(true);
    try {
      await api.sendNotice(token, { title: title.trim(), body: body.trim(), targetType: 'TEACHER', targetStaffUserId: teacherId });
      setSendMessage('Message sent to the teacher.');
      setTitle('');
      setBody('');
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const sendToAdmin = async (_target: NoticeTarget, noticeTitle: string, noticeBody: string) => {
    if (!token) return;
    setSendMessage('');
    try {
      await api.sendNotice(token, { title: noticeTitle, body: noticeBody, targetType: 'ADMIN' });
      setSendMessage('Message sent to the school office.');
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Could not send message');
    }
  };

  const sorted = useMemo(() => notices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [notices]);
  const unread = sorted.filter(n => !n.read);
  const shown = tab === 'unread' ? unread : sorted;

  return (
    <Screen title="Messages" subtitle="Announcements from the school and your child's teacher.">
      <SubTabs tabs={[{ key: 'messages', label: 'Messages' }, { key: 'unread', label: `Unread${unread.length ? ` (${unread.length})` : ''}` }, { key: 'sent', label: 'Sent' }, { key: 'compose', label: 'Compose' }]} active={tab} onChange={setTab} />

      {tab === 'compose' && (
        <>
          <SubTabs tabs={[{ key: 'teacher', label: 'Message Teacher' }, { key: 'admin', label: 'Message Admin' }]} active={composeTarget} onChange={setComposeTarget} />
          <Banner text={sendMessage} onDismiss={() => setSendMessage('')} />
          {composeTarget === 'teacher' && (
            teachers.length === 0 ? (
              <EmptyText>No teacher assigned to your children's classes yet.</EmptyText>
            ) : (
              <Card>
                {teachers.length > 1
                  ? <Dropdown label="To" options={teachers.map(t => ({ label: t.label, value: t.id }))} value={teacherId} onChange={setTeacherId} />
                  : <Muted>To: {teachers[0].label}</Muted>}
                <Input placeholder="Title" value={title} onChangeText={setTitle} />
                <Input placeholder="Message" value={body} onChangeText={setBody} multiline />
                <Button label={sending ? 'Sending…' : 'Send to Teacher'} onPress={sendToTeacher} disabled={sending} />
              </Card>
            )
          )}
          {composeTarget === 'admin' && <NoticeComposer allLabel="School Office" sendLabel="Send to School Office" onSend={sendToAdmin} />}
        </>
      )}

      {tab === 'sent' && <SentNotices />}

      {(tab === 'messages' || tab === 'unread') && (
        shown.length === 0 ? (
          <EmptyText>{tab === 'unread' ? 'No unread messages.' : 'No messages yet.'}</EmptyText>
        ) : (
          shown.map(notice => (
            <TouchableOpacity key={notice.id} style={[styles.card, !notice.read && styles.cardUnread]} onPress={() => markRead(notice.id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                {!notice.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.noticeBody}>{notice.body}</Text>
              <Text style={styles.noticeMeta}>
                {notice.senderName} ({notice.senderRole}) · {new Date(notice.createdAt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E4E9', gap: 6 },
  cardUnread: { borderColor: '#1976D2', backgroundColor: '#F4F8FC' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeTitle: { fontSize: 16, fontWeight: '600', color: '#374151', flexShrink: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1976D2' },
  noticeBody: { fontSize: 14, color: '#374151' },
  noticeMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
