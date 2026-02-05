import type {
  User,
  Message,
  Room,
  PresenceStatus,
  AuthSession,
} from "../types";
import { AVATARS } from "../data/avatars";
import { z } from "zod";

const MessageSchema = z.object({
  type: z.enum([
    "chat",
    "nudge",
    "wink",
    "typing",
    "system",
    "participants",
    "history",
    "delivery_status",
    "ack",
    "ping",
  ]),
  content: z.string().optional(),
  id: z.string().optional(),
  roomId: z.string().optional(),
  senderId: z.string().optional(),
  displayName: z.string().optional(),
  status: z.enum(["sent", "delivered", "read"]).optional(),
  ackId: z.string().optional(),
  participants: z.array(z.any()).optional(),
  messages: z.array(z.any()).optional(),
  timestamp: z.number().optional(),
});

export interface IMessengerService {
  getCurrentUser(): Promise<User>;
  getContacts(): Promise<User[]>;
  getRooms(): Promise<Room[]>;
  getMessages(roomId: string): Promise<Message[]>;
  sendMessage(
    roomId: string,
    content: string,
    senderId: string,
  ): Promise<Message>;
  sendAck(roomId: string, ackId: string, status: "delivered" | "read"): void;
  setPresence(
    userId: string,
    status: PresenceStatus,
    displayName?: string,
  ): Promise<void>;
  getUser(userId: string): Promise<User | undefined>;
  getAvatarUrl(avatarId: string): string;
  logout(): Promise<void>;
}

interface PresenceUpdatePayload {
  userId: string;
  status: PresenceStatus;
  displayName?: string;
  type?: string;
}

class RealMessengerService implements IMessengerService {
  private users: User[] = [];
  private currentUser: User | null = null;
  private sessionId: string | null = null;

  private sessions: Map<string, WebSocket> = new Map<string, WebSocket>();
  private reconnectAttempts: Map<string, number> = new Map<string, number>();
  private isConnecting: Map<string, boolean> = new Map<string, boolean>();

  private messageCache: Map<string, Message[]> = new Map<string, Message[]>();
  private pingIntervals: Map<string, number> = new Map<string, number>();

  private messageListeners: ((roomId: string, message: Message) => void)[] = [];
  private contactsListeners: ((contacts: User[]) => void)[] = [];
  private currentUserListeners: ((user: User) => void)[] = [];

  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (this.sessionId) {
      headers.set("Authorization", `Bearer ${this.sessionId}`);
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    const json = (await res.json()) as {
      success: boolean;
      data?: T;
      error?: { code: string; message: string };
    };

    if (!json.success || !res.ok) {
      throw new Error(
        json.error?.message ??
          `API Error ${String(res.status)}: ${res.statusText}`,
      );
    }
    return json.data as T;
  }

  async getCurrentUser(): Promise<User> {
    if (this.currentUser) return this.currentUser;

    try {
      this.sessionId ??= localStorage.getItem("cf-messenger-session");
      if (!this.sessionId) throw new Error("No persisted session found");

      const user = await this.fetchApi<User>("/auth/me");
      this.currentUser = user;
      this.emitCurrentUserUpdate();
      return user;
    } catch (e: unknown) {
      localStorage.removeItem("cf-messenger-session");
      this.sessionId = null;
      throw e;
    }
  }

  async login(userId: string, token: string): Promise<User> {
    const session = await this.fetchApi<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ userId, token }),
    });

    this.sessionId = session.sessionId;
    this.currentUser = session.user;
    localStorage.setItem("cf-messenger-session", this.sessionId);
    this.emitCurrentUserUpdate();
    return session.user;
  }

  async getContacts(): Promise<User[]> {
    try {
      const accounts = await this.fetchApi<User[]>("/users");
      const currentId = this.currentUser?.id;
      this.users = currentId
        ? accounts.filter((u) => u.id !== currentId)
        : accounts;
      this.emitContactsUpdate();
      return this.users;
    } catch (e: unknown) {
      console.error("Failed to fetch contacts", e);
      throw e;
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    if (this.users.length === 0) await this.getContacts();
    return this.users.find((u) => u.id === userId);
  }

  public onContactsUpdated(listener: (contacts: User[]) => void) {
    this.contactsListeners.push(listener);
    if (this.users.length > 0) {
      listener(this.users);
    } else {
      this.getContacts().catch((err: unknown) => {
        console.error(err);
      });
    }
  }

  private emitContactsUpdate() {
    this.contactsListeners.forEach((l) => {
      l(this.users);
    });
  }

  public onCurrentUserUpdated(listener: (user: User) => void) {
    this.currentUserListeners.push(listener);
    if (this.currentUser) {
      listener(this.currentUser);
    }
  }

  private emitCurrentUserUpdate() {
    if (this.currentUser) {
      const user = this.currentUser;
      this.currentUserListeners.forEach((l) => {
        l(user);
      });
    }
  }

  async getRooms(): Promise<Room[]> {
    try {
      return await this.fetchApi<Room[]>("/rooms");
    } catch (e: unknown) {
      console.error("Failed to fetch rooms", e);
      return [];
    }
  }

  public connectWebSocket(roomId = "general") {
    if (this.sessions.has(roomId)) {
      const existing = this.sessions.get(roomId);
      if (
        existing?.readyState === WebSocket.OPEN ||
        existing?.readyState === WebSocket.CONNECTING
      )
        return;
    }

    if (this.isConnecting.get(roomId)) return;
    this.isConnecting.set(roomId, true);

    if (!this.currentUser || !this.sessionId) {
      this.isConnecting.set(roomId, false);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/room/${roomId}?sessionId=${this.sessionId}&userId=${this.currentUser.id}&displayName=${encodeURIComponent(this.currentUser.displayName)}`;

    const ws = new WebSocket(wsUrl);
    this.sessions.set(roomId, ws);

    ws.onopen = () => {
      console.log(`[MSN] Connected to room: ${roomId}`);
      this.reconnectAttempts.set(roomId, 0);
      this.isConnecting.set(roomId, false);
      this.startPinging(roomId);
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data as string) as Record<string, unknown>;
        const result = MessageSchema.safeParse(raw);
        if (!result.success) return;
        this.handleWebSocketMessage(roomId, result.data as Message);
      } catch (err: unknown) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      this.stopPinging(roomId);
      this.isConnecting.set(roomId, false);
      const attempts = this.reconnectAttempts.get(roomId) ?? 0;
      const delay =
        Math.min(30000, 1000 * Math.pow(2, attempts)) + Math.random() * 1000;
      this.reconnectAttempts.set(roomId, attempts + 1);
      setTimeout(() => {
        this.connectWebSocket(roomId);
      }, delay);
    };
  }

  private handleWebSocketMessage(roomId: string, msg: Message) {
    if (msg.type === "history" && msg.messages) {
      const msgs: Message[] = msg.messages
        .filter((m) => m.type === "chat" || m.type === "system")
        .map((m) => ({
          ...m,
          timestamp: m.timestamp,
        }));
      this.messageCache.set(roomId, msgs);
      msgs.forEach((m) => {
        this.emitMessageUpdate(roomId, m);
      });
      return;
    }

    if (
      msg.type === "chat" ||
      msg.type === "typing" ||
      msg.type === "system" ||
      msg.type === "participants" ||
      msg.type === "delivery_status" ||
      msg.type === "nudge"
    ) {
      if (!msg.timestamp) msg.timestamp = Date.now();
      const targetRoomId = msg.roomId;
      if (msg.type === "chat") {
        const current = this.messageCache.get(targetRoomId) ?? [];
        if (!current.find((m) => m.id === msg.id)) {
          current.push(msg);
          this.messageCache.set(targetRoomId, current);
        }
      }
      this.emitMessageUpdate(targetRoomId, msg);
    }
  }

  async sendMessage(
    roomId: string,
    content: string,
    senderId: string,
  ): Promise<Message> {
    let ws = this.sessions.get(roomId);
    if (ws?.readyState !== WebSocket.OPEN) {
      this.connectWebSocket(roomId);
      await this.waitForConnection(roomId);
      ws = this.sessions.get(roomId);
    }
    if (ws?.readyState !== WebSocket.OPEN)
      throw new Error("No active connection");

    const msg: Message = {
      id: `temp_${String(Date.now())}`,
      roomId,
      senderId,
      content,
      timestamp: Date.now(),
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    ws.send(JSON.stringify(msg));
    return msg;
  }

  sendAck(roomId: string, ackId: string, status: "delivered" | "read") {
    const ws = this.sessions.get(roomId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ack", ackId, status }));
    }
  }

  private async waitForConnection(
    roomId: string,
    timeoutMs = 5000,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const currentWs = this.sessions.get(roomId);
      if (currentWs?.readyState === WebSocket.OPEN) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Connection timeout");
  }

  getMessages(roomId: string): Promise<Message[]> {
    this.connectWebSocket(roomId);
    return Promise.resolve(this.messageCache.get(roomId) ?? []);
  }

  public onMessageReceived(
    listener: (roomId: string, message: Message) => void,
  ) {
    this.messageListeners.push(listener);
  }

  private emitMessageUpdate(roomId: string, message: Message) {
    this.messageListeners.forEach((l) => {
      l(roomId, message);
    });
  }

  public connectGlobalPresence() {
    if (
      this.sessions.has("global_presence") ||
      !this.currentUser ||
      !this.sessionId
    )
      return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/presence?sessionId=${this.sessionId}&userId=${this.currentUser.id}&displayName=${encodeURIComponent(this.currentUser.displayName)}`;

    const ws = new WebSocket(wsUrl);
    this.sessions.set("global_presence", ws);

    ws.onopen = () => {
      this.reconnectAttempts.set("global_presence", 0);
      this.startPinging("global_presence");
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(
          event.data as string,
        ) as PresenceUpdatePayload & {
          participants?: {
            id: string;
            status: PresenceStatus;
            displayName: string;
          }[];
          message?: Message;
        };
        if (
          raw.type &&
          ["presence_update", "presence_join"].includes(raw.type)
        ) {
          const update: {
            userId: string;
            status: PresenceStatus;
            displayName?: string;
          } = {
            userId: raw.userId,
            status: (raw.status as PresenceStatus | undefined) ?? "online",
          };
          if (raw.displayName !== undefined) {
            update.displayName = raw.displayName;
          }
          this.handlePresenceUpdate(update);
        } else if (
          raw.type === "presence_full_sync" &&
          Array.isArray(raw.participants)
        ) {
          raw.participants.forEach(
            (p: {
              id: string;
              status: PresenceStatus;
              displayName: string;
            }) => {
              this.handlePresenceUpdate({
                userId: p.id,
                status: p.status,
                displayName: p.displayName,
              });
            },
          );
        } else if (raw.type === "message_notification" && raw.message) {
          const msg = raw.message;
          if (!msg.timestamp) msg.timestamp = Date.now();
          const targetRoomId = (msg.roomId as string | undefined) ?? "general";
          const current = this.messageCache.get(targetRoomId) ?? [];
          if (!current.find((m) => m.id === msg.id)) {
            current.push(msg);
            this.messageCache.set(targetRoomId, current);
          }
          this.emitMessageUpdate(targetRoomId, msg);
        }
      } catch (err: unknown) {
        console.error("Presence sync error", err);
      }
    };

    ws.onclose = () => {
      this.stopPinging("global_presence");
      this.sessions.delete("global_presence");
      const attempts = this.reconnectAttempts.get("global_presence") ?? 0;
      const delay = Math.min(30000, 1000 * Math.pow(2, attempts));
      this.reconnectAttempts.set("global_presence", attempts + 1);
      setTimeout(() => {
        this.connectGlobalPresence();
      }, delay);
    };
  }

  private handlePresenceUpdate(data: {
    userId: string;
    status: PresenceStatus;
    displayName?: string;
  }) {
    const idx = this.users.findIndex((u) => u.id === data.userId);
    if (idx !== -1) {
      const newUsers = [...this.users];
      newUsers[idx] = {
        ...newUsers[idx],
        status: data.status,
        displayName: data.displayName ?? newUsers[idx].displayName,
      };
      this.users = newUsers;
      this.emitContactsUpdate();
    } else if (this.currentUser?.id === data.userId) {
      this.currentUser = {
        ...this.currentUser,
        status: data.status,
        displayName: data.displayName ?? this.currentUser.displayName,
      };
      this.emitCurrentUserUpdate();
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.sessionId) {
        await this.fetchApi("/auth/logout", { method: "POST" });
      }
    } catch (e: unknown) {
      console.warn("Logout failed", e);
    } finally {
      this.currentUser = null;
      this.sessionId = null;
      localStorage.removeItem("cf-messenger-session");
      this.sessions.forEach((ws) => {
        ws.close();
      });
      this.sessions.clear();
      this.reconnectAttempts.clear();
      this.pingIntervals.forEach((interval) => {
        clearInterval(interval);
      });
      this.pingIntervals.clear();
    }
  }

  async setPresence(
    _userId: string,
    status: PresenceStatus,
    displayName?: string,
  ): Promise<void> {
    await Promise.resolve(); // satisfying async rule
    const ws = this.sessions.get("global_presence");
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "presence_update",
          userId: _userId,
          status,
          displayName,
        }),
      );
    } else {
      this.connectGlobalPresence();
    }

    this.sessions.forEach((wsInstance, key) => {
      if (
        key !== "global_presence" &&
        wsInstance.readyState === WebSocket.OPEN
      ) {
        wsInstance.send(
          JSON.stringify({
            type: "presence",
            status,
            displayName,
            senderId: _userId,
          }),
        );
      }
    });

    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        status,
        displayName: displayName ?? this.currentUser.displayName,
      };
      this.emitContactsUpdate();
    }
  }

  getAvatarUrl(avatarId: string): string {
    const avatar = AVATARS.find((a) => a.id === avatarId);
    return avatar ? avatar.imageUrl : `/person.png`;
  }

  private startPinging(roomId: string) {
    this.stopPinging(roomId);
    const interval = setInterval(() => {
      const ws = this.sessions.get(roomId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      } else {
        this.stopPinging(roomId);
      }
    }, 30000) as unknown as number;
    this.pingIntervals.set(roomId, interval);
  }

  private stopPinging(roomId: string) {
    const existing = this.pingIntervals.get(roomId);
    if (existing) {
      clearInterval(existing);
      this.pingIntervals.delete(roomId);
    }
  }
}

export const messengerService = new RealMessengerService();
