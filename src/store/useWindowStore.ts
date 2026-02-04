import { create } from "zustand";

interface WindowState {
  activeWindowId: string | null;
  openWindows: string[]; // IDs of open "system" windows (like IE)
  minimizedWindows: string[];
  maximizedWindows: string[];
  // Chat windows are managed by separate store for now, but we could unify.
  // userStore manages login state which implies "Login Window" vs "Contact List".
  // So this is mainly for Apps like IE.

  // Actions
  setActiveWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  toggleWindow: (id: string) => void;
  isWindowMinimized: (id: string) => boolean;
  isWindowMaximized: (id: string) => boolean;
  openWindow: (id: string) => void;
  closeWindow: (id: string) => void;
}

export const useWindowStore = create<WindowState>((set, get) => ({
  activeWindowId: "login-screen",
  minimizedWindows: [],
  maximizedWindows: [],
  openWindows: ["login-screen"],

  setActiveWindow: (id) => {
    set({ activeWindowId: id });
  },

  minimizeWindow: (id) => {
    set((state) => {
      if (!state.minimizedWindows.includes(id)) {
        return { minimizedWindows: [...state.minimizedWindows, id] };
      }
      return state;
    });
  },

  restoreWindow: (id) => {
    set((state) => ({
      minimizedWindows: state.minimizedWindows.filter((wId) => wId !== id),
      // Also bring to front when restoring
      activeWindowId: id,
    }));
  },

  toggleMaximize: (id) => {
    set((state) => {
      const isMaximized = state.maximizedWindows.includes(id);
      return {
        maximizedWindows: isMaximized
          ? state.maximizedWindows.filter((wId) => wId !== id)
          : [...state.maximizedWindows, id],
      };
    });
  },

  toggleWindow: (id) => {
    const {
      minimizedWindows,
      restoreWindow,
      minimizeWindow,
      activeWindowId,
      setActiveWindow,
    } = get();
    if (minimizedWindows.includes(id)) {
      restoreWindow(id);
    } else if (activeWindowId === id) {
      minimizeWindow(id);
    } else {
      setActiveWindow(id);
    }
  },

  isWindowMinimized: (id) => get().minimizedWindows.includes(id),

  isWindowMaximized: (id) => get().maximizedWindows.includes(id),

  openWindow: (id) => {
    set((state) => {
      if (!state.openWindows.includes(id)) {
        return {
          openWindows: [...state.openWindows, id],
          activeWindowId: id,
          minimizedWindows: state.minimizedWindows.filter((w) => w !== id), // Ensure not minimized
        };
      }
      // If already open, just focus
      return {
        activeWindowId: id,
        minimizedWindows: state.minimizedWindows.filter((w) => w !== id),
      };
    });
  },

  closeWindow: (id) => {
    set((state) => ({
      minimizedWindows: state.minimizedWindows.filter((wId) => wId !== id),
      maximizedWindows: state.maximizedWindows.filter((wId) => wId !== id),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
      openWindows: state.openWindows.filter((wId) => wId !== id),
    }));
  },
}));
