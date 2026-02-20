type StateStreamListener = (event: StateStreamDeltaEvent) => void;

export type StateStreamDeltaEvent = {
  userId: number;
  baseId: string;
  seq: number;
  serverTime: number;
  op: string;
  delta: Record<string, unknown>[];
};

const listenersByUser = new Map<number, Map<string, StateStreamListener>>();
let subscriptionCounter = 0;

export function subscribeStateStream(
  userId: number,
  listener: StateStreamListener
): () => void {
  const subscriptionId = `s${++subscriptionCounter}`;
  const bySubscription = listenersByUser.get(userId) ?? new Map<string, StateStreamListener>();
  bySubscription.set(subscriptionId, listener);
  listenersByUser.set(userId, bySubscription);

  return () => {
    const current = listenersByUser.get(userId);
    if (!current) return;
    current.delete(subscriptionId);
    if (current.size === 0) {
      listenersByUser.delete(userId);
    }
  };
}

export function publishStateStreamDelta(event: StateStreamDeltaEvent): void {
  const listeners = listenersByUser.get(event.userId);
  if (!listeners || listeners.size === 0) return;

  for (const listener of listeners.values()) {
    listener(event);
  }
}
