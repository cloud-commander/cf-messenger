import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AdBanner } from "../components/chat/AdBanner";

// Mock configured ads
vi.mock("../config/adConfig", () => ({
  AD_CONFIG: [
    { linkUrl: "http://example.com", imageUrl: "/ad1.png", altText: "Ad 1" },
    { linkUrl: "http://example.org", imageUrl: "/ad2.png", altText: "Ad 2" },
  ],
}));

describe("AdBanner", () => {
  it("should render ad image", () => {
    render(<AdBanner />);
    expect(screen.getByAltText("Ad 1")).toBeDefined();
  });

  it("should rotate ads (mock timers)", async () => {
    vi.useFakeTimers();
    render(<AdBanner />);

    // Initial
    expect(screen.getByAltText("Ad 1")).toBeDefined();

    // Advance 10s
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    // Should show next
    expect(screen.getByAltText("Ad 2")).toBeDefined();

    vi.useRealTimers();
  });
});
