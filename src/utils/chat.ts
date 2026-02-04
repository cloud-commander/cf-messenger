export function getDmRoomId(userId1: string, userId2: string): string {
  // Sort IDs to ensure consistency regardless of who initiates
  const sorted = [userId1, userId2].sort();
  return `dm_${sorted[0]}__${sorted[1]}`;
}
