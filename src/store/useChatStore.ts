import { create } from "zustand";
import type { User, Message, Room, PresenceStatus } from "../types";
import { messengerService } from "../services/messengerService";
import { playSound } from "../utils/sound";

interface ChatState {
  currentUser: User | null;
  contacts: User[];
  rooms: Room[];
  openChatIds: string[];
  messages: Record<string, Message[]>;
  roomParticipants: Record<string, User[]>;
  typingStatus: Record<string, Record<string, string | null>>;
  isLoading: boolean;
  error: string | null;
  turnstileToken: string | null;
  _listenersInitialized: boolean;

  // Internal Batching State
  _messageBuffer: { roomId: string; message: Message }[];
  _typingBuffer: Record<string, Record<string, string | null>>;
  _batchTimer: number | null;
  _typingTimeouts: Record<string, Record<string, number>>;

  // Actions
  login: (user: User) => Promise<void>;
  logout: () => void;
  fetchContacts: (silent?: boolean) => Promise<void>;
  openChat: (chatId: string) => void;
  closeChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  setStatus: (status: PresenceStatus, displayName?: string) => void;
  initializeChat: (roomId: string) => Promise<void>;
  setTurnstileToken: (token: string | null) => void;
  initializeListeners: () => void;
  resetInternalState: () => void;
  _flushUpdates: () => void;
  _scheduleFlush: () => void;
  _scheduleTypingTimeout: (roomId: string, userId: string) => void;
}

const FLUSH_INTERVAL = 20;

export const useChatStore = create<ChatState>((set, get) => ({
  currentUser: null,
  contacts: [],
  rooms: [],
  openChatIds: [],
  messages: {},
  roomParticipants: {},
  typingStatus: {},
  isLoading: false,
  error: null,
  turnstileToken: null,
  _listenersInitialized: false,

  // Internal
  _messageBuffer: [],
  _typingBuffer: {},
  _batchTimer: null,
  _typingTimeouts: {},

  _scheduleFlush: () => {
    if (get()._batchTimer) return;

    const timer = setTimeout(() => {
      set({ _batchTimer: null });
      get()._flushUpdates();
    }, FLUSH_INTERVAL) as unknown as number;

    set({ _batchTimer: timer });
  },

  _flushUpdates: () => {
    const { _messageBuffer, _typingBuffer, messages, typingStatus } = get();
    console.warn(
      "DEBUG: _flushUpdates buffer size:",
      Object.keys(_typingBuffer).length,
    );

    if (_messageBuffer.length === 0 && Object.keys(_typingBuffer).length === 0)
      return;

    const nextMessages = { ...messages };
    const nextTyping = { ...typingStatus };
    let hasChanges = false;

    // Apply Typing Updates
    for (const [roomId, updates] of Object.entries(_typingBuffer)) {
      nextTyping[roomId] = {
        ...nextTyping[roomId],
        ...updates,
      };
      hasChanges = true;
    }

    // Apply Messages
    for (const { roomId, message } of _messageBuffer) {
      const existing = nextMessages[roomId] || [];
      if (!existing.find((m) => m.id === message.id)) {
        const sorted = [...existing, message].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        );
        // POC FIX: Prevent memory leak by capping history at 500 messages
        if (sorted.length > 500) {
          nextMessages[roomId] = sorted.slice(-500);
        } else {
          nextMessages[roomId] = sorted;
        }
        hasChanges = true;
      }
    }

    if (hasChanges) {
      set({
        messages: nextMessages,
        typingStatus: nextTyping,
        _messageBuffer: [],
        _typingBuffer: {},
      });
    } else {
      set({ _messageBuffer: [], _typingBuffer: {} });
    }
  },

  _scheduleTypingTimeout: (roomId: string, userId: string) => {
    const { _typingTimeouts } = get();
    const roomTimeouts = { ..._typingTimeouts[roomId] };

    if (roomTimeouts[userId]) {
      clearTimeout(roomTimeouts[userId]);
    }

    roomTimeouts[userId] = setTimeout(() => {
      set((state) => ({
        _typingBuffer: {
          ...state._typingBuffer,
          [roomId]: {
            ...state._typingBuffer[roomId],
            [userId]: null,
          },
        },
      }));
      get()._scheduleFlush();
    }, 6000) as unknown as number;

    set((state) => ({
      _typingTimeouts: {
        ...state._typingTimeouts,
        [roomId]: roomTimeouts,
      },
    }));
  },

  login: async (user) => {
    try {
      const { turnstileToken } = get();
      if (!turnstileToken) throw new Error("Missing Turnstile Token");
      await messengerService.login(user.id, turnstileToken);
      messengerService.connectGlobalPresence();
      set({ currentUser: user });
      get().initializeListeners();
      await get().fetchContacts(true);
    } catch (err) {
      console.error("Login failed", err);
    }
  },

  logout: () => {
    set({ currentUser: null, openChatIds: [], _listenersInitialized: false });
  },

  fetchContacts: async (silent = false) => {
    get().initializeListeners();
    if (!silent) set({ isLoading: true });
    try {
      const [contacts, rooms] = await Promise.all([
        messengerService.getContacts(),
        messengerService.getRooms(),
      ]);
      set({ contacts, rooms, isLoading: false });
    } catch {
      set({ error: "Failed to fetch contacts", isLoading: false });
    }
  },

  initializeListeners: () => {
    if (get()._listenersInitialized) return;

    messengerService.onContactsUpdated((updatedContacts) => {
      const { contacts, currentUser } = get();
      if (currentUser && contacts.length > 0) {
        updatedContacts.forEach((newContact) => {
          const oldContact = contacts.find((c) => c.id === newContact.id);
          if (
            oldContact?.status === "offline" &&
            newContact.status !== "offline"
          ) {
            playSound("LOGIN");
          }
        });
      }
      set({ contacts: updatedContacts });
    });

    messengerService.onCurrentUserUpdated((updatedUser) => {
      set({ currentUser: updatedUser });
    });

    messengerService.onMessageReceived((roomId, message) => {
      if (message.type === "typing") {
        const { senderId, isTyping, displayName } = message;
        if (senderId) {
          set((state) => ({
            _typingBuffer: {
              ...state._typingBuffer,
              [roomId]: {
                ...state._typingBuffer[roomId],
                [senderId]: isTyping ? (displayName ?? "Someone") : null,
              },
            },
          }));
          if (isTyping) get()._scheduleTypingTimeout(roomId, senderId);
          get()._scheduleFlush();
        }
        return;
      }

      if (message.type === "participants" && message.participants) {
        const { participants } = message;
        set((state) => {
          const updatedContacts = state.contacts.map((c) => {
            const match = participants.find((p) => p.id === c.id);
            return match && match.displayName !== c.displayName
              ? { ...c, displayName: match.displayName }
              : c;
          });
          return {
            contacts: updatedContacts,
            roomParticipants: {
              ...state.roomParticipants,
              [roomId]: participants,
            },
          };
        });
        return;
      }

      if (message.type === "delivery_status") {
        const { ackId, status } = message;
        if (ackId && status) {
          set((state) => {
            const currentMessages = state.messages[roomId] || [];
            const updated = currentMessages.map((m) =>
              m.id === ackId ? { ...m, status } : m,
            );
            return {
              messages: { ...state.messages, [roomId]: updated },
            };
          });
        }
        return;
      }

      if (
        message.type !== "chat" &&
        message.type !== "system" &&
        message.type !== "nudge"
      )
        return;

      set((state) => {
        const currentMessages = state.messages[roomId] || [];
        if (currentMessages.find((m) => m.id === message.id)) return state;

        // Auto-Ack for messages from others
        if (
          message.type === "chat" &&
          message.senderId !== state.currentUser?.id
        ) {
          messengerService.sendAck(roomId, message.id, "delivered");
        }

        const newMessages = [...currentMessages, message].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        );
        return {
          messages: { ...state.messages, [roomId]: newMessages },
        };
      });

      // Clear typing
      set((state) => ({
        _typingBuffer: {
          ...state._typingBuffer,
          [roomId]: {
            ...state._typingBuffer[roomId],
            [message.senderId as string]: null,
          },
        },
      }));
      get()._scheduleFlush();

      const { currentUser, openChatIds, openChat } = get();
      if (currentUser && message.senderId !== currentUser.id) {
        playSound("MESSAGE");
        if (!openChatIds.includes(roomId)) openChat(roomId);
      }
    });

    set({ _listenersInitialized: true });
  },

  resetInternalState: () => {
    const { _batchTimer, _typingTimeouts } = get();
    if (_batchTimer) clearTimeout(_batchTimer);
    Object.values(_typingTimeouts).forEach((room) => {
      Object.values(room).forEach((timeout) => {
        clearTimeout(timeout);
      });
    });
    set({
      _messageBuffer: [],
      _typingBuffer: {},
      _batchTimer: null,
      _typingTimeouts: {},
    });
  },

  openChat: (chatId) => {
    const { openChatIds, currentUser, messages } = get();

    // Send Read Acks for messages from others in this room that aren't read yet
    const roomMsgs = messages[chatId] || [];
    roomMsgs.forEach((m) => {
      if (
        m.type === "chat" &&
        m.senderId !== currentUser?.id &&
        m.status !== "read"
      ) {
        messengerService.sendAck(chatId, m.id, "read");
      }
    });

    if (openChatIds.includes(chatId)) return;
    const newOpenIds = [...openChatIds];
    if (newOpenIds.length >= 3) newOpenIds.shift();
    newOpenIds.push(chatId);
    set({ openChatIds: newOpenIds });
    void get().initializeChat(chatId);
  },

  closeChat: (chatId) => {
    set((state) => ({
      openChatIds: state.openChatIds.filter((id) => id !== chatId),
    }));
  },

  initializeChat: async (roomId) => {
    try {
      const history = await messengerService.getMessages(roomId);
      set((state) => {
        const current = state.messages[roomId] || [];
        // Use a map for deduplication by ID
        const mergedMap = new Map<string, Message>();
        [...current, ...history].forEach((m) => {
          if (m.id) {
            mergedMap.set(m.id, m);
          }
        });

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        );

        return {
          messages: { ...state.messages, [roomId]: merged },
        };
      });
    } catch (err) {
      console.error(err);
    }
  },

  sendMessage: async (chatId, content) => {
    const { currentUser } = get();
    if (!currentUser) return;
    try {
      const newMsg = await messengerService.sendMessage(
        chatId,
        content,
        currentUser.id,
      );
      set((state) => {
        const current = state.messages[chatId] ?? [];
        return {
          messages: {
            ...state.messages,
            [chatId]: [...current, newMsg].sort(
              (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
            ),
          },
        };
      });
    } catch (err) {
      console.error("Failed to send message", err);
      set({ error: "Failed to send message" });
    }
  },

  setStatus: (status, displayName) => {
    const { currentUser } = get();
    if (!currentUser) return;
    void messengerService.setPresence(currentUser.id, status, displayName);
    set({
      currentUser: {
        ...currentUser,
        status,
        displayName: displayName ?? currentUser.displayName,
      },
    });
  },

  setTurnstileToken: (token) => {
    set({ turnstileToken: token });
  },
}));
