import { MessageHandler, MessageContext } from "./MessageHandler";
import { Message } from "../types";
import { IBotService } from "../services/BotService";

export class ChatHandler implements MessageHandler {
  private botService: IBotService;
  // We need to store rate limit state.
  // Ideally this state belongs in the Room or a specialized RateLimiter service,
  // but for now we can keep it here if we instantiate one handler per room.
  // BUT: ChatRoom instantiates handlers?
  // If ChatRoom has `this.chatHandler = new ChatHandler()`, then state persists per room.

  private lastMessageTimes: Map<string, number> = new Map();

  constructor(botService: IBotService) {
    this.botService = botService;
  }

  async handle(data: any, context: MessageContext): Promise<void> {
    const { session, roomId, broadcast, scheduleSave, addMessage } = context;

    // RATE LIMITING (Defense in Depth)
    const lastMsgTime = this.lastMessageTimes.get(session.userId) || 0;
    const now = Date.now();
    if (now - lastMsgTime < 200) {
      return;
    }
    this.lastMessageTimes.set(session.userId, now);

    const fullMessage: Message = {
      id: data.id || crypto.randomUUID(),
      roomId: roomId || "general",
      senderId: session.userId,
      content: data.content || "",
      timestamp: Date.now(),
      isNudge: false,
      isWink: false,
      type: "chat",
      displayName: session.displayName,
    };

    addMessage(fullMessage);
    scheduleSave();
    broadcast(fullMessage);

    // --- GLOBAL NOTIFICATION BRIDGE (Multi-Tab Sync) ---
    // We notify the sender (all sessions) to ensure multi-tab sync,
    // and if it's a DM, we notify the recipient.
    const presenceId = context.env.PRESENCE_ROOM.idFromName("global_v1");
    const presenceStub = context.env.PRESENCE_ROOM.get(presenceId);

    // 1. Notify Sender (for cross-tab sync)
    presenceStub
      .fetch("http://internal/notify", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: session.userId,
          message: fullMessage,
        }),
      })
      .catch((err: any) =>
        console.error("[ChatHandler] Global notify (sender) failed", err),
      );

    // 2. Notify Recipient (if DM)
    if (roomId && roomId.startsWith("dm_")) {
      const participants = roomId.replace("dm_", "").split("__");
      const otherUser = participants.find((id) => id !== session.userId);

      if (otherUser) {
        presenceStub
          .fetch("http://internal/notify", {
            method: "POST",
            body: JSON.stringify({
              targetUserId: otherUser,
              message: fullMessage,
            }),
          })
          .catch((err: any) =>
            console.error(
              "[ChatHandler] Global notify (recipient) failed",
              err,
            ),
          );
      }
    }

    // AI BOT LOGIC via Service
    if (fullMessage.content) {
      const targetBot = this.botService.detectTargetBot(
        roomId || "general",
        fullMessage.content,
      );

      if (targetBot) {
        console.log(
          `[ChatHandler] Triggering bot response for persona: ${targetBot.botPersona}`,
        );
        // We do not await this to avoid blocking the websocket loop?
        // Actually, we are in an async function, good to await or just let it float?
        // In Cloudflare DO, context.waitUntil is safer, but we don't have ctx here.
        // We can let it run as promise floating since DO keeps running while IO is pending usually.
        // Pass callbacks
        this.botService.processBotResponse(
          targetBot,
          fullMessage.content,
          roomId || "general",
          session.userId,
          broadcast,
          scheduleSave,
          addMessage,
        );
      }
    }
  }
}
