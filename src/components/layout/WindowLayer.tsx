import { useEffect } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useWindowStore } from "../../store/useWindowStore";
import { DraggableWindow } from "./DraggableWindow";
import { LoginScreen } from "../auth/LoginScreen";
import { ContactList } from "../chat/ContactList";
import { ChatWindow } from "../chat/ChatWindow";
import { InternetExplorer } from "../apps/InternetExplorer/InternetExplorer";
import { TurnstileWindow } from "../auth/TurnstileWindow";

export function WindowLayer() {
  const currentUser = useChatStore((state) => state.currentUser);
  const openChatIds = useChatStore((state) => state.openChatIds);
  const login = useChatStore((state) => state.login);
  const logout = useChatStore((state) => state.logout);
  const closeChat = useChatStore((state) => state.closeChat);

  const openWindows = useWindowStore((state) => state.openWindows);
  const minimizedWindows = useWindowStore((state) => state.minimizedWindows);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const openWindow = useWindowStore((state) => state.openWindow);

  // Initialization Logic: Ensure correct main window is open
  useEffect(() => {
    if (!currentUser) {
      // Ensure login screen is open if not logged in
      if (!openWindows.includes("login-screen")) {
        // modifying store in render effect is risky if not careful, but okay in useEffect
        openWindow("login-screen");
        // Also ensure contact-list is closed?
        closeWindow("contact-list");
      }
    } else {
      // Ensure contact list is open if logged in
      if (!openWindows.includes("contact-list")) {
        openWindow("contact-list");
        closeWindow("login-screen");
      }
    }
  }, [currentUser, openWindow, closeWindow, openWindows]);

  const handleCloseChat = (chatId: string) => {
    closeChat(chatId);
    closeWindow(chatId);
  };

  const handleCloseIE = () => {
    closeWindow("internet-explorer");
  };

  return (
    <>
      {/* Internet Explorer */}
      {openWindows.includes("internet-explorer") &&
        !minimizedWindows.includes("internet-explorer") && (
          <DraggableWindow
            windowId="internet-explorer"
            defaultPosition={{ x: 100, y: 50 }}
            className="w-[800px] h-[600px]"
          >
            <InternetExplorer
              windowId="internet-explorer"
              onClose={handleCloseIE}
            />
          </DraggableWindow>
        )}

      {/* Turnstile Verification */}
      {/* Turnstile Verification */}
      {openWindows.includes("turnstile-verification") &&
        !minimizedWindows.includes("turnstile-verification") && (
          <DraggableWindow
            windowId="turnstile-verification"
            defaultPosition={{
              x: 20,
              y: 40,
            }}
            zIndex={200}
            className="w-[320px] h-[240px]"
            maximizable={false}
          >
            <TurnstileWindow />
          </DraggableWindow>
        )}

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
            <LoginScreen
              onLogin={(user) => {
                void login(user);
              }}
            />
          </DraggableWindow>
        )}

      {/* Contact List */}
      {currentUser &&
        openWindows.includes("contact-list") &&
        !minimizedWindows.includes("contact-list") && (
          <DraggableWindow
            windowId="contact-list"
            defaultPosition={{ x: 50, y: 50 }}
            className="w-[300px] h-[580px]"
          >
            <ContactList onLogout={logout} />
          </DraggableWindow>
        )}

      {/* Chat Windows */}
      {currentUser &&
        openChatIds.map((chatId, index) => {
          if (minimizedWindows.includes(chatId)) return null;
          return (
            <DraggableWindow
              key={chatId}
              windowId={chatId}
              defaultPosition={{ x: 100 + index * 30, y: 50 + index * 30 }}
              className="w-[500px] h-[450px]"
            >
              <ChatWindow
                onClose={() => {
                  handleCloseChat(chatId);
                }}
                windowId={chatId}
              />
            </DraggableWindow>
          );
        })}
    </>
  );
}
