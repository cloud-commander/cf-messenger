import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useChatStore } from "../store/useChatStore";
import { messengerService } from "../services/messengerService";
import { Message, User } from "../types";

// Mocking MessengerService to simulate network events
vi.mock("../services/messengerService", () => ({
  messengerService: {
    login: vi.fn(),
    getContacts: vi.fn().mockResolvedValue([]),
    getRooms: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
    sendAck: vi.fn(),
    onMessageReceived: vi.fn(),
    onContactsUpdated: vi.fn(),
    onCurrentUserUpdated: vi.fn(),
    connectGlobalPresence: vi.fn(),
    connectWebSocket: vi.fn(),
  },
}));

describe("Advanced Integration Tests (E2E simulation)", () => {
  const userA: User = {
    id: "user_a",
    email: "a@msn.com",
    displayName: "User A",
    status: "online",
    avatarId: "1",
    isAiBot: false,
  };
  const userB: User = {
    id: "user_b",
    email: "b@msn.com",
    displayName: "User B",
    status: "online",
    avatarId: "2",
    isAiBot: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (messengerService.getMessages as any).mockResolvedValue([]);
    (messengerService.getRooms as any).mockResolvedValue([]);
    useChatStore.getState().resetInternalState();
    useChatStore.setState({
      currentUser: userA,
      messages: {},
      openChatIds: [],
      _listenersInitialized: false,
    });
  });

  it("should handle full message lifecycle: send -> received -> delivered (Ack) -> read (Ack)", async () => {
    let messageCallback: ((roomId: string, msg: Message) => void) | undefined;
    (messengerService.onMessageReceived as any).mockImplementation(
      (cb: any) => {
        messageCallback = cb;
      },
    );

    // 1. Initialize listeners
    act(() => {
      useChatStore.getState().initializeListeners();
    });

    // 2. User A sends a message (Optimistic update)
    const mockSentMsg: Message = {
      id: "msg_1",
      roomId: "room_1",
      senderId: userA.id,
      content: "Hello B",
      timestamp: Date.now(),
      type: "chat",
      isNudge: false,
      isWink: false,
      status: "sent",
    };

    (messengerService.sendMessage as any).mockResolvedValue(mockSentMsg);

    await act(async () => {
      await useChatStore.getState().sendMessage("room_1", "Hello B");
    });

    // Verify sent in store
    const msgs = useChatStore.getState().messages["room_1"];
    expect(msgs[0].content).toBe("Hello B");

    // 3. Simulate User B receiving it and sending 'delivered' ack
    // The server broadcasts 'delivery_status' back to User A
    act(() => {
      messageCallback!("room_1", {
        type: "delivery_status",
        ackId: "msg_1",
        status: "delivered",
        roomId: "room_1",
        senderId: userB.id,
        id: "ack_1",
        content: "",
        timestamp: Date.now(),
        isNudge: false,
        isWink: false,
      });
    });

    expect(useChatStore.getState().messages["room_1"][0].status).toBe(
      "delivered",
    );

    // 4. User B opens chat, triggers 'read' ack
    act(() => {
      messageCallback!("room_1", {
        type: "delivery_status",
        ackId: "msg_1",
        status: "read",
        roomId: "room_1",
        senderId: userB.id,
        id: "ack_2",
        content: "",
        timestamp: Date.now(),
        isNudge: false,
        isWink: false,
      });
    });

    expect(useChatStore.getState().messages["room_1"][0].status).toBe("read");
  });

  it("should trigger 'delivered' ack automatically when receiving message from others", async () => {
    let messageCallback: ((roomId: string, msg: Message) => void) | undefined;
    (messengerService.onMessageReceived as any).mockImplementation(
      (cb: any) => {
        messageCallback = cb;
      },
    );

    act(() => {
      useChatStore.getState().initializeListeners();
    });

    // Receive message from User B
    const incomingMsg: Message = {
      id: "msg_other",
      roomId: "room_1",
      senderId: userB.id,
      content: "Hi A",
      timestamp: Date.now(),
      type: "chat",
      isNudge: false,
      isWink: false,
    };

    act(() => {
      messageCallback!("room_1", incomingMsg);
    });

    // Verify store updated
    expect(useChatStore.getState().messages["room_1"]).toHaveLength(1);

    // Verify messengerService.sendAck was called with 'delivered'
    expect(messengerService.sendAck).toHaveBeenCalledWith(
      "room_1",
      "msg_other",
      "delivered",
    );
  });

  it("should trigger 'read' ack when opening a chat with unread messages", async () => {
    // Setup store with unread messages from other user
    const unreadMsg: Message = {
      id: "msg_unread",
      roomId: "room_1",
      senderId: userB.id,
      content: "Wait for me",
      timestamp: Date.now(),
      type: "chat",
      isNudge: false,
      isWink: false,
      status: "delivered",
    };

    useChatStore.setState({
      messages: { room_1: [unreadMsg] },
    });

    // Open chat
    act(() => {
      useChatStore.getState().openChat("room_1");
    });

    // Verify messengerService.sendAck was called with 'read'
    expect(messengerService.sendAck).toHaveBeenCalledWith(
      "room_1",
      "msg_unread",
      "read",
    );
  });

  it("should handle reconnection sync (History Reload)", async () => {
    // 1. Client has some local messages
    const localMsg: Message = {
      id: "old",
      roomId: "room_1",
      senderId: userA.id,
      content: "Old",
      type: "chat",
      timestamp: 100,
      isNudge: false,
      isWink: false,
    };
    useChatStore.setState({ messages: { room_1: [localMsg] } });

    // 2. Simulate reconnection (messengerService calls getMessages)
    const serverHistory: Message[] = [
      localMsg,
      {
        id: "new",
        roomId: "room_1",
        senderId: userB.id,
        content: "Catch up",
        type: "chat",
        timestamp: 200,
        isNudge: false,
        isWink: false,
      },
    ];
    (messengerService.getMessages as any).mockResolvedValue(serverHistory);

    await act(async () => {
      await useChatStore.getState().initializeChat("room_1");
    });

    // 3. Verify deduplication and sync
    const finalMsgs = useChatStore.getState().messages["room_1"];
    expect(finalMsgs).toHaveLength(2);
    expect(finalMsgs.find((m) => m.id === "new")).toBeDefined();
    expect(finalMsgs.filter((m) => m.id === "old")).toHaveLength(1);
  });

  it("should handle message_notification via global presence and open chat", async () => {
    let globalMessageCallback: ((roomId: string, msg: any) => void) | undefined;
    (messengerService.onMessageReceived as any).mockImplementation(
      (cb: any) => {
        globalMessageCallback = cb;
      },
    );

    act(() => {
      // Clean start for this test
      useChatStore.setState({ messages: {}, openChatIds: [] });
      useChatStore.getState().initializeListeners();
    });

    const incomingGlobalMsg: Message = {
      id: "global_msg_1",
      roomId: "room_notif",
      senderId: userB.id,
      content: "Wake up A",
      timestamp: Date.now() + 1000,
      type: "chat",
      isNudge: false,
      isWink: false,
    };

    // Simulate arriving via global socket (notified by PresenceRoom)
    await act(async () => {
      globalMessageCallback!("room_notif", incomingGlobalMsg);
    });

    const msgs = useChatStore.getState().messages["room_notif"];
    expect(msgs).toBeDefined();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("Wake up A");

    // Verify window opened
    expect(useChatStore.getState().openChatIds).toContain("room_notif");
  });
});
