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
  ASSETS: Fetcher;
  AE: AnalyticsEngineDataset;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Analytics Helper
    const trackEvent = (name: string, blob1?: string, blob2?: string) => {
      try {
        env.AE.writeDataPoint({
          blobs: [name, blob1 ?? "", blob2 ?? ""],
          doubles: [Date.now()],
        });
      } catch (e) {
        console.error("Analytics Error", e);
      }
    };

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
          TURNSTILE_SITE_KEY: env.TURNSTILE_SITE_KEY,
        });
      }

      // ---------------------------------------------------------
      // Route: /api/auth/accounts (Combined below)
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

        // SECURITY: Server-Side Turnstile Validation
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

        const sessionId = crypto.randomUUID();
        const expiresAt = Date.now() + 20 * 60 * 1000;

        const sessionData: AuthSession = { sessionId, user, expiresAt };

        const sessionStore = env.CF_MESSENGER_SESSIONS.put(
          `session:${sessionId}`,
          JSON.stringify(sessionData),
          { expirationTtl: 300 },
        );

        const mappingStore = env.CF_MESSENGER_SESSIONS.put(
          `user_session:${user.id}`,
          sessionId,
          { expirationTtl: 300 },
        );

        ctx.waitUntil(Promise.all([sessionStore, mappingStore]));
        trackEvent("login_success", user.id, user.displayName);

        return jsonResponse(sessionData);
      }

      // API: Logout
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        const authHeader = request.headers.get("Authorization");
        const sessionId = authHeader?.replace("Bearer ", "");
        if (!sessionId) return errorResponse("Missing session token", 401);

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (sessionStr) {
          const session = JSON.parse(sessionStr) as AuthSession;
          await env.CF_MESSENGER_SESSIONS.delete(`session:${sessionId}`);
          await env.CF_MESSENGER_SESSIONS.delete(
            `user_session:${session.user.id}`,
          );
        }
        return jsonResponse({ success: true });
      }

      // API: Me
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const authHeader = request.headers.get("Authorization");
        const sessionId = authHeader?.replace("Bearer ", "");
        if (!sessionId) return errorResponse("Unauthorized", 401);

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr)
          return errorResponse("Session expired or invalid", 401);

        const session = JSON.parse(sessionStr) as AuthSession;
        return jsonResponse(session.user);
      }

      // API: List Rooms
      if (url.pathname === "/api/rooms" && request.method === "GET") {
        const { PUBLIC_ROOMS } = await import("./data/rooms");
        return jsonResponse(PUBLIC_ROOMS, 200, {
          "Cache-Control": "public, max-age=3600",
        });
      }

      // API: List Users (with presence)
      if (
        url.pathname === "/api/auth/accounts" ||
        url.pathname === "/api/users"
      ) {
        const humans = USERS.filter((u) => !u.isAiBot);
        const bots = USERS.filter((u) => u.isAiBot);

        let activeBots: typeof bots = [];
        try {
          const cachedBots =
            await env.CF_MESSENGER_SESSIONS.get("bot_state:active");
          if (cachedBots) {
            const activeIds = JSON.parse(cachedBots) as string[];
            activeBots = bots
              .filter((b) => activeIds.includes(b.id))
              .map((b) => ({ ...b, status: "online" as const }));
          }
        } catch (e) {
          console.warn("Bot state fetch fail", e);
        }

        if (activeBots.length === 0) {
          const selected = bots.slice(0, 4);
          activeBots = selected.map((b) => ({
            ...b,
            status: "online" as const,
          }));
          await env.CF_MESSENGER_SESSIONS.put(
            "bot_state:active",
            JSON.stringify(selected.map((b) => b.id)),
            { expirationTtl: 3600 },
          );
        }

        const presenceId = env.PRESENCE_ROOM.idFromName("global_v1");
        const presenceStub = env.PRESENCE_ROOM.get(presenceId);
        let onlineMap = new Map<
          string,
          { status: string; displayName: string }
        >();
        try {
          const resp = await presenceStub.fetch("http://internal/presence");
          if (resp.ok) {
            const list = (await resp.json()) as any[];
            if (Array.isArray(list))
              list.forEach((u) => onlineMap.set(u.id, u));
          }
        } catch (e) {
          console.error("Presence fetch fail", e);
        }

        const humansWithPresence = humans.map((h) => {
          const live = onlineMap.get(h.id);
          return {
            ...h,
            status: (live?.status || h.status) as typeof h.status,
            displayName: live?.displayName || h.displayName,
          };
        });

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

        await env.CF_MESSENGER_SESSIONS.put(
          `presence:${session.user.id}`,
          JSON.stringify({ status, displayName }),
          { expirationTtl: 300 },
        );
        return jsonResponse({ success: true, status, displayName });
      }

      // WS: Room
      if (
        url.pathname.startsWith("/api/ws/room/") &&
        !url.pathname.endsWith("/presence")
      ) {
        if (request.headers.get("Upgrade") !== "websocket")
          return errorResponse("Expected Upgrade: websocket", 426);
        const roomId = url.pathname.split("/")[4];
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) return new Response("Unauthorized", { status: 401 });

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr)
          return new Response("Invalid Session", { status: 401 });
        const session = JSON.parse(sessionStr) as AuthSession;

        const id = env.CHAT_ROOM.idFromName(roomId);
        const stub = env.CHAT_ROOM.get(id);
        url.searchParams.set("userId", session.user.id);
        url.searchParams.set("displayName", session.user.displayName);
        return stub.fetch(new Request(url.toString(), request));
      }

      // WS: Presence
      if (url.pathname === "/api/ws/presence") {
        if (request.headers.get("Upgrade") !== "websocket")
          return errorResponse("Expected Upgrade: websocket", 426);
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) return errorResponse("No session", 401);

        const sessionStr = await env.CF_MESSENGER_SESSIONS.get(
          `session:${sessionId}`,
        );
        if (!sessionStr) return errorResponse("Invalid Session", 401);
        const session = JSON.parse(sessionStr) as AuthSession;

        const id = env.PRESENCE_ROOM.idFromName("global_v1");
        const stub = env.PRESENCE_ROOM.get(id);
        url.searchParams.set("userId", session.user.id);
        url.searchParams.set("displayName", session.user.displayName);
        return stub.fetch(new Request(url.toString(), request));
      }

      // Fallback: ASSETS
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.ok || assetResponse.status === 304) {
        const newHeaders = new Headers(assetResponse.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers: newHeaders,
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      return errorResponse(err.message || "Internal Server Error", 500);
    }
  },
};
