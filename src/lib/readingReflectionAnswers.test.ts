import { describe, expect, it } from "vitest";
import { reflectionAnswersChanged } from "./readingReflectionAnswers";
import { REVELATIONS_PHASE_FIELDS } from "./revelationsJournal";

describe("Sacred Spreads reflection answers", () => {
  it("allows saving a Phase 2 reflection even when no other answers change", () => {
    expect(reflectionAnswersChanged({ regulation_experience: "Before: tight chest. After: more settled." }, {})).toBe(true);
    expect(reflectionAnswersChanged({ regulation_experience: "Before: tight chest. After: more settled." }, { regulation_experience: "Before: tight chest. After: more settled." })).toBe(false);
  });
  it("allows saving the extra protection prediction in Phase 3", () => {
    expect(reflectionAnswersChanged({ protection_prediction: "If I share my work, people will reject it." }, {})).toBe(true);
  });
  it("uses the same Reveal, Regulate and Investigate answer keys as Revelations", () => {
    expect(Object.values(REVELATIONS_PHASE_FIELDS).flat().map(field => field.key)).toEqual(["pattern_location", "regulation_experience", "old_evidence", "protection_prediction", "new_evidence", "todays_choice", "returned_evidence"]);
  });
  it("does not mark older saved answers dirty just because new fields are empty", () => {
    expect(reflectionAnswersChanged({ old_evidence: "An earlier experience", regulation_experience: "", protection_prediction: "" }, { old_evidence: "An earlier experience" })).toBe(false);
  });
});