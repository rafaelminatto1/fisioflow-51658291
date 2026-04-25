import { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from "../lib/token-storage";
import { config } from "../lib/config";
import NetInfo from "@react-native-community/netinfo";

export interface RealtimeEvent {
  type:
    | "appointment_update"
    | "new_message"
    | "whatsapp_message"
    | "typing"
    | "sla_breach"
    | "notification";
  payload: any;
  timestamp: string;
}

export interface UseRealtimeReturn {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  subscribe: (eventTypes: string[], callback: (event: RealtimeEvent) => void) => () => void;
}

type Subscriber = {
  eventTypes: string[];
  callback: (event: RealtimeEvent) => void;
};

const MAX_BACKOFF = 30_000;

export function useRealtime(): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Subscriber[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const mountedRef = useRef(true);

  const buildUrl = useCallback(async () => {
    const baseUrl = config.apiUrl.replace(/^https?/, "wss");
    const token = await getToken();
    return `${baseUrl}/api/realtime${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }, []);

  const notifySubscribers = useCallback((event: RealtimeEvent) => {
    if (!mountedRef.current) return;
    setLastEvent(event);
    for (const sub of subscribersRef.current) {
      if (sub.eventTypes.includes(event.type)) {
        try {
          sub.callback(event);
        } catch {}
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.CONNECTING ||
        wsRef.current.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    let url: string;
    try {
      url = await buildUrl();
    } catch {
      scheduleReconnect();
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
        backoffRef.current = 1000;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;
          notifySubscribers(data);
        } catch {}
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
      };
    } catch {
      scheduleReconnect();
    }
  }, [buildUrl, notifySubscribers]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    const delay = backoffRef.current;
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect();
    }, delay);
  }, [connect]);

  const subscribe = useCallback(
    (eventTypes: string[], callback: (event: RealtimeEvent) => void) => {
      const sub: Subscriber = { eventTypes, callback };
      subscribersRef.current.push(sub);
      return () => {
        subscribersRef.current = subscribersRef.current.filter((s) => s !== sub);
      };
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    connect();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && mountedRef.current) {
        if (
          wsRef.current?.readyState !== WebSocket.OPEN &&
          wsRef.current?.readyState !== WebSocket.CONNECTING
        ) {
          backoffRef.current = 1000;
          connect();
        }
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, lastEvent, subscribe };
}
