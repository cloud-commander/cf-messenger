import { strict as assert } from "assert";

const API_BASE = "http://localhost:8787";

async function runTest() {
  console.log("Starting Phase 6: Bot Rotation & Stability Test...");

  // 1. First Fetch
  console.log("1. Fetching user list (Attempt 1)...");
  const res1 = await fetch(`${API_BASE}/api/users`);
  if (!res1.ok) throw new Error(`Failed to fetch users: ${res1.status}`);
  const users1 = (await res1.json()) as any[];

  // Filter for online bots
  const onlineBots1 = users1
    .filter((u: any) => u.isAiBot && u.status === "online")
    .map((u: any) => u.id)
    .sort();

  console.log("   Online Bots (1):", onlineBots1);
  if (onlineBots1.length === 0) {
    console.warn(
      "WARNING: No online bots found. Check if bots are defined or logic selects 0.",
    );
  }

  // 2. Wait briefly
  console.log("2. Waiting 2 seconds...");
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Second Fetch
  console.log("3. Fetching user list (Attempt 2)...");
  const res2 = await fetch(`${API_BASE}/api/users`);
  if (!res2.ok) throw new Error(`Failed to fetch users: ${res2.status}`);
  const users2 = (await res2.json()) as any[];

  const onlineBots2 = users2
    .filter((u: any) => u.isAiBot && u.status === "online")
    .map((u: any) => u.id)
    .sort();

  console.log("   Online Bots (2):", onlineBots2);

  // 4. Verify Stability
  console.log("4. Verifying Stability...");
  assert.deepEqual(
    onlineBots1,
    onlineBots2,
    "Online bots should persist between requests (KV caching)",
  );

  console.log("✅ Phase 6 Test Passed: Bot list is stable across requests.");
}

runTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
