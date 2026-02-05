import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useWindowStore } from "../../store/useWindowStore";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: (() => void) | undefined;
  }
}

export function TurnstileWindow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const setTurnstileToken = useChatStore((state) => state.setTurnstileToken);
  const closeWindow = useWindowStore((state) => state.closeWindow);

  // Load Turnstile SDK
  useEffect(() => {
    // 1. Check if script is already present
    if (document.getElementById("turnstile-script")) {
      console.log("[Turnstile] Script already present in DOM");
      if (window.turnstile) {
        console.log("[Turnstile] window.turnstile already available");
        setTimeout(() => {
          setIsSdkLoaded(true);
        }, 0);
      } else {
        console.log("[Turnstile] Waiting for window.turnstile...");
        const interval = setInterval(() => {
          if (window.turnstile) {
            console.log("[Turnstile] window.turnstile appeared");
            setIsSdkLoaded(true);
            clearInterval(interval);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(interval);
        }, 10000); // 10s timeout
      }
      return;
    }

    // 2. Inject Script
    console.log("[Turnstile] Injecting SDK script...");
    const script = document.createElement("script");
    // Use render=explicit to control exactly when it renders
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.id = "turnstile-script";
    script.async = true;
    script.defer = true;

    const handleLoad = () => {
      console.log("[Turnstile] Script onload event fired");
      // Small delay ensuring global var is ready
      setTimeout(() => {
        if (window.turnstile) {
          setIsSdkLoaded(true);
        } else {
          console.warn(
            "[Turnstile] Script loaded but window.turnstile missing?",
          );
        }
      }, 50);
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", (e) => {
      console.error("[Turnstile] Script load error", e);
    });

    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, []);

  const [error, setError] = useState<string | null>(null);

  // Render Widget
  useEffect(() => {
    if (!isSdkLoaded) return;
    if (!containerRef.current) return;
    if (widgetIdRef.current) return; // Already rendered

    console.log("[Turnstile] Attempting render...");

    const renderWidget = async () => {
      try {
        // Fetch dynamic config
        const configRes = await fetch("/api/config");
        const config = (await configRes.json()) as {
          success: boolean;
          data?: { TURNSTILE_SITE_KEY?: string };
        };
        const sitekey =
          config.data?.TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
        console.log("[Turnstile] Using sitekey:", sitekey);

        if (window.turnstile && containerRef.current) {
          const ts = window.turnstile;
          // Add a small delay to ensure DOM is ready and visible
          setTimeout(() => {
            if (!containerRef.current || widgetIdRef.current) return;

            const id = ts.render(containerRef.current, {
              sitekey,
              callback: (_token: string) => {
                console.log("[Turnstile] Token received");
                setError(null);
                setTimeout(() => {
                  setTurnstileToken(_token);
                  closeWindow("turnstile-verification");
                }, 1000);
              },
              "error-callback": (code?: string) => {
                console.error("[Turnstile] Widget error callback, code:", code);
                setError(code ?? "Verification failed to load");
              },
              "expired-callback": () => {
                console.warn("[Turnstile] Token expired");
                setError("Token expired, please try again");
              },
            });
            widgetIdRef.current = id;
            console.log("[Turnstile] Rendered with ID:", id);
          }, 200);
        }
      } catch (err) {
        console.error("[Turnstile] Render failed", err);
        setError("Network error loading security check");
      }
    };

    void renderWidget();

    return () => {
      // Cleanup
      if (widgetIdRef.current && window.turnstile) {
        console.log("[Turnstile] Removing widget", widgetIdRef.current);
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [isSdkLoaded, setTurnstileToken, closeWindow]);

  return (
    <div className="window w-full h-full flex flex-col">
      <div className="title-bar">
        <div className="title-bar-text">Security Check</div>
        <div className="title-bar-controls">
          <button
            aria-label="Close"
            onClick={() => {
              closeWindow("turnstile-verification");
            }}
          />
        </div>
      </div>
      <div className="window-body flex flex-col items-center justify-center gap-4 bg-msn-bg p-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <img
            src="/cf-messenger-logo.png"
            alt="Security"
            className="w-8 h-8 object-contain gray-scale grayscale"
          />
          <span className="font-bold text-msn-base">Additional Protection</span>
        </div>
        <p className="text-msn-sm text-center max-w-[250px] mb-2">
          Please complete the security check to continue signing in.
        </p>
        <div className="min-h-[65px] flex flex-col items-center justify-center">
          <div ref={containerRef} />
          {error && (
            <div className="text-red-600 text-[10px] mt-2 text-center bg-red-50 p-1 border border-red-200">
              Error: {error}
              <br />
              <button
                className="mt-1 underline text-blue-600 hover:text-blue-800"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
