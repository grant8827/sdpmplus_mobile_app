import React, { useCallback, useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { NoticeCards } from '../../components/NoticeCards';
import { NoticeComposer, type NoticeTarget, type ParentOption } from '../../components/NoticeComposer';
import { Banner, Label, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Notice } from '../../types';

type Tab = 'messages' | 'compose';

/**
 * Teacher Messages — same as the website's: an inbox (All Staff messages
 * and anything addressed to this teacher), and Compose — to the whole
 * class's parents, one parent, or the school office.
 */
export function MessagesScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('messages');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [inbox, classParents] = await Promise.all([api.staffNotices(token), api.teacherParents(token)]);
    setNotices(inbox);
    setParents(classParents.map(p => ({ id: p.id, label: p.fullName })));
  }, [token]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const markRead = (noticeId: string) => {
    setNotices(current => current.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    if (token) api.markNoticeRead(token, noticeId).catch(() => {});
  };

  const sendToClass = async (target: NoticeTarget, title: string, body: string) => {
    if (!token) return;
    setMessage('');
    try {
      await api.sendNotice(token, {
        title, body,
        targetType: target.type === 'ALL' ? 'CLASS' : 'PARENT',
        targetParentUserId: target.type === 'PARENT' ? target.parentUserId : undefined,
      });
      setMessage('Message sent.');
    } catch (error) {
      setMessage(errorText(error, 'Could not send the message'));
    }
  };

  const sendToOffice = async (_target: NoticeTarget, title: string, body: string) => {
    if (!token) return;
    setMessage('');
    try {
      await api.sendNotice(token, { title, body, targetType: 'ADMIN' });
      setMessage('Message sent to the school office.');
    } catch (error) {
      setMessage(errorText(error, 'Could not send the message'));
    }
  };

  const unread = notices.filter(n => !n.read).length;

  return (
    <Screen title="Messages" subtitle="School announcements, and messages to your class or a parent.">
      <SubTabs tabs={[{ key: 'messages', label: `Messages${unread ? ` (${unread})` : ''}` }, { key: 'compose', label: 'Compose' }]} active={tab} onChange={setTab} />
      <Banner text={message} onDismiss={() => setMessage('')} />

      {tab === 'messages' && <NoticeCards notices={notices} onRead={markRead} />}

      {tab === 'compose' && (
        <>
          <NoticeComposer allLabel="All Class Parents" parentOptions={parents} onSend={sendToClass} sendLabel="Send Message" />
          <Label>Or message the school office directly</Label>
          <NoticeComposer allLabel="School Office" onSend={sendToOffice} sendLabel="Send to School Office" />
        </>
      )}
    </Screen>
  );
}
