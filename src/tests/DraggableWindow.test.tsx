import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DraggableWindow } from "../components/layout/DraggableWindow";
import { useWindowStore } from "../store/useWindowStore";

describe("DraggableWindow", () => {
  it("should render children", () => {
    render(
      <DraggableWindow windowId="win1" defaultPosition={{ x: 0, y: 0 }}>
        <div data-testid="content">Content</div>
      </DraggableWindow>,
    );
    expect(screen.getByTestId("content")).toBeDefined();
  });

  it("should toggle maximize on double click title bar", () => {
    const toggleMaximize = vi.fn();
    // @ts-ignore
    useWindowStore.setState({
      toggleMaximize,
      isWindowMaximized: () => false,
      activeWindowId: null,
    });

    render(
      <DraggableWindow windowId="win1" defaultPosition={{ x: 0, y: 0 }}>
        <div className="title-bar" data-testid="title-bar">
          Title
        </div>
      </DraggableWindow>,
    );

    const titleBar = screen.getByTestId("title-bar");

    // Simulate two clicks within 300ms
    fireEvent.mouseDown(titleBar);
    fireEvent.mouseDown(titleBar);

    expect(toggleMaximize).toHaveBeenCalledWith("win1");
  });
});
