import type {
  RealtimeEventMap,
  RealtimeEventName,
  RealtimeService,
} from './RealtimeService';

/**
 * In-memory stand-in for the real backend transport (WebSocket / FCM
 * bridge) described in SDP-2. Lets Parent/Teacher screens exchange
 * events locally during UI development. Replace with a Socket.io or
 * Firebase implementation behind the same `RealtimeService` interface
 * once the backend is up — see `RealtimeService.ts`.
 */
class MockRealtimeService implements RealtimeService {
  private connected = false;
  private listeners = new Map<RealtimeEventName, Set<(payload: any) => void>>();

  async connect(_authToken: string): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  on<K extends RealtimeEventName>(
    event: K,
    handler: (payload: RealtimeEventMap[K]) => void,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit<K extends RealtimeEventName>(event: K, payload: RealtimeEventMap[K]): void {
    this.listeners.get(event)?.forEach(handler => handler(payload));
  }
}

export const realtimeService: RealtimeService = new MockRealtimeService();
