export type PresenceStatus = "online" | "busy" | "away" | "offline";

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
  displayName?: string; // Fallback for sender identification
  content: string;
  timestamp: number;
  isNudge: boolean;
  isWink: boolean;
  winkId?: string;
  type?:
    | "chat"
    | "system"
    | "typing"
    | "nudge"
    | "wink"
    | "history"
    | "participants"
    | "presence"
    | "ack"
    | "delivery_status";
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
export interface AdBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
}
