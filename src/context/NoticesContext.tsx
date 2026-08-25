import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { mockNotices } from '../mocks/mockData';
import { realtimeService } from '../services/realtime';
import type { Notice } from '../types';

interface NoticesContextValue {
  notices: Notice[];
  unreadCount: number;
  markRead: (noticeId: string) => void;
}

const NoticesContext = createContext<NoticesContextValue | undefined>(undefined);

/**
 * Backs SDP-5 (Parent Notices feed + unread badge on the tab icon).
 * New notices arrive via the `notice:posted` real-time event, which
 * the Teacher composer (SDP-8) and Admin broadcast composer (SDP-11)
 * both emit.
 */
export function NoticesProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>(mockNotices);

  useEffect(() => {
    return realtimeService.on('notice:posted', notice => {
      setNotices(prev => [notice, ...prev]);
    });
  }, []);

  const markRead = (noticeId: string) => {
    setNotices(prev =>
      prev.map(n => (n.id === noticeId ? { ...n, read: true } : n)),
    );
  };

  const value = useMemo<NoticesContextValue>(
    () => ({
      notices,
      unreadCount: notices.filter(n => !n.read).length,
      markRead,
    }),
    [notices],
  );

  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>;
}

export function useNotices(): NoticesContextValue {
  const ctx = useContext(NoticesContext);
  if (!ctx) throw new Error('useNotices must be used within a NoticesProvider');
  return ctx;
}
