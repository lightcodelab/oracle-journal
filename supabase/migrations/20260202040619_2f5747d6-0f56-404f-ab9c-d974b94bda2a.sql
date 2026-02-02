-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view replay videos" ON storage.objects;

-- Create new policy that restricts access to Tier 3 (The Initiate) members and admins only
CREATE POLICY "Tier 3 members can view replay videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'session-replays'
  AND (
    -- Admin can view all
    public.has_role(auth.uid(), 'admin')
    OR
    -- Tier 3 (The Initiate) members with active/trialing subscription can view
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.member_tier_code = 'T3'
        AND p.subscription_status IN ('active', 'trialing')
    )
  )
);