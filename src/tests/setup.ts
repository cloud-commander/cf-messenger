import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Standard cleanup for each test
// Mock Audio for XP aesthetic sounds
(globalThis as any).Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
}));

afterEach(() => {
  cleanup();
});
