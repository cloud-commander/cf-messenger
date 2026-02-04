import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WindowLayer } from "../components/layout/WindowLayer";
import { useWindowStore } from "../store/useWindowStore";

// Mutable state for mock
let mockChatState = {
  currentUser: null,
  openChatIds: [],
  login: vi.fn(),
  logout: vi.fn(),
  closeChat: vi.fn(),
};

// Mock ChatStore
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: any) => selector(mockChatState),
}));

// Mock child components
vi.mock("../components/auth/LoginScreen", () => ({
  LoginScreen: () => <div data-testid="login-screen">Login Screen</div>,
}));

vi.mock("../components/chat/ContactList", () => ({
  ContactList: () => <div data-testid="contact-list">Contact List</div>,
}));

vi.mock("../components/chat/ChatWindow", () => ({
  ChatWindow: ({ windowId }: { windowId: string }) => (
    <div data-testid="chat-window">{windowId}</div>
  ),
}));

vi.mock("../components/layout/DraggableWindow", () => ({
  DraggableWindow: ({ children }: { children: any }) => <div>{children}</div>,
}));

vi.mock("../components/auth/TurnstileWindow", () => ({
  TurnstileWindow: () => <div data-testid="turnstile">Turnstile</div>,
}));

describe("WindowLayer", () => {
  beforeEach(() => {
    useWindowStore.setState({ openWindows: [] });
    // Reset mock state
    mockChatState = {
      currentUser: null,
      openChatIds: [],
      login: vi.fn(),
      logout: vi.fn(),
      closeChat: vi.fn(),
    };
  });

  it("should render LoginScreen by default if no user", () => {
    useWindowStore.setState({ openWindows: [] });
    render(<WindowLayer />);
    expect(screen.getByTestId("login-screen")).toBeDefined();
  });

  it("should render LoginScreen", () => {
    useWindowStore.setState({ openWindows: ["login-screen"] });
    render(<WindowLayer />);
    expect(screen.getByTestId("login-screen")).toBeDefined();
  });

  it("should render ContactList if user logged in", () => {
    mockChatState = {
      ...mockChatState,
      currentUser: { id: "u1" } as any,
    };
    useWindowStore.setState({ openWindows: ["contact-list"] });
    render(<WindowLayer />);
    expect(screen.getByTestId("contact-list")).toBeDefined();
  });

  it("should render ChatWindows if user logged in", () => {
    mockChatState = {
      ...mockChatState,
      currentUser: { id: "u1" } as any,
      openChatIds: ["room-1", "room-2"],
    };
    useWindowStore.setState({ openWindows: ["room-1", "room-2"] });

    render(<WindowLayer />);
    expect(screen.getByText("room-1")).toBeDefined();
    expect(screen.getByText("room-2")).toBeDefined();
  });

  it("should render Turnstile", () => {
    useWindowStore.setState({ openWindows: ["turnstile-verification"] });
    render(<WindowLayer />);
    expect(screen.getByTestId("turnstile")).toBeDefined();
  });
});
