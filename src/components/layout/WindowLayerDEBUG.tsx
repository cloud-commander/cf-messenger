import { useEffect } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useWindowStore } from "../../store/useWindowStore";
import { DraggableWindow } from "./DraggableWindow";

import { LoginScreen } from "../auth/LoginScreen";

// TOXICITY TEST:
// import { ContactList } from "../chat/ContactList";
// import { ChatWindow } from "../chat/ChatWindow";
// import { InternetExplorer } from "../apps/InternetExplorer/InternetExplorer";
// import { TurnstileWindow } from "../auth/TurnstileWindow";

export function WindowLayerDEBUG() {
  const currentUser = useChatStore((state) => state.currentUser);
  const login = useChatStore((state) => state.login);

  const openWindows = useWindowStore((state) => state.openWindows);
  const openWindow = useWindowStore((state) => state.openWindow);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const minimizedWindows = useWindowStore((state) => state.minimizedWindows);

  // Initialization Logic needed for proper behavior
  useEffect(() => {
    if (!currentUser) {
      if (!openWindows.includes("login-screen")) {
        openWindow("login-screen");
        closeWindow("contact-list");
      }
    }
  }, [currentUser, openWindow, closeWindow, openWindows]);

  return (
    <>
      {/* Login Screen */}
      {!currentUser &&
        openWindows.includes("login-screen") &&
        !minimizedWindows.includes("login-screen") && (
          <DraggableWindow
            windowId="login-screen"
            defaultPosition={{
              x: 20,
              y: 40,
            }}
            zIndex={100}
            maximizable={false}
          >
            <LoginScreen onLogin={login} />
          </DraggableWindow>
        )}
    </>
  );
}
