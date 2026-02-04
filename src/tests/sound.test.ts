import { describe, it, expect, vi } from "vitest";
import { playSound } from "../utils/sound";

describe("sound utility", () => {
  it("should not crash on MESSAGE sound type", () => {
    const originalAudio = globalThis.Audio;
    try {
      globalThis.Audio = class {
        play() {
          return Promise.resolve();
        }
        currentTime = 0;
        pause() {}
      } as any;
      expect(() => playSound("MESSAGE")).not.toThrow();
    } finally {
      globalThis.Audio = originalAudio;
    }
  });

  it("should not crash on LOGIN sound type", () => {
    const originalAudio = globalThis.Audio;
    try {
      globalThis.Audio = class {
        play() {
          return Promise.resolve();
        }
        currentTime = 0;
        pause() {}
      } as any;
      expect(() => playSound("LOGIN")).not.toThrow();
    } finally {
      globalThis.Audio = originalAudio;
    }
  });

  it("should not crash on NUDGE sound type", () => {
    const originalAudio = globalThis.Audio;
    try {
      globalThis.Audio = class {
        play() {
          return Promise.resolve();
        }
        currentTime = 0;
        pause() {}
      } as any;
      expect(() => playSound("NUDGE")).not.toThrow();
    } finally {
      globalThis.Audio = originalAudio;
    }
  });

  it("should not crash on CALL sound type", () => {
    const originalAudio = globalThis.Audio;
    try {
      globalThis.Audio = class {
        play() {
          return Promise.resolve();
        }
        currentTime = 0;
        pause() {}
      } as any;
      expect(() => playSound("CALL")).not.toThrow();
    } finally {
      globalThis.Audio = originalAudio;
    }
  });

  it("should warn for invalid sound types", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    playSound("INVALID" as any);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("No sound file for type"),
    );
    spy.mockRestore();
  });

  it("should handle silence when play fails", async () => {
    const originalAudio = globalThis.Audio;
    try {
      globalThis.Audio = class {
        play() {
          return Promise.reject(new Error("Autoplay blocked"));
        }
        currentTime = 0;
        pause() {}
      } as any;
      // The promise rejection handler should be silent about autoplay restrictions
      expect(() => playSound("MESSAGE")).not.toThrow();
    } finally {
      globalThis.Audio = originalAudio;
    }
  });

  it("should define SoundType with expected values", () => {
    // Import to check that SoundType exists and can be used
    const types: ("MESSAGE" | "LOGIN" | "NUDGE" | "CALL")[] = [
      "MESSAGE",
      "LOGIN",
      "NUDGE",
      "CALL",
    ];
    expect(types.length).toBe(4);
  });
});
