import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useChatStore } from "../store/useChatStore";
import { messengerService } from "../services/messengerService";
import { Message, User } from "../types";

// Setup Mock Service
vi.mock("../services/messengerService", () => ({
  messengerService: {
    // Stub methods
    login: vi.fn(),
    getContacts: vi.fn(),
    getRooms: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    sendAck: vi.fn(),
    onMessageReceived: vi.fn(),
    onContactsUpdated: vi.fn(),
    onCurrentUserUpdated: vi.fn(),
    connectGlobalPresence: vi.fn(),
    connectWebSocket: vi.fn(),
    setPresence: vi.fn().mockImplementation(() => Promise.resolve()),
  },
}));

describe("Frontend Functional Flows", () => {
  const userMe: User = {
    id: "me",
    displayName: "My Name",
    status: "online",
    isAiBot: false,
    avatarId: "1",
    email: "me@msn.com",
  };

  const userPal: User = {
    id: "pal",
    displayName: "Pal",
    status: "online",
    isAiBot: false,
    avatarId: "2",
    email: "pal@msn.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().resetInternalState();
    useChatStore.setState({
      currentUser: userMe,
      contacts: [userPal],
      messages: { room_1: [] },
      _listenersInitialized: false,
    });

    (messengerService.getMessages as any).mockResolvedValue([]);
    (messengerService.getRooms as any).mockResolvedValue([]);
    (messengerService.getContacts as any).mockResolvedValue([userPal]);
  });

  it("should handle sending and receiving a Nudge", async () => {
    // 1. Setup Mock BEFORE Init
    let messageCallback: any;
    (messengerService.onMessageReceived as any).mockImplementation(
      (cb: any) => (messageCallback = cb),
    );

    // 2. Initialize
    act(() => {
      useChatStore.getState().initializeListeners();
    });

    const incomingNudge: Message = {
      id: "nudge_in",
      roomId: "room_1",
      senderId: userPal.id,
      type: "nudge",
      content: "",
      timestamp: Date.now(),
      isNudge: true,
      isWink: false,
    };

    // 3. Trigger Callback
    act(() => {
      if (messageCallback) messageCallback("room_1", incomingNudge);
    });

    // 4. Assert
    const msgs = useChatStore.getState().messages["room_1"];
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe("nudge");
    expect(msgs[0].isNudge).toBe(true);
  });

  it("should handle 'Typing' indicator timeout", async () => {
    vi.useFakeTimers();

    // 1. Setup Mock BEFORE Init
    let messageCallback: any;
    (messengerService.onMessageReceived as any).mockImplementation(
      (cb: any) => (messageCallback = cb),
    );

    // 2. Initialize
    act(() => {
      useChatStore.getState().initializeListeners();
    });

    // Incoming Typing
    const typingMsg = {
      type: "typing",
      roomId: "room_1",
      senderId: userPal.id,
      isTyping: true,
      displayName: "Pal",
    };

    act(() => {
      if (messageCallback) messageCallback("room_1", typingMsg);
      vi.advanceTimersByTime(100); // Allow store batch flush
    });

    // Verify IsTyping state (use typingStatus!)
    const status1 = useChatStore.getState().typingStatus["room_1"];
    expect(status1).toBeDefined();
    expect(status1 && status1[userPal.id]).toBeTruthy();

    // Fast forward 6 seconds (Timeout is usually 5s)
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Verify Cleared
    const status2 = useChatStore.getState().typingStatus["room_1"];
    expect(status2?.[userPal.id]).toBeFalsy();

    vi.useRealTimers();
  });

  it("should update contact status on Presence Update", async () => {
    let contactsCallback: any;
    (messengerService.onContactsUpdated as any).mockImplementation(
      (cb: any) => (contactsCallback = cb),
    );

    act(() => {
      useChatStore.getState().initializeListeners();
    });

    // Simulate Service emitting new contact list
    const updatedPal = { ...userPal, status: "busy" };

    act(() => {
      if (contactsCallback) contactsCallback([updatedPal]);
    });

    const contacts = useChatStore.getState().contacts;
    const pal = contacts.find((c) => c.id === userPal.id);

    expect(pal?.status).toBe("busy");
  });

  it("should optimistic update current user status", async () => {
    // Verify setStatus updates local state immediately
    await act(async () => {
      await useChatStore.getState().setStatus("away");
    });

    expect(useChatStore.getState().currentUser?.status).toBe("away");
    expect(messengerService.setPresence).toHaveBeenCalledWith(
      userMe.id,
      "away",
      undefined,
    );
  });
});
