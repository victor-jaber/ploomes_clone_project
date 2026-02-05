import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import clientLogger from "@/lib/logger";
import type { Lead } from "@shared/schema";

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
        clientLogger.success("WebSocket", "Conectado ao Hermes CRM");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          clientLogger.error("WebSocket", "Erro ao processar mensagem");
        }
      };

      wsRef.current.onclose = () => {
        clientLogger.warn("WebSocket", "Desconectado, reconectando em 3s...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = () => {
        clientLogger.error("WebSocket", "Erro na conexão");
      };
    } catch (error) {
      clientLogger.error("WebSocket", "Falha ao conectar");
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case "connected":
        clientLogger.info("WebSocket", message.payload.message);
        break;

      case "lead_created":
        queryClient.setQueryData<Lead[]>(["/api/leads"], (old) => {
          if (!old) return [message.payload];
          const exists = old.some((l) => l.id === message.payload.id);
          if (exists) return old;
          return [...old, message.payload];
        });
        break;

      case "lead_updated":
        queryClient.setQueryData<Lead[]>(["/api/leads"], (old) => {
          if (!old) return old;
          return old.map((l) =>
            l.id === message.payload.id ? { ...l, ...message.payload } : l
          );
        });
        break;

      case "lead_deleted":
        queryClient.setQueryData<Lead[]>(["/api/leads"], (old) => {
          if (!old) return old;
          return old.filter((l) => l.id !== message.payload.id);
        });
        break;

      case "interaction_created":
        const interactionLeadId = message.payload.leadId;
        if (interactionLeadId) {
          queryClient.setQueryData<any[]>([`/api/leads/${interactionLeadId}/interactions`], (old) => {
            if (!old) return [message.payload];
            const exists = old.some((i) => i.id === message.payload.id);
            if (exists) return old;
            return [message.payload, ...old];
          });
        }
        break;

      default:
        clientLogger.debug("WebSocket", `Tipo de mensagem desconhecido: ${message.type}`);
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
