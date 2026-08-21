// TEMPORARY verification harness for Temple Moments Slice 1. Deleted after the run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const out: Record<string, unknown>[] = [];
const rec = (name: string, expect: string, r: { error?: unknown; data?: unknown }) => {
  const e = r.error as { code?: string; message?: string } | null | undefined;
  out.push({ name, expect, rejected: !!e, code: e?.code ?? null, message: e?.message?.slice(0, 140) ?? null });
};

async function restAttempt(name: string, token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  out.push({ name, http_status: res.status, blocked: res.status >= 400, body: text.slice(0, 180) });
}

Deno.serve(async () => {
  const stamp = `tm-slice1-fixture-${Date.now()}`;
  const mkEmail = (n: string) => `${stamp}-${n}@fixture.invalid`;
  const pass = crypto.randomUUID() + "Aa1!";
  const uA = await admin.auth.admin.createUser({ email: mkEmail("a"), password: pass, email_confirm: true });
  const uB = await admin.auth.admin.createUser({ email: mkEmail("b"), password: pass, email_confirm: true });
  const A = uA.data.user!.id, B = uB.data.user!.id;
  out.push({ name: "fixture_users_created", A_ok: !!A, B_ok: !!B, errA: uA.error?.message ?? null });

  // --- valid parents
  const mA = await admin.from("temple_moments").insert({ user_id: A, label: null }).select("id").single();
  const mB = await admin.from("temple_moments").insert({ user_id: B, label: "owner B moment" }).select("id").single();
  out.push({ name: "valid_parent_inserts", A: !!mA.data, B: !!mB.data, err: mA.error?.message ?? mB.error?.message ?? null });
  const momentA = mA.data!.id, momentB = mB.data!.id;

  // --- label constraint tests
  rec("reject_blank_label", "check violation", await admin.from("temple_moments").insert({ user_id: A, label: "" }));
  rec("reject_whitespace_label", "check violation", await admin.from("temple_moments").insert({ user_id: A, label: "     " }));
  rec("reject_label_121_chars", "check violation", await admin.from("temple_moments").insert({ user_id: A, label: "x".repeat(121) }));
  rec("accept_label_120_chars", "ACCEPTED (control)", await admin.from("temple_moments").insert({ user_id: A, label: "y".repeat(120) }));

  // --- movement constraint tests
  const ok1 = await admin.from("temple_moment_movements").insert({ moment_id: momentA, movement_code: "register", content: { note: "private" } });
  const ok2 = await admin.from("temple_moment_movements").insert({ moment_id: momentA, movement_code: "recognise", content: { note: "private" } });
  const ok3 = await admin.from("temple_moment_movements").insert({ moment_id: momentA, movement_code: "recalibrate", content: {} });
  out.push({ name: "valid_three_movements", errs: [ok1.error?.message, ok2.error?.message, ok3.error?.message] });

  rec("reject_invalid_movement_code", "check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentA, movement_code: "reflect", content: {} }));
  rec("reject_duplicate_moment_code", "unique violation", await admin.from("temple_moment_movements").insert({ moment_id: momentA, movement_code: "register", content: {} }));
  rec("reject_schema_version_zero", "check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "register", schema_version: 0, content: {} }));
  rec("reject_schema_version_negative", "check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "recognise", schema_version: -1, content: {} }));
  rec("reject_content_revision_negative", "check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "recalibrate", content_revision: -1, content: {} }));
  rec("reject_content_array", "check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "register", content: [] }));
  rec("reject_content_scalar", "check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "register", content: "text" }));
  rec("reject_content_json_null", "not-null/check violation", await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "register", content: null }));
  rec("reject_orphan_child", "fk violation", await admin.from("temple_moment_movements").insert({ moment_id: crypto.randomUUID(), movement_code: "register", content: {} }));

  // --- anon + authenticated REST rejection tests
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const signIn = await anonClient.auth.signInWithPassword({ email: mkEmail("a"), password: pass });
  const jwt = signIn.data.session?.access_token ?? "";
  out.push({ name: "fixture_signin", got_jwt: !!jwt, err: signIn.error?.message ?? null });

  for (const [label, token] of [["anon", ANON], ["authenticated_owner", jwt]] as const) {
    for (const tbl of ["temple_moments", "temple_moment_movements"]) {
      await restAttempt(`${label}_select_${tbl}`, token, "GET", `${tbl}?select=*`);
      await restAttempt(`${label}_insert_${tbl}`, token, "POST", tbl,
        tbl === "temple_moments" ? { user_id: A, label: "intrusion" } : { moment_id: momentA, movement_code: "register", content: {} });
      await restAttempt(`${label}_update_${tbl}`, token, "PATCH", `${tbl}?id=neq.00000000-0000-0000-0000-000000000000`, { updated_at: new Date().toISOString() });
      await restAttempt(`${label}_delete_${tbl}`, token, "DELETE", `${tbl}?id=neq.00000000-0000-0000-0000-000000000000`);
    }
  }

  // --- parent-delete cascade
  const before = await admin.from("temple_moment_movements").select("id", { count: "exact", head: true }).eq("moment_id", momentA);
  await admin.from("temple_moments").delete().eq("id", momentA);
  const after = await admin.from("temple_moment_movements").select("id", { count: "exact", head: true }).eq("moment_id", momentA);
  out.push({ name: "parent_delete_cascade", movements_before: before.count, movements_after: after.count });

  // --- account-delete cascade (owner A) + cross-owner isolation (owner B untouched)
  const m2 = await admin.from("temple_moments").insert({ user_id: A, label: "second moment" }).select("id").single();
  await admin.from("temple_moment_movements").insert({ moment_id: m2.data!.id, movement_code: "register", content: { k: "v" } });
  await admin.from("temple_moment_movements").insert({ moment_id: momentB, movement_code: "register", content: { k: "v" } });
  const aBefore = await admin.from("temple_moments").select("id", { count: "exact", head: true }).eq("user_id", A);
  await admin.auth.admin.deleteUser(A);
  const aAfter = await admin.from("temple_moments").select("id", { count: "exact", head: true }).eq("user_id", A);
  const aMovAfter = await admin.from("temple_moment_movements").select("id", { count: "exact", head: true }).eq("moment_id", m2.data!.id);
  const bAfter = await admin.from("temple_moments").select("id", { count: "exact", head: true }).eq("user_id", B);
  const bMovAfter = await admin.from("temple_moment_movements").select("id", { count: "exact", head: true }).eq("moment_id", momentB);
  out.push({
    name: "account_delete_cascade_and_isolation",
    ownerA_moments_before: aBefore.count, ownerA_moments_after: aAfter.count, ownerA_movements_after: aMovAfter.count,
    ownerB_moments_after: bAfter.count, ownerB_movements_after: bMovAfter.count,
  });

  // --- teardown: remove all fixture residue
  await admin.from("temple_moments").delete().eq("user_id", B);
  await admin.auth.admin.deleteUser(B);
  const resM = await admin.from("temple_moments").select("id", { count: "exact", head: true });
  const resV = await admin.from("temple_moment_movements").select("id", { count: "exact", head: true });
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  out.push({
    name: "zero_residue",
    temple_moments_total: resM.count,
    temple_moment_movements_total: resV.count,
    fixture_users_remaining: users.users.filter((u) => (u.email ?? "").includes("tm-slice1-fixture")).length,
  });

  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
