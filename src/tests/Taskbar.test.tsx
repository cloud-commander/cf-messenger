import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Taskbar } from "../components/layout/Taskbar";

// Mock children
vi.mock("../components/layout/StartMenu", () => ({
  StartMenu: () => <div data-testid="start-menu">Start Menu</div>,
}));

vi.mock("../components/layout/TaskbarClock", () => ({
  TaskbarClock: () => <div>12:00 PM</div>,
}));

// Mock config
vi.mock("../config/startMenuConfig", () => ({
  startMenuConfig: {
    startButton: { text: "start", title: "Click here" },
  },
}));

describe("Taskbar", () => {
  it("should render start button and windows", () => {
    const windows = [
      {
        id: "w1",
        title: "App 1",
        isActive: true,
        onMinimize: vi.fn(),
        onRestore: vi.fn(),
      },
      {
        id: "w2",
        title: "App 2",
        isActive: false,
        onMinimize: vi.fn(),
        onRestore: vi.fn(),
      },
    ];

    render(<Taskbar windows={windows} />);

    expect(screen.getByAltText("start")).toBeDefined();
    expect(screen.getByText("App 1")).toBeDefined();
    expect(screen.getByText("App 2")).toBeDefined();
  });

  it("should toggle start menu", () => {
    render(<Taskbar windows={[]} />);

    const startBtn = screen.getByAltText("start");
    // Click to open
    fireEvent.click(startBtn);
    expect(screen.getByTestId("start-menu")).toBeDefined();

    // Click to close
    fireEvent.click(startBtn);
    expect(screen.queryByTestId("start-menu")).toBeNull();
  });

  it("should handle window clicks", () => {
    const onMinimize = vi.fn();
    const onRestore = vi.fn();
    const windows = [
      { id: "w1", title: "Active App", isActive: true, onMinimize, onRestore },
      {
        id: "w2",
        title: "Inactive App",
        isActive: false,
        onMinimize,
        onRestore,
      },
    ];

    render(<Taskbar windows={windows} />);

    // Click active window -> minimize
    fireEvent.click(screen.getByText("Active App"));
    expect(onMinimize).toHaveBeenCalled();

    // Click inactive window -> restore
    fireEvent.click(screen.getByText("Inactive App"));
    expect(onRestore).toHaveBeenCalled();
  });

  it("should close start menu when clicking outside (simulated)", () => {
    render(<Taskbar windows={[]} />);
    const startBtn = screen.getByAltText("start");
    fireEvent.click(startBtn);
    expect(screen.getByTestId("start-menu")).toBeDefined();

    // Simulate click outside
    fireEvent.mouseDown(document.body);

    // Should close
    expect(screen.queryByTestId("start-menu")).toBeNull();
  });
});
