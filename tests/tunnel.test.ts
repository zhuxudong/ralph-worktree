import { describe, it, expect } from "vitest";
import { createAuthCheck } from "../src/server/tunnel.js";

describe("createAuthCheck", () => {
  it("should accept valid credentials", () => {
    const check = createAuthCheck("secret123");
    const header =
      "Basic " + Buffer.from("rw:secret123").toString("base64");
    expect(check(header)).toBe(true);
  });

  it("should reject wrong password", () => {
    const check = createAuthCheck("secret123");
    const header =
      "Basic " + Buffer.from("rw:wrong").toString("base64");
    expect(check(header)).toBe(false);
  });

  it("should reject missing header", () => {
    const check = createAuthCheck("secret123");
    expect(check(undefined)).toBe(false);
  });

  it("should reject wrong username", () => {
    const check = createAuthCheck("secret123");
    const header =
      "Basic " + Buffer.from("admin:secret123").toString("base64");
    expect(check(header)).toBe(false);
  });
});
