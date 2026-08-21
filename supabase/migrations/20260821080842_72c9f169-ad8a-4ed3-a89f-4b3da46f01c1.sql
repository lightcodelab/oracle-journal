-- Temple Moments — Slice 1: private data and privacy foundation only.
-- Schema only. No RPCs, no service functions, no triggers, no client access.

-- 1. Parent: public.temple_moments
CREATE TABLE public.temple_moments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  CONSTRAINT temple_moments_label_length_chk
    CHECK (label IS NULL OR char_length(btrim(label)) BETWEEN 1 AND 120)
);

COMMENT ON TABLE public.temple_moments IS
  'Private per-member Moment parent record for "Bring a Moment to The Temple". No status/completion/progress modelling: stopping after any Movement is a valid end state.';

-- Owner-scoped chronological listing (load/list a member''s Moments newest-first).
CREATE INDEX temple_moments_user_occurred_at_idx
  ON public.temple_moments (user_id, occurred_at DESC);

-- Archive-aware owner listing: the default "My Moments" view excludes archived rows.
CREATE INDEX temple_moments_user_active_occurred_at_idx
  ON public.temple_moments (user_id, occurred_at DESC)
  WHERE archived_at IS NULL;

-- 2. Child: public.temple_moment_movements
CREATE TABLE public.temple_moment_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moment_id uuid NOT NULL REFERENCES public.temple_moments(id) ON DELETE CASCADE,
  movement_code text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL,
  content_revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT temple_moment_movements_code_chk
    CHECK (movement_code IN ('register', 'recognise', 'recalibrate')),
  CONSTRAINT temple_moment_movements_schema_version_chk
    CHECK (schema_version > 0),
  CONSTRAINT temple_moment_movements_content_revision_chk
    CHECK (content_revision >= 0),
  CONSTRAINT temple_moment_movements_content_object_chk
    CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT temple_moment_movements_unique_per_moment
    UNIQUE (moment_id, movement_code)
);

COMMENT ON TABLE public.temple_moment_movements IS
  'Private Movement child rows (register/recognise/recalibrate), at most one per Movement per Moment. Movements are independent; absence of a row is not failure, skipping or incompletion. Payload key validation belongs to the Slice 2 versioned service contract.';

-- No extra moment_id index: the unique constraint index leads with moment_id.

-- 3. Privilege boundary: no member-facing table grants at all.
REVOKE ALL ON TABLE public.temple_moments FROM PUBLIC;
REVOKE ALL ON TABLE public.temple_moments FROM anon;
REVOKE ALL ON TABLE public.temple_moments FROM authenticated;
REVOKE ALL ON TABLE public.temple_moment_movements FROM PUBLIC;
REVOKE ALL ON TABLE public.temple_moment_movements FROM anon;
REVOKE ALL ON TABLE public.temple_moment_movements FROM authenticated;

GRANT ALL ON TABLE public.temple_moments TO service_role;
GRANT ALL ON TABLE public.temple_moment_movements TO service_role;

-- 4. RLS: enabled and forced on both tables.
ALTER TABLE public.temple_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temple_moments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.temple_moment_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temple_moment_movements FORCE ROW LEVEL SECURITY;

-- 5. Dormant owner-only defensive policies (no grants exist, so these are inert
--    today; they guarantee owner-only semantics if direct access is ever opened).
CREATE POLICY temple_moments_owner_select
  ON public.temple_moments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Child ownership is derived through the parent Moment only. The movement row
-- never carries an authoritative caller-supplied user_id.
CREATE POLICY temple_moment_movements_owner_select
  ON public.temple_moment_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.temple_moments m
      WHERE m.id = temple_moment_movements.moment_id
        AND m.user_id = auth.uid()
    )
  );
