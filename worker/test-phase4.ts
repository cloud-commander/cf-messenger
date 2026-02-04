import { WebSocket } from "ws";

async function test() {
  const API_URL = "http://localhost:8787";
  const WS_URL = "ws://localhost:8787";

  console.log("1. Logging in User 1...");
  const loginRes1 = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_1" }),
  });
  const session1 = (await loginRes1.json()) as any;

  console.log("2. Logging in User 2...");
  const loginRes2 = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_2" }),
  });
  const session2 = (await loginRes2.json()) as any;

  const ws1 = new WebSocket(
    `${WS_URL}/api/room/general/websocket?sessionId=${session1.sessionId}`,
  );
  const ws2 = new WebSocket(
    `${WS_URL}/api/room/general/websocket?sessionId=${session2.sessionId}`,
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Listen on User 2
  let nudgeCount = 0;
  let winkReceived = false;

  ws2.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.isNudge) {
      console.log("Success: User 2 received Nudge");
      nudgeCount++;
    }
    if (msg.isWink && msg.winkId === "pig") {
      console.log("Success: User 2 received Wink (ID: pig)");
      winkReceived = true;
    }
  });

  // Test Nudge
  console.log("3. User 1 Sending Nudge...");
  ws1.send(JSON.stringify({ type: "nudge" }));

  // Test Rate Limit (Immediate second nudge)
  console.log("4. User 1 Sending 2nd Nudge (Should be Rate Limited)...");
  ws1.send(JSON.stringify({ type: "nudge" }));

  // Test Wink
  console.log("5. User 1 Sending Wink...");
  ws1.send(JSON.stringify({ type: "wink", winkId: "pig" }));

  // Wait for results
  setTimeout(() => {
    if (nudgeCount === 1 && winkReceived) {
      console.log(
        "Phase 4 Verification Passed: Nudge (Rate Limited) & Wink received.",
      );
      process.exit(0);
    } else {
      console.error(
        `Status: Nudges=${nudgeCount} (Expected 1), Wink=${winkReceived}`,
      );
      process.exit(1);
    }
  }, 2000);
}

test();
