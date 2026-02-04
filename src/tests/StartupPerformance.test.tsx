import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginScreen } from "../components/auth/LoginScreen";
import { ContactList } from "../components/chat/ContactList";
import { ChatWindow } from "../components/chat/ChatWindow";
import { useChatStore } from "../store/useChatStore";

// Mutable Mock State
let mockStoreState: any = {};

// Mock dependencies
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: any) => selector(mockStoreState),
}));

vi.mock("../store/useWindowStore", () => ({
  useWindowStore: (selector: any) =>
    selector({
      openWindow: vi.fn(),
      restoreWindow: vi.fn(),
      minimizedWindows: [],
      openWindows: ["login-screen"],
      activeWindowId: "login-screen",
      isWindowMaximized: () => false,
    }),
}));

vi.mock("../hooks/useTaskbarWindows", () => ({
  useTaskbarWindows: () => [],
}));

vi.mock("../services/messengerService", () => ({
  messengerService: {
    getAvatarUrl: vi.fn((id) => `/avatars/${id}.png`),
    connectWebSocket: vi.fn(),
    login: vi.fn(),
  },
}));

vi.mock("../hooks/useSound", () => ({
  useSound: () => ({ playSound: vi.fn() }),
}));

vi.mock("../config/assets", () => ({
  getAssetUrl: (p: string) => p,
}));

vi.mock("../components/chat/AdBanner", () => ({
  AdBanner: () => <div data-testid="ad-banner">Ad</div>,
}));

// Helpers
const generateContacts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user_${i}`,
    displayName: `User ${i}`,
    status: i % 3 === 0 ? "online" : "offline",
    avatarId: `avatar_${i}`,
    isAiBot: false,
  }));
};

const generateMessages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg_${i}`,
    roomId: "room1",
    content: `Message content ${i} - this is a test message.`,
    senderId: i % 2 === 0 ? "me" : "other",
    sentAt: Date.now() - (count - i) * 1000,
    type: "chat",
    displayName: i % 2 === 0 ? "Me" : "Other",
  }));
};

describe("Performance Benchmarks", () => {
  it("measures LoginScreen initial render time", () => {
    mockStoreState = {
      currentUser: null,
      fetchContacts: vi.fn(),
      isLoading: false,
      error: null,
      login: vi.fn(),
    };

    const start = performance.now();
    render(<LoginScreen />);
    const end = performance.now();

    console.log(`[Perf] LoginScreen Render: ${(end - start).toFixed(2)}ms`);
    expect(screen.getByText("Sign In")).toBeDefined();
  });

  it("measures ContactList render time with 500 contacts", () => {
    const contacts = generateContacts(500);
    mockStoreState = {
      currentUser: { id: "me", displayName: "Tester" },
      contacts: contacts,
      rooms: [],
      openChatIds: [],
      login: vi.fn(),
      logout: vi.fn(),
      setStatus: vi.fn(),
      fetchContacts: vi.fn(),
    };

    const start = performance.now();
    render(<ContactList onLogout={vi.fn()} />);
    const end = performance.now();

    console.log(
      `[Perf] ContactList (500 items) Render: ${(end - start).toFixed(2)}ms`,
    );
    expect(screen.getByText("User 499")).toBeDefined();
  });

  it("measures ChatWindow render time with 1000 messages", () => {
    const messages = generateMessages(1000);
    mockStoreState = {
      currentUser: { id: "me", displayName: "Me" },
      openChatIds: ["room1"],
      rooms: [
        {
          id: "room1",
          name: "Perf Chat",
          type: "dm",
          participants: ["other"],
          messages: [],
        },
      ],
      contacts: [{ id: "other", displayName: "Other User", status: "online" }],
      messages: { room1: messages },
      roomParticipants: {},
      typingStatus: {},
      sendMessage: vi.fn(),
      closeChat: vi.fn(),
    };

    const start = performance.now();
    render(<ChatWindow windowId="room1" onClose={vi.fn()} />);
    const end = performance.now();

    console.log(
      `[Perf] ChatWindow (1000 items) Render: ${(end - start).toFixed(2)}ms`,
    );
    expect(screen.getByText(/Message content 999/)).toBeDefined();
  });
});
