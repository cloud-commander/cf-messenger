const cspHeader =
  "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com 'unsafe-inline' 'unsafe-eval' blob:; frame-src * about:; connect-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com blob:; img-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com data:; child-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com blob: about:; style-src 'self' 'unsafe-inline'";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": cspHeader,
};

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  const envelope = {
    success: status >= 200 && status < 300,
    data,
    meta: {
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
    },
  };

  return new Response(JSON.stringify(envelope), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  code = "ERROR",
): Response {
  const envelope = {
    success: false,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
    },
  };

  return new Response(JSON.stringify(envelope), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}
