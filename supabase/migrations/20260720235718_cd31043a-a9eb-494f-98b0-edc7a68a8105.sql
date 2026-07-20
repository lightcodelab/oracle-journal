-- Phase 4b: Homepage recommendations
CREATE TABLE public.home_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL,
  resource_id uuid REFERENCES public.content_resources(id) ON DELETE SET NULL,
  internal_route text,
  title text NOT NULL,
  description text,
  image_url text,
  priority integer NOT NULL DEFAULT 0,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_recommendations_placement_check
    CHECK (placement IN ('recommended','seasonal')),
  CONSTRAINT home_recommendations_target_check
    CHECK (resource_id IS NOT NULL OR internal_route IS NOT NULL),
  CONSTRAINT home_recommendations_internal_route_check
    CHECK (
      internal_route IS NULL
      OR (
        internal_route ~ '^/[A-Za-z0-9/_\-\.\?\=\&\%\:]*$'
        AND internal_route !~ '^//'
        AND internal_route !~ ':\/\/'
        AND lower(internal_route) !~ '^/?javascript:'
        AND lower(internal_route) !~ '^/?data:'
      )
    ),
  CONSTRAINT home_recommendations_window_check
    CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at)
);

GRANT SELECT ON public.home_recommendations TO authenticated;
GRANT ALL ON public.home_recommendations TO service_role;

ALTER TABLE public.home_recommendations ENABLE ROW LEVEL SECURITY;

-- Admins: full management
CREATE POLICY "Admins manage home recommendations"
ON public.home_recommendations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Active members: read only rows currently displayable
CREATE POLICY "Active members read active windowed recommendations"
ON public.home_recommendations
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (start_at IS NULL OR start_at <= now())
  AND (end_at IS NULL OR end_at > now())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR COALESCE(
         (public.get_member_state(auth.uid()) ->> 'is_active_member')::boolean,
         false
       ) = true
  )
);

CREATE INDEX idx_home_recs_placement_priority
  ON public.home_recommendations(placement, priority DESC, created_at DESC);

CREATE TRIGGER trg_home_recommendations_updated_at
BEFORE UPDATE ON public.home_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
