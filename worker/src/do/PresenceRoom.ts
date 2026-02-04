import { DurableObject } from "cloudflare:workers";
import { Env, SessionMetadata, User } from "../types";

// A dedicated "Room" for global presence management using Hibernation API
export class PresenceRoom extends DurableObject {
  // WE DO NOT HOLD WEBSOCKETS IN A MAP for Hibernation.
  // The system holds them. We interact via ctx.getWebSockets().

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // [RPC MOCK] Internal API to get online users without KV N+1
    if (url.pathname.endsWith("/presence") && request.method === "GET") {
      try {
        const users = this.getOnlineUsers();
        return new Response(JSON.stringify(users), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("[PresenceRoom] Error in /presence handler", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // New Notify Endpoint for Cross-DO Alerts
    if (url.pathname.endsWith("/notify") && request.method === "POST") {
      const { targetUserId, message } = (await request.json()) as {
        targetUserId: string;
        message: any;
      };

      this.notifyUser(targetUserId, message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const sessionId = url.searchParams.get("sessionId");
    const userId = url.searchParams.get("userId");
    const displayName = url.searchParams.get("displayName");

    if (!sessionId || !userId || !displayName) {
      console.error("[PresenceRoom] Missing metadata");
      return new Response("Missing metadata", { status: 400 });
    }

    const { 0: client, 1: server } = new WebSocketPair();

    // Enable Hibernation: acceptWebSocket
    try {
      this.ctx.acceptWebSocket(server);
    } catch (err) {
      console.error("[PresenceRoom] Failed to accept WebSocket", err);
      return new Response("Internal Server Error", { status: 500 });
    }

    // Persist session metadata immediately
    // during hibernation, we can only access this via ws.deserializeAttachment()
    const meta: SessionMetadata & { lastSeen: number } = {
      sessionId,
      userId,
      displayName,
      lastSeen: Date.now(),
    };
    server.serializeAttachment(meta);

    // Send initial "Connected" message
    server.send(
      JSON.stringify({
        type: "system",
        content: "Connected to Global Presence",
      }),
    );

    // Optional: Broadcast join?
    // In a massive global room with 10k users, broadcasting every join/leave is noisy.
    // For this demo (limited users), it is FINE.
    this.broadcast({
      type: "presence_join",
      userId,
      displayName,
    });

    // Send current list to new user
    this.sendFullPresenceList(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // Helper to fetch list for internal API
  getOnlineUsers() {
    const uniqueUsers = new Map<
      string,
      { id: string; displayName: string; status: string }
    >();

    const now = Date.now();
    const threshold = now - 120000; // 2 minutes grace period for listing

    for (const socket of this.ctx.getWebSockets()) {
      try {
        const meta = socket.deserializeAttachment() as SessionMetadata & {
          status?: string;
          lastSeen?: number;
        };
        // Skip sessions that haven't pinged in over 2 minutes
        if (meta.lastSeen && meta.lastSeen < threshold) continue;

        // Use Set/Map to deduplicate. If multiple tabs, prefer "online" over "away/busy" if we were merging,
        uniqueUsers.set(meta.userId, {
          id: meta.userId,
          displayName: meta.displayName,
          status: meta.status || "online",
        });
      } catch (e) {
        console.error("[PresenceRoom] Error deserializing attachment", e);
      }
    }
    return Array.from(uniqueUsers.values());
  }

  // Helper to send list to specific socket
  sendFullPresenceList(ws: WebSocket) {
    const participants = this.getOnlineUsers();
    ws.send(
      JSON.stringify({
        type: "presence_full_sync",
        participants,
      }),
    );
  }

  // --- HIBERNATION EVENT HANDLERS ---

  override async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ) {
    try {
      const data = JSON.parse(message as string);
      const meta = ws.deserializeAttachment() as SessionMetadata & {
        status?: string;
      };

      // Update Metadata
      const newStatus = data.status || meta.status || "online";
      const newDisplayName = data.displayName || meta.displayName;

      const newMeta = {
        ...meta,
        status: newStatus,
        displayName: newDisplayName,
        lastSeen: Date.now(),
      };
      ws.serializeAttachment(newMeta);

      if (data.type === "presence_update") {
        // Broadcast to everyone ELSE (Avoid echo if possible, though frontend handles it)
        this.broadcast(
          {
            type: "presence_update",
            userId: newMeta.userId,
            displayName: newMeta.displayName,
            status: newMeta.status,
          },
          ws,
        );
      } else if (data.type === "ping") {
        // Ping received, lastSeen already updated above.
        // Update alarm if not set
        const alarm = await this.ctx.storage.getAlarm();
        if (!alarm) {
          await this.ctx.storage.setAlarm(Date.now() + 60000);
        }
      }
    } catch (err) {
      console.error("[PresenceRoom] Error parsing message", err);
    }
  }

  override async alarm() {
    console.log("[PresenceRoom] Running session sweep...");
    const now = Date.now();
    const threshold = now - 90000; // 90 seconds
    let hasGoneOffline = false;

    for (const ws of this.ctx.getWebSockets()) {
      try {
        const meta = ws.deserializeAttachment() as SessionMetadata & {
          lastSeen?: number;
        };
        if (meta && meta.lastSeen && meta.lastSeen < threshold) {
          console.log(
            `[PresenceRoom] Closing stale session for ${meta.userId}`,
          );
          ws.close(1011, "Heartbeat timeout");
          // The webSocketClose handler will handle broadcasting offline if needed
        }
      } catch (e) {}
    }

    // Reschedule sweep if there are still active sockets
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 60000);
    }
  }

  override async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    // Determine who left by looking at their attachment ONE LAST TIME
    try {
      const meta = ws.deserializeAttachment() as SessionMetadata;

      // Broadcast Leave (or offline status)
      // FIX: Only broadcast offline if this was the LAST connection for this user.
      if (meta) {
        let hasOtherConnections = false;
        for (const otherWs of this.ctx.getWebSockets()) {
          if (otherWs === ws) continue;
          try {
            const otherMeta =
              otherWs.deserializeAttachment() as SessionMetadata;
            if (otherMeta && otherMeta.userId === meta.userId) {
              hasOtherConnections = true;
              break;
            }
          } catch (e) {
            // Ignore invalid attachments
          }
        }

        if (!hasOtherConnections) {
          this.broadcast({
            type: "presence_update",
            userId: meta.userId,
            displayName: meta.displayName,
            status: "offline",
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  override async webSocketError(ws: WebSocket, error: unknown) {
    // Treat as close
    // Note: webSocketClose is usually called after error anyway, but good to be safe.
  }

  // Broadcast to all active sockets
  broadcast(msg: any, exclude?: WebSocket) {
    const str = JSON.stringify(msg);
    // getWebSockets() returns all ACTIVE sockets. Code doesn't wake up if no sockets.
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude) continue;
      try {
        ws.send(str);
      } catch (e) {
        // If send fails, socket might be broken. Workers will clean it up usually.
      }
    }
  }

  // Targeted Notification
  notifyUser(userId: string, message: any) {
    const notification = JSON.stringify({
      type: "message_notification",
      message,
    });

    for (const ws of this.ctx.getWebSockets()) {
      try {
        const meta = ws.deserializeAttachment() as SessionMetadata;
        if (meta && meta.userId === userId) {
          ws.send(notification);
        }
      } catch (e) {}
    }
  }
}
