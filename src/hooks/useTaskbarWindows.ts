import { useChatStore } from "../store/useChatStore";
import { useWindowStore } from "../store/useWindowStore";
import type { OpenWindow } from "../components/layout/Taskbar";

import { APP_CONFIG } from "../config/appConfig";

export function useTaskbarWindows(): OpenWindow[] {
  const currentUser = useChatStore((state) => state.currentUser);
  const openChatIds = useChatStore((state) => state.openChatIds);
  const contacts = useChatStore((state) => state.contacts);
  const rooms = useChatStore((state) => state.rooms);

  const minimizedWindows = useWindowStore((state) => state.minimizedWindows);
  const openWindows = useWindowStore((state) => state.openWindows);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  const windowsForTaskbar: OpenWindow[] = [];

  // 1. Internet Explorer
  if (openWindows.includes("internet-explorer")) {
    windowsForTaskbar.push({
      id: "internet-explorer",
      title: "Internet Explorer",
      icon: "/icons/ie/iexplorer.png",
      isActive: !minimizedWindows.includes("internet-explorer"),
      onMinimize: () => {
        minimizeWindow("internet-explorer");
      },
      onRestore: () => {
        restoreWindow("internet-explorer");
      },
    });
  }

  // 2. CF Messenger (Login or Contact List)
  if (!currentUser) {
    // Login Screen
    // We assume it matches "login-screen" id logic in WindowLayer
    // Or check openWindows? Usually we want it on taskbar if it's the main app, even if technically "not open" in some sense?
    // But WindowLayer manages openWindows logic.
    if (openWindows.includes("login-screen")) {
      windowsForTaskbar.push({
        id: "login-screen",
        title: APP_CONFIG.APP_NAME,
        icon: "/cf-messenger-logo.png",
        isActive: !minimizedWindows.includes("login-screen"),
        onMinimize: () => {
          minimizeWindow("login-screen");
        },
        onRestore: () => {
          restoreWindow("login-screen");
        },
      });
    }
  } else {
    // Contact List
    if (openWindows.includes("contact-list")) {
      windowsForTaskbar.push({
        id: "contact-list",
        title: "All Contacts",
        icon: "/cf-messenger-logo.png",
        isActive: !minimizedWindows.includes("contact-list"),
        onMinimize: () => {
          minimizeWindow("contact-list");
        },
        onRestore: () => {
          restoreWindow("contact-list");
        },
      });
    }

    // 3. Chat Windows
    openChatIds.forEach((chatId) => {
      // Resolve Title
      let title = "Conversation";
      let icon = "/person.png";

      // Check if DM (contact)
      if (chatId.startsWith("dm_")) {
        const contactId = chatId.replace("dm_", "");
        const contact = contacts.find((c) => c.id === contactId);
        if (contact) {
          title = contact.displayName;
        }
      } else {
        // Check if Room
        const room = rooms.find((r) => r.id === chatId);
        if (room) {
          title = room.name;
          icon = "/msn-group.png";
        }
      }

      windowsForTaskbar.push({
        id: chatId,
        title: title,
        icon: icon,
        isActive: !minimizedWindows.includes(chatId),
        onMinimize: () => {
          minimizeWindow(chatId);
        },
        onRestore: () => {
          restoreWindow(chatId);
        },
      });
    });
  }

  return windowsForTaskbar;
}
