export type SoundType = "LOGIN" | "MESSAGE" | "NUDGE" | "CALL";

export function playSound(type: SoundType) {
  console.log("Mock playSound called:", type);
}
