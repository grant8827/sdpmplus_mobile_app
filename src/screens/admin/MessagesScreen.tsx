import React, { useCallback, useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Dropdown } from '../../components/Dropdown';
import { NoticeCards } from '../../components/NoticeCards';
import { Banner, Button, Card, ChipRow, Input, Label, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Notice } from '../../types';

type Tab = 'messages' | 'send';
type Audience = 'ALL_STAFF' | 'ONE_STAFF' | 'ALL_PARENTS' | 'ONE_PARENT';
const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'ALL_STAFF', label: 'All Staff' },
  { value: 'ONE_STAFF', label: 'One Staff' },
  { value: 'ALL_PARENTS', label: 'All Parents' },
  { value: 'ONE_PARENT', label: 'One Parent' },
];
const STAFF_ROLE_LABELS: Record<string, string> = { teacher: 'Teacher', school_admin: 'Admin', staff: 'Front Desk' };

/**
 * Admin Messages — same as the website's: the Messages tab is this
 * admin's inbox (All Staff messages and anything addressed to them);
 * Send Message goes to all staff, one staff member, all parents, or one
 * parent. Recipients also get an email saying a message is waiting.
 */
export function MessagesScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<Notice[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ label: string; value: string }[]>([]);
  const [parentOptions, setParentOptions] = useState<{ label: string; value: string }[]>([]);
  const [audience, setAudience] = useState<Audience>('ALL_STAFF');
  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [inbox, staff, guardians] = await Promise.all([api.staffNotices(token), api.staff(token), api.guardians(token)]);
    setMessages(inbox);
    setStaffOptions(staff.filter(s => s.active).map(s => ({ value: s.id, label: `${s.fullName} (${STAFF_ROLE_LABELS[s.role] ?? s.role})` })));
    setParentOptions(guardians.filter(g => g.active).map(g => ({ value: g.userId, label: g.fullName })));
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const markRead = (noticeId: string) => {
    setMessages(current => current.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    if (token) api.markNoticeRead(token, noticeId).catch(() => {});
  };

  const chooseAudience = (next: Audience) => {
    setAudience(next);
    setRecipientId('');
  };

  const send = async () => {
    if (!token) return;
    if (!title.trim() || !body.trim()) { setMessage('Add a title and a message.'); return; }
    if ((audience === 'ONE_STAFF' || audience === 'ONE_PARENT') && !recipientId) { setMessage(`Choose a ${audience === 'ONE_STAFF' ? 'staff member' : 'parent'}.`); return; }
    setSending(true);
    setMessage('');
    try {
      if (audience === 'ALL_STAFF' || audience === 'ONE_STAFF') {
        await api.sendNotice(token, { title: title.trim(), body: body.trim(), targetType: 'STAFF', targetStaffUserId: audience === 'ONE_STAFF' ? recipientId : undefined });
      } else {
        await api.sendNotice(token, { title: title.trim(), body: body.trim(), targetType: audience === 'ALL_PARENTS' ? 'SCHOOL' : 'PARENT', targetParentUserId: audience === 'ONE_PARENT' ? recipientId : undefined });
      }
      setMessage('Message sent.');
      setTitle('');
      setBody('');
      setRecipientId('');
      await load();
    } catch (error) {
      setMessage(errorText(error, 'Could not send the message'));
    } finally {
      setSending(false);
    }
  };

  const oneOf = audience === 'ONE_STAFF' ? staffOptions : audience === 'ONE_PARENT' ? parentOptions : null;
  const unread = messages.filter(n => !n.read).length;

  return (
    <Screen title="Messages" subtitle="Send and review messages to staff and parents.">
      <SubTabs tabs={[{ key: 'messages', label: `Messages${unread ? ` (${unread})` : ''}` }, { key: 'send', label: 'Send Message' }]} active={tab} onChange={setTab} />
      <Banner text={message} onDismiss={() => setMessage('')} />

      {tab === 'messages' && <NoticeCards notices={messages} onRead={markRead} />}

      {tab === 'send' && (
        <Card>
          <Label>Send to</Label>
          <ChipRow options={AUDIENCES} value={audience} onChange={chooseAudience} />
          {oneOf && (
            <Dropdown
              label={audience === 'ONE_STAFF' ? 'Staff member' : 'Parent'}
              options={[{ label: 'Choose…', value: '' }, ...oneOf]}
              value={recipientId}
              onChange={setRecipientId}
            />
          )}
          <Input placeholder="Title" value={title} onChangeText={setTitle} />
          <Input placeholder="Message" value={body} onChangeText={setBody} multiline />
          <Button label={sending ? 'Sending…' : 'Send Message'} onPress={send} disabled={sending} />
        </Card>
      )}
    </Screen>
  );
}
