import { describe, it, expect } from "vitest";
import { getDmRoomId } from "../utils/chat";

describe("chat utils", () => {
  it("should generate consistent DM room IDs", () => {
    const id1 = getDmRoomId("userA", "userB");
    const id2 = getDmRoomId("userB", "userA");
    expect(id1).toBe(id2);
    expect(id1).toContain("dm_");
    expect(id1).toContain("userA");
    expect(id1).toContain("userB");
  });
});
