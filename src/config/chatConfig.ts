import type { Room } from "../types";

export const CHAT_CONFIG = {
  rooms: [
    {
      id: "general",
      name: "General Chat",
      type: "group",
      participantIds: ["user_1", "user_2", "user_3"],
      unreadCount: 0,
    },
    {
      id: "nostalgia",
      name: "Nostalgia",
      type: "group",
      participantIds: ["user_1", "user_2"],
      unreadCount: 5,
    },
  ] as Room[],
};
