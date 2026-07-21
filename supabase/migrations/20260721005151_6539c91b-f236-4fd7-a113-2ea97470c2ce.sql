-- Drop the unguarded varchar overload of has_manual_access.
-- The (uuid, text) overload enforces identity boundaries; varchar callers will implicitly cast to text.
DROP FUNCTION IF EXISTS public.has_manual_access(uuid, character varying);

-- Belt-and-suspenders: ensure anon cannot execute the surviving overload.
REVOKE ALL ON FUNCTION public.has_manual_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_manual_access(uuid, text) TO authenticated, service_role;