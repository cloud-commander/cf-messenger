import clsx from "clsx";

interface TaskbarItemProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
  icon?: string | undefined; // Optional icon for the taskbar item
}

export const TaskbarItem = ({
  title,
  isActive,
  onClick,
  icon,
}: TaskbarItemProps) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-2 py-1 min-w-[150px] max-w-[200px] h-[25px] cursor-pointer select-none text-white text-msn-base",
        "border border-[rgba(0,0,0,0.3)] rounded-[2px]",
        isActive
          ? "bg-[#1e52b7] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]"
          : "bg-[#3c81f3] hover:bg-[#5394ff] shadow-[1px_1px_0px_rgba(255,255,255,0.3)]",
      )}
      style={{
        fontFamily: "Tahoma, sans-serif",
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          className="w-msn-icon-taskbar-item h-msn-icon-taskbar-item object-contain"
        />
      )}
      <span className="truncate flex-1">{title}</span>
    </div>
  );
};
