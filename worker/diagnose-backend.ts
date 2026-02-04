import WebSocket from "ws";

const BASE_URL = "http://localhost:8787";

async function runDiagnostic() {
  console.log("🔍 Starting Backend Diagnostic...");

  // 1. Login
  console.log("\n1. Logging in as User 7...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_7" }),
  });

  if (!loginRes.ok) {
    console.error("❌ Login failed:", await loginRes.text());
    return;
  }

  const session = await loginRes.json();
  const token = session.sessionId;
  console.log("✅ Logged in. Token:", token);

  // 2. Connect specific Room (general)
  console.log("\n2. Connecting to WebSocket (General Chat)...");
  // Route pattern matched in index.ts: /api/room/:roomId/websocket
  const wsUrl = `${BASE_URL.replace("http", "ws")}/api/room/general/websocket?sessionId=${token}`;
  const ws = new WebSocket(wsUrl);

  const connectionPromise = new Promise((resolve, reject) => {
    ws.on("open", () => {
      console.log("✅ WebSocket Connected");
      resolve(true);
    });
    ws.on("error", (e) => reject(e));
  });

  const participantsPromise = new Promise((resolve) => {
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "participants") {
        console.log(
          "✅ Received 'participants' message:",
          msg.participants.length,
          "users",
        );
        console.log(
          "   Users:",
          msg.participants.map((p: any) => p.displayName).join(", "),
        );
        resolve(true);
      }
    });
  });

  await connectionPromise;

  // 3. Check Presence via API
  console.log("\n3. Checking Presence API...");
  // Wait a moment for KV to propagate locally
  await new Promise((r) => setTimeout(r, 1000));

  const accountsRes = await fetch(`${BASE_URL}/api/auth/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const accounts = await accountsRes.json();
  const me = accounts.find((u: any) => u.id === "user_7");

  if (me && me.status === "online") {
    console.log("✅ API reports User 7 is ONLINE");
  } else {
    console.error("❌ API reports User 7 is:", me?.status);
  }

  // Wait for participants message if not yet received
  console.log("\n4. Waiting for participant broadcast...");
  await Promise.race([
    participantsPromise,
    new Promise((r) =>
      setTimeout(() => {
        console.log("⚠️ Timed out waiting for participants");
        r(false);
      }, 3000),
    ),
  ]);

  ws.close();
  console.log("\n🏁 Diagnostic Complete");
}

runDiagnostic().catch(console.error);
