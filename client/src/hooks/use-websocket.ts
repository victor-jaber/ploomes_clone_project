import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import type { Opportunity } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("[WS] Connected to Hermes CRM");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("[WS] Connection closed, reconnecting in 3s...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error("[WS] Error:", error);
      };
    } catch (error) {
      console.error("[WS] Failed to connect:", error);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "connected":
        console.log("[WS]", message.payload.message);
        break;

      case "opportunity_created":
        queryClient.setQueryData<Opportunity[]>(["/api/opportunities"], (old) => {
          if (!old) return [message.payload];
          const exists = old.some((o) => o.id === message.payload.id);
          if (exists) return old;
          return [...old, message.payload];
        });
        break;

      case "opportunity_updated":
        queryClient.setQueryData<Opportunity[]>(["/api/opportunities"], (old) => {
          if (!old) return old;
          return old.map((o) =>
            o.id === message.payload.id ? { ...o, ...message.payload } : o
          );
        });
        break;

      case "opportunity_deleted":
        queryClient.setQueryData<Opportunity[]>(["/api/opportunities"], (old) => {
          if (!old) return old;
          return old.filter((o) => o.id !== message.payload.id);
        });
        break;

      default:
        console.log("[WS] Unknown message type:", message.type);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef;
}
