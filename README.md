# CF Messenger

> **A classic Messenger inspired proof of concept using modern edge technologies.**

CF Messenger is a real-time communication platform that recreates the nostalgic Windows Messenger experience using cutting-edge Cloudflare technologies. It is built to be "Edge-native," leveraging Durable Objects for high-performance stateful messaging, WebSockets for instant communication, and Cloudflare Workers for a serverless, global backend.

![CF Messenger Screenshot](https://spirit-assets.pages.dev/og-image.png)

---

## Key Features

- **Real-time Chat**: Bi-directional messaging powered by Cloudflare Durable Objects and WebSockets.
- **Classic UI**: Faithful recreation of the Windows Live Messenger interface using `xp.css` and custom themes.
- **AI Bots**: Interactive AI contacts (powered by Llama 3.2 via Workers AI) with built-in cost controls.
- **Global Presence**: Real-time "Online/Away/Busy" status tracking across all active sessions using a specialized DO.
- **Production Hardened**:
  - **Turnstile Security**: Bot-proof login and registration.
  - **Rate Limiting**: Throttling for both human and AI interactions to prevent abuse and bill shock.
  - **Circuit Breakers**: Global "Kill Switch" for AI features via KV.
  - **Ghost User Elimination**: Client/Server heartbeats and automated session sweeping.

---

## Tech Stack

### Frontend

- **Framework**: [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **State**: [Zustand](https://github.com/pmndrs/zustand) with optimized render batching.
- **Styling**: [xp.css](https://botoxparty.github.io/XP.css/) + Vanilla CSS.

### Backend (Cloudflare Edge)

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) (Standard & Durable Objects).
- **Security**: [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).
- **AI**: [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/).
- **Storage**: [Durable Object Storage](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/#storage-api) (Granular) + [KV Namespace](https://developers.cloudflare.com/workers/runtime-apis/kv/).

---

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Cloudflare CLI)
- **Cloudflare Workers Paid Plan**: Required for Durable Objects ($5/mo).

### 2. Cloudflare Turnstile Setup

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Turnstile**.
2. Click **Add Site**.
3. Name it (e.g., "CF Messenger") and add your domain (e.g., `localhost` for dev).
4. Choose **Widget Type: Managed**.
5. Copy your **Site Key** and **Secret Key**.

### 3. Local Development

1. **Clone & Install**:

   ```bash
   git clone <repo-url>
   npm install
   ```

2. **Configure Frontend**:
   Create a `.env` file in the root directory:

   ```env
   VITE_TURNSTILE_SITE_KEY=your_site_key_here
   ```

3. **Configure Backend**:
   Edit `wrangler.jsonc` (or use `wrangler secret put`):

   ```jsonc
   "vars": {
     "TURNSTILE_SECRET_KEY": "your_secret_key_here"
   }
   ```

4. **Launch**:

   ```bash
   # Terminal 1: Worker (API & DOs)
   npm run worker:dev

   # Terminal 2: Frontend (Vite with Proxy)
   npm run dev
   ```

---

## Production Deployment

### 1. Backend & Frontend (Unified)

1. **Create KV Namespace**:
   ```bash
   wrangler kv namespace create CF_MESSENGER_SESSIONS
   ```
2. **Update `wrangler.jsonc`**: Paste the KV `id` into the `kv_namespaces` block.
3. **Set Production Keys**:

   ```bash
   # Private Key
   wrangler secret put TURNSTILE_SECRET_KEY --env production

   # Public Key (kept out of git for Clean Config)
   wrangler secret put TURNSTILE_SITE_KEY --env production
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

> [!NOTE]
> This project uses **Workers with Assets**. A single deployment handles both your React frontend and your Worker API on the same domain, eliminating CORS issues.

---

## 🛡️ Security & Secrets

### 1. Local Development (`.dev.vars`)

Local secrets (like your Turnstile Secret Key) are stored in `.dev.vars`. This file is ignored by git to prevent accidental leaks.

```env
# .dev.vars
# Use Cloudflare's always-pass test key for development:
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### 2. Production Secrets (`wrangler secret`)

Production secrets are never stored in files. Use the Cloudflare CLI to upload them directly:

```bash
wrangler secret put TURNSTILE_SECRET_KEY --env production
```

---

## Operational Maintenance

### AI Cost Controls (Circuit Breakers)

You can instantly disable all AI bot features without redeploying:

```bash
# Disable Bots
wrangler kv key put --binding CF_MESSENGER_SESSIONS "config:bot_enabled" "false"

# Re-enable Bots
wrangler kv key put --binding CF_MESSENGER_SESSIONS "config:bot_enabled" "true"
```

### Rate Limits

- **Human**: 15 messages/minute (configurable in `ChatRoom.ts`).
- **Bots**: 50 messages/day/user (configurable in `BotService.ts`).

### Cloudflare Analytics (Free Tier)

This project uses a dual-layered analytics setup to monitor performance and usage without compromising privacy.

1.  **Web Analytics (Frontend)**:
    - **Required Action**: Open `index.html` and replace `"YOUR_TOKEN_HERE"` with your site token from the **Cloudflare Dashboard > Analytics & Logs > Web Analytics**.
    - _Metrics_: Page views, visit counts, and Core Web Vitals.

2.  **Workers Analytics Engine (Backend)**:
    - **Setup**: Automatically configured in `wrangler.jsonc`. No manual token required.
    - **Event Tracking**: Logs critical events like `login_success`.
    - **Querying**: View data points in the **Cloudflare Dashboard > Workers & Pages > cf-messenger-api > Analytics**.

### Cloudflare WAF (Wildcard/Multi-App) Setup

> [!NOTE]
> WAF rules on the Free Plan are **per Zone (Apex Domain)**. If you have multiple applications on subdomains (e.g., `messenger.cfdemo.link`, `app1.cfdemo.link`), they all share the same protective rules if you use the patterns below.

To protect your entire ecosystem on the free plan, apply these rules in the Cloudflare Dashboard > Security > WAF:

1.  **Bot Fight Mode**:
    - Go to **Security > Bots** and enable **Bot Fight Mode**.
    - _Why:_ Automatically challenges automated scrapers across all subdomains.

2.  **Rate Limiting Rule (1 Free Rule)**:
    - **Rule Name**: `Universal Login Protection`
    - **Expression**: `(http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST")`
    - **Action**: `Block` (or `Managed Challenge`)
    - **Rate**: 10 requests / 1 minute / IP
    - _Why:_ Protects the login endpoint for ALL your applications at once since they share the same API structure.

3.  **Custom Rules (Max 10 Free)**:
    - **Rule 1 - Zone-Wide Login Guard**:
      - Expression: `(http.request.uri.path eq "/api/auth/login" and not http.referer contains "cfdemo.link")`
      - Action: `Managed Challenge`
      - _Why:_ Blocks direct API attacks while allowing users from any of your `cfdemo.link` subdomains to log in.
    - **Rule 2 - Block Suspicious User Agents**:
      - Expression: `(http.user_agent contains "curl" or http.user_agent contains "python")`
      - Action: `Block`
      - _Why:_ Global hygiene for all your subdomains.

---

## Environment Reference

| Variable                  | Scope    | Description                                                        |
| :------------------------ | :------- | :----------------------------------------------------------------- |
| `VITE_TURNSTILE_SITE_KEY` | Frontend | Public key for the Turnstile widget.                               |
| `TURNSTILE_SECRET_KEY`    | Backend  | Secret key for server-side verification.                           |
| `AI_API_BASE`             | Backend  | URL for local AI proxy (leave empty in prod).                      |
| `AI_MODEL`                | Backend  | Cloudflare AI model ID (e.g., `@cf/meta/llama-3.2-1b-instruct`).   |
| `AE`                      | Backend  | Workers Analytics Engine binding (configured in `wrangler.jsonc`). |

---

## Credits & Inspiration

- **[XP.css](https://botoxparty.github.io/XP.css/)** for the aesthetic.
- **[Spirit Messenger](https://spirit-messenger.vercel.app/)** for the initial spark.
- **[Cloudflare Developers](https://developers.cloudflare.com/)** for the powerful edge tools.
