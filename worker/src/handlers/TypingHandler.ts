import { MessageHandler, MessageContext } from "./MessageHandler";

export class TypingHandler implements MessageHandler {
  async handle(data: any, context: MessageContext): Promise<void> {
    const { session, broadcast, ws } = context;

    broadcast(
      {
        type: "typing",
        senderId: session.userId,
        displayName: session.displayName,
        isTyping: !!data.isTyping,
      },
      ws, // Exclude sender
    );
  }
}
