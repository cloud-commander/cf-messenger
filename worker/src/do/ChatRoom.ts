import { DurableObject } from "cloudflare:workers";
import {
  Env,
  AuthSession,
  Message,
  User,
  PresenceData,
  SessionMetadata,
} from "../types";
import { USERS } from "../data/users";
import { z } from "zod";

// Services & Handlers
import { BotService } from "../services/BotService";
import { MessageHandler, MessageContext } from "../handlers/MessageHandler";
import { ChatHandler } from "../handlers/ChatHandler";
import { NudgeHandler } from "../handlers/NudgeHandler";
import { WinkHandler } from "../handlers/WinkHandler";
import { TypingHandler } from "../handlers/TypingHandler";
import { PresenceHandler } from "../handlers/PresenceHandler";
import { AckHandler } from "../handlers/AckHandler";
import { IBotService } from "../services/BotService";

export interface ChatRoomDependencies {
  botService?: IBotService;
  handlers?: Map<string, MessageHandler>;
}

const MessageSchema = z.object({
  type: z.enum([
    "chat",
    "nudge",
    "wink",
    "typing",
    "system",
    "presence",
    "ack",
    "delivery_status",
    "history",
    "ping",
  ]),
  content: z.string().max(2048).optional(),
  winkId: z.string().optional(),
  isTyping: z.boolean().optional(),
  id: z.string().optional(),
  roomId: z.string().optional(),
  senderId: z.string().optional(),
  timestamp: z.number().optional(),
  displayName: z.string().max(50).optional(),
  status: z.string().max(20).optional(),
  ackId: z.string().optional(),
});

const SAVE_INTERVAL_MS = 1000; // 1s for POC demo safety
const HISTORY_LIMIT = 100;

export class ChatRoom extends DurableObject {
  storage: DurableObjectStorage;
  override env: Env;

  messages: Message[] = [];
  isDirty: boolean = false;
  lastSaveTime: number = 0;
  saveTimer: number | null = null;

  // Services
  botService: IBotService;
  handlers: Map<string, MessageHandler>;

  // Rate Limiting: Map<UserId, Timestamp[]>
  rateLimits: Map<string, number[]> = new Map();

  constructor(
    ctx: DurableObjectState,
    env: Env,
    dependencies?: ChatRoomDependencies,
  ) {
    super(ctx, env);
    this.env = env;
    this.storage = ctx.storage;

    // Initialize Services (DI or Default)
    this.botService = dependencies?.botService || new BotService(env);

    // Initialize Handlers (DI or Default)
    if (dependencies?.handlers) {
      this.handlers = dependencies.handlers;
    } else {
      this.handlers = new Map();
      this.handlers.set("chat", new ChatHandler(this.botService));
      this.handlers.set("nudge", new NudgeHandler());
      this.handlers.set("wink", new WinkHandler());
      this.handlers.set("typing", new TypingHandler());
      this.handlers.set("ack", new AckHandler());
      this.handlers.set(
        "presence",
        new PresenceHandler(() => this.broadcastParticipants()),
      );
    }

    // Load history
    this.ctx.blockConcurrencyWhile(async () => {
      const legacy = await this.storage.get<Message[]>("history");
      if (legacy && legacy.length > 0) {
        console.log(`[ChatRoom] Migrating ${legacy.length} messages...`);
        const entries: Record<string, Message> = {};
        for (const msg of legacy) {
          entries[`msg_${msg.timestamp}_${msg.id}`] = msg;
        }
        await this.storage.put(entries);
        await this.storage.delete("history");
        this.messages = legacy;
        return;
      }

      const list = await this.storage.list<Message>({
        prefix: "msg_",
        reverse: true,
        limit: 50,
      });
      this.messages = Array.from(list.values()).reverse();

      // Load roomId from storage (survives hibernation)
      const storedRoomId = await this.storage.get<string>("roomId");
      if (storedRoomId) this.roomId = storedRoomId;
    });
  }

  scheduleSave() {
    this.isDirty = true;
    if (!this.saveTimer) {
      // @ts-ignore
      this.saveTimer = setTimeout(() => {
        this.saveHistory().catch((err) => {
          console.error("[ChatRoom] Failed to save history:", err);
        });
        this.saveTimer = null;
      }, 5000);
    }
  }

  async saveHistory() {
    if (!this.isDirty) return;
    this.isDirty = false;
    this.lastSaveTime = Date.now();

    const entries: Record<string, Message> = {};
    const msgsToWrite = this.messages;

    for (const msg of msgsToWrite) {
      entries[`msg_${msg.timestamp}_${msg.id}`] = msg;
    }

    await this.storage.put(entries);
    console.log(`[ChatRoom] Saved ${Object.keys(entries).length} messages.`);
  }

  roomId: string | null = null;

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const parts = url.pathname.split("/");
    const roomIndex = parts.indexOf("room");
    if (roomIndex !== -1 && parts[roomIndex + 1]) {
      this.roomId = parts[roomIndex + 1];
      this.ctx.blockConcurrencyWhile(async () => {
        await this.storage.put("roomId", this.roomId);
      });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const sessionId = url.searchParams.get("sessionId");
    const userId = url.searchParams.get("userId");
    const displayName = url.searchParams.get("displayName");

    if (!sessionId || !userId || !displayName) {
      return new Response("Missing metadata", { status: 400 });
    }

    // Auth & Identity Validation
    const sessionStr = await this.env.CF_MESSENGER_SESSIONS.get(
      `session:${sessionId}`,
    );
    if (!sessionStr) {
      return new Response("Unauthorized: Invalid Session", { status: 401 });
    }
    const session = JSON.parse(sessionStr) as AuthSession;
    if (session.user.id !== userId) {
      return new Response("Forbidden: Identity Mismatch", { status: 403 });
    }

    // Access Control for DMs
    if (this.roomId && this.roomId.startsWith("dm_")) {
      const participants = this.roomId.replace("dm_", "").split("__");
      if (!participants.includes(userId)) {
        return new Response("Forbidden: Not a participant", { status: 403 });
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const metadata: SessionMetadata & { lastSeen: number } = {
      sessionId,
      userId,
      displayName,
      lastSeen: Date.now(),
    };
    server.serializeAttachment(metadata);

    const isDM = this.roomId?.startsWith("dm_");

    if (!isDM) {
      server.send(
        JSON.stringify({
          type: "system",
          content: "Connected to ChatRoom",
          roomId: this.roomId || "general",
          timestamp: Date.now(),
        }),
      );
    }

    // Send history
    if (this.messages.length > 0) {
      server.send(
        JSON.stringify({
          type: "history",
          messages: this.messages,
          roomId: this.roomId || "general",
        }),
      );
    }

    // Broadcast join for groups
    if (!isDM) {
      this.broadcast({
        type: "system",
        content: `${displayName} joined the room.`,
        roomId: this.roomId || "general",
        timestamp: Date.now(),
      });
      this.broadcastParticipants();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcastParticipants() {
    const participants: { id: string; displayName: string; status: string }[] =
      [];
    const now = Date.now();
    const threshold = now - 120000;

    for (const ws of this.ctx.getWebSockets()) {
      try {
        const meta = ws.deserializeAttachment() as SessionMetadata & {
          lastSeen?: number;
          status?: string;
        };
        if (meta && meta.userId) {
          if (meta.lastSeen && meta.lastSeen < threshold) continue;
          participants.push({
            id: meta.userId,
            displayName: meta.displayName,
            status: meta.status || "online",
          });
        }
      } catch (e) {}
    }

    this.broadcast({
      type: "participants",
      roomId: this.roomId || "general",
      participants,
    });
  }

  override async webSocketClose(ws: WebSocket) {
    let session: SessionMetadata | null = null;
    try {
      session = ws.deserializeAttachment() as SessionMetadata;
    } catch (e) {}

    if (session) {
      this.rateLimits.delete(session.userId);
      if (!this.roomId?.startsWith("dm_")) {
        this.broadcast({
          type: "system",
          content: `${session.displayName} left the room.`,
          roomId: this.roomId || "general",
          timestamp: Date.now(),
        });
        this.broadcastParticipants();
      }
    }
  }

  override async webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }

  override async alarm() {
    const now = Date.now();
    const threshold = now - 90000;

    for (const ws of this.ctx.getWebSockets()) {
      try {
        const meta = ws.deserializeAttachment() as SessionMetadata & {
          lastSeen?: number;
        };
        if (meta && meta.lastSeen && meta.lastSeen < threshold) {
          ws.close(1011, "Heartbeat timeout");
        }
      } catch (e) {}
    }

    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 60000);
    }
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ) {
    let session: SessionMetadata | null = null;
    try {
      session = ws.deserializeAttachment() as SessionMetadata;
    } catch (e) {
      return;
    }
    if (!session) return;

    const now = Date.now();
    const userId = session.userId;
    const timestamps = this.rateLimits.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < 60000);

    if (recent.length >= 15) {
      ws.send(
        JSON.stringify({
          type: "error",
          content: "Rate limit exceeded.",
        }),
      );
      this.rateLimits.set(userId, recent);
      return;
    }

    recent.push(now);
    this.rateLimits.set(userId, recent);

    try {
      const raw = JSON.parse(message as string);
      const result = MessageSchema.safeParse(raw);
      if (!result.success) {
        ws.send(
          JSON.stringify({
            type: "error",
            content: "Invalid payload",
          }),
        );
        return;
      }

      const data = result.data;
      const meta = ws.deserializeAttachment() as SessionMetadata & {
        lastSeen: number;
      };
      ws.serializeAttachment({ ...meta, lastSeen: Date.now() });

      if (data.type === "ping") {
        const alarm = await this.ctx.storage.getAlarm();
        if (!alarm) {
          await this.ctx.storage.setAlarm(Date.now() + 60000);
        }
        return;
      }

      if (data.id && this.messages.some((m) => m.id === data.id)) return;

      const handler = this.handlers.get(data.type);
      if (handler) {
        const context: MessageContext = {
          ws,
          session,
          env: this.env,
          roomId: this.roomId,
          broadcast: this.broadcast.bind(this),
          scheduleSave: this.scheduleSave.bind(this),
          addMessage: (msg: Message) => {
            this.messages.push(msg);
            if (this.messages.length > HISTORY_LIMIT) this.messages.shift();
          },
          getMessageHistory: () => this.messages,
          updateSessionMetadata: (newMeta: SessionMetadata) => {
            ws.serializeAttachment(newMeta);
          },
        };
        await handler.handle(data, context);
      }
    } catch (err) {
      console.error("[ChatRoom] Error:", err);
    }
  }

  broadcast(message: any, excludeWs?: WebSocket) {
    const msgStr = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === excludeWs) continue;
      try {
        ws.send(msgStr);
      } catch (err) {}
    }
  }
}
