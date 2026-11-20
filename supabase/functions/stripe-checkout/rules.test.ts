import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { blocksNewMembership } from "./rules.ts";
Deno.test("ongoing or overdue memberships cannot start a second subscription", () => {
  for (const status of ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"]) assertEquals(blocksNewMembership(status), true);
  assertEquals(blocksNewMembership("canceled"), false);
  assertEquals(blocksNewMembership("incomplete_expired"), false);
});