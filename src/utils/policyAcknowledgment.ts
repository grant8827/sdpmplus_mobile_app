import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type PolicyAcknowledgment } from '../services/api';
import { POLICIES_VERSION } from '../legal/documents';

// Screens showing the confirmation reload when it changes (e.g. the
// popup disappears as soon as someone confirms on Legal & Policies).
const listeners = new Set<() => void>();
export const policyAcknowledgmentChanged = () => listeners.forEach(listener => listener());

/**
 * The school's latest confirmation that it read the Legal & Policies
 * documents. `current` is true when it covers today's versions;
 * undefined while loading (or if it couldn't be loaded). Same as the website's.
 */
export function usePolicyAcknowledgment() {
  const { token, activeSchoolId } = useAuth();
  const [acknowledgment, setAcknowledgment] = useState<PolicyAcknowledgment | null | undefined>(undefined);
  const reload = useCallback(() => {
    if (!token) return;
    api.policyAcknowledgment(token).then(result => setAcknowledgment(result.acknowledgment)).catch(() => {});
  }, [token]);
  useEffect(() => { reload(); }, [reload, activeSchoolId]);
  useEffect(() => { listeners.add(reload); return () => { listeners.delete(reload); }; }, [reload]);
  const current = acknowledgment === undefined ? undefined : acknowledgment?.version === POLICIES_VERSION;
  return { acknowledgment, current, setAcknowledgment, reload };
}
