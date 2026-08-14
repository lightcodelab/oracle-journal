// TEMPORARY verification harness for Arrival-B3.3. Deleted after the run.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const TOKEN = "b33-fixture-6f2a1c";
const MARKER = "arrivalB33:" + crypto.randomUUID();
const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(URL_, SRV, { auth: { autoRefreshToken: false, persistSession: false } });

async function rpc(token: string | null, fn: string, args: unknown) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

async function mkUser(tag: string, fullAccess: boolean) {
  const email = `arrival-b33-${tag}-${MARKER.slice(-8)}@fixture.test`;
  const password = "B33!" + crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { fixture_marker: MARKER, b33_tag: tag },
  });
  if (error || !data.user) throw new Error(`create ${tag}: ${error?.message}`);
  const uid = data.user.id;
  if (fullAccess) {
    const now = Date.now();
    const { error: e2 } = await admin.from("entitlements").insert({
      user_id: uid, source: "admin", source_ref: `${MARKER}:${tag}`,
      product_kind: "app_membership", status: "active",
      starts_at: new Date(now - 86400000).toISOString(),
      ends_at: new Date(now + 30 * 86400000).toISOString(),
      metadata: { fixture: true, marker: MARKER },
    });
    if (e2) throw new Error(`ent ${tag}: ${e2.message}`);
  }
  const { data: s, error: e3 } = await createClient(URL_, ANON)
    .auth.signInWithPassword({ email, password });
  if (e3 || !s.session) throw new Error(`signin ${tag}: ${e3?.message}`);
  return { uid, email, token: s.session.access_token, password };
}

serve(async (req) => {
  if (req.headers.get("x-fixture-token") !== TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403 });
  }
  const out: any = { marker: MARKER, tests: [], residue: {} };
  const rec = (name: string, passed: boolean, detail: unknown) =>
    out.tests.push({ name, passed, detail });

  let A: any = null, B: any = null, N: any = null;
  try {
    A = await mkUser("member-a", true);
    B = await mkUser("member-b", true);
    N = await mkUser("no-access", false);

    // questionnaire map
    const { data: qs } = await admin
      .from("arrival_questions")
      .select("id,slug,select_min,select_max,questionnaire_version_id,arrival_answer_options(id,slug)");
    const qBySlug: Record<string, any> = {};
    for (const q of qs ?? []) qBySlug[q.slug] = q;
    const opt = (qslug: string, oslug: string) =>
      qBySlug[qslug].arrival_answer_options.find((o: any) => o.slug === oslug).id;

    // 1. anonymous + non-full-access
    const anonCall = await rpc(null, "arrival_save_answers",
      { _interaction_id: crypto.randomUUID(), _expected_answers_revision: 0, _answers: [] });
    rec("anonymous rejected", anonCall.status >= 400, anonCall);
    const noAcc = await rpc(N.token, "arrival_save_answers",
      { _interaction_id: crypto.randomUUID(), _expected_answers_revision: 0, _answers: [] });
    rec("non-full-access rejected", noAcc.status >= 400 &&
      JSON.stringify(noAcc.body).includes("arrival_forbidden"), noAcc);

    // interactions
    const startA = await rpc(A.token, "arrival_start_or_resume", {});
    const iA = startA.body?.interaction?.id;
    const startB = await rpc(B.token, "arrival_start_or_resume", {});
    const iB = startB.body?.interaction?.id;
    rec("interactions provisioned", !!iA && !!iB, { iA, iB });

    const answersOf = async (id: string) => {
      const { data } = await admin.from("arrival_answers")
        .select("question_id,answer_option_id").eq("interaction_id", id);
      return (data ?? []).map((r) => `${r.question_id}:${r.answer_option_id}`).sort();
    };
    const revOf = async (id: string) => {
      const { data } = await admin.from("arrival_interactions")
        .select("answers_revision,state").eq("id", id).single();
      return data;
    };

    // 2. foreign / nonexistent / null / non-in-progress
    const bad: any = {};
    bad.foreign = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: iB, _expected_answers_revision: 0, _answers: [] });
    bad.nonexistent = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: crypto.randomUUID(), _expected_answers_revision: 0, _answers: [] });
    bad.nullId = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: null, _expected_answers_revision: 0, _answers: [] });
    // non-in-progress: abandon a throwaway interaction of A via restart
    const restart = await rpc(A.token, "arrival_abandon_and_restart", { _expected_interaction_id: iA });
    const iA2 = restart.body?.interaction?.id;
    bad.abandoned = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: iA, _expected_answers_revision: 0, _answers: [] });
    const msgs = Object.fromEntries(Object.entries(bad).map(([k, v]: any) => [k, JSON.stringify(v.body)]));
    const allNotFound = Object.values(msgs).every((m: any) => m.includes("arrival_interaction_not_found"));
    rec("foreign/nonexistent/null/abandoned all identical not_found", allNotFound,
      { msgs, foreignAnswers: await answersOf(iB), abandonedRev: await revOf(iA) });

    // 3. valid single-select save
    const single = [{ question_id: qBySlug.present_state.id,
      answer_option_ids: [opt("present_state", "activated")] }];
    const s1 = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: iA2, _expected_answers_revision: 0, _answers: single });
    rec("valid single-select save, revision 0->1",
      s1.status === 200 && s1.body?.interaction?.answers_revision === 1 &&
      s1.body?.answers?.length === 1,
      { status: s1.status, rev: s1.body?.interaction?.answers_revision, answers: s1.body?.answers });

    // 4. valid multi-select save
    const multi = [
      { question_id: qBySlug.present_state.id, answer_option_ids: [opt("present_state", "depleted")] },
      { question_id: qBySlug.preferred_form.id,
        answer_option_ids: [opt("preferred_form", "guided_listening"), opt("preferred_form", "reflection")] },
      { question_id: qBySlug.honour_first.id,
        answer_option_ids: [opt("honour_first", "gentle_only"), opt("honour_first", "no_decisions")] },
    ];
    const s2 = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: iA2, _expected_answers_revision: 1, _answers: multi });
    rec("valid multi-select save, revision 1->2 and replaces prior set",
      s2.status === 200 && s2.body?.interaction?.answers_revision === 2 &&
      s2.body?.answers?.length === 5,
      { status: s2.status, rev: s2.body?.interaction?.answers_revision, count: s2.body?.answers?.length });

    // 5. invalid payloads, all atomic
    const before = { rev: await revOf(iA2), answers: await answersOf(iA2) };
    const invalid: Record<string, unknown> = {
      cross_question_option: [{ question_id: qBySlug.present_state.id,
        answer_option_ids: [opt("capacity", "capacity_1")] }],
      unknown_question: [{ question_id: crypto.randomUUID(),
        answer_option_ids: [opt("present_state", "activated")] }],
      unknown_option: [{ question_id: qBySlug.present_state.id,
        answer_option_ids: [crypto.randomUUID()] }],
      duplicate_option: [{ question_id: qBySlug.preferred_form.id,
        answer_option_ids: [opt("preferred_form", "reflection"), opt("preferred_form", "reflection")] }],
      duplicate_question: [
        { question_id: qBySlug.present_state.id, answer_option_ids: [opt("present_state", "activated")] },
        { question_id: qBySlug.present_state.id, answer_option_ids: [opt("present_state", "depleted")] }],
      too_many: [{ question_id: qBySlug.present_state.id,
        answer_option_ids: [opt("present_state", "activated"), opt("present_state", "depleted")] }],
      too_few: [{ question_id: qBySlug.present_state.id, answer_option_ids: [] }],
      exclusive_no_preference: [{ question_id: qBySlug.preferred_form.id,
        answer_option_ids: [opt("preferred_form", "no_preference"), opt("preferred_form", "reflection")] }],
      exclusive_none: [{ question_id: qBySlug.honour_first.id,
        answer_option_ids: [opt("honour_first", "none"), opt("honour_first", "gentle_only")] }],
      extra_key: [{ question_id: qBySlug.present_state.id,
        answer_option_ids: [opt("present_state", "activated")], sneaky: 1 }],
    };
    const invRes: any = {};
    for (const [k, payload] of Object.entries(invalid)) {
      const r = await rpc(A.token, "arrival_save_answers",
        { _interaction_id: iA2, _expected_answers_revision: 2, _answers: payload });
      invRes[k] = { status: r.status, body: JSON.stringify(r.body).slice(0, 160) };
    }
    const after = { rev: await revOf(iA2), answers: await answersOf(iA2) };
    rec("all invalid payloads rejected atomically",
      Object.values(invRes).every((r: any) => r.status >= 400) &&
      after.rev.answers_revision === before.rev.answers_revision &&
      JSON.stringify(after.answers) === JSON.stringify(before.answers),
      { invRes, before: before.rev, after: after.rev, answersUnchanged:
        JSON.stringify(after.answers) === JSON.stringify(before.answers) });

    // 6/7. concurrency: two independent sessions, same expected revision
    const { data: s2b } = await createClient(URL_, ANON)
      .auth.signInWithPassword({ email: A.email, password: A.password });
    const tokenA2 = s2b!.session!.access_token;
    const pA = [{ question_id: qBySlug.capacity.id, answer_option_ids: [opt("capacity", "capacity_1")] }];
    const pB = [{ question_id: qBySlug.capacity.id, answer_option_ids: [opt("capacity", "capacity_3")] }];
    const [cA, cB] = await Promise.all([
      rpc(A.token, "arrival_save_answers",
        { _interaction_id: iA2, _expected_answers_revision: 2, _answers: pA }),
      rpc(tokenA2, "arrival_save_answers",
        { _interaction_id: iA2, _expected_answers_revision: 2, _answers: pB }),
    ]);
    const okCount = [cA, cB].filter((r) => r.status === 200).length;
    const finalAnswers = await answersOf(iA2);
    const winner = cA.status === 200 ? "session1(capacity_1)" : "session2(capacity_3)";
    const winnerOpt = cA.status === 200 ? opt("capacity", "capacity_1") : opt("capacity", "capacity_3");
    const finalRev = await revOf(iA2);
    rec("exactly one concurrent writer wins; stale writer conflicts; final = winner only",
      okCount === 1 &&
      JSON.stringify([cA, cB].find((r) => r.status !== 200)?.body).includes("arrival_revision_conflict") &&
      finalAnswers.length === 1 && finalAnswers[0].endsWith(winnerOpt) &&
      finalRev.answers_revision === 3,
      { statuses: [cA.status, cB.status], winner, finalAnswers, finalRev,
        loser: JSON.stringify([cA, cB].find((r) => r.status !== 200)?.body).slice(0, 160) });

    // 8. subsequent save with returned revision
    const good = [cA, cB].find((r) => r.status === 200)!;
    const nextRev = good.body.interaction.answers_revision;
    const s3 = await rpc(A.token, "arrival_save_answers",
      { _interaction_id: iA2, _expected_answers_revision: nextRev,
        _answers: [{ question_id: qBySlug.available_time.id, answer_option_ids: [opt("available_time", "time_10")] }] });
    rec("subsequent save with returned revision succeeds",
      s3.status === 200 && s3.body.interaction.answers_revision === nextRev + 1,
      { nextRev, newRev: s3.body?.interaction?.answers_revision });

    // 9. isolation: B saves own; A's answers untouched, B unaffected by A
    const sB = await rpc(B.token, "arrival_save_answers",
      { _interaction_id: iB, _expected_answers_revision: 0,
        _answers: [{ question_id: qBySlug.present_state.id, answer_option_ids: [opt("present_state", "tender_exposed")] }] });
    rec("answers isolated per interaction",
      sB.status === 200 &&
      (await answersOf(iB)).length === 1 &&
      (await answersOf(iA2)).length === 1 &&
      (await answersOf(iA)).length === 0,
      { bStatus: sB.status, aAnswers: await answersOf(iA2), bAnswers: await answersOf(iB) });

    out.interactions = { iA, iA2, iB };
  } catch (e) {
    out.error = String(e);
  }

  // ---- teardown ----
  try {
    for (const u of [A, B, N]) if (u) await admin.auth.admin.deleteUser(u.uid);
    await admin.from("entitlements").delete().like("source_ref", `${MARKER}%`);
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    out.residue.fixture_users = (users?.users ?? [])
      .filter((u) => String(u.user_metadata?.fixture_marker ?? "").startsWith("arrivalB33:")).length;
    const cnt = async (t: string, col: string, vals: string[]) => {
      const { count } = await admin.from(t).select("*", { count: "exact", head: true }).in(col, vals);
      return count ?? 0;
    };
    const ids = [out.interactions?.iA, out.interactions?.iA2, out.interactions?.iB].filter(Boolean);
    out.residue.interactions = ids.length ? await cnt("arrival_interactions", "id", ids) : 0;
    out.residue.answers = ids.length ? await cnt("arrival_answers", "interaction_id", ids) : 0;
    const { count: ec } = await admin.from("entitlements")
      .select("*", { count: "exact", head: true }).like("source_ref", "arrivalB33:%");
    out.residue.entitlements = ec ?? 0;
    const { count: gc } = await admin.from("manual_full_access_grants")
      .select("*", { count: "exact", head: true }).eq("notes", "phaseC-fixture");
    out.residue.manual_grants_phaseC = gc ?? 0;
    const { count: pc } = await admin.from("profiles")
      .select("*", { count: "exact", head: true })
      .in("id", [A?.uid, B?.uid, N?.uid].filter(Boolean));
    out.residue.profiles = pc ?? 0;
  } catch (e) {
    out.teardown_error = String(e);
  }

  out.verdict = out.tests.every((t: any) => t.passed) && !out.error &&
    Object.values(out.residue).every((v: any) => v === 0) ? "PASS" : "REVIEW";
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
