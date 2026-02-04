import { useState, useEffect, useCallback } from "react";
import { useWindowStore } from "../../store/useWindowStore";
import { useChatStore } from "../../store/useChatStore";
import type { User, PresenceStatus } from "../../types";
import { messengerService } from "../../services/messengerService";

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

import { APP_CONFIG } from "../../config/appConfig";

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [randomUsers, setRandomUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [status, setStatus] = useState<PresenceStatus>("online");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real users from backend
  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await messengerService.getContacts();
        const humans = users.filter((u) => !u.isAiBot);
        // Shuffle and take 3 for display
        const random3 = [...humans].sort(() => 0.5 - Math.random()).slice(0, 3);
        setRandomUsers(random3);
        if (random3.length > 0) {
          setSelectedUserId(random3[0].id);
        }
      } catch (err) {
        console.error("Failed to load users for login screen", err);
      } finally {
        setIsLoading(false);
      }
    }
    void loadUsers();
  }, []);

  const getAvatarUrl = (avatarId: string) => {
    return messengerService.getAvatarUrl(avatarId);
  };

  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const turnstileToken = useChatStore((state) => state.turnstileToken);
  const openWindow = useWindowStore((state) => state.openWindow);

  const [isWaitingForTurnstile, setIsWaitingForTurnstile] = useState(false);

  const handleLogin = useCallback(() => {
    const user = randomUsers.find((u) => u.id === selectedUserId);
    if (user) {
      if (!turnstileToken) {
        setIsWaitingForTurnstile(true);
        openWindow("turnstile-verification");
        return;
      }
      onLogin(user);
    }
  }, [randomUsers, selectedUserId, turnstileToken, onLogin, openWindow]);

  // Auto-login when token is received if we were waiting
  useEffect(() => {
    if (turnstileToken && isWaitingForTurnstile) {
      handleLogin();
      setIsWaitingForTurnstile(false);
    }
  }, [turnstileToken, isWaitingForTurnstile, randomUsers, selectedUserId]); // dependencies for handleLogin logic

  return (
    <div className="window w-[350px] h-auto shadow-xp-window">
      <div className="title-bar" style={{ cursor: "default" }}>
        <div className="title-bar-text">{APP_CONFIG.APP_NAME}</div>
        <div className="title-bar-controls">
          <button
            className="no-drag"
            aria-label="Minimize"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              minimizeWindow("login-screen");
            }}
          ></button>
          <button aria-label="Maximize" disabled></button>
          <button
            className="no-drag"
            aria-label="Close"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              minimizeWindow("login-screen");
            }}
          ></button>
        </div>
      </div>

      <div className="window-body flex flex-col items-center gap-4 p-4 bg-msn-bg">
        <div className="flex flex-col items-center gap-2 mb-2">
          <img
            src="/cf-messenger-logo.png"
            alt={`${APP_CONFIG.APP_NAME} Logo`}
            className="w-32 h-32 object-contain mb-2"
          />
          <p className="text-msn-lg text-gray-600">
            Select an account to sign in
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <div className="bg-white border-2 border-inset border-xp-border-blue p-2 h-[180px] overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Loading accounts...
              </div>
            ) : (
              randomUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setSelectedUserId(user.id);
                  }}
                  className={`flex items-center gap-2 p-1 cursor-pointer border ${selectedUserId === user.id ? "bg-[#316AC5] text-white border-dotted border-white" : "hover:bg-[#EFEFEF] border-transparent"}`}
                >
                  <img
                    src={getAvatarUrl(user.avatarId)}
                    className="w-8 h-8 object-cover border border-gray-400"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-msn-lg font-bold truncate">
                      {user.displayName}
                    </span>
                    <span
                      className={`text-msn-base truncate ${selectedUserId === user.id ? "text-gray-200" : "text-gray-500"}`}
                    >
                      {user.email}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="field-row-stacked">
            <label htmlFor="status">Sign in as:</label>
            <select
              id="status"
              className="w-full border-2 border-inset border-xp-border-blue px-1 py-0.5 bg-white text-msn-lg"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PresenceStatus);
              }}
            >
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
              <option value="offline">Appear Offline</option>
            </select>
          </div>
        </div>

        <div className="mt-4 mb-2">
          <button
            className="px-8 py-1 active:translate-y-[1px]"
            onClick={handleLogin}
            style={{ minWidth: "100px" }}
            disabled={!selectedUserId}
          >
            Sign In
          </button>
        </div>

        <div className="text-msn-sm text-blue-800 underline cursor-pointer hover:text-blue-600">
          Service Status
        </div>
      </div>
    </div>
  );
}
