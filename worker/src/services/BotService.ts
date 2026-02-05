import { Env, Message, User } from "../types";
import { USERS } from "../data/users";
import { generateAiResponse } from "../utils/ai";

export interface IBotService {
  detectTargetBot(roomId: string, messageContent: string): User | undefined;
  processBotResponse(
    bot: User,
    userMessage: string,
    roomId: string,
    senderId: string,
    broadcastFn: (msg: any) => void,
    scheduleSaveFn: () => void,
    addMessageFn: (msg: Message) => void,
  ): Promise<void>;
}

export class BotService implements IBotService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  detectTargetBot(roomId: string, messageContent: string): User | undefined {
    let targetBot: User | undefined;

    // 1. Direct Message Check
    if (roomId && roomId.startsWith("dm_")) {
      const parts = roomId.replace("dm_", "").split("__");
      // Find a bot in the participants
      targetBot = USERS.find((u) => u.isAiBot && parts.includes(u.id));
    }

    // 2. Mention Check
    if (!targetBot && messageContent.includes("@")) {
      const match = messageContent.match(/@(\w+)/);
      if (match) {
        const mentionedName = match[1].toLowerCase();
        targetBot = USERS.find(
          (u) =>
            u.isAiBot &&
            (u.botPersona?.toLowerCase() === mentionedName ||
              u.displayName.toLowerCase().includes(mentionedName)),
        );
      }
    }

    return targetBot;
  }

  async processBotResponse(
    bot: User,
    userMessage: string,
    roomId: string,
    senderId: string, // Pass the human sender's ID
    broadcastFn: (msg: any) => void,
    scheduleSaveFn: () => void,
    addMessageFn: (msg: Message) => void,
  ) {
    const { botPersona, displayName, id } = bot;
    if (!botPersona) return;

    // 1. Send Typing Indicator
    broadcastFn({
      type: "typing",
      userId: id,
      displayName: displayName,
      isTyping: true,
      roomId: roomId,
    });

    try {
      // 2. Circuit Breaker & Rate Limiting
      // -------------------------------------
      const today = new Date().toISOString().split("T")[0];
      const globalUsageKey = `daily_ai_usage:${today}`;
      const userUsageKey = `user_ai_usage:${today}:${senderId}`;

      // Check Global Emergency Stop
      const isEnabled =
        await this.env.CF_MESSENGER_SESSIONS.get("config:bot_enabled");
      if (isEnabled === "false") {
        console.warn("[BotService] Global AI Circuit Breaker is ON.");
        this.stopTyping(bot, roomId, broadcastFn);
        return;
      }

      const GLOBAL_LIMIT = 4000;
      const USER_LIMIT = 50;

      // Optimistic Reads
      const [globalStr, userStr] = await Promise.all([
        this.env.CF_MESSENGER_SESSIONS.get(globalUsageKey),
        this.env.CF_MESSENGER_SESSIONS.get(userUsageKey),
      ]);

      const globalCount = globalStr ? parseInt(globalStr) : 0;
      const userCount = userStr ? parseInt(userStr) : 0;

      // Check Limits
      if (globalCount >= GLOBAL_LIMIT || userCount >= USER_LIMIT) {
        const reason =
          globalCount >= GLOBAL_LIMIT ? "Global Quota" : "User Quota";
        console.warn(`[BotService] Limit reached (${reason}): ${senderId}`);
        this.stopTyping(bot, roomId, broadcastFn);

        const limitMsg: Message = {
          id: crypto.randomUUID(),
          roomId: roomId,
          senderId: id,
          displayName: displayName,
          content: `(Bot limit reached: ${reason})`,
          timestamp: Date.now(),
          isNudge: false,
          isWink: false,
          type: "system",
        };
        addMessageFn(limitMsg);
        broadcastFn(limitMsg);
        return;
      }

      // 3. Generate AI Response
      const aiResponse = await generateAiResponse(
        this.env,
        botPersona,
        userMessage,
      );

      // Increment Usage (Async)
      // Note: In Workers fetch, we use ctx.waitUntil. In DO, it's this.ctx.waitUntil.
      // But BotService is a helper class. It doesn't have this.ctx unless we pass it.
      // However, DO storage operations are automatically handled.
      // We'll just fire and forget the KV puts as they are eventually consistent anyway.
      Promise.all([
        this.env.CF_MESSENGER_SESSIONS.put(
          globalUsageKey,
          (globalCount + 1).toString(),
          {
            expirationTtl: 86400 * 2,
          },
        ),
        this.env.CF_MESSENGER_SESSIONS.put(
          userUsageKey,
          (userCount + 1).toString(),
          {
            expirationTtl: 86400 * 2,
          },
        ),
      ]).catch((e) => console.error("Quota increment failed", e));

      console.log(`[BotService] AI Response generated for ${senderId}`);

      // --- Artificial Delay ---
      const delayMs = Math.min(Math.max(aiResponse.length * 40, 1000), 4000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // 4. Stop Typing
      this.stopTyping(bot, roomId, broadcastFn);

      // 5. Send Message
      const botMsg: Message = {
        id: crypto.randomUUID(),
        roomId: roomId,
        senderId: id,
        displayName: displayName,
        content: aiResponse,
        timestamp: Date.now(),
        isNudge: false,
        isWink: false,
        type: "chat",
      };

      addMessageFn(botMsg);
      scheduleSaveFn();
      broadcastFn(botMsg);

      // --- GLOBAL NOTIFICATION BRIDGE (Multi-Tab Sync) ---
      // Notify the human sender about the bot's response in all their sessions
      try {
        const presenceId = this.env.PRESENCE_ROOM.idFromName("global_v1");
        const presenceStub = this.env.PRESENCE_ROOM.get(presenceId);
        presenceStub
          .fetch("http://internal/notify", {
            method: "POST",
            body: JSON.stringify({
              targetUserId: senderId,
              message: botMsg,
            }),
          })
          .catch((e: any) =>
            console.error("[BotService] Bridge notify failed", e),
          );
      } catch (e) {
        console.error("[BotService] Hub notify setup failed", e);
      }
    } catch (err) {
      console.error("[BotService] Error:", err);
      this.stopTyping(bot, roomId, broadcastFn);
    }
  }

  private stopTyping(
    bot: User,
    roomId: string,
    broadcastFn: (msg: any) => void,
  ) {
    broadcastFn({
      type: "typing",
      userId: bot.id,
      displayName: bot.displayName,
      isTyping: false,
      roomId: roomId,
    });
  }
}
