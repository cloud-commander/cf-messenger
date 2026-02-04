import { useCallback } from "react";
import { playSound as playSoundUtil } from "../utils/sound";
import type { SoundType } from "../utils/sound";

export function useSound() {
  const playSound = useCallback((type: SoundType) => {
    playSoundUtil(type);
  }, []);

  return { playSound };
}
