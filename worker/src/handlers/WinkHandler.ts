import { MessageHandler, MessageContext } from "./MessageHandler";
import { Message } from "../types";

export class WinkHandler implements MessageHandler {
  async handle(data: any, context: MessageContext): Promise<void> {
    const { session, roomId, broadcast, scheduleSave, addMessage } = context;

    if (!data.winkId) return;

    const winkMsg: Message = {
      id: crypto.randomUUID(),
      roomId: roomId || "general",
      senderId: session.userId,
      displayName: session.displayName,
      content: "sent a wink.",
      timestamp: Date.now(),
      isNudge: false,
      isWink: true,
      winkId: data.winkId,
      type: "chat",
    };

    addMessage(winkMsg);
    scheduleSave();
    broadcast(winkMsg);

    // --- GLOBAL NOTIFICATION BRIDGE (Multi-Tab Sync) ---
    const presenceId = context.env.PRESENCE_ROOM.idFromName("global_v1");
    const presenceStub = context.env.PRESENCE_ROOM.get(presenceId);

    presenceStub
      .fetch("http://internal/notify", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: session.userId,
          message: winkMsg,
        }),
      })
      .catch((err: any) =>
        console.error("[WinkHandler] Global notify failed", err),
      );
  }
}
