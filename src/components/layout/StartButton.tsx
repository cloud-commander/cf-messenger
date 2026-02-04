import { useState } from "react";
import xpBtnNorm from "../../assets/taskbar/xp_btn_norm.png";
import xpBtnHover from "../../assets/taskbar/xp_btn_hover.png";
import xpBtnClicked from "../../assets/taskbar/xp_btn_clicked.png";
import { startMenuConfig } from "../../config/startMenuConfig";

interface StartButtonProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const StartButton = ({ isOpen, onToggle }: StartButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Determine which image to show based on state
  // If menu is open, button stays "pressed"
  let currentImage = xpBtnNorm;
  if (isPressed || isOpen) {
    currentImage = xpBtnClicked;
  } else if (isHovered) {
    currentImage = xpBtnHover;
  }

  return (
    <div
      className="relative cursor-pointer select-none"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => {
        setIsPressed(true);
      }}
      onMouseUp={() => {
        setIsPressed(false);
      }}
      onClick={onToggle}
      title={startMenuConfig.startButton.title}
    >
      <img
        src={currentImage}
        alt={startMenuConfig.startButton.text}
        className="h-msn-h-taskbar object-contain"
      />
    </div>
  );
};
