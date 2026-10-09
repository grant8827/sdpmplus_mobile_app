import React, { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { QueueList } from '../../components/QueueList';
import { SubTabs } from '../../components/SubTabs';
import { api } from '../../services/api';
import type { QueueItem } from '../../types';

type Tab = 'DROP_OFF' | 'PICK_UP';
const POLL_MS = 4000;

/**
 * SDP-6: Teacher Tab 1 - Live Drop-off & Pick-up Queue, split into
 * Drop-off / Pick-up tabs (same split as Admin's queue, but scoped to
 * this teacher's own class — see admin/LiveQueueScreen for the
 * all-classes view).
 * SDP-7: Approving a drop-off auto-marks attendance (via pickup_status)
 * on the backend.
 *
 * Backed by the real queue_items table now, so a request a parent
 * submits — from the app or the website — shows up here. Polls rather
 * than pushing, since there's no websocket/live-update transport yet.
 */
export function LiveQueueScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('DROP_OFF');
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.teacherQueue(token).then(next => { if (!cancelled) setQueue(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  // Errors propagate to QueueList, which shows them on the card; the
  // queue is refreshed either way.
  const approve = async (item: QueueItem) => {
    if (!token) return;
    try { await api.approveQueueItem(token, item.id); }
    finally { api.teacherQueue(token).then(setQueue).catch(() => {}); }
  };

  const decline = async (item: QueueItem) => {
    if (!token) return;
    try { await api.declineQueueItem(token, item.id); }
    finally { api.teacherQueue(token).then(setQueue).catch(() => {}); }
  };

  const visible = queue.filter(item => item.requestType === tab);

  return (
    <Screen title="Live Queue" subtitle="Incoming drop-off and pick-up requests for your class.">
      <SubTabs
        tabs={[
          { key: 'DROP_OFF', label: 'Drop-off' },
          { key: 'PICK_UP', label: 'Pick-up' },
        ]}
        active={tab}
        onChange={setTab}
      />
      <QueueList items={visible} onApprove={approve} onDecline={decline} />
    </Screen>
  );
}
