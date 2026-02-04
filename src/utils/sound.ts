export type SoundType = "LOGIN" | "MESSAGE" | "NUDGE" | "CALL";

const SOUND_FILES: Record<SoundType, string> = {
  LOGIN: "/sounds/contact_online.mp3",
  MESSAGE: "/sounds/new_message.mp3",
  NUDGE: "/sounds/nudge.mp3",
  CALL: "/sounds/video_call.mp3",
};

// Cache Audio objects to avoid reloading
const audioCache: Record<string, HTMLAudioElement | undefined> = {};

export function playSound(type: SoundType) {
  const path = SOUND_FILES[type];
  if (!path) {
    console.warn(`[Audio] No sound file for type: ${type}`);
    return;
  }

  try {
    let audio = audioCache[path];
    if (!audio) {
      audio = new Audio(path);
      audioCache[path] = audio;
    } else {
      audio.currentTime = 0; // Reset to start
    }

    // Play and handle potential autoplay errors
    audio.play().catch((error: unknown) => {
      console.warn(`[Audio] Playback failed for ${type}:`, error);
    });
  } catch (err: unknown) {
    console.error(`[Audio] Error initializing sound ${type}:`, err);
  }
}
