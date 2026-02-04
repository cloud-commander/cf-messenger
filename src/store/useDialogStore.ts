import { create } from "zustand";

export type DialogType = "alert" | "confirm" | "prompt";
export type IconType = "info" | "warning" | "error" | "question";

export interface DialogOptions {
  iconType?: IconType;
  defaultValue?: string;
  okText?: string;
  cancelText?: string;
}

export interface DialogInstance {
  id: string;
  type: DialogType;
  title: string;
  message: string;
  options: DialogOptions;
  resolve: (value: boolean | string | null | undefined) => void;
}

interface DialogState {
  dialogs: DialogInstance[];

  // High-level API returning promises
  alert: (
    title: string,
    message: string,
    options?: DialogOptions,
  ) => Promise<void>;
  confirm: (
    title: string,
    message: string,
    options?: DialogOptions,
  ) => Promise<boolean>;
  prompt: (
    title: string,
    message: string,
    options?: DialogOptions,
  ) => Promise<string | null>;

  // Store management
  closeDialog: (id: string, value: boolean | string | null | undefined) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  dialogs: [],

  alert: async (title, message, options) => {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const newDialog: DialogInstance = {
        id,
        type: "alert",
        title,
        message,
        options: options ?? {},
        resolve: resolve as (
          value: boolean | string | null | undefined,
        ) => void,
      };
      set((state) => ({ dialogs: [...state.dialogs, newDialog] }));
    });
  },

  confirm: async (title, message, options) => {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const newDialog: DialogInstance = {
        id,
        type: "confirm",
        title,
        message,
        options: options ?? {},
        resolve: resolve as (
          value: boolean | string | null | undefined,
        ) => void,
      };
      set((state) => ({ dialogs: [...state.dialogs, newDialog] }));
    });
  },

  prompt: async (title, message, options) => {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const newDialog: DialogInstance = {
        id,
        type: "prompt",
        title,
        message,
        options: options ?? {},
        resolve: resolve as (
          value: boolean | string | null | undefined,
        ) => void,
      };
      set((state) => ({ dialogs: [...state.dialogs, newDialog] }));
    });
  },

  closeDialog: (id, value) => {
    const dialog = get().dialogs.find((d) => d.id === id);
    if (dialog) {
      dialog.resolve(value);
      set((state) => ({
        dialogs: state.dialogs.filter((d) => d.id !== id),
      }));
    }
  },
}));
