CREATE OR REPLACE FUNCTION public.get_location_preview(_location_id uuid)
RETURNS TABLE(id uuid, title text, slug text, summary text, thumbnail_path text, source text, type_id text, type_name text, type_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.title, r.slug, r.summary, r.thumbnail_url, 'content', c.id::text, c.name, c.slug
  FROM content_resources r LEFT JOIN content_categories c ON c.id = r.resource_type_id
  WHERE auth.uid() IS NOT NULL AND r.location_id = _location_id AND r.status = 'published'
  UNION ALL
  SELECT h.id, h.title, COALESCE('healing-' || h.slug, 'healing-' || h.id::text), COALESCE(h.summary, h.teaching_description), h.display_image_url, 'healing', h.modality::text, initcap(h.modality::text), h.modality::text
  FROM healing_resources h
  WHERE auth.uid() IS NOT NULL AND h.location_id = _location_id AND h.status = 'published'
$$;
REVOKE EXECUTE ON FUNCTION public.get_location_preview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_location_preview(uuid) TO authenticated;