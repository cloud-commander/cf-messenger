import { MessageHandler, MessageContext } from "./MessageHandler";
import { Message } from "../types";

export class NudgeHandler implements MessageHandler {
  private lastNudgeTimes: Map<string, number> = new Map();

  async handle(data: any, context: MessageContext): Promise<void> {
    const { session, roomId, broadcast, scheduleSave, addMessage } = context;

    const lastNudge = this.lastNudgeTimes.get(session.userId) || 0;
    const now = Date.now();

    // 5 Second Rate Limit
    if (now - lastNudge < 5000) {
      return;
    }
    this.lastNudgeTimes.set(session.userId, now);

    const nudgeMsg: Message = {
      id: crypto.randomUUID(),
      roomId: roomId || "general",
      senderId: session.userId,
      displayName: session.displayName,
      content: "sent a nudge.",
      timestamp: now,
      isNudge: true,
      isWink: false,
      type: "nudge",
    };

    addMessage(nudgeMsg);
    scheduleSave();
    broadcast(nudgeMsg);

    // --- GLOBAL NOTIFICATION BRIDGE (Multi-Tab Sync) ---
    const presenceId = context.env.PRESENCE_ROOM.idFromName("global_v1");
    const presenceStub = context.env.PRESENCE_ROOM.get(presenceId);

    presenceStub
      .fetch("http://internal/notify", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: session.userId,
          message: nudgeMsg,
        }),
      })
      .catch((err: any) =>
        console.error("[NudgeHandler] Global notify failed", err),
      );
  }
}
