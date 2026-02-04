export type SoundType = "LOGIN" | "MESSAGE" | "NUDGE" | "CALL";

export function playSound(type: SoundType) {
  console.log("AudioUtility: playSound", type);
}
