-- Mirror Exchange — Task 4B: Curated topic-system schema (schema-only)

-- 1. Singular axis enum
CREATE TYPE public.mirror_topic_axis AS ENUM ('hold', 'exclude');

REVOKE ALL ON TYPE public.mirror_topic_axis FROM PUBLIC;

-- 2. mirror_topic_catalog
CREATE TABLE public.mirror_topic_catalog (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  slug          text        NOT NULL,
  label         text        NOT NULL,
  description   text,
  active        boolean     NOT NULL DEFAULT true,
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mirror_topic_catalog_pkey PRIMARY KEY (id),
  CONSTRAINT mirror_topic_catalog_slug_key UNIQUE (slug),
  CONSTRAINT mirror_topic_catalog_slug_length_chk
    CHECK (char_length(slug) BETWEEN 1 AND 80),
  CONSTRAINT mirror_topic_catalog_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT mirror_topic_catalog_label_length_chk
    CHECK (char_length(label) BETWEEN 1 AND 120),
  CONSTRAINT mirror_topic_catalog_description_length_chk
    CHECK (description IS NULL OR char_length(description) <= 600)
);

CREATE INDEX idx_mirror_topic_catalog_active_order
  ON public.mirror_topic_catalog (active, display_order);

CREATE TRIGGER mirror_topic_catalog_touch
  BEFORE UPDATE ON public.mirror_topic_catalog
  FOR EACH ROW EXECUTE FUNCTION public.mirror_touch_updated_at();

COMMENT ON TABLE public.mirror_topic_catalog IS
  'Curated, administratively managed Mirror Exchange topic catalogue referenced by member topic selections.';
COMMENT ON COLUMN public.mirror_topic_catalog.id IS
  'Primary key. Stable topic identifier referenced by member selections.';
COMMENT ON COLUMN public.mirror_topic_catalog.slug IS
  'Unique kebab-case slug: lowercase alphanumerics separated by single hyphens, no leading/trailing hyphens.';
COMMENT ON COLUMN public.mirror_topic_catalog.label IS
  'Human-readable topic label, 1–120 characters.';
COMMENT ON COLUMN public.mirror_topic_catalog.description IS
  'Optional descriptive text for the topic, up to 600 characters.';
COMMENT ON COLUMN public.mirror_topic_catalog.active IS
  'Whether the topic is currently offered in the catalogue. Deactivation does not remove historical member selections.';
COMMENT ON COLUMN public.mirror_topic_catalog.display_order IS
  'Sort key used to order topics for presentation.';

ALTER TABLE public.mirror_topic_catalog ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mirror_topic_catalog FROM PUBLIC;
REVOKE ALL ON TABLE public.mirror_topic_catalog FROM anon;
REVOKE ALL ON TABLE public.mirror_topic_catalog FROM authenticated;
GRANT ALL ON TABLE public.mirror_topic_catalog TO service_role;

-- 3. mirror_member_topics
CREATE TABLE public.mirror_member_topics (
  user_id    uuid                       NOT NULL,
  topic_id   uuid                       NOT NULL,
  axis       public.mirror_topic_axis   NOT NULL,
  created_at timestamptz                NOT NULL DEFAULT now(),
  updated_at timestamptz                NOT NULL DEFAULT now(),
  CONSTRAINT mirror_member_topics_pkey PRIMARY KEY (user_id, topic_id),
  CONSTRAINT mirror_member_topics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT mirror_member_topics_topic_id_fkey
    FOREIGN KEY (topic_id) REFERENCES public.mirror_topic_catalog(id) ON DELETE RESTRICT
);

CREATE INDEX idx_mirror_member_topics_topic_id
  ON public.mirror_member_topics (topic_id);

CREATE TRIGGER mirror_member_topics_touch
  BEFORE UPDATE ON public.mirror_member_topics
  FOR EACH ROW EXECUTE FUNCTION public.mirror_touch_updated_at();

COMMENT ON TABLE public.mirror_member_topics IS
  'A member''s private curated-topic selections along one singular hold-or-exclude axis.';
COMMENT ON COLUMN public.mirror_member_topics.user_id IS
  'Owning member. References auth.users(id) with ON DELETE CASCADE.';
COMMENT ON COLUMN public.mirror_member_topics.topic_id IS
  'Selected catalogue topic. References mirror_topic_catalog(id) with ON DELETE RESTRICT.';
COMMENT ON COLUMN public.mirror_member_topics.axis IS
  'Whether the member wishes to hold or exclude this topic. Exactly one axis value per (user, topic) row.';

ALTER TABLE public.mirror_member_topics ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mirror_member_topics FROM PUBLIC;
REVOKE ALL ON TABLE public.mirror_member_topics FROM anon;
REVOKE ALL ON TABLE public.mirror_member_topics FROM authenticated;
GRANT ALL ON TABLE public.mirror_member_topics TO service_role;

-- 4. mirror_topic_notes
CREATE TABLE public.mirror_topic_notes (
  user_id    uuid        NOT NULL,
  note       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mirror_topic_notes_pkey PRIMARY KEY (user_id),
  CONSTRAINT mirror_topic_notes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT mirror_topic_notes_note_chk
    CHECK (char_length(note) BETWEEN 1 AND 600 AND btrim(note) <> '')
);

CREATE TRIGGER mirror_topic_notes_touch
  BEFORE UPDATE ON public.mirror_topic_notes
  FOR EACH ROW EXECUTE FUNCTION public.mirror_touch_updated_at();

COMMENT ON TABLE public.mirror_topic_notes IS
  'At most one optional, private, general topic note per member. Absence of a row means no note.';
COMMENT ON COLUMN public.mirror_topic_notes.user_id IS
  'Owning member and primary key. References auth.users(id) with ON DELETE CASCADE.';
COMMENT ON COLUMN public.mirror_topic_notes.note IS
  'Private free-text note, 1–600 characters, must not be blank or whitespace-only.';

ALTER TABLE public.mirror_topic_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mirror_topic_notes FROM PUBLIC;
REVOKE ALL ON TABLE public.mirror_topic_notes FROM anon;
REVOKE ALL ON TABLE public.mirror_topic_notes FROM authenticated;
GRANT ALL ON TABLE public.mirror_topic_notes TO service_role;