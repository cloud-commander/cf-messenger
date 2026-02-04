const WebSocket = require("ws"); // You might need to install 'ws' dependency if not using native Node 22+ ws
// Actually Node 22 has native WebSocket, but let's assume standard fetch/web crypto environment or use 'ws' package.
// For simpler script without deps, we can try using native WebSocket if node version allows, or I can add 'ws' to package.json.
// Let's add 'ws' to package.json first to be safe, or just use fetch for login and ws for connection.

async function test() {
  const API_URL = "http://localhost:8787";
  const WS_URL = "ws://localhost:8787";

  console.log("1. Logging in...");
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_1" }),
  });

  const session = await loginRes.json();
  console.log("Session:", session.sessionId);

  if (!session.sessionId) {
    console.error("Login failed");
    process.exit(1);
  }

  console.log("2. Connecting to WebSocket Room 'general'...");
  const ws = new WebSocket(
    `${WS_URL}/api/room/general/websocket?sessionId=${session.sessionId}`,
  );

  ws.on("open", () => {
    console.log("Connected!");

    // Send message
    console.log("3. Sending message...");
    ws.send(
      JSON.stringify({ type: "chat", content: "Hello World via WebSocket!" }),
    );
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    console.log("Received:", msg);

    if (msg.type === "chat" && msg.content === "Hello World via WebSocket!") {
      console.log("SUCCESS: Echo received!");
      ws.close();
      process.exit(0);
    }
  });

  ws.on("error", (err) => {
    console.error("WS Error:", err);
    process.exit(1);
  });
}

test();
