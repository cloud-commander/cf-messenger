import { useLayoutEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const PortalParams = ({
  children,
  triggerRef,
  isOpen,
  onClose,
}: PortalProps) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      // We want to position the portal ABOVE the trigger.
      // The portal content will use translateY(-100%) to shift itself up.
      // Since we are using "fixed" positioning, we use pure viewport coordinates (rect.top/left).
      // No need to add window.scrollX/Y unless we were absolute relative to document.
      setCoords({
        top: rect.top,
        left: rect.left,
      });
    };

    updatePosition();

    // meaningful updates
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true); // Capture for all scrolling elements

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={contentRef}
      className="fixed z-[99999]"
      style={{
        top: coords.top,
        left: coords.left,
        transform: "translateY(-100%)", // Move up by its own height to sit above
        pointerEvents: "auto",
      }}
    >
      <div className="relative">
        {/* Invisible backdrop to handle closing when clicking outside */}
        <div className="fixed inset-0 z-[-1]" onClick={onClose} />
        <div
          className="relative z-10 mb-1" // minimal margin to not touch button
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
