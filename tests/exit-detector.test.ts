import { describe, it, expect } from "vitest";
import { ExitDetector } from "../src/core/exit-detector.js";

describe("ExitDetector", () => {
  const detector = new ExitDetector();

  it("detects COMPLETE with exit signal", () => {
    const response = `Some work done here.
---RW_STATUS---
STATUS: COMPLETE
EXIT_SIGNAL: true
SUMMARY: Fixed the camera FOV conversion
---END_RW_STATUS---`;

    const status = detector.analyze(response);
    expect(status.status).toBe("COMPLETE");
    expect(status.exitSignal).toBe(true);
    expect(status.summary).toBe("Fixed the camera FOV conversion");
    expect(detector.shouldExit(status)).toBe(true);
  });

  it("detects BLOCKED status", () => {
    const response = `---RW_STATUS---
STATUS: BLOCKED
EXIT_SIGNAL: false
SUMMARY: Cannot find the required module
---END_RW_STATUS---`;

    const status = detector.analyze(response);
    expect(status.status).toBe("BLOCKED");
    expect(status.error).toBe("Cannot find the required module");
    expect(detector.shouldExit(status)).toBe(true);
  });

  it("returns IN_PROGRESS when no status block", () => {
    const status = detector.analyze("Just some random output");
    expect(status.status).toBe("IN_PROGRESS");
    expect(status.exitSignal).toBe(false);
    expect(detector.shouldExit(status)).toBe(false);
  });
});
