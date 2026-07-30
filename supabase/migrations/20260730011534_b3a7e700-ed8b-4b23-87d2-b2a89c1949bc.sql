-- =========================================================================
-- Arrival-B1.1: bounded corrective migration (append-only).
-- Does not modify the applied B1 migration.
-- No seeds. No RPCs. No routes. No UI. No admin policies. No client grants.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 2. Account-deletion cascade compatibility.
--    UPDATE stays unconditionally rejected.
--    DELETE is rejected only when the authorised parent row still exists,
--    i.e. a direct child-row deletion. During an FK ON DELETE CASCADE the
--    parent row is already gone, which is what distinguishes the two cases.
--    This is proven empirically by the rolled-back fixture at the end.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arrival_run_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'arrival_recommendation_runs rows are immutable after insertion';
  END IF;
  -- TG_OP = 'DELETE'
  IF EXISTS (SELECT 1 FROM public.arrival_interactions i WHERE i.id = OLD.interaction_id) THEN
    RAISE EXCEPTION 'arrival_recommendation_runs rows cannot be deleted directly';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_run_immutable() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.arrival_recommendation_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'arrival_recommendations rows are immutable after insertion';
  END IF;
  -- TG_OP = 'DELETE'
  IF EXISTS (SELECT 1 FROM public.arrival_recommendation_runs r WHERE r.id = OLD.run_id) THEN
    RAISE EXCEPTION 'arrival_recommendations rows cannot be deleted directly';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_recommendation_immutable() FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. Locked recommendation-reason cardinality.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arrival_reasons_valid(_reasons jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT _reasons IS NOT NULL
     AND pg_catalog.jsonb_typeof(_reasons) = 'array'
     AND pg_catalog.jsonb_array_length(_reasons) BETWEEN 1 AND 2
     AND NOT EXISTS (
           SELECT 1
             FROM pg_catalog.jsonb_array_elements(_reasons) AS e(v)
            WHERE pg_catalog.jsonb_typeof(e.v) <> 'string'
               OR pg_catalog.btrim(e.v #>> '{}') = ''
         );
$$;
REVOKE ALL ON FUNCTION public.arrival_reasons_valid(jsonb) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.arrival_recommendations ALTER COLUMN reasons DROP DEFAULT;
ALTER TABLE public.arrival_recommendations DROP CONSTRAINT arrival_rc_reasons_array;
ALTER TABLE public.arrival_recommendations
  ADD CONSTRAINT arrival_rc_reasons_valid CHECK (public.arrival_reasons_valid(reasons));

-- -------------------------------------------------------------------------
-- 5. Published-or-used immutability: close the INSERT and DELETE holes.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arrival_question_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
    FROM public.arrival_questionnaire_versions
   WHERE id = COALESCE(NEW.questionnaire_version_id, OLD.questionnaire_version_id);
  IF v_status IN ('published','archived') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'arrival_questions cannot be added to a published questionnaire version';
    END IF;
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'arrival_questions on a published questionnaire is immutable';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.questionnaire_version_id IS DISTINCT FROM OLD.questionnaire_version_id
         OR NEW.slug IS DISTINCT FROM OLD.slug
         OR NEW.prompt IS DISTINCT FROM OLD.prompt
         OR NEW.helper_text IS DISTINCT FROM OLD.helper_text
         OR NEW.display_order IS DISTINCT FROM OLD.display_order
         OR NEW.select_min IS DISTINCT FROM OLD.select_min
         OR NEW.select_max IS DISTINCT FROM OLD.select_max
         OR NEW.required IS DISTINCT FROM OLD.required
      THEN
        RAISE EXCEPTION 'arrival_questions on a published questionnaire is immutable';
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_question_lock() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.arrival_answer_option_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT qv.status INTO v_status
    FROM public.arrival_questions q
    JOIN public.arrival_questionnaire_versions qv
      ON qv.id = q.questionnaire_version_id
   WHERE q.id = COALESCE(NEW.question_id, OLD.question_id);
  IF v_status IN ('published','archived') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'arrival_answer_options cannot be added to a published questionnaire version';
    END IF;
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'arrival_answer_options on a published questionnaire is immutable';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.question_id IS DISTINCT FROM OLD.question_id
         OR NEW.slug IS DISTINCT FROM OLD.slug
         OR NEW.label IS DISTINCT FROM OLD.label
         OR NEW.display_order IS DISTINCT FROM OLD.display_order
      THEN
        RAISE EXCEPTION 'arrival_answer_options on a published questionnaire is immutable';
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_answer_option_lock() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.arrival_match_rule_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
    FROM public.arrival_rule_versions
   WHERE id = COALESCE(NEW.rule_version_id, OLD.rule_version_id);
  IF v_status IN ('published','retired') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'arrival_resource_match_rules cannot be added to a published rule version';
    END IF;
    RAISE EXCEPTION 'arrival_resource_match_rules on a published rule version is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_match_rule_lock() FROM PUBLIC, anon, authenticated;

-- Deletion guards for version rows that have left draft.
CREATE OR REPLACE FUNCTION public.arrival_questionnaire_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'published or archived arrival_questionnaire_versions cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_questionnaire_delete_guard() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.arrival_rule_version_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'published or retired arrival_rule_versions cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_rule_version_delete_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER arrival_qv_delete_guard
  BEFORE DELETE ON public.arrival_questionnaire_versions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_questionnaire_delete_guard();

CREATE TRIGGER arrival_rv_delete_guard
  BEFORE DELETE ON public.arrival_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_rule_version_delete_guard();

-- =========================================================================
-- Transaction-scoped verification fixture.
-- Everything below is executed inside a subtransaction that is ALWAYS
-- rolled back. If any assertion fails, the whole migration fails.
-- =========================================================================
DO $verify$
DECLARE
  f            text := '';
  v_user       uuid := '00000000-0000-4000-8000-0000b11f0001';
  v_qv         uuid := '00000000-0000-4000-8000-0000b11f0002';
  v_q          uuid := '00000000-0000-4000-8000-0000b11f0003';
  v_opt        uuid := '00000000-0000-4000-8000-0000b11f0004';
  v_rv         uuid := '00000000-0000-4000-8000-0000b11f0005';
  v_reg        uuid := '00000000-0000-4000-8000-0000b11f0006';
  v_int        uuid := '00000000-0000-4000-8000-0000b11f0007';
  v_run        uuid := '00000000-0000-4000-8000-0000b11f0008';
  v_rec        uuid := '00000000-0000-4000-8000-0000b11f0009';
  v_int2       uuid := '00000000-0000-4000-8000-0000b11f000a';
  v_qv2        uuid := '00000000-0000-4000-8000-0000b11f000b';
  v_rv2        uuid := '00000000-0000-4000-8000-0000b11f000c';
  v_mr         uuid := '00000000-0000-4000-8000-0000b11f000d';
  v_reg2       uuid := '00000000-0000-4000-8000-0000b11f000e';
  v_reg3       uuid := '00000000-0000-4000-8000-0000b11f000f';
  v_cr         uuid;
  v_cr2        uuid;
  v_cr3        uuid;
  v_pub        timestamptz;
  n            integer;
BEGIN
  BEGIN
    SELECT id INTO v_cr  FROM public.content_resources ORDER BY id OFFSET 0 LIMIT 1;
    SELECT id INTO v_cr2 FROM public.content_resources ORDER BY id OFFSET 1 LIMIT 1;
    SELECT id INTO v_cr3 FROM public.content_resources ORDER BY id OFFSET 2 LIMIT 1;
    IF v_cr IS NULL OR v_cr2 IS NULL OR v_cr3 IS NULL THEN
      RAISE EXCEPTION 'ARRIVAL_B11_FIXTURE_END:no content_resources available for fixture';
    END IF;

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'arrival-b11-fixture@example.invalid', 'x', now(), now());

    -- draft definitions are preparable
    INSERT INTO public.arrival_questionnaire_versions (id, version_number, label, status)
      VALUES (v_qv, 990001, 'b11 fixture qv', 'draft');
    INSERT INTO public.arrival_questions (id, questionnaire_version_id, slug, prompt, display_order)
      VALUES (v_q, v_qv, 'fx', 'Fixture?', 0);
    INSERT INTO public.arrival_answer_options (id, question_id, slug, label, display_order)
      VALUES (v_opt, v_q, 'fo', 'Fixture option', 0);
    INSERT INTO public.arrival_rule_versions (id, questionnaire_version_id, version_number, label, status)
      VALUES (v_rv, v_qv, 990001, 'b11 fixture rv', 'draft');
    INSERT INTO public.arrival_resource_registry (id, content_resource_id) VALUES (v_reg, v_cr);
    INSERT INTO public.arrival_resource_registry (id, content_resource_id) VALUES (v_reg2, v_cr2);
    INSERT INTO public.arrival_resource_registry (id, content_resource_id) VALUES (v_reg3, v_cr3);
    INSERT INTO public.arrival_resource_match_rules (id, rule_version_id, registry_id, answer_option_id, effect, weight)
      VALUES (v_mr, v_rv, v_reg, v_opt, 'MATCH', 1);

    -- publish the pair and make the rule version current
    UPDATE public.arrival_questionnaire_versions SET status='published', published_at=now() WHERE id=v_qv;
    UPDATE public.arrival_rule_versions SET status='published', published_at=now(), is_current=true WHERE id=v_rv;
    SELECT published_at INTO v_pub FROM public.arrival_rule_versions WHERE id=v_rv;

    ----------------------------------------------------------------------
    -- published-or-used immutability
    ----------------------------------------------------------------------
    BEGIN UPDATE public.arrival_questions SET prompt='edited' WHERE id=v_q;
      f := f || '[q update allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.arrival_questions WHERE id=v_q;
      f := f || '[q delete allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_questions (questionnaire_version_id, slug, prompt, display_order)
            VALUES (v_qv,'fx2','Fixture 2?',1);
      f := f || '[q insert allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE public.arrival_answer_options SET label='edited' WHERE id=v_opt;
      f := f || '[opt update allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order)
            VALUES (v_q,'fo2','Fixture option 2',1);
      f := f || '[opt insert allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE public.arrival_resource_match_rules SET weight=5 WHERE id=v_mr;
      f := f || '[mr update allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.arrival_resource_match_rules WHERE id=v_mr;
      f := f || '[mr delete allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_resource_match_rules (rule_version_id, registry_id, answer_option_id, effect, weight)
            VALUES (v_rv, v_reg, v_opt, 'BOOST', 2);
      f := f || '[mr insert allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.arrival_questionnaire_versions WHERE id=v_qv;
      f := f || '[published qv delete allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.arrival_rule_versions WHERE id=v_rv;
      f := f || '[published rv delete allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- registry: source immutable, admin_notes mutable
    BEGIN UPDATE public.arrival_resource_registry SET content_resource_id=NULL, course_id=NULL WHERE id=v_reg;
      f := f || '[registry source mutable] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    UPDATE public.arrival_resource_registry SET admin_notes='note' WHERE id=v_reg;

    ----------------------------------------------------------------------
    -- member data + emitted run/recommendation
    ----------------------------------------------------------------------
    INSERT INTO public.arrival_interactions (id,user_id,questionnaire_version_id,rule_version_id,state,completed_at)
      VALUES (v_int, v_user, v_qv, v_rv, 'completed', now());
    INSERT INTO public.arrival_answers (interaction_id, question_id, answer_option_id)
      VALUES (v_int, v_q, v_opt);
    INSERT INTO public.arrival_recommendation_runs (id,interaction_id,rule_version_id,questionnaire_version_id,outcome)
      VALUES (v_run, v_int, v_rv, v_qv, 'complete');
    INSERT INTO public.arrival_recommendations (id,run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
      VALUES (v_rec, v_run, v_reg, 'content_resource', v_cr, 'Fixture', 1, '["one reason"]'::jsonb, 1);

    -- restart successor referencing the first interaction
    INSERT INTO public.arrival_interactions (id,user_id,questionnaire_version_id,rule_version_id,state,restarted_from_interaction_id)
      VALUES (v_int2, v_user, v_qv, v_rv, 'in_progress', v_int);

    ----------------------------------------------------------------------
    -- reasons cardinality
    ----------------------------------------------------------------------
    -- helper-level shape evidence
    IF NOT (public.arrival_reasons_valid('["a"]'::jsonb)
            AND public.arrival_reasons_valid('["a","b"]'::jsonb)) THEN
      f := f || '[reasons valid shapes rejected] ';
    END IF;
    IF public.arrival_reasons_valid('[]'::jsonb)
       OR public.arrival_reasons_valid('["a","b","c"]'::jsonb)
       OR public.arrival_reasons_valid('[1]'::jsonb)
       OR public.arrival_reasons_valid('[null]'::jsonb)
       OR public.arrival_reasons_valid('[true]'::jsonb)
       OR public.arrival_reasons_valid('[{"a":1}]'::jsonb)
       OR public.arrival_reasons_valid('[["a"]]'::jsonb)
       OR public.arrival_reasons_valid('[""]'::jsonb)
       OR public.arrival_reasons_valid('["   "]'::jsonb)
       OR public.arrival_reasons_valid('"a"'::jsonb)
       OR public.arrival_reasons_valid('{}'::jsonb) THEN
      f := f || '[reasons invalid shape accepted by helper] ';
    END IF;

    -- constraint-level evidence: two non-empty strings accepted
    INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
      VALUES (v_run, v_reg2, 'content_resource', v_cr2, 'Fixture2', 1, '["a","b"]'::jsonb, 2);
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '[]'::jsonb, 3);
      f := f || '[reasons empty accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '["a","b","c"]'::jsonb, 3);
      f := f || '[reasons three accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '[1]'::jsonb, 3);
      f := f || '[reasons numeric accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '[null]'::jsonb, 3);
      f := f || '[reasons null accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '[{"a":1}]'::jsonb, 3);
      f := f || '[reasons object accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '[["a"]]'::jsonb, 3);
      f := f || '[reasons nested array accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '["   "]'::jsonb, 3);
      f := f || '[reasons whitespace accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.arrival_recommendations (run_id,registry_id,resource_type,resource_id,title_snapshot,score,reasons,rank)
            VALUES (v_run, v_reg3, 'content_resource', v_cr3, 'Bad', 1, '"a"'::jsonb, 3);
      f := f || '[reasons scalar accepted] '; EXCEPTION WHEN OTHERS THEN NULL; END;

    ----------------------------------------------------------------------
    -- run / recommendation direct mutation must stay rejected
    ----------------------------------------------------------------------
    BEGIN UPDATE public.arrival_recommendation_runs SET outcome='partial' WHERE id=v_run;
      f := f || '[run update allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE public.arrival_recommendations SET score=9 WHERE id=v_rec;
      f := f || '[rec update allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.arrival_recommendations WHERE id=v_rec;
      f := f || '[direct rec delete allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.arrival_recommendation_runs WHERE id=v_run;
      f := f || '[direct run delete allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;

    ----------------------------------------------------------------------
    -- version lifecycle / supersession without touching historical semantics
    ----------------------------------------------------------------------
    INSERT INTO public.arrival_questionnaire_versions (id, version_number, label, status)
      VALUES (v_qv2, 990002, 'b11 fixture qv2', 'draft');
    INSERT INTO public.arrival_rule_versions (id, questionnaire_version_id, version_number, label, status)
      VALUES (v_rv2, v_qv2, 990002, 'b11 fixture rv2', 'draft');
    UPDATE public.arrival_questionnaire_versions SET status='published', published_at=now() WHERE id=v_qv2;
    UPDATE public.arrival_rule_versions SET is_current=false WHERE id=v_rv;
    UPDATE public.arrival_rule_versions SET status='published', published_at=now(), is_current=true WHERE id=v_rv2;
    -- old version retired, its questionnaire archived; publication timestamps preserved
    UPDATE public.arrival_rule_versions SET status='retired' WHERE id=v_rv;
    UPDATE public.arrival_questionnaire_versions SET status='archived' WHERE id=v_qv;
    IF (SELECT published_at FROM public.arrival_rule_versions WHERE id=v_rv) IS DISTINCT FROM v_pub THEN
      f := f || '[retirement changed published_at] ';
    END IF;
    SELECT count(*) INTO n FROM public.arrival_rule_versions WHERE is_current;
    IF n <> 1 THEN f := f || '[single-current index broken] '; END IF;
    BEGIN UPDATE public.arrival_rule_versions SET is_current=true WHERE id=v_rv2;
          UPDATE public.arrival_rule_versions SET status='published', is_current=true WHERE id=v_rv;
      f := f || '[two current versions allowed] '; EXCEPTION WHEN OTHERS THEN NULL; END;
    -- archived/retired versions remain valid FK targets for pinned interactions
    IF NOT EXISTS (SELECT 1 FROM public.arrival_interactions WHERE id=v_int AND questionnaire_version_id=v_qv) THEN
      f := f || '[pinned interaction lost] ';
    END IF;

    ----------------------------------------------------------------------
    -- ACCOUNT DELETION CASCADE
    ----------------------------------------------------------------------
    DELETE FROM auth.users WHERE id = v_user;
    SELECT (SELECT count(*) FROM public.arrival_interactions WHERE user_id=v_user)
         + (SELECT count(*) FROM public.arrival_recommendation_runs WHERE interaction_id IN (v_int,v_int2))
         + (SELECT count(*) FROM public.arrival_recommendations WHERE run_id=v_run)
         + (SELECT count(*) FROM public.arrival_answers WHERE interaction_id IN (v_int,v_int2))
      INTO n;
    IF n <> 0 THEN f := f || '[orphaned arrival rows after account deletion: ' || n || '] '; END IF;

    RAISE EXCEPTION 'ARRIVAL_B11_FIXTURE_END:%', f;
  EXCEPTION WHEN OTHERS THEN
    IF pg_catalog.strpos(SQLERRM, 'ARRIVAL_B11_FIXTURE_END:') = 1 THEN
      f := pg_catalog.substr(SQLERRM, 25);
    ELSE
      RAISE EXCEPTION 'Arrival-B1.1 verification fixture aborted unexpectedly: %', SQLERRM;
    END IF;
  END;

  IF f <> '' THEN
    RAISE EXCEPTION 'Arrival-B1.1 verification FAILED: %', f;
  END IF;
  RAISE NOTICE 'Arrival-B1.1 verification PASSED (fixture rolled back)';
END
$verify$;