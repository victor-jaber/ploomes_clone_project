import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import logger from "./logger";

interface BroadcastMessage {
  type: string;
  payload: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      logger.success(`Cliente conectado (${this.clients.size} ativos)`, { prefix: "WS" });

      ws.on("close", () => {
        this.clients.delete(ws);
        logger.info(`Cliente desconectado (${this.clients.size} ativos)`, { prefix: "WS" });
      });

      ws.on("error", (error) => {
        logger.error(`Erro no WebSocket: ${error.message}`, undefined, { prefix: "WS" });
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: "connected", payload: { message: "Connected to Hermes CRM" } }));
    });

    logger.success("WebSocket inicializado", { prefix: "WS" });
  }

  broadcast(message: BroadcastMessage) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  broadcastLeadUpdate(lead: any) {
    this.broadcast({
      type: "lead_updated",
      payload: lead,
    });
  }

  broadcastLeadCreated(lead: any) {
    this.broadcast({
      type: "lead_created",
      payload: lead,
    });
  }

  broadcastLeadDeleted(leadId: string) {
    this.broadcast({
      type: "lead_deleted",
      payload: { id: leadId },
    });
  }

  broadcastInteractionCreated(interaction: any) {
    this.broadcast({
      type: "interaction_created",
      payload: interaction,
    });
  }
}

export const wsManager = new WebSocketManager();
