import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Desktop } from "../components/layout/Desktop";
import { useWindowStore } from "../store/useWindowStore";

// Mutable Mock Store
let mockWindowStore = {
  openWindow: vi.fn(),
  restoreWindow: vi.fn(),
  minimizedWindows: [] as string[],
};

// Mock dependencies
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: any) => selector({ currentUser: null }),
}));

vi.mock("../store/useWindowStore", () => ({
  useWindowStore: (selector: any) => selector(mockWindowStore),
}));

vi.mock("../config/appConfig", () => ({
  APP_CONFIG: { APP_NAME: "Messenger" },
}));

describe("Desktop", () => {
  beforeEach(() => {
    mockWindowStore = {
      openWindow: vi.fn(),
      restoreWindow: vi.fn(),
      minimizedWindows: [],
    };
  });

  it("should render desktop icons", () => {
    render(<Desktop />);
    expect(screen.getByText("Messenger")).toBeDefined();
    expect(screen.getByText("Internet Explorer")).toBeDefined();
  });

  it("should open messenger on double click", () => {
    render(<Desktop />);
    const icon = screen.getByText("Messenger");
    fireEvent.doubleClick(icon);
    expect(mockWindowStore.openWindow).toHaveBeenCalledWith("login-screen");
  });

  it("should restore messenger if minimized", () => {
    mockWindowStore.minimizedWindows = ["login-screen"];
    render(<Desktop />);
    const icon = screen.getByText("Messenger");
    fireEvent.doubleClick(icon);
    expect(mockWindowStore.restoreWindow).toHaveBeenCalledWith("login-screen");
  });

  it("should open IE on double click", () => {
    render(<Desktop />);
    const icon = screen.getByText("Internet Explorer");
    fireEvent.doubleClick(icon);
    expect(mockWindowStore.openWindow).toHaveBeenCalledWith(
      "internet-explorer",
    );
  });
});
