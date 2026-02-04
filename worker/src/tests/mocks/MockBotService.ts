import { IBotService } from "../services/BotService";
import { User, Message } from "../types";

export class MockBotService implements IBotService {
  detectTargetBot(roomId: string, messageContent: string): User | undefined {
    // Determine target bot based on content for testing specific bot triggers
    if (messageContent.includes("@clippy")) {
      return {
        id: "bot_clippy",
        displayName: "Clippy",
        isBot: true,
        avatarId: "av_bot_clippy",
        status: "online",
      };
    }
    return undefined;
  }

  async processBotResponse(
    bot: User,
    userMessage: string,
    roomId: string,
    broadcastFn: (msg: any) => void,
    scheduleSaveFn: () => void,
    addMessageFn: (msg: Message) => void,
  ): Promise<void> {
    // Simulate a bot response
    const botMsg: Message = {
      id: "mock-bot-msg-id",
      roomId,
      senderId: bot.id,
      content: `Beep boop: ${userMessage}`,
      timestamp: Date.now(),
      type: "chat",
      displayName: bot.displayName,
    };
    addMessageFn(botMsg);
    broadcastFn(botMsg);
    scheduleSaveFn();
  }
}
