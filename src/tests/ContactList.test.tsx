import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactList } from "../components/chat/ContactList";
import { useChatStore } from "../store/useChatStore";

// Mock hooks
vi.mock("../hooks/useSound", () => ({
  useSound: () => ({ playSound: vi.fn() }),
}));

vi.mock("../store/useWindowStore", () => ({
  useWindowStore: (selector: any) => {
    // Mock logic for window store
    if (typeof selector !== "function") return selector;
    return selector({
      minimizeWindow: vi.fn(),
      toggleMaximize: vi.fn(),
      isWindowMaximized: () => false,
      setActiveWindow: vi.fn(),
    });
  },
}));

// Mock services
vi.mock("../services/messengerService", () => ({
  messengerService: {
    getAvatarUrl: vi.fn().mockReturnValue("/avatar.png"),
  },
}));

// Mock AdBanner to avoid complexity
vi.mock("../components/chat/AdBanner", () => ({
  AdBanner: () => <div>Ad</div>,
}));

// Mock store logic
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: any) =>
    selector({
      currentUser: {
        id: "me",
        displayName: "Me",
        status: "online",
        avatarId: "001",
      },
      contacts: [
        {
          id: "u1",
          displayName: "Alice",
          status: "online",
          isAiBot: false,
          avatarId: "002",
        },
        {
          id: "u2",
          displayName: "Bob",
          status: "offline",
          isAiBot: false,
          avatarId: "003",
        },
        {
          id: "bot1",
          displayName: "Bot",
          status: "online",
          isAiBot: true,
          avatarId: "004",
        },
      ],
      rooms: [],
      openChatIds: [],
      isLoading: false,
      error: null,
      // Mock actions
      login: vi.fn(),
      logout: vi.fn(),
      openChat: vi.fn(),
      setStatus: vi.fn(),
      fetchContacts: vi.fn(),
    }),
}));

describe("ContactList", () => {
  it("should render user info", () => {
    render(<ContactList onLogout={vi.fn()} />);
    // Checking for "Me"
    expect(screen.getByText("Me")).toBeDefined();
  });

  it("should render groups", () => {
    render(<ContactList onLogout={vi.fn()} />);
    // Online, Offline, AI
    expect(screen.getByText(/Online/)).toBeDefined();
    expect(screen.getByText(/Offline/)).toBeDefined();
    expect(screen.getByText(/AI Personalities/)).toBeDefined();
  });

  it("should render contacts", () => {
    render(<ContactList onLogout={vi.fn()} />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("Bot")).toBeDefined();
  });
});
