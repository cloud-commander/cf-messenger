import clsx from "clsx";
import { useChatStore } from "../../store/useChatStore";
import { messengerService } from "../../services/messengerService";

import {
  startMenuConfig,
  type StartMenuItem,
} from "../../config/startMenuConfig";

interface MenuItemProps {
  icon?: string | undefined;
  label?: string | undefined;
  subLabel?: string | undefined;
  bold?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

export const StartMenu = () => {
  const currentUser = useChatStore((state) => state.currentUser);
  const logout = useChatStore((state) => state.logout);

  const avatarUrl = currentUser
    ? messengerService.getAvatarUrl(currentUser.avatarId)
    : "/person.png";

  const { header, leftColumn, rightColumn, footer, allPrograms } =
    startMenuConfig;

  // Helper to render menu items
  const renderMenuItem = (
    item: StartMenuItem,
    index: number,
    Component: React.ComponentType<MenuItemProps>,
  ) => {
    if (item.type === "separator") {
      return (
        <div
          key={`sep-${String(index)}`}
          className={clsx(
            "my-2 border-t mx-2",
            Component === MenuLink ? "border-gray-200" : "border-[#A8C7EA]",
          )}
        />
      );
    }
    return (
      <Component
        key={index}
        icon={item.icon}
        label={item.label}
        subLabel={item.subLabel}
        bold={item.bold}
        onClick={item.action}
      />
    );
  };

  return (
    <div
      className="absolute bottom-msn-h-taskbar left-0 w-[470px] h-[530px] bg-xp-start-left rounded-t-lg shadow-2xl flex flex-col overflow-hidden z-[10000] border-2 border-xp-start-border"
      style={{
        boxShadow:
          "4px 4px 5px rgba(0,0,0,0.5), inset 1px 1px 0 rgba(255,255,255,0.3)",
      }}
    >
      {/* Header */}
      <div className="h-[60px] bg-gradient-to-b from-xp-start-header-start to-xp-start-header-end flex items-center px-3 py-1 gap-3 border-b-2 border-xp-orange-border shadow-xp-inner">
        <div className="w-msn-avatar-taskbar h-msn-avatar-taskbar bg-white rounded border-2 border-white/50 shadow-sm overflow-hidden flex-none">
          <img
            src={avatarUrl}
            className="w-full h-full object-cover"
            alt="User"
          />
        </div>
        <span className="text-white font-bold text-shadow text-lg select-none truncate">
          {currentUser?.displayName ?? header.defaultName}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex bg-xp-start-left relative">
        {/* Left Column (White) */}
        <div className="flex-1 flex flex-col py-2 pl-2 pr-1 bg-xp-start-left">
          {leftColumn.map((item: StartMenuItem, index: number) =>
            renderMenuItem(item, index, MenuLink),
          )}

          <div className="flex-1" />

          <div className="flex items-center justify-center p-2 mb-2">
            <div className="font-bold text-[#444] text-msn-base py-2 px-6 bg-xp-start-all-programs hover:bg-xp-start-all-programs-hover cursor-pointer text-center rounded flex items-center gap-2 group shadow-sm border border-black/10">
              {allPrograms.label}{" "}
              <span className="text-green-600 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Blue) */}
        <div className="w-[225px] bg-xp-start-right border-l border-[#95BDEE] flex flex-col py-2 px-2 text-xp-start-right-text">
          {rightColumn.map((item: StartMenuItem, index: number) =>
            renderMenuItem(item, index, MenuLinkRight),
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="h-[52px] bg-gradient-to-b from-xp-start-footer-start to-xp-start-footer-end flex items-center justify-end px-4 gap-6 border-t border-xp-start-border">
        <div
          className="flex items-center gap-2 text-white hover:brightness-110 cursor-pointer px-2 py-1"
          onClick={logout}
        >
          <div className="w-msn-icon-start-footer h-msn-icon-start-footer flex items-center justify-center">
            <img
              src={footer.logOff.icon}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-msn-base font-bold whitespace-nowrap">
            {footer.logOff.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-white hover:brightness-110 cursor-pointer px-2 py-1">
          <div className="w-msn-icon-start-footer h-msn-icon-start-footer flex items-center justify-center">
            <img
              src={footer.turnOff.icon}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-msn-base font-bold whitespace-nowrap">
            {footer.turnOff.label}
          </span>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MenuLink = ({ icon, label, subLabel, bold, onClick }: MenuItemProps) => {
  return (
    <div
      className="flex items-center gap-2 p-1.5 hover:bg-[#316AC5] hover:text-white cursor-default group rounded-sm"
      onClick={onClick}
    >
      <div className="w-msn-icon-start-left h-msn-icon-start-left flex-none group-hover:brightness-110">
        {icon ? (
          <img src={icon} alt="" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-gray-400 rounded shadow-sm opacity-80" />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className={clsx(
            "text-msn-base leading-tight truncate",
            bold && "font-bold",
          )}
        >
          {label}
        </span>
        {subLabel && (
          <span className="text-msn-xs text-gray-500 group-hover:text-gray-200 truncate">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const MenuLinkRight = ({ icon, label, bold, onClick }: MenuItemProps) => (
  <div
    className="flex items-center gap-2 p-1.5 hover:bg-[#316AC5] hover:text-white cursor-default group rounded-sm"
    onClick={onClick}
  >
    <div className="w-msn-icon-start-right h-msn-icon-start-right flex-none group-hover:brightness-110">
      {icon ? (
        <img src={icon} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full bg-blue-300 rounded-sm opacity-50 group-hover:bg-white/30" />
      )}
    </div>
    <span className={clsx("text-msn-sm font-bold", bold && "font-black")}>
      {label}
    </span>
  </div>
);
