import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

function log(message: string, source = "ws") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

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
      log(`WebSocket client connected. Total: ${this.clients.size}`, "ws");

      ws.on("close", () => {
        this.clients.delete(ws);
        log(`WebSocket client disconnected. Total: ${this.clients.size}`, "ws");
      });

      ws.on("error", (error) => {
        log(`WebSocket error: ${error.message}`, "ws");
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: "connected", payload: { message: "Connected to Hermes CRM" } }));
    });

    log("WebSocket server initialized", "ws");
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
}

export const wsManager = new WebSocketManager();
