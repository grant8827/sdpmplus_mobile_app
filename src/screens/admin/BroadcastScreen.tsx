import React from 'react';
import { Screen } from '../../components/Screen';
import { NoticeComposer } from '../../components/NoticeComposer';
import { useAuth } from '../../context/AuthContext';
import { realtimeService } from '../../services/realtime';
import type { Notice } from '../../types';

/** SDP-11 (broadcast half): send a notice to all school parents. */
export function BroadcastScreen() {
  const { user } = useAuth();

  const handleSend = (_targetId: string, title: string, body: string) => {
    if (!user) return;
    const notice: Notice = {
      id: `notice-${Date.now()}`,
      title,
      body,
      senderName: user.fullName,
      senderRole: 'admin',
      createdAt: new Date().toISOString(),
      // No targetTeacherId/targetParentId => school-wide.
      read: false,
    };
    realtimeService.emit('notice:posted', notice);
  };

  return (
    <Screen title="Broadcast" subtitle="Send an announcement to all school parents.">
      <NoticeComposer
        targetOptions={[{ id: 'ALL', label: 'All School Parents' }]}
        defaultTargetId="ALL"
        onSend={handleSend}
        sendLabel="Send to All School Parents"
      />
    </Screen>
  );
}
