import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StartMenu } from "../components/layout/StartMenu";
import { useChatStore } from "../store/useChatStore";

// Mutable state
let mockStoreState = {
  currentUser: { id: "me", displayName: "Tester", avatarId: "001" },
  logout: vi.fn(),
};

// Mock dependencies
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: any) => selector(mockStoreState),
}));

vi.mock("../services/messengerService", () => ({
  messengerService: {
    getAvatarUrl: vi.fn().mockReturnValue("/avatar.png"),
  },
}));

vi.mock("../config/startMenuConfig", () => ({
  startMenuConfig: {
    header: { defaultName: "Guest" },
    leftColumn: [
      { label: "Internet", icon: "ie.png", action: vi.fn() },
      { type: "separator" },
    ],
    rightColumn: [{ label: "My Documents", bold: true, action: vi.fn() }],
    footer: {
      logOff: { label: "Log Off", icon: "logoff.png" },
      turnOff: { label: "Turn Off", icon: "shutdown.png" },
    },
    allPrograms: { label: "All Programs" },
  },
}));

describe("StartMenu", () => {
  beforeEach(() => {
    mockStoreState = {
      currentUser: { id: "me", displayName: "Tester", avatarId: "001" },
      logout: vi.fn(),
    };
  });

  it("should render user info", () => {
    render(<StartMenu />);
    expect(screen.getByText("Tester")).toBeDefined();
  });

  it("should render menu items", () => {
    render(<StartMenu />);
    expect(screen.getByText("Internet")).toBeDefined();
    expect(screen.getByText("My Documents")).toBeDefined();
    expect(screen.getByText("All Programs")).toBeDefined();
  });

  it("should handle logout click", () => {
    render(<StartMenu />);

    const logOffBtn = screen.getByText("Log Off");
    fireEvent.click(logOffBtn);

    expect(mockStoreState.logout).toHaveBeenCalled();
  });
});
