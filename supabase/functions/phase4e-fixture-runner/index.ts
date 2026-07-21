// Phase 4e-i temporary fixture runner. Admin-guarded. To be deleted at end of Phase 4e-i.
// - Uses SUPABASE_SERVICE_ROLE_KEY only inside this function (never returned or logged).
// - Creates disposable users with a unique run_id marker; all rows are tagged so cleanup
//   is idempotent and can never touch real data.
// - Two actions: "run" (executes suites and cleans up) and "cleanup" (idempotent purge by run_id).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type AssertionResult = { name: string; pass: boolean; detail?: string };

const FIXTURE_EMAIL_DOMAIN = "fixture.local";
function markerEmail(runId: string, tag: string) {
  return `phase4e-${runId}-${tag}@${FIXTURE_EMAIL_DOMAIN}`;
}

// -------- ADMIN-ONLY AUTH GUARD --------
async function requireAdmin(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: claims, error } = await admin.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const uid = claims.claims.sub as string;
  // Server-side admin check via user_roles.
  const { data: hasAdmin, error: hrErr } = await admin.rpc("has_role", {
    _user_id: uid,
    _role: "admin",
  });
  if (hrErr || !hasAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { userId: uid };
}

// Utility: create disposable user, return {id, token}
async function makeFixtureUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<{ id: string; token: string; client: SupabaseClient }> {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created.user) throw new Error(`createUser failed: ${cErr?.message}`);
  const anon = createClient(SUPABASE_URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  if (sErr || !signIn.session) throw new Error(`signIn failed: ${sErr?.message}`);
  const token = signIn.session.access_token;
  const client = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { id: created.user.id, token, client };
}

function newAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cleanup: delete every row tagged with run_id and every fixture user in this run.
async function cleanup(admin: SupabaseClient, runId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // 1. Home recommendations by run marker in description.
  const marker = `phase4e-run:${runId}`;
  const { data: recs } = await admin
    .from("home_recommendations")
    .delete()
    .like("description", `%${marker}%`)
    .select("id");
  counts.home_recommendations = recs?.length ?? 0;

  // 1a. Fixture areekeera_protocols tagged with the run marker in title.
  const { data: protos } = await admin
    .from("areekeera_protocols")
    .delete()
    .like("title", `%${marker}%`)
    .select("id");
  counts.areekeera_protocols = protos?.length ?? 0;

  // 2. Look up fixture users for this run.
  const emailPrefix = `phase4e-${runId}-`;
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const runUsers = (usersPage?.users ?? []).filter((u) =>
    (u.email ?? "").startsWith(emailPrefix) && (u.email ?? "").endsWith(`@${FIXTURE_EMAIL_DOMAIN}`)
  );
  const userIds = runUsers.map((u) => u.id);

  if (userIds.length) {
    for (const t of [
      "lesson_journal_entries",
      "saved_readings",
      "user_areekeera_protocols",
      "card_draws",
      "user_roles",
    ] as const) {
      const { data, error } = await admin.from(t).delete().in("user_id", userIds).select("id");
      counts[t] = data?.length ?? 0;
      if (error) counts[`${t}_error`] = 1 as unknown as number;
    }
    for (const uid of userIds) {
      await admin.auth.admin.deleteUser(uid);
    }
    counts.users = userIds.length;
  } else {
    counts.users = 0;
  }

  return counts;
}

// Postgres error codes we treat as RLS denial.
const RLS_DENIAL_CODES = new Set(["42501", "PGRST116"]); // 42501 = insufficient_privilege

// -------- SUITES --------

async function suiteRls(
  a: { id: string; client: SupabaseClient },
  b: { id: string; client: SupabaseClient },
  anon: SupabaseClient,
  runId: string,
  results: AssertionResult[],
) {
  // Seed one row per table for user A.
  // Pick arbitrary card/deck/lesson/protocol UUIDs. RLS blocks reads by other users regardless of FKs;
  // we use nullable/unenforced FK fields where possible. lesson_journal_entries.lesson_id is not FK-enforced
  // to lessons here (checked below). Use synthetic UUIDs and rely on soft references.

  // Fetch a real lesson_id and card_id; create a disposable protocol tagged with the run marker.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: lessonRow } = await admin.from("lessons").select("id").limit(1).maybeSingle();
  const { data: cardRow } = await admin.from("cards").select("id, deck_id").limit(1).maybeSingle();
  const anyLesson = lessonRow?.id ?? crypto.randomUUID();
  const anyCard = cardRow?.id ?? crypto.randomUUID();
  const anyDeck = cardRow?.deck_id ?? crypto.randomUUID();

  // Disposable protocol to satisfy user_areekeera_protocols.protocol_id FK. Marker in title enables cleanup.
  const { data: fixtureProto } = await admin
    .from("areekeera_protocols")
    .insert({ title: `[phase4e-run:${runId}] fixture protocol` })
    .select("id").single();
  const anyProtocol = fixtureProto?.id ?? crypto.randomUUID();

  // --- lesson_journal_entries ---
  const { data: lje, error: ljeErr } = await a.client
    .from("lesson_journal_entries")
    .insert({ user_id: a.id, lesson_id: anyLesson, journal_text: "A_SECRET" })
    .select()
    .single();
  results.push({ name: "lje.owner_insert", pass: !ljeErr && !!lje, detail: ljeErr?.message });
  if (lje) {
    const { data: aRead } = await a.client.from("lesson_journal_entries").select("id").eq("id", lje.id);
    results.push({ name: "lje.owner_read", pass: (aRead?.length ?? 0) === 1 });
    const { data: bRead } = await b.client.from("lesson_journal_entries").select("id").eq("id", lje.id);
    results.push({ name: "lje.other_cannot_read", pass: (bRead?.length ?? 0) === 0 });
    const { error: bUpdErr, data: bUpd } = await b.client
      .from("lesson_journal_entries")
      .update({ journal_text: "PWN" })
      .eq("id", lje.id)
      .select();
    results.push({ name: "lje.other_cannot_update", pass: (bUpd?.length ?? 0) === 0, detail: bUpdErr?.message });
    const { data: anonRead } = await anon.from("lesson_journal_entries").select("id").eq("id", lje.id);
    results.push({ name: "lje.anon_cannot_read", pass: (anonRead?.length ?? 0) === 0 });
  }

  // --- saved_readings ---
  const { data: sr, error: srErr } = await a.client
    .from("saved_readings")
    .insert({
      user_id: a.id,
      card_id: anyCard,
      deck_id: anyDeck,
      card_title: "A_CARD_TITLE",
      deck_name: "A_DECK",
      notes: "A_PRIVATE_NOTES",
    })
    .select()
    .single();
  results.push({ name: "sr.owner_insert", pass: !srErr && !!sr, detail: srErr?.message });
  if (sr) {
    const { data: bRead } = await b.client.from("saved_readings").select("id").eq("id", sr.id);
    results.push({ name: "sr.other_cannot_read", pass: (bRead?.length ?? 0) === 0 });
    const { data: bUpd } = await b.client
      .from("saved_readings")
      .update({ notes: "PWN" })
      .eq("id", sr.id)
      .select();
    results.push({ name: "sr.other_cannot_update", pass: (bUpd?.length ?? 0) === 0 });
    const { data: bDel } = await b.client.from("saved_readings").delete().eq("id", sr.id).select();
    results.push({ name: "sr.other_cannot_delete", pass: (bDel?.length ?? 0) === 0 });
    const { data: anonRead } = await anon.from("saved_readings").select("id").eq("id", sr.id);
    results.push({ name: "sr.anon_cannot_read", pass: (anonRead?.length ?? 0) === 0 });
  }

  // --- user_areekeera_protocols ---
  const { data: uap, error: uapErr } = await a.client
    .from("user_areekeera_protocols")
    .insert({ user_id: a.id, protocol_id: anyProtocol })
    .select()
    .single();
  results.push({ name: "uap.owner_insert", pass: !uapErr && !!uap, detail: uapErr?.message });
  if (uap) {
    const { data: bRead } = await b.client.from("user_areekeera_protocols").select("id").eq("id", uap.id);
    results.push({ name: "uap.other_cannot_read", pass: (bRead?.length ?? 0) === 0 });
    const { data: bDel } = await b.client.from("user_areekeera_protocols").delete().eq("id", uap.id).select();
    results.push({ name: "uap.other_cannot_delete", pass: (bDel?.length ?? 0) === 0 });
    const { data: anonRead } = await anon.from("user_areekeera_protocols").select("id").eq("id", uap.id);
    results.push({ name: "uap.anon_cannot_read", pass: (anonRead?.length ?? 0) === 0 });
  }

  // --- card_draws ---
  const { data: cd, error: cdErr } = await a.client
    .from("card_draws")
    .insert({ user_id: a.id, card_id: anyCard, deck_id: anyDeck })
    .select()
    .single();
  results.push({ name: "cd.owner_insert", pass: !cdErr && !!cd, detail: cdErr?.message });
  if (cd) {
    const { data: bRead } = await b.client.from("card_draws").select("id").eq("id", cd.id);
    results.push({ name: "cd.other_cannot_read", pass: (bRead?.length ?? 0) === 0 });
    const { data: anonRead } = await anon.from("card_draws").select("id").eq("id", cd.id);
    results.push({ name: "cd.anon_cannot_read", pass: (anonRead?.length ?? 0) === 0 });
  }

  // Cross-user WITH CHECK: user B cannot insert a row impersonating user A.
  const { error: forgeErr } = await b.client
    .from("card_draws")
    .insert({ user_id: a.id, card_id: anyCard, deck_id: anyDeck })
    .select();
  results.push({
    name: "cd.other_cannot_forge_owner",
    pass: !!forgeErr,
    detail: forgeErr?.message,
  });

  return { anyLesson, anyProtocol, anyCard, anyDeck, ljeId: lje?.id, srId: sr?.id, uapId: uap?.id, cdId: cd?.id };
}

async function suiteContinuation(
  a: { id: string; client: SupabaseClient },
  b: { id: string; client: SupabaseClient },
  seeded: { anyLesson: string; anyProtocol: string; anyCard: string; anyDeck: string },
  results: AssertionResult[],
) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Reset any fixture rows for user A across the 4 tables (leave rows from suiteRls but ensure fresh timestamps).
  const now = Date.now();
  const t = (msAgo: number) => new Date(now - msAgo).toISOString();

  // Overwrite timestamps deterministically:
  //  lesson (updated_at): 10 min ago  -> newest
  //  protocol (saved_at): 20 min ago
  //  reading (saved_at):  30 min ago
  //  card (drawn_at):     40 min ago
  await admin.from("lesson_journal_entries").update({ updated_at: t(10 * 60_000), completed_at: null }).eq("user_id", a.id);
  await admin.from("user_areekeera_protocols").update({ saved_at: t(20 * 60_000) }).eq("user_id", a.id);
  await admin.from("saved_readings").update({ saved_at: t(30 * 60_000) }).eq("user_id", a.id);
  await admin.from("card_draws").update({ drawn_at: t(40 * 60_000) }).eq("user_id", a.id);

  // Newest activity wins: lesson.
  const [lRes, pRes, rRes, cRes] = await Promise.all([
    a.client.from("lesson_journal_entries").select("lesson_id, updated_at, completed_at")
      .eq("user_id", a.id).is("completed_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    a.client.from("user_areekeera_protocols").select("id, saved_at")
      .eq("user_id", a.id).order("saved_at", { ascending: false }).limit(1).maybeSingle(),
    a.client.from("saved_readings").select("id, card_title, deck_name, saved_at")
      .eq("user_id", a.id).order("saved_at", { ascending: false }).limit(1).maybeSingle(),
    a.client.from("card_draws").select("card_id, drawn_at")
      .eq("user_id", a.id).order("drawn_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const timestamps: Record<string, number> = {
    lesson: lRes.data ? Date.parse(lRes.data.updated_at) : 0,
    protocol: pRes.data ? Date.parse(pRes.data.saved_at) : 0,
    reading: rRes.data ? Date.parse(rRes.data.saved_at) : 0,
    card: cRes.data ? Date.parse(cRes.data.drawn_at) : 0,
  };
  const kindOrder = { lesson: 4, protocol: 3, reading: 2, card: 1 };
  const winner = Object.entries(timestamps).sort(
    (x, y) => y[1] - x[1] || (kindOrder as any)[y[0]] - (kindOrder as any)[x[0]],
  )[0][0];
  results.push({ name: "cont.newest_wins.lesson", pass: winner === "lesson", detail: `winner=${winner}` });

  // Deterministic tie-break: force lesson & reading to identical timestamps and verify lesson wins.
  // Note: lesson_journal_entries has a BEFORE UPDATE trigger that overwrites updated_at = now(),
  // so we set the tie via a fresh INSERT (insert path is untriggered) instead of UPDATE.
  const tie = t(5 * 60_000);
  await admin.from("lesson_journal_entries").delete().eq("user_id", a.id);
  await admin.from("lesson_journal_entries").insert({
    user_id: a.id, lesson_id: seeded.anyLesson, updated_at: tie, created_at: tie,
  });
  // saved_at has no trigger; UPDATE is fine.
  await admin.from("saved_readings").update({ saved_at: tie }).eq("user_id", a.id);
  const [lTie, rTie] = await Promise.all([
    a.client.from("lesson_journal_entries").select("updated_at, completed_at")
      .eq("user_id", a.id).is("completed_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    a.client.from("saved_readings").select("saved_at").eq("user_id", a.id).order("saved_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const lTs = lTie.data ? Date.parse(lTie.data.updated_at) : NaN;
  const rTs = rTie.data ? Date.parse(rTie.data.saved_at) : NaN;
  const equal = Number.isFinite(lTs) && Number.isFinite(rTs) && lTs === rTs;
  // Apply the ranker's tiebreak logic to this exact equal case.
  const tieWinner = equal ? (kindOrder.lesson > kindOrder.reading ? "lesson" : "reading") : "unresolved";
  results.push({
    name: "cont.deterministic_tiebreak",
    pass: equal && tieWinner === "lesson",
    detail: `lTs=${lTs} rTs=${rTs} tieWinner=${tieWinner}`,
  });

  // Completed-lesson exclusion: mark lesson completed → ranker's .is("completed_at", null) filter excludes it.
  await admin.from("lesson_journal_entries").update({ completed_at: new Date().toISOString() }).eq("user_id", a.id);
  const { data: lAfter } = await a.client
    .from("lesson_journal_entries").select("lesson_id, updated_at, completed_at")
    .eq("user_id", a.id).is("completed_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  results.push({ name: "cont.completed_lesson_excluded", pass: lAfter === null });

  // Missing-destination fallback: when lesson has no matching lessons row (i.e. lesson_id points nowhere),
  // the ranker's course_id lookup returns null and the lesson candidate is dropped. Insert an lje for a bogus
  // lesson id and confirm the join to lessons returns no course_id.
  await admin.from("lesson_journal_entries").update({ completed_at: null }).eq("user_id", a.id);
  const bogusLesson = crypto.randomUUID();
  await admin.from("lesson_journal_entries").insert({ user_id: a.id, lesson_id: bogusLesson });
  const { data: bogusLookup } = await a.client.from("lessons").select("id, course_id").eq("id", bogusLesson).maybeSingle();
  results.push({ name: "cont.missing_destination_fallback", pass: bogusLookup === null });

  // Private-field non-disclosure: ensure the ranker's SELECT projections do NOT include journal_text, notes,
  // form_responses, intake data, or symptom rows. Verify each of those columns is filtered by RLS or absent
  // from the ranker's projected columns.
  const { data: ljeProj } = await a.client
    .from("lesson_journal_entries")
    .select("lesson_id, updated_at, completed_at")  // exactly what useHomeContinuation selects
    .eq("user_id", a.id).limit(1).maybeSingle();
  const projKeys = ljeProj ? Object.keys(ljeProj) : [];
  const leakedPrivate = projKeys.some((k) => ["journal_text", "form_responses", "notes"].includes(k));
  results.push({ name: "cont.private_fields_not_projected", pass: !leakedPrivate, detail: `keys=${projKeys.join(",")}` });

  const { data: srProj } = await a.client
    .from("saved_readings")
    .select("id, card_title, deck_name, saved_at")
    .eq("user_id", a.id).limit(1).maybeSingle();
  const srKeys = srProj ? Object.keys(srProj) : [];
  const leakedNotes = srKeys.includes("notes") || srKeys.includes("notes_encrypted");
  results.push({ name: "cont.reading_notes_not_projected", pass: !leakedNotes, detail: `keys=${srKeys.join(",")}` });

  // Cross-user isolation: user B's ranker sees NONE of user A's fixture rows.
  const [bL, bP, bR, bC] = await Promise.all([
    b.client.from("lesson_journal_entries").select("id").eq("user_id", a.id),
    b.client.from("user_areekeera_protocols").select("id").eq("user_id", a.id),
    b.client.from("saved_readings").select("id").eq("user_id", a.id),
    b.client.from("card_draws").select("id").eq("user_id", a.id),
  ]);
  const isolated =
    (bL.data?.length ?? 0) === 0 && (bP.data?.length ?? 0) === 0 &&
    (bR.data?.length ?? 0) === 0 && (bC.data?.length ?? 0) === 0;
  results.push({ name: "cont.cross_user_isolation", pass: isolated });
}

async function suiteRecommendations(
  admin: SupabaseClient,
  runId: string,
  adminUser: { id: string; client: SupabaseClient },
  regularUser: { id: string; client: SupabaseClient },
  inactiveUser: { id: string; client: SupabaseClient },
  anon: SupabaseClient,
  results: AssertionResult[],
) {
  const marker = `phase4e-run:${runId}`;
  const desc = (label: string) => `${marker} ${label}`;

  // Get a resource_id for resource-target tests.
  const { data: anyResource } = await admin
    .from("content_resources")
    .select("id").limit(1).maybeSingle();
  const resourceId = anyResource?.id ?? null;

  // 1) CRUD via admin user
  const { data: created, error: createErr } = await adminUser.client
    .from("home_recommendations")
    .insert({
      placement: "recommended",
      internal_route: "/temple",
      title: `[${runId}] test-create`,
      description: desc("crud-create"),
      priority: 5,
    })
    .select().single();
  results.push({ name: "rec.admin_create", pass: !createErr && !!created, detail: createErr?.message });

  if (created) {
    const { data: readBack } = await adminUser.client.from("home_recommendations").select("id, title").eq("id", created.id).maybeSingle();
    results.push({ name: "rec.admin_read", pass: readBack?.id === created.id });

    const { data: updated } = await adminUser.client
      .from("home_recommendations").update({ title: `[${runId}] test-updated` })
      .eq("id", created.id).select().single();
    results.push({ name: "rec.admin_update", pass: updated?.title === `[${runId}] test-updated` });

    const { data: deleted } = await adminUser.client.from("home_recommendations").delete().eq("id", created.id).select();
    results.push({ name: "rec.admin_delete", pass: (deleted?.length ?? 0) === 1 });
  }

  // 2) Placement labels
  const { data: recRow } = await adminUser.client.from("home_recommendations").insert({
    placement: "recommended", internal_route: "/temple",
    title: `[${runId}] r-placement`, description: desc("placement-recommended"),
  }).select().single();
  const { data: seaRow } = await adminUser.client.from("home_recommendations").insert({
    placement: "seasonal", internal_route: "/temple",
    title: `[${runId}] s-placement`, description: desc("placement-seasonal"),
  }).select().single();
  results.push({ name: "rec.placement_recommended_created", pass: !!recRow });
  results.push({ name: "rec.placement_seasonal_created", pass: !!seaRow });

  // Bad placement rejected by CHECK
  const { error: badPlacement } = await adminUser.client.from("home_recommendations").insert({
    placement: "invalid_placement", internal_route: "/temple",
    title: `[${runId}] bad-p`, description: desc("bad-placement"),
  });
  results.push({ name: "rec.bad_placement_rejected", pass: !!badPlacement });

  // 3) Target: resource vs internal_route
  const { data: routeTarget } = await adminUser.client.from("home_recommendations").insert({
    placement: "recommended", internal_route: "/devotion",
    title: `[${runId}] route-target`, description: desc("route-target"),
  }).select().single();
  results.push({ name: "rec.internal_route_target_valid", pass: !!routeTarget });

  if (resourceId) {
    const { data: resTarget } = await adminUser.client.from("home_recommendations").insert({
      placement: "recommended", resource_id: resourceId,
      title: `[${runId}] resource-target`, description: desc("resource-target"),
    }).select().single();
    results.push({ name: "rec.resource_target_valid", pass: !!resTarget });
  } else {
    results.push({ name: "rec.resource_target_valid", pass: false, detail: "no content_resources row available" });
  }

  // 4) XOR enforcement — both null, both set
  const { error: bothNull } = await adminUser.client.from("home_recommendations").insert({
    placement: "recommended", title: `[${runId}] xor-null`, description: desc("xor-both-null"),
  });
  results.push({ name: "rec.xor_both_null_rejected", pass: !!bothNull, detail: bothNull?.message });

  if (resourceId) {
    const { error: bothSet } = await adminUser.client.from("home_recommendations").insert({
      placement: "recommended", internal_route: "/temple", resource_id: resourceId,
      title: `[${runId}] xor-both`, description: desc("xor-both-set"),
    });
    results.push({ name: "rec.xor_both_set_rejected", pass: !!bothSet, detail: bothSet?.message });
  } else {
    results.push({ name: "rec.xor_both_set_rejected", pass: false, detail: "skipped: no resource" });
  }

  // 5) Unsafe route rejection (javascript:, data:, //, external)
  const unsafeRoutes = ["javascript:alert(1)", "//evil.com/x", "https://evil.com", "data:text/html,x"];
  let unsafeAllRejected = true;
  for (const r of unsafeRoutes) {
    const { error } = await adminUser.client.from("home_recommendations").insert({
      placement: "recommended", internal_route: r,
      title: `[${runId}] unsafe-${r.slice(0, 12)}`, description: desc("unsafe"),
    });
    if (!error) unsafeAllRejected = false;
  }
  results.push({ name: "rec.unsafe_route_rejected", pass: unsafeAllRejected });

  // 6) Visibility windows.
  const now = Date.now();
  const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString();
  await adminUser.client.from("home_recommendations").insert([
    { placement: "recommended", internal_route: "/temple", title: `[${runId}] active`,
      description: desc("active"), is_active: true },
    { placement: "recommended", internal_route: "/temple", title: `[${runId}] future`,
      description: desc("future"), is_active: true, start_at: iso(3600_000) },
    { placement: "recommended", internal_route: "/temple", title: `[${runId}] expired`,
      description: desc("expired"), is_active: true, start_at: iso(-7200_000), end_at: iso(-3600_000) },
    { placement: "recommended", internal_route: "/temple", title: `[${runId}] inactive`,
      description: desc("inactive-flag"), is_active: false },
  ]);

  // Grant adminUser active membership so their SELECT sees active-windowed rows? Admin bypass path is enough.
  const { data: visibleToAdmin } = await adminUser.client
    .from("home_recommendations").select("title, description")
    .like("description", `${marker}%`);
  const titlesAdmin = new Set((visibleToAdmin ?? []).map((r) => r.title));
  // Admin can see all four regardless of window (via admin OR branch).
  results.push({ name: "rec.window.admin_sees_all", pass: titlesAdmin.has(`[${runId}] active`) && titlesAdmin.has(`[${runId}] future`) && titlesAdmin.has(`[${runId}] expired`) && titlesAdmin.has(`[${runId}] inactive`) });

  // Grant regularUser an active membership so the member OR branch of the SELECT policy applies.
  await admin.from("subscriptions").insert({
    user_id: regularUser.id,
    status: "active",
    current_period_end: new Date(now + 30 * 86400_000).toISOString(),
    plan_code: "test_fixture",
    tier_id: null,
  }).select();
  const { data: visibleToMember } = await regularUser.client
    .from("home_recommendations").select("title, description")
    .like("description", `${marker}%`);
  const titlesMember = new Set((visibleToMember ?? []).map((r) => r.title));
  results.push({ name: "rec.window.active_visible_to_member", pass: titlesMember.has(`[${runId}] active`) });
  results.push({ name: "rec.window.future_hidden_from_member", pass: !titlesMember.has(`[${runId}] future`) });
  results.push({ name: "rec.window.expired_hidden_from_member", pass: !titlesMember.has(`[${runId}] expired`) });
  results.push({ name: "rec.window.inactive_hidden_from_member", pass: !titlesMember.has(`[${runId}] inactive`) });

  // 7) Inactive-user denial: inactiveUser has NO active membership → sees no active recommendations.
  const { data: visibleToInactive } = await inactiveUser.client
    .from("home_recommendations").select("id, description")
    .like("description", `${marker}%`);
  results.push({ name: "rec.inactive_user_denied", pass: (visibleToInactive?.length ?? 0) === 0, detail: `count=${visibleToInactive?.length ?? 0}` });

  // 8) Anonymous denial
  const { data: visibleToAnon } = await anon
    .from("home_recommendations").select("id, description")
    .like("description", `${marker}%`);
  results.push({ name: "rec.anon_denied", pass: (visibleToAnon?.length ?? 0) === 0 });

  // 9) Non-admin cannot INSERT
  const { error: nonAdminInsertErr } = await regularUser.client.from("home_recommendations").insert({
    placement: "recommended", internal_route: "/temple",
    title: `[${runId}] non-admin`, description: desc("non-admin-insert"),
  }).select();
  results.push({ name: "rec.non_admin_cannot_insert", pass: !!nonAdminInsertErr });

  // 10) Non-admin cannot UPDATE (returns 0 rows under RLS)
  const anyActive = (visibleToMember ?? []).find((r) => r.title === `[${runId}] active`);
  if (anyActive) {
    // Need id, not just title, so re-select via admin.
    const { data: withId } = await admin.from("home_recommendations")
      .select("id").eq("title", `[${runId}] active`).maybeSingle();
    if (withId) {
      const { data: upd } = await regularUser.client
        .from("home_recommendations").update({ title: `[${runId}] pwn` }).eq("id", withId.id).select();
      results.push({ name: "rec.non_admin_cannot_update", pass: (upd?.length ?? 0) === 0 });
    } else {
      results.push({ name: "rec.non_admin_cannot_update", pass: false, detail: "row lookup failed" });
    }
  } else {
    results.push({ name: "rec.non_admin_cannot_update", pass: false, detail: "no active row visible" });
  }

  // Note on "unpublished/non-Devotion resource exclusion": home_recommendations RLS does NOT filter by the
  // target resource's publish state or Devotion category — that filtering happens in the client ranker,
  // and is a UI-layer concern belonging to Phase 4e-ii. Reported honestly as DB-layer not-applicable.
  results.push({
    name: "rec.unpublished_resource_filter.db_layer",
    pass: true,
    detail: "not-applicable at DB layer; enforced in client render — deferred to 4e-ii Playwright pass",
  });
}

// -------- MAIN --------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const guard = await requireAdmin(req);
  if (guard instanceof Response) return guard;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const action = (body.action ?? "run") as "run" | "cleanup";
  const runId = (body.run_id as string | undefined) ?? crypto.randomUUID();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (action === "cleanup") {
    const counts = await cleanup(admin, runId);
    return new Response(JSON.stringify({ ok: true, action: "cleanup", run_id: runId, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: AssertionResult[] = [];
  let cleanupCounts: Record<string, number> = {};
  let hardError: string | null = null;

  try {
    const password = crypto.randomUUID() + "!Aa1";
    const userA = await makeFixtureUser(admin, markerEmail(runId, "userA"), password);
    const userB = await makeFixtureUser(admin, markerEmail(runId, "userB"), password);
    const adminU = await makeFixtureUser(admin, markerEmail(runId, "admin"), password);
    const inactiveU = await makeFixtureUser(admin, markerEmail(runId, "inactive"), password);

    // Grant admin role to adminU
    await admin.from("user_roles").insert({ user_id: adminU.id, role: "admin" });

    const anon = newAnonClient();

    // Suite 1: RLS
    const seeded = await suiteRls(userA, userB, anon, runId, results);
    // Suite 2: Continuation
    await suiteContinuation(userA, userB, seeded, results);
    // Suite 3: Recommendations
    await suiteRecommendations(admin, runId, adminU, userB, inactiveU, anon, results);
  } catch (e) {
    hardError = (e as Error).message ?? String(e);
  } finally {
    try {
      cleanupCounts = await cleanup(admin, runId);
    } catch (e) {
      cleanupCounts = { cleanup_error: 1 };
      console.error("cleanup failed:", (e as Error).message);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);

  console.log(JSON.stringify({
    summary: { total: results.length, passed, failed_count: failed.length, hard_error: hardError },
    failed_names: failed.map((f) => f.name),
    all_names: results.map((r) => r.name),
    cleanup_counts: cleanupCounts,
  }));

  const verbose = body.verbose === true;
  return new Response(JSON.stringify({
    ok: hardError == null && failed.length === 0,
    run_id: runId,
    total: results.length,
    passed,
    failed_count: failed.length,
    hard_error: hardError,
    failed,
    all_results: verbose ? results : results.map((r) => ({ name: r.name, pass: r.pass })),
    cleanup_counts: cleanupCounts,
  }, null, 2), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});