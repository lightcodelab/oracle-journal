import { describe, it, expect } from "vitest";
import { buildRevelationInput, isRevelationCard, matchingDeepeningContent } from "../../supabase/functions/revelations-reading/rules";
describe("Revelations card restriction", () => {
  it("accepts only the drawn Sacred Rewrite card", () => {
    expect(isRevelationCard({ id: "drawn", deck_id: "85dddf8a-cd5e-4cdd-8ccc-af034052e484" }, "drawn")).toBe(true);
    expect(isRevelationCard({ id: "drawn", deck_id: "other-deck" }, "drawn")).toBe(false);
    expect(isRevelationCard({ id: "another", deck_id: "85dddf8a-cd5e-4cdd-8ccc-af034052e484" }, "drawn")).toBe(false);
  });
});

describe("Revelations drawn-card material", () => {
  const first = { card_number: 1, card_title: "The Veil of Shame" };
  const second = { card_number: 2, card_title: "The Hollow Echo" };
  const lessons = [
    { lesson_number: 1, title: "1. The Veil of Shame", content: "Shame-specific extended meaning" },
    { lesson_number: 2, title: "2. The Hollow Echo", content: "Worth-specific extended meaning" },
  ];
  it("uses the drawn card's own extended lesson, not one card for everyone", () => {
    expect(matchingDeepeningContent(first, lessons)).toBe("Shame-specific extended meaning");
    expect(matchingDeepeningContent(second, lessons)).toBe("Worth-specific extended meaning");
  });
  it("rejects a lesson with the right number but another card's meaning", () => {
    expect(() => matchingDeepeningContent(first, [{ ...lessons[1], lesson_number: 1 }])).toThrow();
  });
  it("does not silently substitute missing or ambiguous material", () => {
    expect(() => matchingDeepeningContent(first, [])).toThrow();
    expect(() => matchingDeepeningContent(first, [lessons[0], lessons[0]])).toThrow();
    expect(() => matchingDeepeningContent(first, [{ ...lessons[0], content: "" }])).toThrow();
  });
  it("includes current rich-text material through the end of the lesson", () => {
    const extended = "Extended content ".repeat(400) + "Final deeper meaning";
    expect(matchingDeepeningContent(first, [{ ...lessons[0], body_richtext: {
      type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: extended }] }],
    } }])).toBe(extended);
  });
  it("passes the pre-draw guiding question unchanged with this card and lesson", () => {
    const question = "What would the version of me who succeeds wildly at this have to be willing to be seen doing or saying?";
    const input = JSON.parse(buildRevelationInput(question, second.card_title, matchingDeepeningContent(second, lessons)));
    expect(input.guiding_question).toBe(question);
    expect(input.drawn_sacred_rewrite_card).toBe("The Hollow Echo");
    expect(input.matching_card_deepening_lesson).toBe("Worth-specific extended meaning");
  });
  it("keeps no-question draws optional", () => {
    expect(JSON.parse(buildRevelationInput(null, first.card_title, "Meaning")).guiding_question).toBeNull();
  });
});