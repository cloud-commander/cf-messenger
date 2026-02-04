import WebSocket from "ws";
import { strict as assert } from "assert";

// Config
const API_BASE = "http://localhost:8787";
const WS_BASE = "ws://localhost:8787";

async function runTest() {
  console.log("Starting Phase 7: Private Messaging (DM) Test...");

  // 1. Login User 1
  console.log("1. Logging in User 1...");
  const loginRes1 = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_1" }),
  });
  if (!loginRes1.ok) throw new Error("Login failed for User 1");
  const session1 = (await loginRes1.json()) as any;

  // 2. Login User 2
  console.log("2. Logging in User 2...");
  const loginRes2 = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_2" }),
  });
  if (!loginRes2.ok) throw new Error("Login failed for User 2");
  const session2 = (await loginRes2.json()) as any;

  // 3. Login User 3 (Intruder)
  console.log("3. Logging in User 3 (Intruder)...");
  const loginRes3 = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_3" }),
  });
  if (!loginRes3.ok) throw new Error("Login failed for User 3");
  const session3 = (await loginRes3.json()) as any;

  // 4. Connect User 1 to DM Room (dm_user_1__user_2)
  const dmRoomId = "dm_user_1__user_2";
  console.log(`4. Connecting User 1 to ${dmRoomId}...`);
  const ws1 = new WebSocket(
    `${WS_BASE}/api/room/${dmRoomId}/websocket?sessionId=${session1.sessionId}&userId=${session1.user.id}&displayName=User1`,
  );

  await new Promise<void>((resolve, reject) => {
    ws1.on("open", resolve);
    ws1.on("error", reject);
  });
  console.log("   User 1 Connected.");

  // 5. Connect User 2 to DM Room
  console.log(`5. Connecting User 2 to ${dmRoomId}...`);
  const ws2 = new WebSocket(
    `${WS_BASE}/api/room/${dmRoomId}/websocket?sessionId=${session2.sessionId}&userId=${session2.user.id}&displayName=User2`,
  );

  await new Promise<void>((resolve, reject) => {
    ws2.on("open", resolve);
    ws2.on("error", reject);
  });
  console.log("   User 2 Connected.");

  // 6. Connect Intruder to DM Room (Should Fail)
  console.log(`6. Connecting Intruder to ${dmRoomId} (Should Fail)...`);
  const ws3 = new WebSocket(
    `${WS_BASE}/api/room/${dmRoomId}/websocket?sessionId=${session3.sessionId}&userId=${session3.user.id}&displayName=Intruder`,
  ); // Note: Server checks userId against room ID

  const intruderBlocked = await new Promise<boolean>((resolve) => {
    ws3.on("open", () => {
      console.error("   ❌ Intruder managed to connect!");
      resolve(false);
      ws3.close();
    });
    ws3.on("error", (err) => {
      // ws library emits error on 403 usually
      console.log("   ✅ Intruder connection rejected:", err.message);
      resolve(true);
    });
    // Some clients might just close immediately
    ws3.on("close", (code) => {
      if (code !== 1000) {
        console.log("   ✅ Intruder connection closed:", code);
        resolve(true);
      }
    });
  });

  if (!intruderBlocked)
    throw new Error("Security Check Failed: Intruder joined DM.");

  // 7. Test Message Passing
  console.log("7. Testing Message Passing...");
  const msgText = "Secret message 123";

  const receivePromise = new Promise<void>((resolve, reject) => {
    ws2.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "chat" && msg.content === msgText) {
        console.log("   ✅ User 2 received message.");
        resolve();
      }
    });
    setTimeout(() => reject(new Error("Timeout waiting for message")), 5000);
  });

  ws1.send(JSON.stringify({ type: "chat", content: msgText }));
  await receivePromise;

  ws1.close();
  ws2.close();

  console.log("✅ Phase 7 Test Passed: Private Messaging & Security Verified.");
}

runTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
