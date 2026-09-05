import { useEffect, useRef } from 'react';

export interface DealFlowSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Connects to the backend's internal-workspace WebSocket (/ws) and invokes
 * `onMessage` for every parsed event. Reconnects with backoff on drop.
 *
 * Not used on the Customer Portal - the portal is intentionally isolated to
 * its own token-scoped REST calls only, never the internal broadcast channel.
 */
export function useDealFlowSocket(onMessage: (msg: DealFlowSocketMessage) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByUs = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessageRef.current(parsed);
        } catch {
          // non-JSON frame (e.g. plain pong) - ignore
        }
      };

      socket.onclose = () => {
        if (!closedByUs) {
          retryTimer = setTimeout(connect, 3000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);
}
