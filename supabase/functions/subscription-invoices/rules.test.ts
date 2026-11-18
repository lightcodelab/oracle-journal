import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { ownsInvoice } from "./rules.ts";
Deno.test("members can download only their own subscription invoices", () => {
  assertEquals(ownsInvoice({ subscription: "sub_own", livemode: true }, ["sub_own"]), true);
  assertEquals(ownsInvoice({ subscription: "sub_other", livemode: true }, ["sub_own"]), false);
});
Deno.test("test and non-subscription invoices are excluded", () => {
  assertEquals(ownsInvoice({ subscription: "sub_own", livemode: false }, ["sub_own"]), false);
  assertEquals(ownsInvoice({ livemode: true }, ["sub_own"]), false);
});
Deno.test("new Stripe invoice subscription fields retain ownership checking", () => {
  assertEquals(ownsInvoice({ parent: { subscription_details: { subscription: { id: "sub_own" } } }, livemode: true }, ["sub_own"]), true);
  assertEquals(ownsInvoice({ parent: { subscription_details: { subscription: "sub_other" } }, livemode: true }, ["sub_own"]), false);
});