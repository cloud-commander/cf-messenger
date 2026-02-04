import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatWindow } from "../components/chat/ChatWindow";
import { useChatStore } from "../store/useChatStore";

// Mutable Mock State
let mockChatState = {
  currentUser: { id: "me", displayName: "Me" },
  openChatIds: ["room1"],
  rooms: [
    {
      id: "room1",
      name: "Alice",
      type: "dm",
      participants: ["u1"],
      messages: [],
    },
  ],
  contacts: [
    { id: "u1", displayName: "Alice", status: "online", avatarId: "001" },
  ],
  messages: {
    room1: [
      {
        id: "m1",
        roomId: "room1",
        content: "Hello",
        senderId: "u1",
        sentAt: 1,
        type: "chat",
        displayName: "Alice",
      },
      {
        id: "m2",
        roomId: "room1",
        content: "Hi",
        senderId: "me",
        sentAt: 2,
        type: "chat",
        displayName: "Me",
      },
      {
        id: "m3",
        roomId: "room1",
        content: "",
        senderId: "u1",
        sentAt: 3,
        type: "nudge",
        displayName: "Alice",
        isNudge: true,
      },
    ],
  },
  roomParticipants: {},
  typingStatus: {},
  sendMessage: vi.fn(),
  closeChat: vi.fn(),
  setStatus: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

// Mock store
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: any) => selector(mockChatState),
}));

// Mock sound
vi.mock("../../hooks/useSound", () => ({
  useSound: () => ({ playSound: vi.fn() }),
}));

// Mock utils
vi.mock("../../utils/chat", () => ({
  getChatName: vi.fn().mockReturnValue("Alice"),
  getChatAvatar: vi.fn().mockReturnValue("/avatar.png"),
}));

vi.mock("../../services/messengerService", () => ({
  messengerService: {
    getAvatarUrl: vi.fn().mockReturnValue("/avatar.png"),
  },
}));

vi.mock("../../config/assets", () => ({
  getAssetUrl: (p) => p,
}));

describe("ChatWindow", () => {
  beforeEach(() => {
    // Reset valid state
    mockChatState = {
      currentUser: { id: "me", displayName: "Me" },
      openChatIds: ["room1"],
      rooms: [
        {
          id: "room1",
          name: "Alice",
          type: "dm",
          participants: ["u1"],
          messages: [],
        },
      ],
      contacts: [
        { id: "u1", displayName: "Alice", status: "online", avatarId: "001" },
      ],
      messages: {
        room1: [
          {
            id: "m1",
            roomId: "room1",
            content: "Hello",
            senderId: "u1",
            sentAt: 1,
            type: "chat",
            displayName: "Alice",
          },
          {
            id: "m2",
            roomId: "room1",
            content: "Hi",
            senderId: "me",
            sentAt: 2,
            type: "chat",
            displayName: "Me",
          },
          {
            id: "m3",
            roomId: "room1",
            content: "",
            senderId: "u1",
            sentAt: 3,
            type: "nudge",
            displayName: "Alice",
            isNudge: true,
          },
        ],
      },
      roomParticipants: {},
      typingStatus: {},
      sendMessage: vi.fn(),
      closeChat: vi.fn(),
      setStatus: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    } as any;
  });

  it("should render chat UI", () => {
    render(<ChatWindow windowId="room1" onClose={vi.fn()} />);
    expect(screen.getByText("Conversation with Alice")).toBeDefined();
    expect(screen.getByText("Send")).toBeDefined();
    expect(screen.getByText("Hello")).toBeDefined(); // Message from Alice
    expect(screen.getByText("Hi")).toBeDefined(); // Message from Me
  });

  it("should send message on click", async () => {
    render(<ChatWindow windowId="room1" onClose={vi.fn()} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Msg" } });

    const sendBtn = screen.getByText("Send");
    fireEvent.click(sendBtn);

    expect(mockChatState.sendMessage).toHaveBeenCalledWith("room1", "New Msg");
  });

  it("should toggle emoticon picker", () => {
    render(<ChatWindow windowId="room1" onClose={vi.fn()} />);
    const btn = screen.getByLabelText("Select Emoticon");
    fireEvent.click(btn);
    expect(screen.getByTitle(":)")).toBeDefined();
  });
});
