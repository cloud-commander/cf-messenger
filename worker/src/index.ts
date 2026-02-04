import { DurableObject } from "cloudflare:workers";
// Env interface defined below
import { USERS } from "./data/users";
import { jsonResponse, errorResponse, corsHeaders } from "./utils/response";
import { AuthSession } from "./types";
import { ChatRoom } from "./do/ChatRoom"; // Import real implementation
import { PresenceRoom } from "./do/PresenceRoom";

export { ChatRoom, PresenceRoom }; // Export for Worker runtime

export interface Env {
  CF_MESSENGER_SESSIONS: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  PRESENCE_ROOM: DurableObjectNamespace;
  AI: Ai;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      // API: Public Config
      if (url.pathname === "/api/config" && request.method === "GET") {
        return jsonResponse({
          TURNSTILE_SITE_KEY:
            env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
        });
      }

      // ---------------------------------------------------------
      // Route: /api/auth/accounts
      // MOVED: Combined with /api/users below for filtering logic.
      // ---------------------------------------------------------

      // API: Login
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const body = (await request.json()) as {
          userId: string;
          token?: string;
        };
        const user = USERS.find((u) => u.id === body.userId);

        if (!user) {
          return errorResponse("User not found", 404);
        }

        // ---------------------------------------------------------
        // SECURITY: Server-Side Turnstile Validation
        // ---------------------------------------------------------
        if (!body.token) {
          return errorResponse("Missing Security Token", 403);
        }

        const turnstileSecret = env.TURNSTILE_SECRET_KEY;
        if (turnstileSecret) {
          const ip = request.headers.get("CF-Connecting-IP");
          const formData = new FormData();
          formData.append("secret", turnstileSecret);
          formData.append("response", body.token);
          if (ip) formData.append("remoteip", ip);

          const result = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
              method: "POST",
              body: formData,
            },
          );

          const outcome = (await result.json()) as { success: boolean };
          if (!outcome.success) {
            console.warn(
              `[Auth] Turnstile validation failed for IP ${ip || "unknown"}`,
            );
            return errorResponse("Security Check Failed", 403);
          }
        } else {
          console.warn(
            "[Auth] TURNSTILE_SECRET_KEY not set. Skipping verification (Unsafe).",
          );
        }
        // ---------------------------------------------------------

        const sessionId = crypto.randomUUID();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

        const sessionData: AuthSession = {
          sessionId,
          user,
          expiresAt,
        };

        // Store session in KV (Async Offload)
        const sessionStore = env.CF_MESSENGER_SESSIONS.put(
          `session:${sessionId}`,
          JSON.stringify(sessionData),
          {
            expirationTtl: 300, // 5 mins
          },
        );

        // Store user mapping (Async Offload)
        const mappingStore = env.CF_MESSENGER_SESSIONS.put(
          `user_session:${user.id}`,
          sessionId,
          {
            expirationTtl: 300,
          },
        );

        ctx.waitUntil(Promise.all([sessionStore, mappingStore]));

        return jsonResponse(sessionData);
      }

      // API: Logout
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const authHeader = request.headers.get("Authorization");
        const sessionId = authHeader?.replace("Bearer ", "");

        if (!sessionId) {
          return errorResponse("Missing session token", 401);
        }

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (sessionStr) {
          const session = JSON.parse(sessionStr) as AuthSession;
          // Clear both keys
          await env.CF_MESSENGER_SESSIONS.delete(`session:${sessionId}`);
          await env.CF_MESSENGER_SESSIONS.delete(
            `user_session:${session.user.id}`,
          );
        }

        return jsonResponse({ success: true });
      }

      // API: Me (Verify Session)
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const authHeader = request.headers.get("Authorization");
        const sessionId = authHeader?.replace("Bearer ", "");

        if (!sessionId) {
          return errorResponse("Unauthorized", 401);
        }

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr) {
          return errorResponse("Session expired or invalid", 401);
        }

        const session = JSON.parse(sessionStr) as AuthSession;
        return jsonResponse(session.user);
      }

      // API: List Rooms
      if (url.pathname === "/api/rooms" && request.method === "GET") {
        const { PUBLIC_ROOMS } = await import("./data/rooms");
        // Cache for 1 hour at the edge
        return jsonResponse(PUBLIC_ROOMS, 200, {
          "Cache-Control": "public, max-age=3600",
        });
      }

      // API: List Users with Status (and Auth Accounts)
      if (
        url.pathname === "/api/auth/accounts" ||
        url.pathname === "/api/users"
      ) {
        // Simple Rotation Logic for Phase 6:
        // 1. Separate Humans and Bots
        const humans = USERS.filter((u) => !u.isAiBot);
        const bots = USERS.filter((u) => u.isAiBot);

        // 2. Stable Bot Selection (Persisted in KV to avoid "dancing" bots on refresh)
        let activeBots: typeof bots = [];
        let inactiveBots: typeof bots = [];

        try {
          // Try to get cached bot state
          const cachedBots =
            await env.CF_MESSENGER_SESSIONS.get("bot_state:active");
          if (cachedBots) {
            const activeIds = JSON.parse(cachedBots) as string[];
            activeBots = bots
              .filter((b) => activeIds.includes(b.id))
              .map((b) => ({ ...b, status: "online" as const }));
            inactiveBots = bots
              .filter((b) => !activeIds.includes(b.id))
              .map((b) => ({ ...b, status: "offline" as const }));
          }
        } catch (e) {
          console.warn("Failed to retrieve bot state", e);
        }

        // If no cache or invalid, generate new state (stable for 1 hour)
        if (activeBots.length === 0) {
          // STABLE SELECTION: Always pick the same first 4 bots to avoid inconsistencies
          // between users hitting different KV states or cache misses.
          const selected = bots.slice(0, 4);

          activeBots = selected.map((b) => ({
            ...b,
            status: "online" as const,
          }));
          inactiveBots = bots
            .slice(4)
            .map((b) => ({ ...b, status: "offline" as const }));

          // We still save to KV for performance/consistency, but the source is now stable.
          const activeIds = selected.map((b) => b.id);
          await env.CF_MESSENGER_SESSIONS.put(
            "bot_state:active",
            JSON.stringify(activeIds),
            {
              expirationTtl: 3600,
            },
          );
        }

        // 3. Check presence for humans in KV
        // 3. Check presence for humans in KV
        // 3. [OPTIMIZED] Check presence using Global DO (prevents N+1 KV reads)
        const presenceId = env.PRESENCE_ROOM.idFromName("global_v1");
        const presenceStub = env.PRESENCE_ROOM.get(presenceId);

        let onlineMap = new Map<
          string,
          { status: string; displayName: string }
        >();
        try {
          // We enabled a specific GET handler in PresenceRoom for this
          const resp = await presenceStub.fetch("http://internal/presence");
          if (resp.ok) {
            const list = (await resp.json()) as any[];
            if (Array.isArray(list)) {
              list.forEach((u) => onlineMap.set(u.id, u));
            }
          }
        } catch (e) {
          console.error("[Worker] Failed to fetch global presence list", e);
        }

        const humansWithPresence = humans.map((h) => {
          const live = onlineMap.get(h.id);
          return {
            ...h,
            status: (live?.status || h.status) as typeof h.status,
            displayName: live?.displayName || h.displayName, // Use ephemeral name if available
          };
        });

        // 4. Return Combined
        return jsonResponse([...humansWithPresence, ...activeBots]);
      }

      // API: Presence Heartbeat
      if (url.pathname === "/api/presence" && request.method === "POST") {
        const authHeader = request.headers.get("Authorization");
        const sessionId = authHeader?.replace("Bearer ", "");
        if (!sessionId) return errorResponse("No session", 401);

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr) return errorResponse("Invalid", 401);

        const session = JSON.parse(sessionStr) as AuthSession;
        const { status, displayName } = (await request.json()) as {
          status: string;
          displayName?: string;
        };

        // Update user status and display name in KV
        const presenceData = { status, displayName };
        await env.CF_MESSENGER_SESSIONS.put(
          `presence:${session.user.id}`,
          JSON.stringify(presenceData),
          { expirationTtl: 300 },
        );

        return jsonResponse({ success: true, status, displayName });
      }

      // API: WebSocket Connect for Room
      // Pattern: /api/room/:roomId/websocket
      if (url.pathname.match(/\/api\/room\/.*\/websocket/)) {
        if (request.headers.get("Upgrade") !== "websocket") {
          return errorResponse("Expected Upgrade: websocket", 426);
        }

        const roomId = url.pathname.split("/")[3];

        // Auth Check - get session from query param for WebSocket
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return new Response("Unauthorized", { status: 401 });
        }

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr) {
          return new Response("Invalid Session", { status: 401 });
        }
        const session = JSON.parse(sessionStr) as AuthSession;

        // Get Durable Object ID (derived from room name for simple coordination)
        const id = env.CHAT_ROOM.idFromName(roomId);
        const stub = env.CHAT_ROOM.get(id);

        // Append user metadata to URL so DO knows who connected
        // Note: In prod, signing this data or passing via internal header logic is safer
        // allowing the DO to trust the worker.
        url.searchParams.set("userId", session.user.id);
        url.searchParams.set("displayName", session.user.displayName);

        // Forward to DO
        return stub.fetch(new Request(url.toString(), request));
      }

      // API: Global Presence WebSocket
      // Pattern: /api/global-presence/websocket
      if (url.pathname === "/api/global-presence/websocket") {
        if (request.headers.get("Upgrade") !== "websocket") {
          return errorResponse("Expected Upgrade: websocket", 426);
        }

        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) return errorResponse("No session", 401);

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr) return errorResponse("Invalid Session", 401);
        const session = JSON.parse(sessionStr) as AuthSession;

        // SINGLETON LOGIC: Always use ID "global_v1"
        const id = env.PRESENCE_ROOM.idFromName("global_v1");
        const stub = env.PRESENCE_ROOM.get(id);

        url.searchParams.set("userId", session.user.id);
        url.searchParams.set("displayName", session.user.displayName);

        return stub.fetch(new Request(url.toString(), request));
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      return errorResponse(err.message || "Internal Server Error", 500);
    }
  },
};
