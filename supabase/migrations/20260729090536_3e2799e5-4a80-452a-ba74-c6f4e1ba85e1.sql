
-- =========================================================================
-- Arrival-B1: core schema, constraints, RLS and privilege boundary
-- No seeds. No RPCs. No routes. No UI. No admin policies. No client grants.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Shared trigger helpers (namespaced to Arrival to avoid collisions)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.arrival_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Immutable registry source identity (once inserted, the arc columns cannot change)
CREATE OR REPLACE FUNCTION public.arrival_registry_lock_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.content_resource_id IS DISTINCT FROM OLD.content_resource_id
     OR NEW.healing_resource_id IS DISTINCT FROM OLD.healing_resource_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
  THEN
    RAISE EXCEPTION 'arrival_resource_registry source identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_registry_lock_source() FROM PUBLIC, anon, authenticated;

-- Immutable questionnaire definition once published or referenced
CREATE OR REPLACE FUNCTION public.arrival_questionnaire_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status IN ('published','archived') THEN
    IF NEW.status = 'draft' THEN
      RAISE EXCEPTION 'arrival_questionnaire_versions cannot revert to draft';
    END IF;
    -- Only status and updated_at may change once published.
    IF NEW.label IS DISTINCT FROM OLD.label
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'published arrival_questionnaire_versions is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_questionnaire_lock() FROM PUBLIC, anon, authenticated;

-- Lock questions/options if their parent questionnaire is published/archived
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

-- Rule version lifecycle: draft -> published(current allowed) -> retired
CREATE OR REPLACE FUNCTION public.arrival_rule_version_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status IN ('published','retired') THEN
    IF NEW.questionnaire_version_id IS DISTINCT FROM OLD.questionnaire_version_id
       OR NEW.label IS DISTINCT FROM OLD.label
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'published arrival_rule_versions core fields are immutable';
    END IF;
    IF OLD.status = 'retired' AND NEW.status <> 'retired' THEN
      RAISE EXCEPTION 'arrival_rule_versions cannot leave retired';
    END IF;
    IF OLD.status = 'published' AND NEW.status = 'draft' THEN
      RAISE EXCEPTION 'arrival_rule_versions cannot revert to draft';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_rule_version_lock() FROM PUBLIC, anon, authenticated;

-- Lock match rules if their parent rule version is published/retired
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
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'arrival_resource_match_rules on a published rule version is immutable';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'arrival_resource_match_rules on a published rule version is immutable';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_match_rule_lock() FROM PUBLIC, anon, authenticated;

-- Emitted run / recommendation immutability
CREATE OR REPLACE FUNCTION public.arrival_run_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'arrival_recommendation_runs rows are immutable after insertion';
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_run_immutable() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.arrival_recommendation_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'arrival_recommendations rows are immutable after insertion';
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_recommendation_immutable() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 1. arrival_resource_registry  (exclusive arc; no duplicated generic id/slug)
-- =========================================================================
CREATE TABLE public.arrival_resource_registry (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_resource_id   uuid REFERENCES public.content_resources(id)  ON DELETE RESTRICT,
  healing_resource_id   uuid REFERENCES public.healing_resources(id)  ON DELETE RESTRICT,
  course_id             uuid REFERENCES public.courses(id)            ON DELETE RESTRICT,
  lesson_id             uuid REFERENCES public.lessons(id)            ON DELETE RESTRICT,
  active                boolean NOT NULL DEFAULT true,
  admin_notes           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_resource_registry_exclusive_arc
    CHECK (num_nonnulls(content_resource_id, healing_resource_id, course_id, lesson_id) = 1)
);

CREATE UNIQUE INDEX arrival_resource_registry_content_uk
  ON public.arrival_resource_registry(content_resource_id) WHERE content_resource_id IS NOT NULL;
CREATE UNIQUE INDEX arrival_resource_registry_healing_uk
  ON public.arrival_resource_registry(healing_resource_id) WHERE healing_resource_id IS NOT NULL;
CREATE UNIQUE INDEX arrival_resource_registry_course_uk
  ON public.arrival_resource_registry(course_id) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX arrival_resource_registry_lesson_uk
  ON public.arrival_resource_registry(lesson_id) WHERE lesson_id IS NOT NULL;

CREATE TRIGGER arrival_resource_registry_touch
  BEFORE UPDATE ON public.arrival_resource_registry
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();
CREATE TRIGGER arrival_resource_registry_lock
  BEFORE UPDATE ON public.arrival_resource_registry
  FOR EACH ROW EXECUTE FUNCTION public.arrival_registry_lock_source();

-- =========================================================================
-- 2. arrival_questionnaire_versions
-- =========================================================================
CREATE TABLE public.arrival_questionnaire_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number  integer NOT NULL,
  label           text    NOT NULL,
  status          text    NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_qv_version_positive CHECK (version_number > 0),
  CONSTRAINT arrival_qv_status_valid
    CHECK (status IN ('draft','published','archived')),
  CONSTRAINT arrival_qv_published_timestamp
    CHECK (
      (status = 'draft'     AND published_at IS NULL)
      OR (status IN ('published','archived') AND published_at IS NOT NULL)
    ),
  CONSTRAINT arrival_qv_version_number_uk UNIQUE (version_number)
);

CREATE TRIGGER arrival_qv_touch
  BEFORE UPDATE ON public.arrival_questionnaire_versions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();
CREATE TRIGGER arrival_qv_lock
  BEFORE UPDATE ON public.arrival_questionnaire_versions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_questionnaire_lock();

-- =========================================================================
-- 3. arrival_questions
-- =========================================================================
CREATE TABLE public.arrival_questions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_version_id  uuid NOT NULL
    REFERENCES public.arrival_questionnaire_versions(id) ON DELETE RESTRICT,
  slug            text    NOT NULL,
  prompt          text    NOT NULL,
  helper_text     text,
  display_order   integer NOT NULL,
  select_min      integer NOT NULL DEFAULT 1,
  select_max      integer NOT NULL DEFAULT 1,
  required        boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_q_display_order_nonneg CHECK (display_order >= 0),
  CONSTRAINT arrival_q_select_min_ge_zero   CHECK (select_min >= 0),
  CONSTRAINT arrival_q_select_max_ge_one    CHECK (select_max >= 1),
  CONSTRAINT arrival_q_select_max_ge_min    CHECK (select_max >= select_min),
  CONSTRAINT arrival_q_required_min_ge_one  CHECK (NOT required OR select_min >= 1),
  CONSTRAINT arrival_q_slug_uk_per_qv       UNIQUE (questionnaire_version_id, slug),
  CONSTRAINT arrival_q_order_uk_per_qv      UNIQUE (questionnaire_version_id, display_order)
);

CREATE TRIGGER arrival_q_touch
  BEFORE UPDATE ON public.arrival_questions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();
CREATE TRIGGER arrival_q_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.arrival_questions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_question_lock();

-- =========================================================================
-- 4. arrival_answer_options
-- =========================================================================
CREATE TABLE public.arrival_answer_options (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     uuid NOT NULL REFERENCES public.arrival_questions(id) ON DELETE RESTRICT,
  slug            text    NOT NULL,
  label           text    NOT NULL,
  display_order   integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_ao_display_order_nonneg CHECK (display_order >= 0),
  CONSTRAINT arrival_ao_slug_uk_per_q        UNIQUE (question_id, slug),
  CONSTRAINT arrival_ao_order_uk_per_q       UNIQUE (question_id, display_order),
  -- Composite uniqueness so a composite FK can enforce option-belongs-to-question.
  CONSTRAINT arrival_ao_id_question_uk       UNIQUE (id, question_id)
);

CREATE TRIGGER arrival_ao_touch
  BEFORE UPDATE ON public.arrival_answer_options
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();
CREATE TRIGGER arrival_ao_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.arrival_answer_options
  FOR EACH ROW EXECUTE FUNCTION public.arrival_answer_option_lock();

-- =========================================================================
-- 5. arrival_rule_versions   (version-binds to questionnaire_version_id)
-- =========================================================================
CREATE TABLE public.arrival_rule_versions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_version_id  uuid NOT NULL
    REFERENCES public.arrival_questionnaire_versions(id) ON DELETE RESTRICT,
  version_number  integer NOT NULL,
  label           text    NOT NULL,
  status          text    NOT NULL DEFAULT 'draft',
  is_current      boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_rv_version_positive CHECK (version_number > 0),
  CONSTRAINT arrival_rv_status_valid
    CHECK (status IN ('draft','published','retired')),
  CONSTRAINT arrival_rv_published_timestamp CHECK (
      (status = 'draft'     AND published_at IS NULL)
      OR (status IN ('published','retired') AND published_at IS NOT NULL)
  ),
  CONSTRAINT arrival_rv_current_only_when_published
    CHECK (NOT is_current OR status = 'published'),
  CONSTRAINT arrival_rv_version_number_uk UNIQUE (version_number),
  -- Composite uniqueness so interactions/runs can enforce rule<->questionnaire agreement.
  CONSTRAINT arrival_rv_id_qv_uk UNIQUE (id, questionnaire_version_id)
);

-- At most one is_current rule version overall.
CREATE UNIQUE INDEX arrival_rv_single_current_uk
  ON public.arrival_rule_versions ((1)) WHERE is_current;

CREATE TRIGGER arrival_rv_touch
  BEFORE UPDATE ON public.arrival_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();
CREATE TRIGGER arrival_rv_lock
  BEFORE UPDATE ON public.arrival_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_rule_version_lock();

-- =========================================================================
-- 6. arrival_resource_match_rules
-- =========================================================================
CREATE TABLE public.arrival_resource_match_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version_id   uuid NOT NULL REFERENCES public.arrival_rule_versions(id) ON DELETE RESTRICT,
  registry_id       uuid NOT NULL REFERENCES public.arrival_resource_registry(id) ON DELETE RESTRICT,
  answer_option_id  uuid NOT NULL REFERENCES public.arrival_answer_options(id) ON DELETE RESTRICT,
  effect            text    NOT NULL,
  weight            numeric NOT NULL DEFAULT 0,
  reason_template   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_mr_effect_valid CHECK (effect IN ('MATCH','BOOST','EXCLUDE')),
  CONSTRAINT arrival_mr_weight_nonneg CHECK (weight >= 0),
  CONSTRAINT arrival_mr_exclude_weight_zero
    CHECK (effect <> 'EXCLUDE' OR weight = 0),
  CONSTRAINT arrival_mr_unique_triple
    UNIQUE (rule_version_id, registry_id, answer_option_id, effect)
);

CREATE INDEX arrival_mr_rule_idx     ON public.arrival_resource_match_rules(rule_version_id);
CREATE INDEX arrival_mr_option_idx   ON public.arrival_resource_match_rules(answer_option_id);
CREATE INDEX arrival_mr_registry_idx ON public.arrival_resource_match_rules(registry_id);

CREATE TRIGGER arrival_mr_touch
  BEFORE UPDATE ON public.arrival_resource_match_rules
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();
CREATE TRIGGER arrival_mr_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.arrival_resource_match_rules
  FOR EACH ROW EXECUTE FUNCTION public.arrival_match_rule_lock();

-- =========================================================================
-- 7. arrival_interactions
-- =========================================================================
CREATE TABLE public.arrival_interactions (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_version_id      uuid NOT NULL
    REFERENCES public.arrival_questionnaire_versions(id) ON DELETE RESTRICT,
  rule_version_id               uuid NOT NULL
    REFERENCES public.arrival_rule_versions(id) ON DELETE RESTRICT,
  state                         text NOT NULL DEFAULT 'in_progress',
  answers_revision              bigint NOT NULL DEFAULT 0,
  restarted_from_interaction_id uuid REFERENCES public.arrival_interactions(id) ON DELETE SET NULL,
  started_at                    timestamptz NOT NULL DEFAULT now(),
  completed_at                  timestamptz,
  abandoned_at                  timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_i_state_valid
    CHECK (state IN ('in_progress','completed','abandoned')),
  CONSTRAINT arrival_i_state_timestamps CHECK (
      (state = 'in_progress' AND completed_at IS NULL AND abandoned_at IS NULL)
   OR (state = 'completed'   AND completed_at IS NOT NULL AND abandoned_at IS NULL)
   OR (state = 'abandoned'   AND abandoned_at IS NOT NULL AND completed_at IS NULL)
  ),
  CONSTRAINT arrival_i_answers_revision_nonneg CHECK (answers_revision >= 0),
  CONSTRAINT arrival_i_restart_not_self CHECK (restarted_from_interaction_id IS NULL OR restarted_from_interaction_id <> id),
  -- Composite FK enforces the (rule_version_id, questionnaire_version_id) agreement.
  CONSTRAINT arrival_i_rule_matches_qv
    FOREIGN KEY (rule_version_id, questionnaire_version_id)
    REFERENCES public.arrival_rule_versions(id, questionnaire_version_id)
    ON DELETE RESTRICT
);

-- Restart successor is unique per predecessor.
CREATE UNIQUE INDEX arrival_i_restart_successor_uk
  ON public.arrival_interactions(restarted_from_interaction_id)
  WHERE restarted_from_interaction_id IS NOT NULL;

-- At most one in_progress interaction per member.
CREATE UNIQUE INDEX arrival_i_one_in_progress_per_user
  ON public.arrival_interactions(user_id) WHERE state = 'in_progress';

CREATE INDEX arrival_i_user_idx ON public.arrival_interactions(user_id);

CREATE TRIGGER arrival_i_touch
  BEFORE UPDATE ON public.arrival_interactions
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();

-- =========================================================================
-- 8. arrival_answers
-- =========================================================================
CREATE TABLE public.arrival_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id    uuid NOT NULL REFERENCES public.arrival_interactions(id) ON DELETE CASCADE,
  question_id       uuid NOT NULL REFERENCES public.arrival_questions(id) ON DELETE RESTRICT,
  answer_option_id  uuid NOT NULL REFERENCES public.arrival_answer_options(id) ON DELETE RESTRICT,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_a_unique_selection
    UNIQUE (interaction_id, question_id, answer_option_id),
  -- Composite FK: the selected option must actually belong to the stored question.
  CONSTRAINT arrival_a_option_belongs_to_question
    FOREIGN KEY (answer_option_id, question_id)
    REFERENCES public.arrival_answer_options(id, question_id)
    ON DELETE RESTRICT
);
CREATE INDEX arrival_a_interaction_idx ON public.arrival_answers(interaction_id);

CREATE TRIGGER arrival_a_touch
  BEFORE UPDATE ON public.arrival_answers
  FOR EACH ROW EXECUTE FUNCTION public.arrival_touch_updated_at();

-- =========================================================================
-- 9. arrival_recommendation_runs
-- =========================================================================
CREATE TABLE public.arrival_recommendation_runs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id            uuid NOT NULL UNIQUE
    REFERENCES public.arrival_interactions(id) ON DELETE CASCADE,
  rule_version_id           uuid NOT NULL REFERENCES public.arrival_rule_versions(id) ON DELETE RESTRICT,
  questionnaire_version_id  uuid NOT NULL
    REFERENCES public.arrival_questionnaire_versions(id) ON DELETE RESTRICT,
  outcome                   text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_rr_outcome_valid CHECK (outcome IN ('complete','partial')),
  -- Composite FK guarantees the run's rule version still agrees with its questionnaire.
  CONSTRAINT arrival_rr_rule_matches_qv
    FOREIGN KEY (rule_version_id, questionnaire_version_id)
    REFERENCES public.arrival_rule_versions(id, questionnaire_version_id)
    ON DELETE RESTRICT
);

-- Prevent UPDATE/DELETE on emitted runs.
CREATE TRIGGER arrival_rr_immutable_upd
  BEFORE UPDATE ON public.arrival_recommendation_runs
  FOR EACH ROW EXECUTE FUNCTION public.arrival_run_immutable();
CREATE TRIGGER arrival_rr_immutable_del
  BEFORE DELETE ON public.arrival_recommendation_runs
  FOR EACH ROW EXECUTE FUNCTION public.arrival_run_immutable();

-- The pinned run rule_version_id must equal the interaction's pinned rule_version_id.
-- Enforced with a check trigger since it crosses tables.
CREATE OR REPLACE FUNCTION public.arrival_run_rule_matches_interaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rule uuid;
  v_qv   uuid;
BEGIN
  SELECT rule_version_id, questionnaire_version_id
    INTO v_rule, v_qv
    FROM public.arrival_interactions
   WHERE id = NEW.interaction_id;
  IF v_rule IS DISTINCT FROM NEW.rule_version_id
     OR v_qv IS DISTINCT FROM NEW.questionnaire_version_id THEN
    RAISE EXCEPTION 'arrival_recommendation_runs pinned versions must match the interaction';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.arrival_run_rule_matches_interaction() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER arrival_rr_check_pin
  BEFORE INSERT ON public.arrival_recommendation_runs
  FOR EACH ROW EXECUTE FUNCTION public.arrival_run_rule_matches_interaction();

-- =========================================================================
-- 10. arrival_recommendations
-- =========================================================================
CREATE TABLE public.arrival_recommendations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid NOT NULL REFERENCES public.arrival_recommendation_runs(id) ON DELETE CASCADE,
  registry_id       uuid NOT NULL REFERENCES public.arrival_resource_registry(id) ON DELETE RESTRICT,
  resource_type     text NOT NULL,
  resource_id       uuid NOT NULL,
  title_snapshot    text NOT NULL,
  summary_snapshot  text,
  score             numeric NOT NULL,
  reasons           jsonb   NOT NULL DEFAULT '[]'::jsonb,
  rank              integer NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arrival_rc_rank_range      CHECK (rank BETWEEN 1 AND 3),
  CONSTRAINT arrival_rc_score_nonneg    CHECK (score >= 0),
  CONSTRAINT arrival_rc_reasons_array   CHECK (jsonb_typeof(reasons) = 'array'),
  CONSTRAINT arrival_rc_resource_type_valid
    CHECK (resource_type IN ('content_resource','healing_resource','course','lesson')),
  CONSTRAINT arrival_rc_rank_uk_per_run     UNIQUE (run_id, rank),
  CONSTRAINT arrival_rc_registry_uk_per_run UNIQUE (run_id, registry_id)
);
CREATE INDEX arrival_rc_run_idx ON public.arrival_recommendations(run_id);

CREATE TRIGGER arrival_rc_immutable_upd
  BEFORE UPDATE ON public.arrival_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.arrival_recommendation_immutable();
CREATE TRIGGER arrival_rc_immutable_del
  BEFORE DELETE ON public.arrival_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.arrival_recommendation_immutable();

-- =========================================================================
-- Privilege boundary: strip everything, grant only service_role.
-- authenticated / anon receive NO direct table SELECT or DML in B1.
-- =========================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'arrival_resource_registry',
    'arrival_questionnaire_versions',
    'arrival_questions',
    'arrival_answer_options',
    'arrival_rule_versions',
    'arrival_resource_match_rules',
    'arrival_interactions',
    'arrival_answers',
    'arrival_recommendation_runs',
    'arrival_recommendations'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);
    EXECUTE format('GRANT  ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Defensive owner-only policies on member-private tables. Since authenticated
-- has no direct table grants, these policies are belt-and-suspenders; they
-- ensure that if grants are ever widened by mistake, only the owner can see
-- their own rows. NO admin policy on any of these tables.

CREATE POLICY arrival_interactions_owner_select
  ON public.arrival_interactions FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY arrival_answers_owner_select
  ON public.arrival_answers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.arrival_interactions i
      WHERE i.id = arrival_answers.interaction_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY arrival_recommendation_runs_owner_select
  ON public.arrival_recommendation_runs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.arrival_interactions i
      WHERE i.id = arrival_recommendation_runs.interaction_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY arrival_recommendations_owner_select
  ON public.arrival_recommendations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1
        FROM public.arrival_recommendation_runs r
        JOIN public.arrival_interactions i ON i.id = r.interaction_id
       WHERE r.id = arrival_recommendations.run_id AND i.user_id = auth.uid()
    )
  );

-- Explicitly no policies for configuration tables:
--   arrival_resource_registry, arrival_questionnaire_versions,
--   arrival_questions, arrival_answer_options, arrival_rule_versions,
--   arrival_resource_match_rules
-- RLS is enabled+forced so with no policy, authenticated and anon get nothing.
