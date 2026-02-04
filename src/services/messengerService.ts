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
  ]), // Added participants/history which were missing in backend schema but present here
  content: z.string().optional(),
  id: z.string().optional(),
  roomId: z.string().optional(),
  senderId: z.string().optional(),
  displayName: z.string().optional(),
  status: z.enum(["sent", "delivered", "read"]).optional(),
  ackId: z.string().optional(),
  participants: z.array(z.any()).optional(), // Loose for now
  messages: z.array(z.any()).optional(), // Loose for now
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
  setPresence(userId: string, status: PresenceStatus): Promise<void>;
  getUser(userId: string): Promise<User | undefined>;
  getAvatarUrl(avatarId: string): string;
}

class RealMessengerService implements IMessengerService {
  private users: User[] = [];
  private currentUser: User | null = null;
  private sessionId: string | null = null;

  private sessions: Map<string, WebSocket> = new Map<string, WebSocket>();
  private reconnectAttempts: Map<string, number> = new Map<string, number>();
  private isConnecting: Map<string, boolean> = new Map<string, boolean>(); // Prevent double triggers

  // Cache messages per room
  private messageCache: Map<string, Message[]> = new Map<string, Message[]>();

  // Heartbeat intervals
  private pingIntervals: Map<string, number> = new Map<string, number>();

  // Listeners
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

    if (!res.ok) {
      throw new Error(`API Error ${String(res.status)}: ${res.statusText}`);
    }
    const json: unknown = await res.json();
    return json as T;
  }

  // --- Auth & Session ---

  async getCurrentUser(): Promise<User> {
    if (this.currentUser) return this.currentUser;

    try {
      // 1. Try to get current session
      const session = await this.fetchApi<AuthSession>("/auth/me");
      this.currentUser = session.user;
      this.sessionId = session.sessionId;
      return this.currentUser;
    } catch (e) {
      console.warn("No active session, attempting dev login as user_1", e);
      // 2. Dev Fallback: Login as user_1
      return this.login("user_1", "dev_token");
    }
  }

  async login(userId: string, turnstileToken: string): Promise<User> {
    const session = await this.fetchApi<AuthSession>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token: turnstileToken }),
    });
    this.currentUser = session.user;
    this.sessionId = session.sessionId;

    const currentId = this.currentUser.id;
    this.users = this.users.filter((u) => u.id !== currentId);
    this.emitContactsUpdate();

    return this.currentUser;
  }

  // --- Contacts ---

  async getContacts(): Promise<User[]> {
    // We do not force getCurrentUser() here anymore.
    // The Login Screen needs to call this to get the list of users *before* anyone is logged in.
    // Requiring currentUser here causes a 401 loop/delay on initial load.

    // Ensure Global Presence is connected
    this.connectGlobalPresence();

    try {
      const accounts = await this.fetchApi<User[]>("/auth/accounts");

      this.users = this.currentUser
        ? accounts.filter((u) => u.id !== this.currentUser?.id)
        : accounts;

      this.emitContactsUpdate();
      return this.users;
    } catch (e) {
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
      this.getContacts().catch(console.error);
    }
  }

  private emitContactsUpdate() {
    this.contactsListeners.forEach((l) => {
      l(this.users);
    });
  }

  public onCurrentUserUpdated(listener: (user: User) => void) {
    this.currentUserListeners.push(listener);
  }

  private emitCurrentUserUpdate() {
    if (this.currentUser) {
      this.currentUserListeners.forEach((l) => {
        if (this.currentUser) {
          l(this.currentUser);
        }
      });
    }
  }

  // --- Rooms ---

  async getRooms(): Promise<Room[]> {
    try {
      return await this.fetchApi<Room[]>("/rooms");
    } catch (e) {
      console.error("Failed to fetch rooms", e);
      return [];
    }
  }

  // --- Messaging ---

  public connectWebSocket(roomId = "general") {
    if (this.sessions.has(roomId)) {
      const existing = this.sessions.get(roomId);
      if (
        existing?.readyState === WebSocket.OPEN ||
        existing?.readyState === WebSocket.CONNECTING
      )
        return;
    }

    if (this.isConnecting.get(roomId)) return; // Lock
    this.isConnecting.set(roomId, true);

    if (!this.currentUser || !this.sessionId) {
      this.isConnecting.set(roomId, false);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/room/${roomId}/websocket?sessionId=${this.sessionId}&userId=${this.currentUser.id}&displayName=${encodeURIComponent(this.currentUser.displayName)}`;

    const ws = new WebSocket(wsUrl);
    this.sessions.set(roomId, ws);

    ws.onopen = () => {
      console.log(`[MSN] Connected to room: ${roomId}`);
      this.reconnectAttempts.set(roomId, 0); // Reset retries on success
      this.isConnecting.set(roomId, false);

      // Start pinging
      this.startPinging(roomId);
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data as string) as unknown;
        // Validate
        const result = MessageSchema.safeParse(raw);
        if (!result.success) {
          console.warn("[MSN] Received invalid message payload", result.error);
          return;
        }
        this.handleWebSocketMessage(roomId, result.data);
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      this.stopPinging(roomId);
      this.isConnecting.set(roomId, false);
      const attempts = this.reconnectAttempts.get(roomId) ?? 0;

      // Calculate Backoff: min(30s, 1s * 2^attempts) + Jitter
      const baseDelay = Math.min(30000, 1000 * Math.pow(2, attempts));
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      console.log(
        `[MSN] Disconnected from ${roomId}. Reconnecting in ${String(Math.round(delay))}ms... (Attempt ${String(attempts + 1)})`,
      );

      this.reconnectAttempts.set(roomId, attempts + 1);

      setTimeout(() => {
        this.connectWebSocket(roomId);
      }, delay);
    };
  }

  private handleWebSocketMessage(
    roomId: string,
    data: Message | Record<string, unknown>,
  ) {
    // Determine type safely
    const msgType = (data as { type: string }).type;
    if (
      msgType === "history" &&
      "messages" in data &&
      Array.isArray(data.messages)
    ) {
      const msgs = (data.messages as Message[])
        .filter((m) => m.type === "chat" || m.type === "system")
        .map((m) => ({
          ...m,
          timestamp: m.timestamp || Date.now(),
        }));
      this.messageCache.set(roomId, msgs);
      msgs.forEach((m) => {
        this.emitMessageUpdate(roomId, m);
      });
      return;
    }

    if (
      msgType === "chat" ||
      msgType === "typing" ||
      msgType === "system" ||
      msgType === "participants" ||
      msgType === "delivery_status" ||
      msgType === "nudge"
    ) {
      const msg = data as Message;
      // Ensure timestamp exists for proper sorting
      if (!msg.timestamp) {
        msg.timestamp = Date.now();
      }
      const targetRoomId = msg.roomId || roomId;

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

    // If no session exists or not open, try to connect and wait
    if (ws?.readyState !== WebSocket.OPEN) {
      this.connectWebSocket(roomId);
      try {
        await this.waitForConnection(roomId);
        ws = this.sessions.get(roomId); // Refresh after wait
      } catch {
        throw new Error(`Failed to connect to room: ${roomId}`);
      }
    }

    if (ws?.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection to room: ${roomId}`);
    }

    const tempId = `temp_${String(Date.now())}`;
    const msg: Message = {
      id: tempId,
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
      const ws = this.sessions.get(roomId);
      if (ws?.readyState === WebSocket.OPEN) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Connection timeout for room ${roomId}`);
  }

  getMessages(roomId: string): Promise<Message[]> {
    // If not connected, connect
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

  // --- Global Presence ---

  public connectGlobalPresence() {
    if (this.sessions.has("global_presence")) return;

    if (!this.currentUser || !this.sessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/global-presence/websocket?sessionId=${this.sessionId}&userId=${this.currentUser.id}&displayName=${encodeURIComponent(this.currentUser.displayName)}`;

    const ws = new WebSocket(wsUrl);
    this.sessions.set("global_presence", ws);

    ws.onopen = () => {
      console.log("[MSN] Connected to Global Presence");
      this.reconnectAttempts.set("global_presence", 0);
      this.startPinging("global_presence");
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data as string) as Record<string, unknown>;
        if (raw.type === "presence_update" || raw.type === "presence_join") {
          const updateData: {
            userId: string;
            status: PresenceStatus;
            displayName?: string;
          } = {
            userId: raw.userId as string,
            status: (raw.status as PresenceStatus) || "online", // Join implies online
          };
          if (raw.displayName) {
            updateData.displayName = raw.displayName as string;
          }
          this.handlePresenceUpdate(updateData);
        } else if (raw.type === "presence_full_sync") {
          if (Array.isArray(raw.participants)) {
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
          }
        } else if (raw.type === "message_notification" && raw.message) {
          const msg = raw.message as Message;
          // Ensure timestamp exists for proper sorting (especially for AI bot messages)
          if (!msg.timestamp) {
            msg.timestamp = Date.now();
          }
          const targetRoomId = msg.roomId || "general";
          // Update cache to ensure sync
          const current = this.messageCache.get(targetRoomId) ?? [];
          if (!current.find((m) => m.id === msg.id)) {
            current.push(msg);
            this.messageCache.set(targetRoomId, current);
          }
          this.emitMessageUpdate(targetRoomId, msg);
        }
      } catch (err) {
        console.error("Failed to parse Global Presence message", err);
      }
    };

    ws.onclose = () => {
      this.stopPinging("global_presence");
      this.sessions.delete("global_presence");
      const attempts = this.reconnectAttempts.get("global_presence") ?? 0;
      const delay = Math.min(30000, 1000 * Math.pow(2, attempts));

      console.log(
        `[MSN] Global Presence disconnected. Reconnecting in ${String(delay)}ms...`,
      );
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
    // Update local cache
    const existingIndex = this.users.findIndex((u) => u.id === data.userId);
    if (existingIndex !== -1) {
      // Create new array reference for React/Zustand reactivity
      const newUsers = [...this.users];
      newUsers[existingIndex] = {
        ...newUsers[existingIndex],
        status: data.status,
        displayName: data.displayName ?? newUsers[existingIndex].displayName,
      };
      this.users = newUsers;
      this.emitContactsUpdate();
    } else if (this.currentUser?.id === data.userId) {
      // MULTI-TAB SYNC: Update current user if it was us on another tab
      this.currentUser = {
        ...this.currentUser,
        status: data.status,
        displayName: data.displayName ?? this.currentUser.displayName,
      };
      this.emitCurrentUserUpdate();
    }
  }

  // --- Presence ---

  setPresence(
    _userId: string,
    status: PresenceStatus,
    displayName?: string,
  ): Promise<void> {
    // 1. Send to Global Presence WebSocket pattern (Hibernation API)
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
      // Fallback or ensure connected
      this.connectGlobalPresence();
    }

    // 2. Also broadcast to active chat rooms (Legacy support / Immediate feedback)
    this.sessions.forEach((ws, key) => {
      if (key !== "global_presence" && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "presence",
            status,
            displayName,
            senderId: _userId,
          }),
        );
      }
    });

    // 3. Update local user state
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        status,
        displayName: displayName ?? this.currentUser.displayName,
      };
      this.emitContactsUpdate();
    }
    return Promise.resolve();
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
    }, 30000) as unknown as number; // 30s heartbeats
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
