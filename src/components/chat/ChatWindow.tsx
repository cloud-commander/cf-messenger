import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useLayoutEffect,
  useCallback,
} from "react";
import { useSound } from "../../hooks/useSound";
import type { User } from "../../types";
import { useChatStore } from "../../store/useChatStore";
import { useWindowStore } from "../../store/useWindowStore";
import { messengerService } from "../../services/messengerService";
import { getAssetUrl } from "../../config/assets";
import { useIsMobile } from "../../hooks/useIsMobile";

const EMOTICON_MAP: Record<string, string> = {
  ":)": "regular_smile.gif",
  ":-)": "regular_smile.gif",
  ":(": "sad_smile.gif",
  ":-(": "sad_smile.gif",
  ";)": "wink_smile.gif",
  ";-)": "wink_smile.gif",
  ":P": "tongue_smile.gif",
  ":-P": "tongue_smile.gif",
  ":O": "omg_smile.gif",
  ":-O": "omg_smile.gif",
  "(H)": "shades_smile.gif",
  "(h)": "shades_smile.gif",
  "(6)": "devil_smile.gif",
  "(A)": "angel_smile.gif",
  "(a)": "angel_smile.gif",
  "(L)": "heart.gif",
  "(l)": "heart.gif",
  "(U)": "broken_heart.gif",
  "(u)": "broken_heart.gif",
};

const PRIMARY_EMOTICON_ENTRIES: [string, string][] = (() => {
  const used = new Set<string>();
  return Object.entries(EMOTICON_MAP).filter(([, file]) => {
    if (used.has(file)) return false;
    used.add(file);
    return true;
  });
})();

interface ChatWindowProps {
  onClose: () => void;
  windowId: string;
}

export function ChatWindow({ onClose, windowId }: ChatWindowProps) {
  // Store Hooks
  const currentUser = useChatStore((state) => state.currentUser);
  const messagesMap = useChatStore((state) => state.messages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const contacts = useChatStore((state) => state.contacts);
  const rooms = useChatStore((state) => state.rooms);
  const roomParticipantsMap = useChatStore((state) => state.roomParticipants);
  const typingStatusMap = useChatStore((state) => state.typingStatus);

  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const toggleMaximize = useWindowStore((state) => state.toggleMaximize);
  const isWindowMaximized = useWindowStore((state) => state.isWindowMaximized);

  // Derived state
  const roomId = windowId; // WindowID is the chat/room ID

  const isMaximized = isWindowMaximized(windowId);
  const messages = useMemo(
    () => (roomId ? (messagesMap[roomId] ?? []) : []),
    [roomId, messagesMap],
  );

  // Sound Hook
  const { playSound } = useSound();

  // Local UI State
  const [inputText, setInputText] = useState("");
  const [isNudging, setIsNudging] = useState(false);
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const emoticonButtonRef = useRef<HTMLButtonElement>(null);
  const windowRef = useRef<HTMLDivElement>(null); // New Ref for Window Root
  const pickerRef = useRef<HTMLDivElement>(null); // Ref for Picker to measure width

  // Picker Position State
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

  const EMOTICON_PICKER_COLUMNS = 5;
  const EMOTICON_PICKER_CELL = 27;
  const EMOTICON_PICKER_PADDING = 4;
  const EMOTICON_PICKER_BORDER = 2; // 1px per side from tailwind border
  const EMOTICON_PICKER_WIDTH =
    EMOTICON_PICKER_COLUMNS * EMOTICON_PICKER_CELL +
    EMOTICON_PICKER_PADDING * 2 +
    EMOTICON_PICKER_BORDER;
  const EMOTICON_PICKER_ROW_COUNT = Math.ceil(
    PRIMARY_EMOTICON_ENTRIES.length / EMOTICON_PICKER_COLUMNS,
  );
  const EMOTICON_PICKER_HEIGHT =
    EMOTICON_PICKER_ROW_COUNT * EMOTICON_PICKER_CELL +
    EMOTICON_PICKER_PADDING * 2 +
    EMOTICON_PICKER_BORDER;

  const updatePickerPosition = useCallback(() => {
    if (
      !emoticonButtonRef.current ||
      !windowRef.current ||
      !pickerRef.current
    ) {
      return;
    }

    const btnRect = emoticonButtonRef.current.getBoundingClientRect();
    const winRect = windowRef.current.getBoundingClientRect();

    const PADDING = 8;
    const GAP = 6;

    const minLeft = PADDING;
    const maxLeft = Math.max(
      winRect.width - EMOTICON_PICKER_WIDTH - PADDING,
      PADDING,
    );
    const leftRelative =
      btnRect.left -
      winRect.left +
      btnRect.width / 2 -
      EMOTICON_PICKER_WIDTH / 2;
    const left = Math.min(Math.max(leftRelative, minLeft), maxLeft);

    const minTop = PADDING;
    const aboveTop = btnRect.top - EMOTICON_PICKER_HEIGHT - GAP - winRect.top;
    const belowTop = btnRect.bottom + GAP - winRect.top;
    const topCandidate = aboveTop >= minTop ? aboveTop : belowTop;
    const maxTop = Math.max(
      winRect.height - EMOTICON_PICKER_HEIGHT - PADDING,
      minTop,
    );
    const top = Math.min(topCandidate, maxTop);

    setPickerPos({
      top,
      left,
    });
  }, [setPickerPos, EMOTICON_PICKER_HEIGHT, EMOTICON_PICKER_WIDTH]);

  // Update layout when picker opens
  useLayoutEffect(() => {
    if (!showEmoticonPicker) return;
    updatePickerPosition();
  }, [showEmoticonPicker, updatePickerPosition]);

  useEffect(() => {
    if (!showEmoticonPicker) return undefined;
    const handleResize = () => {
      updatePickerPosition();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [showEmoticonPicker, updatePickerPosition]);

  useEffect(() => {
    if (!showEmoticonPicker) return undefined;
    const handleScroll = () => {
      updatePickerPosition();
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showEmoticonPicker, updatePickerPosition]);

  // Handle outside click to close
  useEffect(() => {
    if (!showEmoticonPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      // If clicking outside the button AND not inside a potential picker (though picker stops prop), close it.
      // We rely on stopPropagation on the picker itself.
      // But we need to check if we clicked on the button.
      if (
        emoticonButtonRef.current &&
        !emoticonButtonRef.current.contains(e.target as Node) &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
        // If click was inside picker, strict mode might have bubbled it if we didn't stop prop.
      ) {
        setShowEmoticonPicker(false);
      }
    };
    // Capture phase might be better but bubble is fine if we stopProp on picker
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showEmoticonPicker]);

  // Play Sound on new message
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.isNudge) {
        playSound("NUDGE");
      } else {
        playSound("MESSAGE");
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, playSound]);

  // Identify Target (Contact or Room)
  const targetContact = useMemo(() => {
    if (windowId.startsWith("dm_")) {
      const parts = windowId.replace("dm_", "").split("__");
      if (
        parts.length < 2 &&
        windowId.includes("_") &&
        !windowId.includes("__")
      ) {
        const legacyParts = windowId.replace("dm_", "").split("_");
        if (legacyParts.length > 1) {
          const legacyContactId = legacyParts.find(
            (id) => id !== currentUser?.id,
          );
          return contacts.find((c) => c.id === legacyContactId);
        }
      }
      const contactId = parts.find((id) => id !== currentUser?.id);
      const targetId = contactId ?? parts[0];
      return contacts.find((c) => c.id === targetId);
    }
    return null;
  }, [windowId, contacts, currentUser]);

  const targetRoom = useMemo(() => {
    if (!windowId.startsWith("dm_")) {
      return rooms.find((r) => r.id === windowId);
    }
    return null;
  }, [windowId, rooms]);

  const targetName = useMemo(() => {
    if (targetContact) return targetContact.displayName;
    if (targetRoom) return targetRoom.name;
    return "Chat";
  }, [targetContact, targetRoom]);

  const targetAvatarUrl = useMemo(() => {
    if (targetContact)
      return messengerService.getAvatarUrl(targetContact.avatarId);
    return "/msn-group.png";
  }, [targetContact]);

  const myAvatarUrl = useMemo(
    () =>
      currentUser
        ? messengerService.getAvatarUrl(currentUser.avatarId)
        : "/person.png",
    [currentUser],
  );

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Derived Participants for Group Chat
  const roomParticipants = useMemo<User[]>(() => {
    const list = roomParticipantsMap[windowId] || [];
    if (list.length > 0) return list;

    if (!targetRoom?.participantIds) return [];

    return targetRoom.participantIds.map((pid) => {
      if (currentUser?.id === pid) return currentUser;

      const contact = contacts.find((c) => c.id === pid);
      if (contact) return contact;

      return {
        id: pid,
        displayName: "Unknown",
        status: "offline",
        email: "",
        avatarId: "default",
        isAiBot: false,
      } as User;
    });
  }, [roomParticipantsMap, windowId, targetRoom, contacts, currentUser]);

  // Render Logic
  const renderContent = (content: string) => {
    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      const emoticonFile = EMOTICON_MAP[part];
      if (emoticonFile) {
        return (
          <img
            key={i}
            src={getAssetUrl(`/emoticons/${emoticonFile}`)}
            className="w-4 h-4 inline-block"
            alt={part}
          />
        );
      }
      return part;
    });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await sendMessage(windowId, inputText); // Pass windowId
    setInputText("");
    setShowEmoticonPicker(false);
  };

  const handleNudge = () => {
    setIsNudging(true);
    playSound("NUDGE");
    setTimeout(() => {
      setIsNudging(false);
    }, 500);
  };

  const getSenderName = (senderId: string, fallbackName?: string) => {
    if (!currentUser) return fallbackName ?? "Unknown";
    if (senderId === currentUser.id) return currentUser.displayName;

    // Check contacts
    const contact = contacts.find((c) => c.id === senderId);
    if (contact) return contact.displayName;

    return fallbackName ?? "Unknown";
  };

  const handleEmoticonSelect = (code: string) => {
    setInputText((prev) => prev + code + " ");
    setShowEmoticonPicker(false);
  };

  // Mobile Check
  const isMobile = useIsMobile();

  if (!currentUser || !roomId) return null;

  return (
    <div
      ref={windowRef}
      className={`window relative w-full h-full flex flex-col shadow-xp-window ${isNudging ? "nudge-shake" : ""}`}
    >
      <div className="title-bar flex-none">
        <div className="title-bar-text flex items-center gap-1">
          {targetName} - Conversation
        </div>
        <div className="title-bar-controls">
          <button
            className="no-drag"
            aria-label="Minimize"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              minimizeWindow(windowId);
            }}
          />
          <button
            className="no-drag"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              toggleMaximize(windowId);
            }}
          />
          <button
            className="no-drag"
            aria-label="Close"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={onClose}
          />
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col p-0 overflow-hidden bg-xp-window-bg min-h-0">
        {/* Menu Bar */}
        <nav className="text-msn-sm text-black px-2 py-1 bg-xp-menu-bg border-b border-gray-200">
          <ul className="flex gap-3 list-none p-0 m-0">
            <li className="cursor-pointer hover:bg-[#316AC5] hover:text-white px-1">
              File
            </li>
            <li className="cursor-pointer hover:bg-[#316AC5] hover:text-white px-1">
              Edit
            </li>
            <li className="cursor-pointer hover:bg-[#316AC5] hover:text-white px-1">
              Actions
            </li>
            <li className="cursor-pointer hover:bg-[#316AC5] hover:text-white px-1">
              Tools
            </li>
            <li className="cursor-pointer hover:bg-[#316AC5] hover:text-white px-1">
              Help
            </li>
          </ul>
        </nav>

        {/* To: Bar */}
        <div className="bg-white border-b border-xp-border-silver px-4 py-3 flex items-center gap-2 text-base shadow-sm z-10 relative">
          <span className="text-gray-500 text-msn-sm">To:</span>
          <span className="font-bold text-[#444] text-msn-base">
            {targetName}
          </span>
          {targetContact && (
            <span className="text-gray-400 text-msn-sm">
              &lt;{targetContact.email}&gt;
            </span>
          )}
        </div>

        {/* Main Split View */}
        <div
          className={`flex flex-1 min-h-0 bg-[#EFF3F7] ${isMobile ? "p-1 gap-1" : "p-3 gap-3"}`}
        >
          {/* LEFT: Chat History & Input */}
          <div className="flex flex-1 flex-col gap-3 min-h-0">
            {/* History */}
            <div
              ref={scrollRef}
              className="flex-1 bg-white border border-xp-border-blue p-4 overflow-y-auto font-sans text-msn-lg shadow-inner leading-normal min-h-0"
            >
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-500 border-b border-gray-200 pb-1 mb-2">
                  Conversation with {targetName}
                </div>
                {/* Personal message at top */}
                {targetContact?.personalMessage && (
                  <div className="text-sm text-gray-400 italic mb-3">
                    {targetContact.personalMessage}
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className="flex flex-col mb-1">
                    {m.isNudge ? (
                      <div className="font-bold italic text-gray-500 text-xs my-2">
                        ---{" "}
                        {m.senderId === currentUser.id
                          ? "You have"
                          : getSenderName(m.senderId, m.displayName) +
                            " has"}{" "}
                        just sent a nudge. ---
                      </div>
                    ) : m.type === "system" ? (
                      <div className="text-xs text-blue-500 italic my-1">
                        * {m.content}
                      </div>
                    ) : m.type === "chat" ? (
                      <>
                        <div
                          className="font-bold text-msn-base mb-1"
                          style={{
                            color:
                              m.senderId === currentUser.id
                                ? "var(--color-chat-sender-me)"
                                : "var(--color-chat-sender-them)",
                          }}
                        >
                          {getSenderName(m.senderId, m.displayName)} says:
                        </div>
                        <div
                          className="text-msn-lg ml-1 flex flex-wrap items-center gap-x-1"
                          style={{
                            color:
                              m.senderId === currentUser.id
                                ? "var(--color-chat-text-me)"
                                : "var(--color-chat-text-them)",
                          }}
                        >
                          {m.content && renderContent(m.content)}
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Typing Indicator */}
              {(() => {
                const roomTyping = typingStatusMap[windowId] ?? {};
                const typingUsers = Object.values(roomTyping).filter(Boolean);
                if (typingUsers.length === 0) return null;

                return (
                  <div className="px-4 py-1 text-xs text-gray-500 italic font-sans animate-pulse">
                    {typingUsers.join(", ")}{" "}
                    {typingUsers.length === 1 ? "is" : "are"} typing...
                  </div>
                );
              })()}
            </div>

            {/* Input Area */}
            <div
              className={`flex flex-col bg-white border border-[#8E9EBB] rounded-sm shadow-sm relative z-10 ${isMobile ? "h-32" : "h-40"}`}
            >
              {/* Formatting Bar */}
              <div className="h-12 flex items-center pl-1 pr-2 gap-1 border-b border-xp-border-silver bg-gradient-to-b from-xp-menu-bg to-xp-border-silver relative">
                <button
                  ref={emoticonButtonRef}
                  type="button"
                  className="btn-reset-accessible p-0 cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label="Select Emoticon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmoticonPicker(!showEmoticonPicker);
                  }}
                >
                  <img
                    src={getAssetUrl("/emoticon.png")}
                    className="w-[26px] h-[26px]"
                    alt=""
                  />
                </button>
                <button
                  type="button"
                  className="btn-reset-accessible p-0 cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label="Send Nudge"
                  onClick={() => {
                    handleNudge();
                  }}
                >
                  <img
                    src={getAssetUrl("/nudge.png")}
                    className="w-[26px] h-[26px]"
                    alt=""
                  />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                className="flex-1 w-full resize-none border-none outline-none p-3 font-sans leading-relaxed text-msn-lg"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />

              {/* Send Button */}
              <div className="absolute bottom-2 right-2">
                <button
                  className="px-6 py-1.5 text-sm font-bold bg-white border rounded shadow-md active:shadow-inner active:translate-y-px transition-all hover:bg-[#F0F0F0]"
                  style={{
                    borderColor: "#A0A0A0",
                    fontFamily: "Tahoma, sans-serif",
                  }}
                  onClick={() => {
                    void handleSend();
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div
            className={`${isMobile ? "w-[80px]" : "w-msn-w-sidebar"} flex flex-col justify-between py-1`}
          >
            {targetRoom ? (
              // PARTICIPANT LIST
              <div className="flex flex-col h-full bg-white border border-xp-border-blue ml-1">
                <div className="bg-msn-light-blue px-2 py-1 text-msn-sm text-gray-600 border-b border-xp-border-silver text-center font-sans">
                  Participants
                </div>
                <div className="flex-1 overflow-y-auto p-1 font-sans text-xs">
                  {roomParticipants.map((u) => (
                    <div key={u.id} className="flex items-center gap-1 mb-1">
                      <img
                        src="/person.png"
                        className="w-3 h-3 opacity-70"
                        alt="p"
                      />
                      <span
                        className="truncate text-[#444]"
                        title={u.displayName}
                      >
                        {u.displayName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // AVATARS
              <>
                <div
                  className={`${isMobile ? "w-[70px] h-[70px]" : "w-msn-w-avatar h-msn-w-avatar"} bg-white border border-xp-border-blue p-1 shadow-sm relative cursor-pointer`}
                  title="View Profile"
                >
                  <img
                    src={targetAvatarUrl}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>

                <div
                  className={`${isMobile ? "w-[70px] h-[70px]" : "w-msn-w-avatar h-msn-w-avatar"} bg-white border border-xp-border-blue p-1 shadow-sm relative cursor-pointer mt-auto`}
                  title="My Display Picture"
                >
                  <img
                    src={myAvatarUrl}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HOISTED EMOJI PICKER */}
      {showEmoticonPicker && (
        <div
          className="absolute z-50"
          style={{
            top: pickerPos.top,
            left: pickerPos.left,
          }}
          onClick={(e) => e.stopPropagation()}
          ref={pickerRef}
        >
          <div
            className="bg-white border border-gray-400 shadow-lg"
            style={{
              width: `${String(EMOTICON_PICKER_WIDTH)}px`,
              display: "grid",
              gridTemplateColumns: "repeat(5, 27px)",
              gap: "0px",
              padding: `${String(EMOTICON_PICKER_PADDING)}px`,
            }}
          >
            {PRIMARY_EMOTICON_ENTRIES.map(([code, file]) => (
              <button
                key={code}
                type="button"
                className="btn-reset-accessible cursor-pointer hover:bg-gray-100 flex items-center justify-center transition-colors"
                style={{ width: "27px", height: "27px" }}
                onClick={() => {
                  handleEmoticonSelect(code);
                }}
                title={code}
                aria-label={`Insert emoticon ${code}`}
              >
                <img
                  src={getAssetUrl(`/emoticons/${file}`)}
                  className="w-5 h-5"
                  alt=""
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
