import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("normalizeEmail trims leading and trailing whitespace", () => {
    expect(normalizeEmail("  User@Example.com  ")).toBe("user@example.com");
  });

  it("normalizeEmail lowercases ascii email letters", () => {
    expect(normalizeEmail("User.Name+News@Example.COM")).toBe(
      "user.name+news@example.com",
    );
  });
});

describe("isValidEmail", () => {
  it("isValidEmail accepts a simple valid address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("isValidEmail rejects malformed addresses", () => {
    for (const email of ["", "not-an-email", "user@", "@example.com", "user @example.com"]) {
      expect(isValidEmail(email)).toBe(false);
    }
  });
});
