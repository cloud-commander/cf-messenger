import { useState, useMemo, useEffect } from "react";
import { useSound } from "../../hooks/useSound";
import { useChatStore } from "../../store/useChatStore";
import { useWindowStore } from "../../store/useWindowStore";
import { messengerService } from "../../services/messengerService";
import type { PresenceStatus, User } from "../../types";
import { AdBanner } from "./AdBanner";
import { getDmRoomId } from "../../utils/chat";

interface ContactListProps {
  onLogout: () => void;
}

// Helper for UI grouping logic (Pure view logic)
const useContactGroups = (contacts: User[], currentUserId?: string) => {
  return useMemo(() => {
    // Filter out current user from all lists
    const otherContacts = currentUserId
      ? contacts.filter((c) => c.id !== currentUserId)
      : contacts;

    return {
      aiBots: otherContacts.filter((c) => c.isAiBot),
      onlineHumans: otherContacts.filter(
        (c) => !c.isAiBot && c.status !== "offline",
      ),
      offlineHumans: otherContacts.filter(
        (c) => !c.isAiBot && c.status === "offline",
      ),
    };
  }, [contacts, currentUserId]);
};

import { APP_CONFIG } from "../../config/appConfig";

export function ContactList({ onLogout }: ContactListProps) {
  const { playSound } = useSound();
  const currentUser = useChatStore((state) => state.currentUser);

  useEffect(() => {
    playSound("LOGIN");
  }, [playSound]);

  const fetchContacts = useChatStore((state) => state.fetchContacts);
  const contacts = useChatStore((state) => state.contacts);
  const rooms = useChatStore((state) => state.rooms);

  useEffect(() => {
    if (currentUser && rooms.length === 0) {
      void fetchContacts(true);
    }
  }, [currentUser, rooms.length, fetchContacts]);
  const openChat = useChatStore((state) => state.openChat);
  const setStatus = useChatStore((state) => state.setStatus);
  const isLoading = useChatStore((state) => state.isLoading);
  const error = useChatStore((state) => state.error);

  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const toggleMaximize = useWindowStore((state) => state.toggleMaximize);
  const isWindowMaximized = useWindowStore((state) => state.isWindowMaximized);
  const setActiveWindow = useWindowStore((state) => state.setActiveWindow); // Added

  const isMaximized = isWindowMaximized("contact-list");

  // Helper to open chat and bring to front
  const handleOpenChat = (chatId: string) => {
    openChat(chatId);
    setActiveWindow(chatId);
  };

  // Grouping Logic
  const { aiBots, onlineHumans, offlineHumans } = useContactGroups(
    contacts,
    currentUser?.id,
  );

  // UI State
  const [isOnlineExpanded, setIsOnlineExpanded] = useState(true);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(true); // Default to true for debugging
  const [isAiExpanded, setIsAiExpanded] = useState(true);
  const [isRoomsExpanded, setIsRoomsExpanded] = useState(true);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  // Personal Message State
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [tempMessage, setTempMessage] = useState(
    currentUser?.personalMessage ?? "",
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentUser?.displayName ?? "");

  const handleNameSubmit = () => {
    if (tempName.trim() !== "" && currentUser) {
      if (tempName !== currentUser.displayName) {
        setStatus(currentUser.status, tempName);
      }
    }
    setIsEditingName(false);
  };

  if (!currentUser) return null;

  const handleStatusChange = (status: PresenceStatus) => {
    setStatus(status);
    setIsStatusMenuOpen(false);
  };

  const handleMessageSubmit = () => {
    // Ideally update via store/service
    setIsEditingMessage(false);
  };

  const statusColors = {
    online: "text-green-600",
    busy: "text-red-600",
    away: "text-yellow-600",
    offline: "text-gray-600",
  };

  const myAvatarUrl = messengerService.getAvatarUrl(currentUser.avatarId);

  return (
    <div className="window w-full h-full flex flex-col shadow-xp-window">
      <div className="title-bar flex-none" style={{ cursor: "default" }}>
        <div className="title-bar-text flex items-center gap-1">
          <img src="/cf-messenger-logo.png" className="w-3.5 h-3.5" alt="" />
          {APP_CONFIG.APP_NAME}
        </div>
        <div className="title-bar-controls">
          <button
            className="no-drag"
            aria-label="Minimize"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              minimizeWindow("contact-list");
            }}
          ></button>
          <button
            className="no-drag"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              toggleMaximize("contact-list");
            }}
          ></button>
          <button
            className="no-drag"
            aria-label="Close"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={onLogout}
          ></button>
        </div>
      </div>

      <div className="window-body flex-1 flex flex-col m-1 p-0 overflow-hidden bg-white border border-xp-border-silver">
        {/* Header Area */}
        <div className="bg-msn-light-blue p-3 flex gap-3 border-b border-xp-border-silver">
          <img
            src={myAvatarUrl}
            alt="My Avatar"
            className="w-16 h-16 object-cover border border-gray-400 bg-white"
          />
          <div className="flex flex-col flex-1 min-w-0 relative">
            <div className="flex items-center gap-1">
              {isEditingName ? (
                <input
                  autoFocus
                  type="text"
                  className="font-bold text-msn-base text-[#444] border border-gray-400 px-1 py-0 w-full outline-none"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameSubmit();
                  }}
                />
              ) : (
                <span
                  className="font-bold text-[#444] truncate cursor-pointer hover:bg-black/5 px-1 rounded border border-transparent hover:border-gray-300"
                  title="Click to change your Display Name"
                  onClick={() => {
                    setTempName(currentUser.displayName);
                    setIsEditingName(true);
                  }}
                >
                  {currentUser.displayName}
                </span>
              )}
              <div className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-0.5 cursor-pointer hover:bg-black/5 px-1 rounded transition-colors"
                  onClick={() => {
                    setIsStatusMenuOpen(!isStatusMenuOpen);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsStatusMenuOpen(!isStatusMenuOpen);
                    }
                  }}
                  aria-label={`Change status (currently ${currentUser.status})`}
                  aria-haspopup="true"
                  aria-expanded={isStatusMenuOpen}
                >
                  <span
                    className={`text-msn-base ${statusColors[currentUser.status]}`}
                  >
                    ({currentUser.status})
                  </span>
                  <span
                    className="text-msn-micro text-blue-800"
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </div>

                {isStatusMenuOpen && (
                  <ul className="absolute top-full left-0 mt-1 w-40 bg-white border border-[#0054E3] shadow-[2px_2px_5px_rgba(0,0,0,0.2)] z-50 py-0 flex flex-col list-none p-0 m-0 select-none">
                    <li className="bg-[#E3EFFF] py-1 px-2 text-xs font-bold text-[#0054E3] border-b border-[#A0C4E3]">
                      My Status
                    </li>
                    {(
                      ["online", "busy", "away", "offline"] as PresenceStatus[]
                    ).map((s) => {
                      const isSelected = currentUser.status === s;
                      const statusColorDots = {
                        online: "bg-green-600 border-green-700",
                        busy: "bg-red-600 border-red-700",
                        away: "bg-yellow-400 border-yellow-600",
                        offline: "bg-gray-400 border-gray-600",
                      };

                      const labels = {
                        online: "Online",
                        busy: "Busy",
                        away: "Away",
                        offline: "Appear Offline",
                      };

                      return (
                        <li key={s}>
                          <button
                            type="button"
                            className={`btn-reset-accessible w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 transition-colors hover:bg-[#316AC5] hover:text-white text-black cursor-pointer group`}
                            onClick={() => {
                              handleStatusChange(s);
                            }}
                          >
                            <div className="w-4 flex justify-center">
                              {isSelected && (
                                <span className="font-bold">✓</span>
                              )}
                            </div>
                            <span
                              className={`w-3 h-3 rounded-full flex-shrink-0 border shadow-sm ${statusColorDots[s]} group-hover:border-white`}
                            ></span>
                            <span className="capitalize">{labels[s]}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {isEditingMessage ? (
                <input
                  autoFocus
                  type="text"
                  className="text-msn-base border border-gray-400 px-1 py-0 w-full outline-none"
                  value={tempMessage}
                  onChange={(e) => {
                    setTempMessage(e.target.value);
                  }}
                  onBlur={handleMessageSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleMessageSubmit();
                    }
                  }}
                />
              ) : (
                <p
                  className="text-msn-base text-gray-500 italic truncate cursor-pointer hover:bg-black/5 px-1 rounded"
                  onClick={() => {
                    setTempMessage(currentUser.personalMessage ?? "");
                    setIsEditingMessage(true);
                  }}
                >
                  {currentUser.personalMessage ?? "Type a personal message..."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto bg-white p-2">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-1 mb-2 text-xs">
              Error: {error}
            </div>
          )}
          {isLoading && contacts.length === 0 && (
            <div className="text-gray-500 text-xs text-center p-2">
              Loading contacts...
            </div>
          )}

          {/* AI Assistants Group */}
          <div className="mb-2">
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center gap-1 cursor-pointer select-none group px-2 py-1"
              onClick={() => {
                setIsAiExpanded(!isAiExpanded);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsAiExpanded(!isAiExpanded);
                }
              }}
              aria-expanded={isAiExpanded}
            >
              <span
                className="text-msn-xs text-gray-500 w-3 text-center"
                aria-hidden="true"
              >
                {isAiExpanded ? "▼" : "▶"}
              </span>
              <span className="font-bold text-msn-base text-[#003399] group-hover:underline">
                AI Personalities ({aiBots.length})
              </span>
            </div>

            {isAiExpanded && (
              <div className="ml-4 mt-1 flex flex-col gap-1">
                {aiBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex items-center gap-2 px-1 py-0.5 hover:bg-[#EBF3FA] cursor-pointer"
                    onClick={() => {
                      if (currentUser) {
                        handleOpenChat(getDmRoomId(currentUser.id, bot.id));
                      }
                    }}
                  >
                    <img
                      src={messengerService.getAvatarUrl(bot.avatarId)}
                      alt={bot.displayName}
                      className="w-4 h-4 object-cover"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-msn-lg truncate select-none">
                        {bot.displayName}
                      </span>
                      {bot.personalMessage && (
                        <span className="text-msn-sm text-gray-400 truncate -mt-0.5">
                          {bot.personalMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Rooms Group */}
          <div className="mb-2">
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center gap-1 cursor-pointer select-none group px-2 py-1"
              onClick={() => {
                setIsRoomsExpanded(!isRoomsExpanded);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsRoomsExpanded(!isRoomsExpanded);
                }
              }}
              aria-expanded={isRoomsExpanded}
            >
              <span
                className="text-msn-xs text-gray-500 w-3 text-center"
                aria-hidden="true"
              >
                {isRoomsExpanded ? "▼" : "▶"}
              </span>
              <span className="font-bold text-msn-base text-[#003399] group-hover:underline">
                Chat Rooms ({rooms.filter((r) => r.type === "group").length})
              </span>
            </div>

            {isRoomsExpanded && (
              <div className="ml-4 mt-1 flex flex-col gap-1">
                {rooms
                  .filter((r) => r.type === "group")
                  .map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-2 px-1 py-0.5 hover:bg-[#EBF3FA] cursor-pointer"
                      onClick={() => {
                        handleOpenChat(room.id);
                      }}
                    >
                      <img
                        src="/group-plus.png"
                        className="w-3.5 h-3.5"
                        alt=""
                      />
                      <span className="text-msn-lg truncate select-none">
                        {room.name}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Online Humans Group */}
          <div className="mb-2">
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center gap-1 cursor-pointer select-none group px-2 py-1"
              onClick={() => {
                setIsOnlineExpanded(!isOnlineExpanded);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsOnlineExpanded(!isOnlineExpanded);
                }
              }}
              aria-expanded={isOnlineExpanded}
            >
              <span
                className="text-msn-xs text-gray-500 w-3 text-center"
                aria-hidden="true"
              >
                {isOnlineExpanded ? "▼" : "▶"}
              </span>
              <span className="font-bold text-msn-base text-[#003399] group-hover:underline">
                Online ({onlineHumans.length})
              </span>
            </div>

            {isOnlineExpanded && (
              <div className="ml-4 mt-1 flex flex-col gap-1">
                {onlineHumans.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 p-1 hover:bg-[#EFEFEF] cursor-pointer"
                    onDoubleClick={() => {
                      if (currentUser) {
                        handleOpenChat(getDmRoomId(currentUser.id, contact.id));
                      }
                    }}
                  >
                    <img
                      src={messengerService.getAvatarUrl(contact.avatarId)}
                      alt={contact.displayName}
                      className={`w-4 h-4 object-cover ${contact.status === "busy" ? "opacity-50" : ""}`}
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-msn-lg truncate select-none">
                        {contact.displayName}
                      </span>
                      {contact.personalMessage && (
                        <span className="text-msn-sm text-gray-400 truncate -mt-0.5">
                          {contact.personalMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offline Humans Group */}
          <div>
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center gap-1 cursor-pointer select-none group px-2 py-1"
              onClick={() => {
                setIsOfflineExpanded(!isOfflineExpanded);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsOfflineExpanded(!isOfflineExpanded);
                }
              }}
              aria-expanded={isOfflineExpanded}
            >
              <span
                className="text-msn-xs text-gray-500 w-3 text-center"
                aria-hidden="true"
              >
                {isOfflineExpanded ? "▼" : "▶"}
              </span>
              <span className="font-bold text-msn-base text-[#003399] group-hover:underline">
                Offline ({offlineHumans.length})
              </span>
            </div>

            {isOfflineExpanded && (
              <div className="ml-4 mt-1 flex flex-col gap-1">
                {offlineHumans.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 px-1 py-0.5 hover:bg-[#EBF3FA] cursor-pointer opacity-60"
                    onClick={() => {
                      if (currentUser) {
                        handleOpenChat(getDmRoomId(currentUser.id, contact.id));
                      }
                    }}
                  >
                    <img
                      src={messengerService.getAvatarUrl(contact.avatarId)}
                      alt={contact.displayName}
                      className="w-4 h-4 object-cover grayscale"
                    />
                    <span className="text-msn-lg truncate select-none">
                      {contact.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Advertisement */}
        <div className="bg-msn-bg p-1 border-t border-xp-border-silver flex-none">
          <AdBanner />
        </div>
      </div>
    </div>
  );
}
