
-- Table for admin-granted temporary access
CREATE TABLE public.manual_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_key varchar NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, bucket_key)
);

-- Enable RLS
ALTER TABLE public.manual_access_grants ENABLE ROW LEVEL SECURITY;

-- Admins can manage all grants
CREATE POLICY "Admins can manage manual access grants"
  ON public.manual_access_grants
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own grants (needed for access checks)
CREATE POLICY "Users can view their own grants"
  ON public.manual_access_grants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user has active manual access to a bucket
CREATE OR REPLACE FUNCTION public.has_manual_access(_user_id uuid, _bucket_key varchar)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manual_access_grants
    WHERE user_id = _user_id
      AND bucket_key = _bucket_key
      AND starts_at <= now()
      AND ends_at > now()
  )
$$;

-- Function to check if user has ANY active manual grant
CREATE OR REPLACE FUNCTION public.has_any_manual_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manual_access_grants
    WHERE user_id = _user_id
      AND starts_at <= now()
      AND ends_at > now()
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_manual_access_grants_updated_at
  BEFORE UPDATE ON public.manual_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
