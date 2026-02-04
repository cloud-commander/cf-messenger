import WebSocket from "ws";
import { strict as assert } from "assert";

// Config
const API_BASE = "http://localhost:8787";
const WS_BASE = "ws://localhost:8787";

async function runTest() {
  console.log("Starting Phase 5 AI Test...");

  // 1. Login
  console.log("Logging in as User 1...");
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_1" }),
  });

  if (!loginRes.ok) throw new Error("Login failed");
  const { sessionId, user } = (await loginRes.json()) as any;
  console.log(`Logged in as ${user.displayName} (${sessionId})`);

  // 2. Connect WebSocket
  const wsUrl = `${WS_BASE}/api/room/general/websocket?sessionId=${sessionId}&userId=${user.id}&displayName=${encodeURIComponent(user.displayName)}`;
  const ws = new WebSocket(wsUrl);

  const messagePromise = new Promise<void>((resolve, reject) => {
    let receivedTyping = false;
    let receivedResponse = false;

    ws.on("open", () => {
      console.log("WebSocket connected.");

      // 3. Send Message to Clippy
      const msg = {
        type: "chat",
        content: "Hey @Clippy, can you help me write a letter?",
      };

      console.log(`Sending: "${msg.content}"`);
      ws.send(JSON.stringify(msg));
    });

    ws.on("message", (data) => {
      const event = JSON.parse(data.toString());

      // Ignore my own messages or system messages
      if (event.senderId === user.id || event.type === "system") return;

      console.log("Received Event:", event.type, event.senderId || "");

      // 4. Expect Typing from Bot
      if (
        event.type === "typing" &&
        event.isTyping &&
        event.userId.includes("bot_clippy")
      ) {
        console.log("✅ Received typing indicator from Clippy");
        receivedTyping = true;
      }

      // 5. Expect Chat from Bot
      if (event.type === "chat" && event.senderId.includes("bot_clippy")) {
        console.log("✅ Received response from Clippy:", event.content);
        receivedResponse = true;
      }

      if (receivedTyping && receivedResponse) {
        ws.close();
        resolve();
      }
    });

    ws.on("error", (err) => reject(err));

    // Timeout
    setTimeout(() => {
      if (!receivedResponse)
        reject(new Error("Timeout waiting for AI response"));
      else ws.close(); // Cleanup if resolved but logic didn't trigger
    }, 15000);
  });

  await messagePromise;
  console.log("phase 5 Test Passed!");
}

runTest().catch((err) => {
  console.error("Test Failed:", err);
  process.exit(1);
});
