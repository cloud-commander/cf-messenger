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
          TURNSTILE_SITE_KEY: string;
        };
        const sitekey = config.TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

        if (window.turnstile && containerRef.current) {
          const id = window.turnstile.render(containerRef.current, {
            sitekey,
            callback: (_token: string) => {
              console.log("[Turnstile] Token received");
              setTimeout(() => {
                setTurnstileToken(_token);
                closeWindow("turnstile-verification");
              }, 1000);
            },
            "error-callback": () => {
              console.error("[Turnstile] Widget error callback");
            },
            "expired-callback": () => {
              console.warn("[Turnstile] Token expired");
            },
          });
          widgetIdRef.current = id;
          console.log("[Turnstile] Rendered with ID:", id);
        }
      } catch (err) {
        console.error("[Turnstile] Render failed", err);
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
        <div className="min-h-[65px] flex items-center justify-center">
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  );
}
