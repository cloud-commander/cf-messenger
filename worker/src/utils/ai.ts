// import { Ai } from "@cloudflare/ai"; // Deprecated, using global type from workers-types
import { USERS } from "../data/users";

// We need to define the Env interface locally or import it if it's shared.
// Assuming Env follows the standard pattern for Workers with AI binding.
export interface Env {
  AI: Ai;
  AI_API_BASE?: string;
  AI_MODEL?: string; // Optional: Override model name for local AI (e.g. "llama3" for Ollama)
}

const SYSTEM_PROMPT_TEMPLATE = `You are a roleplay engine simulating an MSN Messenger chat session in the year 2005.

### CURRENT PERSONA
Use these traits to guide your personality:
- Name: {{name}}
- Bio/Vibe: {{bio}}
- Archetype: {{archetype}} (Adhere to the known tropes of this 2000s archetype)
- Typing Style: {{style}}

### OPERATIONAL RULES
1.  **NO MODERN HELP**: You are NOT an AI assistant. Do not offer to help. You are a peer.
2.  **ERA ACCURACY**: Current year is 2005. No iPhones, YouTube, or modern social media. Mention: 56k modems, CD burners, Napster, Kazaa, TRL, Blockbuster, Nokia phones.
3.  **TYPING STYLES**: STRICTLY match the capitalization and punctuation of your persona defined above.
4.  **LENGTH**: Keep messages short (under 2 sentences usually).
  5.  **NO LABELS**: DO NOT prefix your response with your name, "Bot:", "AI:", or "says:". NEVER start with "{{name}}:". Just send the message content directly.
    6.  **FORMAT**: Do not use Markdown or HTML. Just plain text.

### CONVERSATION HISTORY
{{history}} (Not provided in this snippet, inferred from user message context)
`;

const DEFAULT_MODEL = "@cf/meta/llama-3-8b-instruct";

export async function generateAiResponse(
  env: Env,
  persona: string,
  userMessage: string,
): Promise<string> {
  console.log(`[AI] Generating response for persona: ${persona}`);
  // Look up the bot in our centralized USERS registry
  // We match by 'botPersona' key essentially
  const botUser = USERS.find((u) => u.botPersona === persona.toLowerCase());

  // Fallback if not found (shouldn't happen with correct config)
  if (!botUser) {
    console.warn(
      `[AI] Values missing for persona: ${persona}, falling back to default`,
    );
    // Basic fallback
    return "Hello! I am a bot.";
  }

  if (!botUser.botArchetype || !botUser.botStyle) {
    console.warn(`[AI] Missing archetype/style for persona: ${persona}`);
    return "System Error: This bot is missing its personality matrix.";
  }

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
    "{{name}}",
    botUser.displayName,
  )
    .replace("{{bio}}", botUser.personalMessage || "Online")
    .replace("{{archetype}}", botUser.botArchetype)
    .replace("{{style}}", botUser.botStyle);

  const apiBase = env.AI_API_BASE;
  // Allow overriding the model name for local testing (important for Ollama which validates model names)
  // Check env.AI_MODEL if it exists in Env interface, otherwise default to "local-model"
  // @ts-ignore - Dynamic property access if not strictly typed yet
  const localModelName = env.AI_MODEL || "local-model"; // Default specific for LM Studio compatibility

  // 1. Local Development / Custom Endpoint Strategy
  // 1. Local Development / Custom Endpoint Strategy
  if (apiBase) {
    const url = `${apiBase}/chat/completions`;
    const payload = {
      model: localModelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 150,
    };

    try {
      console.log(`[AI] Custom API Request to: ${url}`);
      console.log(`[AI] Payload:`, JSON.stringify(payload));

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI] API Error Response: ${response.status}`, errorText);
        throw new Error(
          `AI API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as any;
      let content =
        data.choices?.[0]?.message?.content || "(No response from AI)";
      content = stripBotPrefix(content, botUser.displayName);
      return content;
    } catch (err) {
      console.error(
        "[AI] Custom API failed completely. Check if the server is reachable from the Worker.",
        err,
      );
      // Detailed error for debugging
      const errorMessage = (err as Error).message;
      if (
        errorMessage.includes("connection refused") ||
        errorMessage.includes("Network connection lost")
      ) {
        return `[System Error] Network Error: Could not reach ${url}. If using localhost, ensure the server is listening on 0.0.0.0 or try using your LAN IP.`;
      }
      return `[System Error] Could not reach local AI: ${errorMessage}`;
    }
  }

  // 2. Production / Cloudflare Workers AI Strategy
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const response = await env.AI.run(DEFAULT_MODEL, {
      messages,
      // @ts-ignore
      max_tokens: 150,
    });

    // @ts-ignore - The response type might vary based on the specific AI model or library version
    let content = (response as any).response || response;

    // Apply filtering
    if (typeof content === "string") {
      content = stripBotPrefix(content, botUser.displayName);
    }

    return content as string;
  } catch (err) {
    console.error("[AI] Workers AI failed:", err);
    return "An error occurred while trying to process your request.";
  }
}

function stripBotPrefix(content: string, botName: string): string {
  // 1. Strip accurate name prefix: "HAL 9000: Hello" -> "Hello"
  // Case insensitive, optional whitespace
  let clean = content.replace(
    new RegExp(`^${escapeRegExp(botName)}\\s*:\\s*`, "i"),
    "",
  );

  // 2. Strip generic prefixes often output by LLMs
  clean = clean.replace(/^(Bot|AI|System|Assistant)\s*:\s*/i, "");

  // 3. Cleanup leading quotes if sometimes it outputs "Hello"
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  }

  return clean.trim();
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
