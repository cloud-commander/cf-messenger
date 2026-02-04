export type PresenceStatus = "online" | "busy" | "away" | "offline";

export interface PresenceData {
  status: PresenceStatus;
  displayName?: string;
}

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarId: string;
  status: PresenceStatus;
  isAiBot: boolean;
  botPersona?: string | null;
  personalMessage?: string;
  // AI Persona Traits
  botArchetype?: string;
  botStyle?: string;
}

export type RoomType = "group" | "direct";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  participantIds: string[];
  unreadCount: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: number;
  isNudge: boolean;
  isWink: boolean;
  winkId?: string;
  // added for websocket
  type?:
    | "chat"
    | "system"
    | "typing"
    | "nudge"
    | "wink"
    | "participants"
    | "presence"
    | "history"
    | "ack"
    | "delivery_status"
    | "ping";
  displayName?: string;
  isTyping?: boolean;
  participants?: User[];
  messages?: Message[];
  status?: "sent" | "delivered" | "read";
  ackId?: string;
}

export interface AuthSession {
  sessionId: string;
  user: User;
  expiresAt: number;
}

export interface SessionMetadata {
  sessionId: string;
  userId: string;
  displayName: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface Env {
  CF_MESSENGER_SESSIONS: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  PRESENCE_ROOM: DurableObjectNamespace;
  AI: Ai;
}
