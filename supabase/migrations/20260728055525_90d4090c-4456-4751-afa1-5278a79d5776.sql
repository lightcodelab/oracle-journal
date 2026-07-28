REVOKE ALL PRIVILEGES ON TABLE public.mirror_blocks FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.mirror_blocks TO authenticated;