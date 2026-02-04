import { MessageHandler, MessageContext } from "./MessageHandler";
import { Message } from "../types";

export class AckHandler implements MessageHandler {
  async handle(data: any, context: MessageContext): Promise<void> {
    const { roomId, broadcast, scheduleSave, getMessageHistory, session } =
      context;

    const { ackId, status } = data;
    if (!ackId || !status) return;

    // 1. Update message in history if found
    const history = getMessageHistory();
    const msgIndex = history.findIndex((m) => m.id === ackId);

    if (msgIndex !== -1) {
      const msg = history[msgIndex];
      // Only allow upgrading status (delivered -> read, but not read -> delivered)
      const statusOrder = { sent: 1, delivered: 2, read: 3 };
      const currentStatus = msg.status || "sent";

      if (
        statusOrder[status as keyof typeof statusOrder] >
        statusOrder[currentStatus as keyof typeof statusOrder]
      ) {
        msg.status = status;

        // 2. Broadcast the status update to everyone else
        // We broadcast a special 'delivery_status' message
        broadcast({
          type: "delivery_status",
          roomId: roomId || "general",
          ackId,
          status,
          senderId: session.userId, // Who is acknowledging
          timestamp: Date.now(),
        });

        // 3. Persist the change
        scheduleSave();
      }
    }
  }
}
