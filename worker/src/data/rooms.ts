import { Room } from "../types";

export const PUBLIC_ROOMS: Room[] = [
  {
    id: "general",
    name: "General Chat",
    type: "group",
    participantIds: [], // Public rooms don't strictly track participants in this array
    unreadCount: 0,
  },
  {
    id: "music",
    name: "Music 🎵",
    type: "group",
    participantIds: [],
    unreadCount: 0,
  },
];
