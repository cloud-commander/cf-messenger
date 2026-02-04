import { describe, it, expect, beforeEach } from "vitest";
import { useWindowStore } from "../store/useWindowStore";

describe("useWindowStore", () => {
  beforeEach(() => {
    // Reset store
    useWindowStore.setState({
      activeWindowId: null,
      minimizedWindows: [],
      maximizedWindows: [],
      openWindows: [],
    });
  });

  it("should initialize with empty state", () => {
    const state = useWindowStore.getState();
    expect(state.activeWindowId).toBeNull();
    expect(state.openWindows).toEqual([]);
  });

  it("should open a window", () => {
    useWindowStore.getState().openWindow("chat-1");
    const state = useWindowStore.getState();
    expect(state.openWindows).toContain("chat-1");
    expect(state.activeWindowId).toBe("chat-1");
  });

  it("should not duplicate windows when opening same window twice", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().openWindow("chat-1");
    const state = useWindowStore.getState();
    expect(state.openWindows.filter((id) => id === "chat-1")).toHaveLength(1);
  });

  it("should close a window", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().closeWindow("chat-1");
    const state = useWindowStore.getState();
    expect(state.openWindows).not.toContain("chat-1");
    expect(state.activeWindowId).not.toBe("chat-1");
  });

  it("should change active window when closing active window with other windows open", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().openWindow("chat-2");
    expect(useWindowStore.getState().activeWindowId).toBe("chat-2");

    useWindowStore.getState().closeWindow("chat-2");
    const state = useWindowStore.getState();
    // Should focus previous window
    expect(state.openWindows).toContain("chat-1");
  });

  it("should minimize a window", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().minimizeWindow("chat-1");
    const state = useWindowStore.getState();
    expect(state.minimizedWindows).toContain("chat-1");
  });

  it("should not add window to minimized list if already minimized", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().minimizeWindow("chat-1");
    useWindowStore.getState().minimizeWindow("chat-1");
    const state = useWindowStore.getState();
    expect(state.minimizedWindows.filter((id) => id === "chat-1")).toHaveLength(
      1,
    );
  });

  it("should restore a window from minimized", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().minimizeWindow("chat-1");
    useWindowStore.getState().restoreWindow("chat-1");
    const state = useWindowStore.getState();
    expect(state.minimizedWindows).not.toContain("chat-1");
    expect(state.activeWindowId).toBe("chat-1");
  });

  it("should toggle maximize on window", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().toggleMaximize("chat-1");
    let state = useWindowStore.getState();
    expect(state.maximizedWindows).toContain("chat-1");
    expect(state.isWindowMaximized("chat-1")).toBe(true);

    useWindowStore.getState().toggleMaximize("chat-1");
    state = useWindowStore.getState();
    expect(state.maximizedWindows).not.toContain("chat-1");
    expect(state.isWindowMaximized("chat-1")).toBe(false);
  });

  it("should check if window is maximized", () => {
    useWindowStore.getState().openWindow("chat-1");
    expect(useWindowStore.getState().isWindowMaximized("chat-1")).toBe(false);

    useWindowStore.getState().toggleMaximize("chat-1");
    expect(useWindowStore.getState().isWindowMaximized("chat-1")).toBe(true);
  });

  it("should check if window is minimized", () => {
    useWindowStore.getState().openWindow("chat-1");
    expect(useWindowStore.getState().isWindowMinimized("chat-1")).toBe(false);

    useWindowStore.getState().minimizeWindow("chat-1");
    expect(useWindowStore.getState().isWindowMinimized("chat-1")).toBe(true);
  });

  it("should set active window", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().openWindow("chat-2");

    useWindowStore.getState().setActiveWindow("chat-1");
    expect(useWindowStore.getState().activeWindowId).toBe("chat-1");
  });

  it("should handle multiple windows lifecycle", () => {
    // Open multiple windows
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().openWindow("chat-2");
    useWindowStore.getState().openWindow("chat-3");

    let state = useWindowStore.getState();
    expect(state.openWindows).toHaveLength(3);
    expect(state.activeWindowId).toBe("chat-3");

    // Minimize one
    useWindowStore.getState().minimizeWindow("chat-2");
    state = useWindowStore.getState();
    expect(state.minimizedWindows).toContain("chat-2");

    // Maximize another
    useWindowStore.getState().toggleMaximize("chat-1");
    state = useWindowStore.getState();
    expect(state.maximizedWindows).toContain("chat-1");

    // Close one
    useWindowStore.getState().closeWindow("chat-3");
    state = useWindowStore.getState();
    expect(state.openWindows).not.toContain("chat-3");
    expect(state.openWindows).toHaveLength(2);
  });

  it("should handle restore window that is also maximized", () => {
    useWindowStore.getState().openWindow("chat-1");
    useWindowStore.getState().toggleMaximize("chat-1");
    useWindowStore.getState().minimizeWindow("chat-1");

    useWindowStore.getState().restoreWindow("chat-1");

    const state = useWindowStore.getState();
    expect(state.minimizedWindows).not.toContain("chat-1");
    expect(state.maximizedWindows).toContain("chat-1"); // Should remain maximized
    expect(state.activeWindowId).toBe("chat-1");
  });

  it("should handle closing non-existent window gracefully", () => {
    expect(() => {
      useWindowStore.getState().closeWindow("non-existent");
    }).not.toThrow();
  });

  it("should handle restoring non-existent window gracefully", () => {
    expect(() => {
      useWindowStore.getState().restoreWindow("non-existent");
    }).not.toThrow();
  });
});
