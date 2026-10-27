import { describe, expect, it } from "vitest";
import { revelationAnswers, REVELATIONS_PHASE_FIELDS, REVELATIONS_PROFILE_LINKS } from "./revelationsJournal";

describe("Saved Revelations", () => {
  it("keeps the limited profile menu to profile, account and saved Revelations", () => {
    expect(REVELATIONS_PROFILE_LINKS.map(item => item.route)).toEqual(["/profile", "/account", "/revelations/saved"]);
  });
  it("places the reveal answer in Phase 1", () => {
    expect(REVELATIONS_PHASE_FIELDS.reveal.map(field => field.key)).toEqual(["pattern_location"]);
  });
  it("places the regulation reflection in Phase 2", () => {
    expect(REVELATIONS_PHASE_FIELDS.regulate.map(field => field.key)).toEqual(["regulation_experience"]);
  });
  it("keeps all Evidence Locker answers including returned evidence in Phase 3", () => {
    expect(REVELATIONS_PHASE_FIELDS.investigate.map(field => field.key)).toEqual(["old_evidence", "protection_prediction", "new_evidence", "todays_choice", "returned_evidence"]);
  });
  it("preserves saved text without interpreting other JSON fields as answers", () => {
    expect(revelationAnswers({ regulation_experience: "Before: tense.\nAfter: settled.", old_evidence: "My earlier experience", invalid: { nested: true } })).toEqual({ regulation_experience: "Before: tense.\nAfter: settled.", old_evidence: "My earlier experience" });
  });
});