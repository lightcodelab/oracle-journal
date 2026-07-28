-- Revoke unnecessary direct table privileges from anon and PUBLIC on
-- Mirror Exchange tables. RLS remains the primary boundary; this closes
-- the hardening gap identified in the Stage 1 audit.

REVOKE ALL ON TABLE public.community_profiles FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.mirror_agreement_acceptances FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.mirror_orientation_completions FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.mirror_adult_attestations FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.mirror_participations FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.mirror_suspensions FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.mirror_blocks FROM anon, PUBLIC;