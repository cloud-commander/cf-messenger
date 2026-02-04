import { Env, Message, SessionMetadata } from "../types";

export interface MessageContext {
  ws: WebSocket;
  session: SessionMetadata;
  env: Env;
  roomId: string | null;
  // Callbacks
  broadcast: (msg: any, exclude?: WebSocket) => void;
  scheduleSave: () => void;
  addMessage: (msg: Message) => void;
  getMessageHistory: () => Message[];
  updateSessionMetadata?: (newMeta: SessionMetadata) => void;
}

export interface MessageHandler {
  handle(data: any, context: MessageContext): Promise<void>;
}
