-- Task 12G: authoritative live-ACL inspection function for public.mirror_blocks.
-- Read-only. No parameters. Hard-coded table and roles. Callable only by service_role.

CREATE OR REPLACE FUNCTION public._mirror_blocks_privilege_inventory()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_oid oid;
  v_owner name;
  v_relacl text;
  v_rls_enabled boolean;
  v_rls_forced boolean;
  v_result jsonb;
  v_roles text[] := ARRAY['authenticated','anon','service_role'];
  v_privs text[] := ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'];
  v_role text;
  v_priv text;
  v_role_map jsonb := '{}'::jsonb;
  v_priv_map jsonb;
  v_has boolean;
  v_public_map jsonb := '{}'::jsonb;
  v_pg_version int;
BEGIN
  -- Resolve target table oid. Hard-coded; not caller-supplied.
  SELECT c.oid, pg_get_userbyid(c.relowner), COALESCE(array_to_string(c.relacl::text[], ','), ''),
         c.relrowsecurity, c.relforcerowsecurity
    INTO v_oid, v_owner, v_relacl, v_rls_enabled, v_rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'mirror_blocks' AND c.relkind = 'r';

  IF v_oid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'public.mirror_blocks not found'
    );
  END IF;

  v_pg_version := current_setting('server_version_num')::int;

  -- Effective role privileges via has_table_privilege against catalog state.
  FOREACH v_role IN ARRAY v_roles LOOP
    v_priv_map := '{}'::jsonb;
    FOREACH v_priv IN ARRAY v_privs LOOP
      -- MAINTAIN only exists on PG >= 17
      IF v_priv = 'MAINTAIN' AND v_pg_version < 170000 THEN
        v_priv_map := v_priv_map || jsonb_build_object(v_priv, jsonb_build_object('supported', false));
        CONTINUE;
      END IF;
      BEGIN
        v_has := has_table_privilege(v_role, v_oid, v_priv);
        v_priv_map := v_priv_map || jsonb_build_object(v_priv, jsonb_build_object('supported', true, 'granted', v_has));
      EXCEPTION WHEN OTHERS THEN
        v_priv_map := v_priv_map || jsonb_build_object(v_priv, jsonb_build_object('supported', false, 'error', SQLERRM));
      END;
    END LOOP;
    v_role_map := v_role_map || jsonb_build_object(v_role, v_priv_map);
  END LOOP;

  -- PUBLIC: derived from aclexplode; look for entries where grantee = 0 (PUBLIC).
  -- Also compute per-priv "granted to PUBLIC" flags.
  FOREACH v_priv IN ARRAY v_privs LOOP
    IF v_priv = 'MAINTAIN' AND v_pg_version < 170000 THEN
      v_public_map := v_public_map || jsonb_build_object(v_priv, jsonb_build_object('supported', false));
      CONTINUE;
    END IF;
    BEGIN
      SELECT EXISTS (
        SELECT 1
          FROM pg_class c, aclexplode(c.relacl) a
         WHERE c.oid = v_oid
           AND a.grantee = 0
           AND a.privilege_type = v_priv
      ) INTO v_has;
      v_public_map := v_public_map || jsonb_build_object(v_priv, jsonb_build_object('supported', true, 'granted', v_has));
    EXCEPTION WHEN OTHERS THEN
      v_public_map := v_public_map || jsonb_build_object(v_priv, jsonb_build_object('supported', false, 'error', SQLERRM));
    END;
  END LOOP;
  v_role_map := v_role_map || jsonb_build_object('PUBLIC', v_public_map);

  v_result := jsonb_build_object(
    'ok', true,
    'table', 'public.mirror_blocks',
    'oid', v_oid::text,
    'owner', v_owner,
    'relacl', v_relacl,
    'rls_enabled', v_rls_enabled,
    'rls_forced', v_rls_forced,
    'pg_version_num', v_pg_version,
    'roles', v_role_map,
    'inspected_at', now()
  );

  RETURN v_result;
END;
$$;

ALTER FUNCTION public._mirror_blocks_privilege_inventory() OWNER TO postgres;

REVOKE ALL ON FUNCTION public._mirror_blocks_privilege_inventory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._mirror_blocks_privilege_inventory() FROM anon;
REVOKE ALL ON FUNCTION public._mirror_blocks_privilege_inventory() FROM authenticated;
GRANT EXECUTE ON FUNCTION public._mirror_blocks_privilege_inventory() TO service_role;

COMMENT ON FUNCTION public._mirror_blocks_privilege_inventory() IS
'Task 12G: authoritative live-ACL inventory for public.mirror_blocks. Read-only, no parameters, hard-coded table and roles. Callable only by service_role.';