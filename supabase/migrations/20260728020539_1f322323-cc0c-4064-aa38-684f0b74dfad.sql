-- 1. Purge orphan evidence rows whose user_id no longer exists in auth.users
DELETE FROM public.mirror_agreement_acceptances a
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = a.user_id);
DELETE FROM public.mirror_orientation_completions o
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = o.user_id);
DELETE FROM public.mirror_adult_attestations at
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = at.user_id);
DELETE FROM public.community_profiles p
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id);
DELETE FROM public.mirror_participations mp
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = mp.user_id);
DELETE FROM public.mirror_suspensions s
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id);
DELETE FROM public.mirror_blocks b
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = b.blocker_id)
     OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = b.blocked_id);

-- 2. Attach cascade FKs so future user deletion is complete
ALTER TABLE public.community_profiles
  DROP CONSTRAINT IF EXISTS community_profiles_user_id_fkey,
  ADD CONSTRAINT community_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mirror_agreement_acceptances
  DROP CONSTRAINT IF EXISTS mirror_agreement_acceptances_user_id_fkey,
  ADD CONSTRAINT mirror_agreement_acceptances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mirror_orientation_completions
  DROP CONSTRAINT IF EXISTS mirror_orientation_completions_user_id_fkey,
  ADD CONSTRAINT mirror_orientation_completions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mirror_adult_attestations
  DROP CONSTRAINT IF EXISTS mirror_adult_attestations_user_id_fkey,
  ADD CONSTRAINT mirror_adult_attestations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mirror_participations
  DROP CONSTRAINT IF EXISTS mirror_participations_user_id_fkey,
  ADD CONSTRAINT mirror_participations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mirror_suspensions
  DROP CONSTRAINT IF EXISTS mirror_suspensions_user_id_fkey,
  ADD CONSTRAINT mirror_suspensions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mirror_blocks
  DROP CONSTRAINT IF EXISTS mirror_blocks_blocker_id_fkey,
  DROP CONSTRAINT IF EXISTS mirror_blocks_blocked_id_fkey,
  ADD CONSTRAINT mirror_blocks_blocker_id_fkey
    FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT mirror_blocks_blocked_id_fkey
    FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;