import { describe, it, expect } from "vitest";
import { normalizeSignupEmail, signupReturnedExistingIdentity } from "./signupIdentity";
describe("same-email signup protection", () => {
  it("treats email casing and surrounding spaces as the same email", () => {
    expect(normalizeSignupEmail(" Member@Example.com ")).toBe("member@example.com");
  });
  it("does not treat an obscured existing account response as a new signup", () => {
    expect(signupReturnedExistingIdentity({ identities: [] })).toBe(true);
    expect(signupReturnedExistingIdentity({ identities: [{}] })).toBe(false);
  });
});