import React, { useMemo } from 'react';
import { Screen } from '../../components/Screen';
import { NoticeComposer, type TargetOption } from '../../components/NoticeComposer';
import { useAuth } from '../../context/AuthContext';
import { mockChildren } from '../../mocks/mockData';
import { realtimeService } from '../../services/realtime';
import type { Notice } from '../../types';

/** SDP-8 (notices half): compose to "All Class Parents" or one specific parent. */
export function ComposeNoticeScreen() {
  const { user } = useAuth();

  const targetOptions = useMemo<TargetOption[]>(() => {
    if (!user) return [];
    const parentIds = Array.from(
      new Set(mockChildren.filter(c => c.teacherId === user.id).map(c => c.parentId)),
    );
    return [
      { id: 'ALL', label: 'All Class Parents' },
      ...parentIds.map(id => ({ id, label: id })),
    ];
  }, [user]);

  const handleSend = (targetId: string, title: string, body: string) => {
    if (!user) return;
    const notice: Notice = {
      id: `notice-${Date.now()}`,
      title,
      body,
      senderName: user.fullName,
      senderRole: 'teacher',
      createdAt: new Date().toISOString(),
      targetTeacherId: targetId === 'ALL' ? user.id : undefined,
      targetParentId: targetId === 'ALL' ? undefined : targetId,
      read: false,
    };
    realtimeService.emit('notice:posted', notice);
  };

  return (
    <Screen title="Compose Notice" subtitle="Message your class or a specific parent.">
      <NoticeComposer
        targetOptions={targetOptions}
        defaultTargetId="ALL"
        onSend={handleSend}
      />
    </Screen>
  );
}
