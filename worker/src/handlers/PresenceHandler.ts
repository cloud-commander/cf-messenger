import { MessageHandler, MessageContext } from "./MessageHandler";
import { SessionMetadata } from "../types";

export class PresenceHandler implements MessageHandler {
  // We need a callback to broadcastParticipants from ChatRoom,
  // or we can implement it here if we have access to all sessions.
  // MessageContext only provides helper `broadcast`, not access to `sessions` map directly.
  // However, `broadcastParticipants` was a method on ChatRoom.
  // We might need to extend MessageContext or pass a specific callback.
  // Let's assume we pass a `broadcastParticipants` callback in context or separate.

  // For now, let's look at how ChatRoom uses it.
  // It updates session metadata and calls `this.broadcastParticipants()`.

  // We need to UPDATE the session object in the Map in ChatRoom.
  // context.session is likely a reference to the object in the map?
  // If it is, modifying it works.
  // If it's a copy, we have a problem.
  // In ChatRoom.ts: `const session = this.sessions.get(ws);` -> returns reference.
  // So modifying `session` in context modifies the object in the map.

  // BUT we also need to call `ws.serializeAttachment(newMeta)`.
  // Context has `ws`.

  private broadcastParticipantsFn: () => void;

  constructor(broadcastParticipantsFn: () => void) {
    this.broadcastParticipantsFn = broadcastParticipantsFn;
  }

  async handle(data: any, context: MessageContext): Promise<void> {
    const { session, updateSessionMetadata } = context;

    if ((data.displayName || data.status) && updateSessionMetadata) {
      // Create new metadata object
      const newMeta = {
        ...session,
        displayName: data.displayName || session.displayName,
        status: data.status || (session as any).status || "online",
      };

      // Use callback
      updateSessionMetadata(newMeta);

      // Broadcast new participant list
      this.broadcastParticipantsFn();
    }
  }
}
