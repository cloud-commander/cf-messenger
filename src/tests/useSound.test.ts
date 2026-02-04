import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as soundModule from "../utils/sound";

vi.mock("../utils/sound");

import { useSound } from "../hooks/useSound";

describe("useSound hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an object with playSound function", () => {
    const { result } = renderHook(() => useSound());
    expect(result.current).toBeDefined();
    expect(typeof result.current.playSound).toBe("function");
  });

  it("should call playSound utility with MESSAGE type", () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playSound("MESSAGE");
    });

    expect(soundModule.playSound).toHaveBeenCalledWith("MESSAGE");
  });

  it("should call playSound utility with LOGIN type", () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playSound("LOGIN");
    });

    expect(soundModule.playSound).toHaveBeenCalledWith("LOGIN");
  });

  it("should call playSound utility with NUDGE type", () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playSound("NUDGE");
    });

    expect(soundModule.playSound).toHaveBeenCalledWith("NUDGE");
  });

  it("should call playSound utility with CALL type", () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playSound("CALL");
    });

    expect(soundModule.playSound).toHaveBeenCalledWith("CALL");
  });

  it("should maintain stable function reference across renders", () => {
    const { result, rerender } = renderHook(() => useSound());
    const firstRef = result.current.playSound;

    rerender();
    const secondRef = result.current.playSound;

    expect(firstRef).toBe(secondRef);
  });

  it("should be callable multiple times", () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playSound("MESSAGE");
      result.current.playSound("LOGIN");
      result.current.playSound("NUDGE");
      result.current.playSound("CALL");
    });

    expect(soundModule.playSound).toHaveBeenCalledTimes(4);
  });
});
