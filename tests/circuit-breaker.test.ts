import { describe, it, expect } from "vitest";
import { CircuitBreaker } from "../src/core/circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("opens after 3 loops with no progress", () => {
    const cb = new CircuitBreaker();
    expect(cb.isOpen()).toBe(false);

    cb.record({ hasChanges: false });
    cb.record({ hasChanges: false });
    expect(cb.isOpen()).toBe(false);

    cb.record({ hasChanges: false });
    expect(cb.isOpen()).toBe(true);
  });

  it("resets progress count on changes", () => {
    const cb = new CircuitBreaker();
    cb.record({ hasChanges: false });
    cb.record({ hasChanges: false });
    cb.record({ hasChanges: true }); // reset
    cb.record({ hasChanges: false });
    cb.record({ hasChanges: false });
    expect(cb.isOpen()).toBe(false);
  });

  it("opens after 5 same errors", () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 4; i++) {
      cb.record({ hasChanges: true, error: "same error" });
    }
    expect(cb.isOpen()).toBe(false);

    cb.record({ hasChanges: true, error: "same error" });
    expect(cb.isOpen()).toBe(true);
  });

  it("resets on different error", () => {
    const cb = new CircuitBreaker();
    cb.record({ hasChanges: true, error: "error A" });
    cb.record({ hasChanges: true, error: "error A" });
    cb.record({ hasChanges: true, error: "error B" }); // reset
    cb.record({ hasChanges: true, error: "error B" });
    cb.record({ hasChanges: true, error: "error B" });
    cb.record({ hasChanges: true, error: "error B" });
    expect(cb.isOpen()).toBe(false);
  });
});
