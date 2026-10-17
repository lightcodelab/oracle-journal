import { describe, expect, it } from "vitest";
import { collectNewTags } from "../newlyTagged";

const now = Date.parse("2026-10-17T05:03:00Z");
describe("newly tagged discovery", () => {
  it("includes a newly created Gastro tag without a resource assignment", () => {
    expect(collectNewTags([{ name: "Gastro", created_at: "2026-10-17T04:38:21Z" }], now))
      .toEqual([{ name: "Gastro", created_at: "2026-10-17T04:38:21Z", href: "/search?q=Gastro" }]);
  });
  it("keeps exactly the last seven days", () => {
    expect(collectNewTags([
      { name: "Included", created_at: "2026-10-10T05:03:00Z" },
      { name: "Expired", created_at: "2026-10-10T05:02:59Z" },
    ], now).map(tag => tag.name)).toEqual(["Included"]);
  });
  it("excludes existing tags created more than seven days ago", () => {
    expect(collectNewTags([
      { name: "Lilac Light", created_at: "2026-08-01T00:00:00Z" },
    ], now)).toEqual([]);
  });
  it("merges newly created tag names across catalogues", () => {
    expect(collectNewTags([
      { name: "Lilac Light", created_at: "2026-08-01T00:00:00Z" },
      { name: "Lilac Light", created_at: "2026-10-13T21:10:10Z" },
      { name: "lilac light", created_at: "2026-10-12T00:00:00Z" },
    ], now)).toEqual([{ name: "Lilac Light", created_at: "2026-10-13T21:10:10Z", href: "/search?q=Lilac%20Light" }]);
  });
});