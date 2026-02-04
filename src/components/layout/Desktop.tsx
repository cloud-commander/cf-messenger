import { useChatStore } from "../../store/useChatStore";
import { useWindowStore } from "../../store/useWindowStore";
import { DesktopIcon } from "./DesktopIcon";

import { APP_CONFIG } from "../../config/appConfig";

export function Desktop() {
  const currentUser = useChatStore((state) => state.currentUser);

  const openWindow = useWindowStore((state) => state.openWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  const minimizedWindows = useWindowStore((state) => state.minimizedWindows);

  // Helper handling the specific logic for launching Messenger
  const handleLaunchMessenger = () => {
    // If user is not logged in, we want to show the 'login-screen'
    // If user IS logged in, we want to show the 'contact-list'
    const targetWindowId = !currentUser ? "login-screen" : "contact-list";

    // Logic: if it's already "open" (in our logical list or active), just focus it
    // But Login/ContactList are special: they are always "active" in the session sense
    // but maybe minimized.

    // Check if it's minimized
    if (minimizedWindows.includes(targetWindowId)) {
      restoreWindow(targetWindowId);
    } else {
      // If not minimized, ensure it's active/focused
      // Also ensure it is in 'openWindows' (though Login/Contact might be implicit)
      // I'll add to openWindows to be safe/consistent
      openWindow(targetWindowId);
    }
  };

  const handleLaunchIE = () => {
    openWindow("internet-explorer");
  };

  return (
    <div
      className="absolute inset-0 top-0 left-0 w-full h-full bg-cover bg-center"
      style={{ backgroundImage: "url(/msn-background.png)" }}
    >
      {/* Icons Container */}
      <div className="flex flex-col gap-2 p-4">
        <DesktopIcon
          label={APP_CONFIG.APP_NAME}
          iconPath="/cf-messenger-logo.png"
          onDoubleClick={handleLaunchMessenger}
        />
        <DesktopIcon
          label="Internet Explorer"
          iconPath="/icons/ie/iexplorer.png"
          onDoubleClick={handleLaunchIE}
        />
      </div>
    </div>
  );
}
