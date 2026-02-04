import { useRef } from "react";
import type { ReactNode } from "react";
import Draggable from "react-draggable";
import { useWindowStore } from "../../store/useWindowStore";
import { cn } from "../../lib/utils"; // Assuming utils exists, or I will check later. If not standard, I'll use simple string concat or check imports.

interface DraggableWindowProps {
  windowId: string;
  defaultPosition?: { x: number; y: number };
  className?: string;
  children: ReactNode;
  maximizable?: boolean;
  zIndex?: number;
}

import { useIsMobile } from "../../hooks/useIsMobile";

export const DraggableWindow = ({
  windowId,
  defaultPosition = { x: 0, y: 0 },
  className,
  children,
  zIndex,
  maximizable = true,
}: DraggableWindowProps) => {
  const nodeRef = useRef(null);
  const { activeWindowId, setActiveWindow, isWindowMaximized, toggleMaximize } =
    useWindowStore();
  const isMobile = useIsMobile();

  const isActive = activeWindowId === windowId;
  const isMaximized = isWindowMaximized(windowId);
  const currentZIndex = isActive ? 50 : 10;

  const lastClickTimeRef = useRef(0);

  const handleManualDoubleClick = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable maximization toggle on mobile
    if (!maximizable) return;

    // Only verify title bar target
    if (
      !(e.target as HTMLElement).closest(".title-bar") ||
      (e.target as HTMLElement).closest(".title-bar-controls") ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      // Double click detected
      toggleMaximize(windowId);
      // Prevent drag start on second click if possible, though state change might handle it
      e.preventDefault();
      e.stopPropagation();
    }
    lastClickTimeRef.current = now;
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".title-bar"
      cancel=".title-bar-controls button, .no-drag"
      defaultPosition={defaultPosition}
      onMouseDown={() => {
        setActiveWindow(windowId);
      }}
      disabled={isMaximized || (isMobile && maximizable)}
      bounds="body"
    >
      <div
        ref={nodeRef}
        className={cn(
          "absolute",
          (isMaximized || (isMobile && maximizable)) &&
            "!fixed !top-0 !left-0 !w-full !h-[calc(100vh-30px)] !transform-none !rounded-none",
          isMobile && maximizable && "!border-none !shadow-none",
          className,
        )}
        style={{ zIndex: zIndex ?? currentZIndex }}
        onMouseDownCapture={handleManualDoubleClick}
      >
        {children}
      </div>
    </Draggable>
  );
};
