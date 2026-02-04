/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-extraneous-class */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { messengerService } from "../services/messengerService";

// Mock global fetch and WebSocket
const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
vi.stubGlobal("fetch", fetchMock);

// Mock WebSocket
const wsMock = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
  onopen: null,
  onmessage: null,
  onclose: null,
};

// Use class for WebSocket mock
class WebSocketMock {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  constructor() {
    return wsMock;
  }
}
vi.stubGlobal("WebSocket", WebSocketMock);

// Mock Math.random for deterministic backoff
const mockRandom = vi.spyOn(Math, "random").mockReturnValue(0);

describe("messengerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRandom.mockReturnValue(0);
    // Reset private state
    (messengerService as any).currentUser = null;
    (messengerService as any).sessionId = null;
    (messengerService as any).users = [];
    (messengerService as any).sessions.clear();
    (messengerService as any).isConnecting.clear();
    (messengerService as any).reconnectAttempts.clear();

    // Reset wsMock handlers
    wsMock.onopen = null;
    wsMock.onmessage = null;
    wsMock.onclose = null;
    wsMock.readyState = 1;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCurrentUser", () => {
    it("should return cached user if available", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          await Promise.resolve({
            user: { id: "u1", displayName: "User 1" },
            sessionId: "sess-1",
          }),
      });

      const user = await messengerService.getCurrentUser();
      expect(user).toEqual({ id: "u1", displayName: "User 1" });
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/me",
        expect.any(Object),
      );
    });

    it("should login as dev user if auth/me fails", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401 }); // auth/me fails

      // Mock login call
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          await Promise.resolve({
            user: { id: "user_1", displayName: "User 1" },
            sessionId: "dev-sess",
          }),
      });

      const user = await messengerService.getCurrentUser();
      expect(user.id).toBe("user_1");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.any(Object),
      );
    });
  });

  describe("getContacts", () => {
    it("should fetch contacts excluding current user", async () => {
      // Mock auth first to set current user
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          await Promise.resolve({ user: { id: "u1" }, sessionId: "s1" }),
      });
      await messengerService.getCurrentUser();
      fetchMock.mockClear();

      // Mock Contacts response
      const mockAccounts = [
        { id: "u1", displayName: "Me" },
        { id: "u2", displayName: "Other" },
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => await Promise.resolve(mockAccounts),
      });

      const contacts = await messengerService.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].id).toBe("u2");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/accounts",
        expect.any(Object),
      );
    });
  });

  describe("WebSocket & Messaging", () => {
    beforeEach(async () => {
      // Authenticate first
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          await Promise.resolve({
            user: { id: "u1", displayName: "Me" },
            sessionId: "s1",
          }),
      });
      await messengerService.getCurrentUser();
    });

    it("should connect to WebSocket", () => {
      messengerService.connectWebSocket("room-1");
      // Expect session to be created
      expect((messengerService as any).sessions.has("room-1")).toBe(true);
    });

    it("should handle incoming messages", () => {
      const listener = vi.fn();
      messengerService.onMessageReceived(listener);

      messengerService.connectWebSocket("room-1");

      // Simulate onopen
      (wsMock.onopen as any)();

      // Simulate incoming message
      const msg = {
        type: "chat",
        id: "m1",
        content: "hello",
        roomId: "room-1",
        senderId: "u2",
      };
      (wsMock.onmessage as any)({ data: JSON.stringify(msg) });

      expect(listener).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({ content: "hello" }),
      );
    });

    it("should send message via WebSocket", async () => {
      messengerService.connectWebSocket("room-1");
      (wsMock.onopen as any)();

      await messengerService.sendMessage("room-1", "test msg", "u1");

      expect(wsMock.send).toHaveBeenCalled();
      const sentData = JSON.parse(wsMock.send.mock.calls[0][0]);
      expect(sentData.content).toBe("test msg");
      expect(sentData.roomId).toBe("room-1");
    });
  });

  describe("Global Presence", () => {
    beforeEach(async () => {
      // Authenticate
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          await Promise.resolve({
            user: { id: "u1", displayName: "Me" },
            sessionId: "s1",
          }),
      });
      await messengerService.getCurrentUser();
    });

    it("should connect global presence", () => {
      messengerService.connectGlobalPresence();
      expect((messengerService as any).sessions.has("global_presence")).toBe(
        true,
      );
    });

    it("should send presence update", async () => {
      messengerService.connectGlobalPresence();
      (wsMock.onopen as any)(); // Mark ready

      await messengerService.setPresence("u1", "busy");

      expect(wsMock.send).toHaveBeenCalled();
      const sentData = JSON.parse(wsMock.send.mock.calls[0][0]);
      expect(sentData.type).toBe("presence_update");
      expect(sentData.status).toBe("busy");
    });

    it("should handle presence_join event", () => {
      messengerService.connectGlobalPresence();
      (wsMock.onopen as any)();

      const listener = vi.fn();
      messengerService.onContactsUpdated(listener);

      // Pre-populate users
      (messengerService as any).users = [{ id: "u2", status: "offline" }];

      // Simulate incoming presence_join
      const msg = {
        type: "presence_join",
        userId: "u2",
        displayName: "User 2",
      };
      (wsMock.onmessage as any)({ data: JSON.stringify(msg) });

      // Should auto-set status to online
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "u2", status: "online" }),
        ]),
      );
    });

    it("should handle presence_full_sync event", () => {
      messengerService.connectGlobalPresence();
      (wsMock.onopen as any)();

      const listener = vi.fn();
      messengerService.onContactsUpdated(listener);

      // Pre-populate users
      (messengerService as any).users = [
        { id: "u2", status: "offline" },
        { id: "u3", status: "offline" },
      ];

      // Simulate incoming presence_full_sync
      const msg = {
        type: "presence_full_sync",
        participants: [
          { id: "u2", status: "online", displayName: "User 2" },
          { id: "u3", status: "busy", displayName: "User 3" },
        ],
      };
      (wsMock.onmessage as any)({ data: JSON.stringify(msg) });

      // Should update both users
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "u2", status: "online" }),
          expect.objectContaining({ id: "u3", status: "busy" }),
        ]),
      );
    });
  });

  describe("Reconnection", () => {
    it("should use exponential backoff for reconnection", async () => {
      vi.useFakeTimers();
      const timerSpy = vi.spyOn(globalThis, "setTimeout");

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          await Promise.resolve({
            user: { id: "u1", displayName: "Reconnect" },
            sessionId: "s1",
          }),
      });
      await messengerService.getCurrentUser();

      messengerService.connectWebSocket("room-1");

      // Trigger close
      if (typeof wsMock.onclose === "function") {
        wsMock.readyState = WebSocketMock.CLOSED;
        (wsMock.onclose as any)();
      }

      // First attempt (Attempt 1)
      vi.advanceTimersByTime(1000);
      expect(timerSpy).toHaveBeenCalledTimes(1);
      expect(timerSpy.mock.calls[0][1]).toBeGreaterThanOrEqual(1000);

      // Second attempt (Attempt 2)
      if (typeof wsMock.onclose === "function") {
        wsMock.readyState = WebSocketMock.CLOSED;
        (wsMock.onclose as any)();
      }
      vi.advanceTimersByTime(2000);
      expect(timerSpy).toHaveBeenCalledTimes(2);
      expect(timerSpy.mock.calls[1][1]).toBeGreaterThanOrEqual(2000);

      timerSpy.mockRestore();
    });
  });
});
