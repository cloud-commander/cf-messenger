import { describe, it, expect, beforeEach, vi } from "vitest";
import { useChatStore } from "../store/useChatStore";
import { messengerService } from "../services/messengerService";

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((ev: any) => void) | null = null;
  send = vi.fn();
  readyState = WebSocket.OPEN;
  close = vi.fn();

  constructor(public url: string) {
    setTimeout(() => this.onopen?.(), 0);
  }
}

describe("Multi-Tab Group Chat Sync", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    // Reset stores
    useChatStore.getState().logout();
    useChatStore.getState().resetInternalState();
    // Clear sessions and listeners
    (messengerService as any).sessions = new Map();
    (messengerService as any).messageListeners = [];
    (messengerService as any).currentUser = null;
    (messengerService as any).sessionId = null;
    (messengerService as any).isConnecting = new Map();

    // Mock fetch for login
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          sessionId: "mock_session",
          user: {
            id: "user_1",
            email: "user1@example.com",
            displayName: "User One",
            avatarId: "avatar_1",
            status: "online",
            isAiBot: false,
          },
        }),
      })),
    );
  });

  it("should sync a message from Tab 2 to Tab 1 in a group room", async () => {
    const user = {
      id: "user_1",
      email: "user1@example.com",
      displayName: "User One",
      avatarId: "avatar_1",
      status: "online" as const,
      isAiBot: false,
    };

    const store = useChatStore.getState();
    store.setTurnstileToken("mock");
    await store.login(user);
    store.openChat("general");

    const tab1Ws = (messengerService as any).sessions.get(
      "general",
    ) as MockWebSocket;
    expect(tab1Ws).toBeDefined();

    const incomingMessage = {
      id: "msg_123",
      type: "chat",
      roomId: "general",
      senderId: "user_2",
      content: "Hello from user 2",
      timestamp: Date.now(),
      displayName: "User Two",
    };

    tab1Ws.onmessage?.({ data: JSON.stringify(incomingMessage) });

    const messages = useChatStore.getState().messages["general"] || [];
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("Hello from user 2");
  });

  it("should handle same-user sender correctly in Tab 1", async () => {
    const user = {
      id: "user_1",
      email: "user1@example.com",
      displayName: "User One",
      avatarId: "avatar_1",
      status: "online" as const,
      isAiBot: false,
    };

    const store = useChatStore.getState();
    store.setTurnstileToken("mock");
    await store.login(user);
    store.openChat("general");

    // Small delay to ensure initializeChat (void) has called connectWebSocket
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tab1Ws = (messengerService as any).sessions.get(
      "general",
    ) as MockWebSocket;
    expect(tab1Ws).toBeDefined();

    const selfMessage = {
      id: "msg_456",
      type: "chat",
      roomId: "general",
      senderId: "user_1",
      content: "Hello from my other tab",
      timestamp: Date.now(),
      displayName: "User One",
    };

    tab1Ws.onmessage?.({ data: JSON.stringify(selfMessage) });

    const messages = useChatStore.getState().messages["general"] || [];
    expect(messages.some((m) => m.id === "msg_456")).toBe(true);
  });

  it("should sync via Global Presence Bridge when room socket is not connected", async () => {
    const user = {
      id: "user_1",
      email: "user1@example.com",
      displayName: "User One",
      avatarId: "avatar_1",
      status: "online" as const,
      isAiBot: false,
    };

    const store = useChatStore.getState();
    store.setTurnstileToken("mock");
    await store.login(user);

    const globalWs = (messengerService as any).sessions.get(
      "global_presence",
    ) as MockWebSocket;
    expect(globalWs).toBeDefined();

    const bridgedMessage = {
      id: "msg_789",
      type: "chat",
      roomId: "general",
      senderId: "user_1",
      content: "Hello from bridge",
      timestamp: Date.now(),
      displayName: "User One",
    };

    globalWs.onmessage?.({
      data: JSON.stringify({
        type: "message_notification",
        message: bridgedMessage,
      }),
    });

    const messages = useChatStore.getState().messages["general"] || [];
    console.log(
      "[Test Bridge] Messages in general:",
      messages.map((m) => m.id),
    );
    expect(messages.some((m) => m.id === "msg_789")).toBe(true);
  });

  it("should sync status updates for currentUser across tabs", async () => {
    const user = {
      id: "user_1",
      email: "user1@example.com",
      displayName: "User One",
      avatarId: "avatar_1",
      status: "online" as const,
      isAiBot: false,
    };

    const store = useChatStore.getState();
    store.setTurnstileToken("mock");
    await store.login(user);

    const globalWs = (messengerService as any).sessions.get(
      "global_presence",
    ) as MockWebSocket;
    expect(globalWs).toBeDefined();

    // Verify initial state
    expect(useChatStore.getState().currentUser?.status).toBe("online");

    // Simulate status update for self arriving from another tab
    globalWs.onmessage?.({
      data: JSON.stringify({
        type: "presence_update",
        userId: "user_1",
        status: "away",
        displayName: "User One",
      }),
    });

    // Verify currentUser state updated
    expect(useChatStore.getState().currentUser?.status).toBe("away");
  });
});
