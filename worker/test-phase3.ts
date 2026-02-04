import { WebSocket } from "ws";

async function test() {
  const API_URL = "http://localhost:8787";
  const WS_URL = "ws://localhost:8787";

  // Login User 1
  console.log("1. Logging in User 1...");
  const loginRes1 = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_1" }),
  });
  const session1 = (await loginRes1.json()) as any;
  console.log("User 1 Session:", session1.sessionId);

  // Login User 2
  console.log("2. Logging in User 2...");
  const loginRes2 = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_2" }),
  });
  const session2 = (await loginRes2.json()) as any;
  console.log("User 2 Session:", session2.sessionId);

  // Connect both to 'general'
  console.log("3. Connecting WebSockets...");
  const ws1 = new WebSocket(
    `${WS_URL}/api/room/general/websocket?sessionId=${session1.sessionId}`,
  );
  const ws2 = new WebSocket(
    `${WS_URL}/api/room/general/websocket?sessionId=${session2.sessionId}`,
  );

  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for connection

  // Test Typing
  console.log("4. Testing Typing Indicator...");
  ws1.send(JSON.stringify({ type: "typing", isTyping: true }));

  ws2.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (
      msg.type === "typing" &&
      msg.displayName === session1.user.displayName
    ) {
      console.log(
        "Typescript Success: User 2 received typing event from User 1",
      );
    }
    if (msg.type === "chat" && msg.content === "History Test Message") {
      console.log("Typescript Success: User 2 received chat message");
    }
  });

  // Test Chat History (Persistence)
  console.log("5. Sending Message for History...");
  ws1.send(JSON.stringify({ type: "chat", content: "History Test Message" }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Connect User 3 to check history
  console.log("6. Connecting User 3 to check History...");
  const loginRes3 = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_3" }),
  });
  const session3 = (await loginRes3.json()) as any;

  const ws3 = new WebSocket(
    `${WS_URL}/api/room/general/websocket?sessionId=${session3.sessionId}`,
  );

  ws3.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === "history") {
      const found = msg.messages.find(
        (m: any) => m.content === "History Test Message",
      );
      if (found) {
        console.log(
          "Typescript Success: User 3 received history containing test message",
        );
        process.exit(0);
      } else {
        console.error("History received but message missing:", msg);
      }
    }
  });

  // Timeout safety
  setTimeout(() => {
    console.error("Test timed out");
    process.exit(1);
  }, 10000);
}

test();
