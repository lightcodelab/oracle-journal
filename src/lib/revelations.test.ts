import { describe, it, expect } from "vitest";
import { isRevelationCard } from "../../supabase/functions/revelations-reading/rules";
describe("Revelations card restriction", () => {
  it("accepts only the drawn Sacred Rewrite card", () => {
    expect(isRevelationCard({ id: "drawn", deck_id: "85dddf8a-cd5e-4cdd-8ccc-af034052e484" }, "drawn")).toBe(true);
    expect(isRevelationCard({ id: "drawn", deck_id: "other-deck" }, "drawn")).toBe(false);
    expect(isRevelationCard({ id: "another", deck_id: "85dddf8a-cd5e-4cdd-8ccc-af034052e484" }, "drawn")).toBe(false);
  });
});