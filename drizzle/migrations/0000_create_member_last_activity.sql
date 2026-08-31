CREATE TABLE public.member_last_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lesson','resource')),
  ref_id text NOT NULL,
  title text NOT NULL,
  href text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_last_activity TO authenticated;
GRANT ALL ON public.member_last_activity TO service_role;

ALTER TABLE public.member_last_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their last activity"
ON public.member_last_activity FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert their last activity"
ON public.member_last_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their last activity"
ON public.member_last_activity FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their last activity"
ON public.member_last_activity FOR DELETE TO authenticated
USING (auth.uid() = user_id);
