import { useState } from "react";

interface DesktopIconProps {
  label: string;
  iconPath: string;
  onDoubleClick: () => void;
  className?: string; // For positioning
}

export function DesktopIcon({
  label,
  iconPath,
  onDoubleClick,
  className,
}: DesktopIconProps) {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <button
      type="button"
      className={`desktop-icon-reset flex flex-col items-center gap-1 p-1 w-20 cursor-default group focus:outline-none bg-transparent border-none outline-none appearance-none shadow-none ring-0 ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsSelected(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onDoubleClick();
        }
      }}
      onBlur={() => {
        setIsSelected(false);
      }}
      aria-label={label}
      // Clicking elsewhere on desktop should deselect, but that requires global click handler.
      // For now, we handle local selection state visual.
      // Ideally, parent controls selection, but local is fine for visual feedback.
    >
      <img
        src={iconPath}
        alt="" // purely decorative if label is present, or redundant
        className={`w-msn-icon-lg h-msn-icon-lg ${isSelected ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}
      />
      <span
        className={`text-msn-base text-white text-center leading-tight px-1 py-0.5 select-none ${
          isSelected ? "bg-[#0B61FF] bg-opacity-80" : "drop-shadow-md"
        }`}
        style={{
          textShadow: isSelected ? "none" : "1px 1px 2px black",
        }}
      >
        {label}
      </span>
    </button>
  );
}
