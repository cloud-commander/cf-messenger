import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock setup must be before imports - use factory functions
vi.mock("../services/messengerService", () => ({
  __esModule: true,
  messengerService: {
    login: vi.fn(),
    connectGlobalPresence: vi.fn(),
    getContacts: vi.fn(),
    getRooms: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    setPresence: vi.fn(),
    sendAck: vi.fn(),
    onContactsUpdated: vi.fn(),
    onCurrentUserUpdated: vi.fn(),
    onMessageReceived: vi.fn(),
  },
}));

vi.mock("../utils/sound", () => ({
  playSound: vi.fn(),
}));

import { act } from "@testing-library/react";
import { useChatStore } from "../store/useChatStore";
import type { Message, User } from "../types";
import { messengerService } from "../services/messengerService";
import { playSound } from "../utils/sound";

const messengerServiceMock = messengerService as any;
const playSoundMock = playSound as any;

const currentUser: User = {
  id: "user_me",
  email: "me@test.com",
  displayName: "Me",
  avatarId: "av_1",
  status: "online",
  isAiBot: false,
};

const otherUser: User = {
  id: "user_other",
  email: "other@test.com",
  displayName: "Other",
  avatarId: "av_2",
  status: "online",
  isAiBot: false,
};

const resetStoreState = () => {
  useChatStore.setState({
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
    _messageBuffer: [],
    _typingBuffer: {},
    _batchTimer: null,
    _typingTimeouts: {},
  });
  useChatStore.getState().resetInternalState();
};

const captureMessageListener = () => {
  let listener: ((roomId: string, message: Message) => void) | undefined;
  messengerServiceMock.onMessageReceived.mockImplementation((cb) => {
    listener = cb;
  });
  useChatStore.getState().initializeListeners();
  if (!listener) {
    throw new Error("Message listener was not registered");
  }
  return listener;
};

describe("useChatStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messengerServiceMock.login.mockResolvedValue(currentUser);
    messengerServiceMock.getContacts.mockResolvedValue([]);
    messengerServiceMock.getRooms.mockResolvedValue([]);
    messengerServiceMock.getMessages.mockResolvedValue([]);
    messengerServiceMock.sendMessage.mockResolvedValue({
      id: "sent_mock",
      roomId: "room_1",
      senderId: currentUser.id,
      displayName: currentUser.displayName,
      content: "Hello",
      timestamp: Date.now(),
      isNudge: false,
      isWink: false,
      type: "chat",
    } as Message);
    messengerServiceMock.setPresence.mockResolvedValue(undefined);
    resetStoreState();
  });

  afterEach(() => {
    useChatStore.getState().resetInternalState();
    vi.useRealTimers();
  });

  it("registers the message listener only once", () => {
    useChatStore.getState().initializeListeners();
    useChatStore.getState().initializeListeners();

    expect(messengerServiceMock.onMessageReceived).toHaveBeenCalledTimes(1);
    expect(useChatStore.getState()._listenersInitialized).toBe(true);
  });

  it("opens and notifies on incoming messages from others", () => {
    useChatStore.setState({
      currentUser,
      contacts: [currentUser],
    });

    const messageCallback = captureMessageListener();

    const incoming: Message = {
      id: "msg_1",
      roomId: "room_1",
      senderId: otherUser.id,
      displayName: otherUser.displayName,
      content: "Hello",
      timestamp: 123,
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    act(() => {
      messageCallback("room_1", incoming);
    });

    const state = useChatStore.getState();
    expect(state.openChatIds).toContain("room_1");
    expect(playSoundMock).toHaveBeenCalledWith("MESSAGE");
    expect(state.messages["room_1"]).toHaveLength(1);
  });

  it("skips sound/open for messages the user sends", () => {
    useChatStore.setState({
      currentUser,
      contacts: [currentUser],
    });

    const messageCallback = captureMessageListener();

    const selfMsg: Message = {
      id: "msg_self",
      roomId: "room_1",
      senderId: currentUser.id,
      displayName: currentUser.displayName,
      content: "Self",
      timestamp: 200,
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    act(() => {
      messageCallback("room_1", selfMsg);
    });

    const state = useChatStore.getState();
    expect(state.openChatIds).not.toContain("room_1");
    expect(playSoundMock).not.toHaveBeenCalled();
    expect(state.messages["room_1"]).toHaveLength(1);
  });

  it("deduplicates messages by id", () => {
    useChatStore.setState({
      currentUser,
      contacts: [currentUser],
    });

    const messageCallback = captureMessageListener();

    const duplicated: Message = {
      id: "msg_dup",
      roomId: "room_1",
      senderId: otherUser.id,
      displayName: otherUser.displayName,
      content: "Repeat",
      timestamp: 300,
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    act(() => {
      messageCallback("room_1", duplicated);
      messageCallback("room_1", duplicated);
    });

    const state = useChatStore.getState();
    expect(state.messages["room_1"]).toHaveLength(1);
  });

  it("clears typing indicators after the timeout", () => {
    vi.useFakeTimers();
    useChatStore.setState({ currentUser });

    const messageCallback = captureMessageListener();

    const typingMessage: Message = {
      id: "typing_1",
      roomId: "room_1",
      senderId: otherUser.id,
      displayName: otherUser.displayName,
      content: "",
      timestamp: 400,
      isNudge: false,
      isWink: false,
      type: "typing",
      isTyping: true,
    };

    act(() => {
      messageCallback("room_1", typingMessage);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    let state = useChatStore.getState();
    expect(state.typingStatus["room_1"]?.[otherUser.id]).toBe("Other");

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    state = useChatStore.getState();
    expect(state.typingStatus["room_1"]?.[otherUser.id]).toBeNull();
  });

  it("keeps room messages sorted by timestamp", () => {
    useChatStore.setState({
      currentUser,
      contacts: [currentUser],
    });

    const messageCallback = captureMessageListener();

    const later: Message = {
      id: "m2",
      roomId: "room_sort",
      senderId: otherUser.id,
      displayName: otherUser.displayName,
      content: "Later",
      timestamp: 200,
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    const earlier: Message = {
      id: "m1",
      roomId: "room_sort",
      senderId: otherUser.id,
      displayName: otherUser.displayName,
      content: "Earlier",
      timestamp: 100,
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    const oldest: Message = {
      id: "m0",
      roomId: "room_sort",
      senderId: otherUser.id,
      displayName: otherUser.displayName,
      content: "Old",
      timestamp: 50,
      isNudge: false,
      isWink: false,
      type: "chat",
    };

    act(() => {
      messageCallback("room_sort", later);
      messageCallback("room_sort", oldest);
      messageCallback("room_sort", earlier);
    });

    const messages = useChatStore.getState().messages["room_sort"];
    expect(messages?.map((msg) => msg.id)).toEqual(["m0", "m1", "m2"]);
  });

  it("shows an error when sendMessage rejects", async () => {
    useChatStore.setState({ currentUser });
    messengerServiceMock.sendMessage.mockRejectedValueOnce(new Error("Failed"));

    await useChatStore.getState().sendMessage("room_1", "fail");

    const state = useChatStore.getState();
    expect(state.error).toBe("Failed to send message");
    expect(state.messages["room_1"]).toBeUndefined();
  });
});
