import { useEffect, useMemo } from "react";
// import { playSound } from "./utils/audio";
import { WindowLayer } from "./components/layout/WindowLayer";
// import { WindowLayerDEBUG } from "./components/layout/WindowLayerDEBUG";
import { Desktop } from "./components/layout/Desktop";
import { Taskbar, type OpenWindow } from "./components/layout/Taskbar";
import { useChatStore } from "./store/useChatStore";
import { useWindowStore } from "./store/useWindowStore";
import { DialogLayer } from "./components/layout/DialogLayer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

import { APP_CONFIG } from "./config/appConfig";

function App() {
  const openWindows = useWindowStore((state) => state.openWindows);
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  // Need contacts to map Chat IDs to names
  const contacts = useChatStore((state) => state.contacts);

  // Map window IDs to Taskbar Items
  const taskbarWindows = useMemo<OpenWindow[]>(() => {
    return openWindows.map((id) => {
      const isActive = id === activeWindowId;
      const commonProps = {
        id,
        isActive,
        onMinimize: () => {
          minimizeWindow(id);
        },
        onRestore: () => {
          restoreWindow(id);
        },
      };

      if (id === "login-screen") {
        return { ...commonProps, title: "Login", icon: "/icons/msn.png" };
      }
      if (id === "contact-list") {
        return {
          ...commonProps,
          title: APP_CONFIG.APP_NAME,
          icon: "/cf-messenger-logo.png",
        };
      }
      if (id === "internet-explorer") {
        return {
          ...commonProps,
          title: "Internet Explorer",
          icon: "/icons/ie/iexplorer.png",
        };
      }
      if (id.startsWith("chat-")) {
        // Find user
        const participantId = id.replace("chat-", "");
        const user = contacts.find((u) => u.id === participantId);
        return {
          ...commonProps,
          title: user?.displayName ?? user?.email ?? "Chat",
          icon: "/icons/msn_chat.png", // Or user avatar?
        };
      }

      return { ...commonProps, title: id };
    });
  }, [openWindows, activeWindowId, contacts, minimizeWindow, restoreWindow]);

  useEffect(() => {
    document.title = APP_CONFIG.APP_NAME;
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-blue-500">
      <Desktop />

      <ErrorBoundary>
        <WindowLayer />
      </ErrorBoundary>

      <Taskbar windows={taskbarWindows} />
      <DialogLayer />
    </div>
  );
}

export default App;
