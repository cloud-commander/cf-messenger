import { useState, useEffect, useRef } from "react";
import { StartButton } from "./StartButton";
import { StartMenu } from "./StartMenu";
import { TaskbarClock } from "./TaskbarClock";
import { TaskbarItem } from "./TaskbarItem";
import sound from "../../assets/taskbar/sound.png";
import internet from "../../assets/taskbar/internet.png";

export interface OpenWindow {
  id: string;
  title: string;
  icon?: string | undefined;
  isActive: boolean;
  onMinimize: () => void;
  onRestore: () => void;
}

interface TaskbarProps {
  windows: OpenWindow[];
}

export const Taskbar = ({ windows }: TaskbarProps) => {
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const taskbarRef = useRef<HTMLDivElement>(null);

  // Close start menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isStartMenuOpen &&
        taskbarRef.current &&
        !taskbarRef.current.contains(event.target as Node)
      ) {
        setIsStartMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isStartMenuOpen]);

  return (
    <div
      ref={taskbarRef}
      className="fixed bottom-0 left-0 w-full h-[30px] flex items-center justify-between select-none z-[9999] bg-gradient-to-b from-xp-blue-dark via-xp-blue-light to-xp-blue-dark border-t border-xp-blue-light"
    >
      {/* Start Menu */}
      {isStartMenuOpen && <StartMenu />}

      {/* Start Button */}
      <div className="flex-none px-1 h-full flex items-center">
        <StartButton
          isOpen={isStartMenuOpen}
          onToggle={() => {
            setIsStartMenuOpen(!isStartMenuOpen);
          }}
        />
      </div>

      {/* Window List */}
      <div className="flex-1 flex items-center justify-start px-2 gap-1 overflow-x-auto overflow-y-hidden h-full">
        {windows.map((w) => (
          <TaskbarItem
            key={w.id}
            title={w.title}
            isActive={w.isActive}
            icon={w.icon}
            onClick={() => {
              // Close start menu if open when interacting with windows
              if (isStartMenuOpen) setIsStartMenuOpen(false);

              if (w.isActive) {
                w.onMinimize();
              } else {
                w.onRestore();
              }
            }}
          />
        ))}
      </div>

      <div className="flex-none h-full flex items-center px-4 gap-2 bg-gradient-to-b from-xp-blue-deep to-xp-blue-bright border-l border-xp-border-dark shadow-xp-taskbar">
        <div className="flex items-center gap-2">
          <img
            src={internet}
            className="w-msn-icon-taskbar-tray h-msn-icon-taskbar-tray object-contain"
            alt="conn"
          />
          <img
            src={sound}
            className="w-msn-icon-taskbar-tray h-msn-icon-taskbar-tray object-contain"
            alt="vol"
          />
        </div>
        <TaskbarClock />
      </div>
    </div>
  );
};
