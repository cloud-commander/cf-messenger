import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { User } from "../types";

// Mock User Data
const userA: User = {
  id: "user_a",
  displayName: "User A",
  status: "online",
  isAiBot: false,
  avatarId: "1",
  email: "a@msn.com",
};

const userB: User = {
  id: "user_b",
  displayName: "User B",
  status: "online",
  isAiBot: false,
  avatarId: "2",
  email: "b@msn.com",
};

describe("RetroFidelity Backend Tests (MSNP12)", () => {
  /**
   * PRESENCE FIDELITY
   * Verifies that the PresenceRoom (Notification Server) accepts connections
   * and broadcasts status updates to subscribed peers.
   */
  describe("Presence Flow (Notification Server)", () => {
    it("should allow a user to connect and receive initial sync", async () => {
      // 1. Connect to Global Presence as User A
      const id = env.PRESENCE_ROOM.idFromName("global_v1");
      const stub = env.PRESENCE_ROOM.get(id);

      const resp = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_a&userId=${userA.id}&displayName=${userA.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      expect(resp.status).toBe(101); // Switching Protocols

      const ws = resp.webSocket;
      if (!ws) throw new Error("No WebSocket returned");
      ws.accept();

      // Helper to capture messages
      const messages: any[] = [];
      ws.addEventListener("message", (evt: MessageEvent) => {
        messages.push(JSON.parse(evt.data as string));
      });

      // Wait for initial system message or full sync
      // We can't easily "wait" in this black box without polling or helpers,
      // but for this integration test, we send a ping and wait for response to ensure flush.
      ws.send(JSON.stringify({ type: "ping" }));

      // Allow event loop to turn
      await new Promise((r) => setTimeout(r, 100));

      // Assert: Should check if we got a "connected" or "full_sync" message
      const hasSystem = messages.some((m) => m.type === "system");
      const hasSync = messages.some((m) => m.type === "presence_full_sync");

      expect(hasSystem || hasSync).toBe(true);
      ws.close();
    });

    it("should broadcast status updates to other connected users", async () => {
      const id = env.PRESENCE_ROOM.idFromName("global_v1");
      const stub = env.PRESENCE_ROOM.get(id);

      // Connect User A
      const respA = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_a&userId=${userA.id}&displayName=${userA.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      const wsA = respA.webSocket!;
      wsA.accept();

      // Connect User B
      const respB = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_b&userId=${userB.id}&displayName=${userB.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      const wsB = respB.webSocket!;
      wsB.accept();

      // User B listens
      const receivedByB: any[] = [];
      wsB.addEventListener("message", (evt: MessageEvent) => {
        receivedByB.push(JSON.parse(evt.data as string));
      });

      await new Promise((r) => setTimeout(r, 50)); // Sync

      // ACTION: User A sets status to "Busy"
      wsA.send(
        JSON.stringify({
          type: "presence_update",
          status: "busy",
          displayName: "User A (Busy)",
        }),
      );

      await new Promise((r) => setTimeout(r, 100)); // Wait for broadcast

      // ASSERT: User B received 'presence_update'
      const updateMsg = receivedByB.find(
        (m) => m.type === "presence_update" && m.userId === userA.id,
      );

      expect(updateMsg).toBeDefined();
      expect(updateMsg.status).toBe("busy");

      wsA.close();
      wsB.close();
    });
  });

  /**
   * MESSAGING FIDELITY
   * Verifies that the ChatRoom (Switchboard) relays messages and Nudges.
   */
  describe("Messaging Flow (Switchboard)", () => {
    it("should relay chat messages between two users in the same room", async () => {
      const roomId = "sb_test_1";
      const id = env.CHAT_ROOM.idFromName(roomId);
      const stub = env.CHAT_ROOM.get(id);

      // Mock Session KV for Auth (ChatRoom checks KV)
      // Since we can't easily mock KV in this specific integration flow without `cloudflare:test` mocks setup
      // or if the code checks `env.CF_MESSENGER_SESSIONS`, we might need to bypass or ensure KV is bound.
      // *critique*: ChatRoom.ts checks CF_MESSENGER_SESSIONS.
      // mocking KV in `vitest-pool-workers` usually just works if bound to a memory namespace.
      // We will assume `getSession` returns valid or we proceed.
      // Note: ChatRoom.ts: `const sessionStr = await this.env.CF_MESSENGER_SESSIONS.get(...)`
      // We need to seed this KV.

      await env.CF_MESSENGER_SESSIONS.put(
        "session:sess_a",
        JSON.stringify({
          sessionId: "sess_a",
          user: userA,
        }),
      );
      await env.CF_MESSENGER_SESSIONS.put(
        "session:sess_b",
        JSON.stringify({
          sessionId: "sess_b",
          user: userB,
        }),
      );

      // Connect A
      const respA = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_a&userId=${userA.id}&displayName=${userA.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      if (respA.status !== 101) {
        console.error(await respA.text());
        throw new Error("User A failed to connect to ChatRoom");
      }
      const wsA = respA.webSocket!;
      wsA.accept();

      // Connect B
      const respB = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_b&userId=${userB.id}&displayName=${userB.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      const wsB = respB.webSocket!;
      wsB.accept();

      const msgsB: any[] = [];
      wsB.addEventListener("message", (evt: MessageEvent) => {
        msgsB.push(JSON.parse(evt.data as string));
      });

      await new Promise((r) => setTimeout(r, 50));

      // ACTION: A sends Message
      const chatPayload = {
        type: "chat",
        content: "Hello from 2005",
        id: "msg_unique_1",
        timestamp: Date.now(),
      };
      wsA.send(JSON.stringify(chatPayload));

      await new Promise((r) => setTimeout(r, 100));

      // ASSERT: B received it
      const received = msgsB.find(
        (m) => m.type === "chat" && m.content === "Hello from 2005",
      );
      expect(received).toBeDefined();
      expect(received.senderId).toBe(userA.id);

      wsA.close();
      wsB.close();
    });

    it("should broadcast Nudges correctly", async () => {
      const roomId = "sb_nudge_test";
      const id = env.CHAT_ROOM.idFromName(roomId);
      const stub = env.CHAT_ROOM.get(id);

      await env.CF_MESSENGER_SESSIONS.put(
        "session:sess_a",
        JSON.stringify({ sessionId: "sess_a", user: userA }),
      );
      await env.CF_MESSENGER_SESSIONS.put(
        "session:sess_b",
        JSON.stringify({ sessionId: "sess_b", user: userB }),
      );

      const respA = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_a&userId=${userA.id}&displayName=${userA.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      const wsA = respA.webSocket!;
      wsA.accept();

      const respB = await stub.fetch(
        `http://fake-host/websocket?sessionId=sess_b&userId=${userB.id}&displayName=${userB.displayName}`,
        { headers: { Upgrade: "websocket" } },
      );
      const wsB = respB.webSocket!;
      wsB.accept();

      const msgsB: any[] = [];
      wsB.addEventListener("message", (evt: MessageEvent) =>
        msgsB.push(JSON.parse(evt.data as string)),
      );

      await new Promise((r) => setTimeout(r, 50));

      // ACTION: Send Nudge
      wsA.send(JSON.stringify({ type: "nudge" }));

      await new Promise((r) => setTimeout(r, 100));

      // ASSERT
      const nudge = msgsB.find((m) => m.type === "nudge");
      expect(nudge).toBeDefined();
      expect(nudge.senderId).toBe(userA.id);

      wsA.close();
      wsB.close();
    });
  });
});
