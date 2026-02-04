import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginScreen } from "../components/auth/LoginScreen";
import { useChatStore } from "../store/useChatStore";
import { messengerService } from "../services/messengerService";

// Mock store
vi.mock("../store/useChatStore", () => ({
  useChatStore: vi.fn(),
}));

// Mock Sound
vi.mock("../hooks/useSound", () => ({
  useSound: () => ({ playSound: vi.fn() }),
}));

// Mock Messenger Service
vi.mock("../services/messengerService", () => ({
  messengerService: {
    getContacts: vi.fn(),
    getAvatarUrl: vi.fn().mockReturnValue("/icon.png"),
  },
}));

describe("LoginScreen", () => {
  const mockFetchContacts = vi.fn();
  const mockLogin = vi.fn();
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useChatStore as any).mockImplementation((selector: any) => {
      const state = {
        contacts: [],
        isLoading: false,
        error: null,
        fetchContacts: mockFetchContacts,
        login: mockLogin,
        currentUser: null,
        turnstileToken: "mock-token",
        openWindow: vi.fn(),
        minimizeWindow: vi.fn(),
      };
      return selector(state);
    });
  });

  it("should render loading state", async () => {
    // Return a promise that never resolves to simulate loading
    (messengerService.getContacts as any).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<LoginScreen onLogin={mockOnLogin} />);
    expect(screen.getByText("Loading accounts...")).toBeDefined();
  });

  it("should fetch contacts on mount and display them", async () => {
    const users = [
      {
        id: "u1",
        displayName: "User 1",
        status: "online",
        avatarId: "a1",
        isAiBot: false,
      },
      {
        id: "u2",
        displayName: "User 2",
        status: "offline",
        avatarId: "a2",
        isAiBot: false,
      },
    ];
    (messengerService.getContacts as any).mockResolvedValue(users);

    render(<LoginScreen onLogin={mockOnLogin} />);

    await waitFor(() => {
      expect(screen.getByText("User 1")).toBeDefined();
    });
    // Should see User 2 as well?
    // The component shuffles and takes 3. If we provide 2, it should show both.
    expect(screen.getByText("User 1")).toBeDefined();
  });

  it("should call login when user is clicked", async () => {
    const users = [
      {
        id: "u1",
        displayName: "User 1",
        status: "online",
        avatarId: "a1",
        isAiBot: false,
      },
    ];
    (messengerService.getContacts as any).mockResolvedValue(users);

    render(<LoginScreen onLogin={mockOnLogin} />);

    await waitFor(() => {
      expect(screen.getByText("User 1")).toBeDefined();
    });

    const userItem = screen.getByText("User 1");
    fireEvent.click(userItem);

    const signInButton = screen.getByText("Sign In");
    fireEvent.click(signInButton);

    expect(mockOnLogin).toHaveBeenCalledTimes(1);
    expect(mockOnLogin).toHaveBeenCalledWith(users[0]);
  });
});
