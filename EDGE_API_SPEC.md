# Standard Edge API Specification v1.0

This document defines a standardized API structure for all applications residing on the `*.cfdemo.link` zone. Adhering to this structure ensures consistent security through WAF rules and facilitates the creation of new apps by AI agents.

## 1. Request/Response Standards

### 1.1 Base Headers

All API requests MUST include:

- `Content-Type: application/json`
- `Authorization: Bearer <sessionId>` (for protected endpoints)

### 1.2 Response Envelope

To ensure AI agents can reliably parse responses, use the following JSON envelope:

```typescript
type ApiResponse<T> = {
  success: boolean; // Root boolean for quick branching
  data?: T; // Payload on success
  error?: {
    // Structured error object
    code: string; // Machine-readable code (e.g. "AUTH_EXPIRED")
    message: string; // Human-readable message
  };
  meta: {
    // Tracking and timing info
    requestId: string;
    timestamp: number;
  };
};
```

## 2. Standard Endpoint Hierarchy

All apps MUST follow this root path hierarchy to leverage zone-wide WAF protection:

| Endpoint Root           | Method          | Use Case                                 | Primary Storage |
| :---------------------- | :-------------- | :--------------------------------------- | :-------------- |
| `/api/auth/login`       | `POST`          | Turnstile-gated session creation         | KV              |
| `/api/auth/me`          | `GET`           | Session validation / Profile fetch       | KV/D1           |
| `/api/data/:collection` | `GET/POST`      | Relational CRUD (Orders, Users, Items)   | D1              |
| `/api/ws/room/:id`      | `GET (Upgrade)` | Real-time stateful sync (Carts, Lobbies) | Durable Object  |
| `/api/ws/presence`      | `GET (Upgrade)` | Real-time global presence tracking       | Durable Object  |

## 3. Storage & Protection Patterns

### 3.1 D1 (Persistent Relational)

- **Security**: Always use `prepared statements` with `bind()`.
- **Naming**: Prefix tables with application namespace (e.g., `SHOP_ORDERS`, `GAME_SCORES`).

### 3.2 KV (Ephemeral / High-Read)

- **Cost Control**: Mandatory `expirationTtl: 1200` (20 minutes) for all session keys.
- **Pattern**: `session:<app_id>:<session_id>`.

### 3.3 Durable Objects (Real-time State)

- **Efficiency**: MUST use the **Hibernation API** (`ctx.acceptWebSocket`) to release CPU while idle.
- **Durability**: Flush critical state to `ctx.storage` on a 1-5s interval or on critical events.

## 4. Unified WAF Shield

By adhering to this spec, one set of rules protects **every** subdomain on `cfdemo.link`:

1. **Protocol Guard**: Managed Challenge for all POSTs to `/api/` lacking a `cfdemo.link` referer.
2. **Brute Force Guard**: Rate limit (10/min) on any endpoint matching `*/api/auth/login`.
3. **Hygiene**: Global block for non-browser user-agents (curl, python) on all `/api/` paths.
