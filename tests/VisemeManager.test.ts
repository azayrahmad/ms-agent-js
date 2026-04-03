import { describe, it, expect, vi, beforeEach } from "vitest";
import { VisemeManager } from "../src/core/behavior/VisemeManager";

describe("VisemeManager", () => {
  let visemeManager: VisemeManager;

  beforeEach(() => {
    visemeManager = new VisemeManager();
  });

  it("should convert a word to visemes correctly", () => {
    const visemes = visemeManager.getVisemesForWord("hello");
    // h -> REST, e -> EE, ll -> DD, o -> OH
    expect(visemes).toEqual(["REST", "EE", "DD", "OH"]);
  });

  it("should handle digraphs correctly", () => {
    const visemes = visemeManager.getVisemesForWord("ship");
    // sh -> OO, i -> EE, p -> PP
    expect(visemes).toEqual(["OO", "EE", "PP"]);
  });

  it("should map viseme to mouth type correctly", () => {
    expect(visemeManager.mapVisemeToMouthType("AA")).toBe("OpenWide4");
    expect(visemeManager.mapVisemeToMouthType("PP")).toBe("Closed");
    expect(visemeManager.mapVisemeToMouthType("UNKNOWN")).toBe("Closed");
  });

  it("should schedule a timeline and trigger callbacks", async () => {
    vi.useFakeTimers();
    const visemes = ["AA", "EE"];
    const onViseme = vi.fn();

    visemeManager.scheduleTimeline(visemes, 1, onViseme);

    vi.advanceTimersByTime(0);
    expect(onViseme).toHaveBeenCalledWith("OpenWide4"); // Immediate (0ms)

    await vi.advanceTimersByTimeAsync(78);
    expect(onViseme).toHaveBeenCalledWith("OpenWide3");

    vi.useRealTimers();
  });

  it("should stop active timers", async () => {
    vi.useFakeTimers();
    const onViseme = vi.fn();
    visemeManager.scheduleTimeline(["AA", "EE"], 1, onViseme);

    vi.advanceTimersByTime(0);
    expect(onViseme).toHaveBeenCalledTimes(1); // First call (immediate)

    visemeManager.stop();

    await vi.advanceTimersByTimeAsync(200);
    expect(onViseme).toHaveBeenCalledTimes(1); // Still 1

    vi.useRealTimers();
  });
});
