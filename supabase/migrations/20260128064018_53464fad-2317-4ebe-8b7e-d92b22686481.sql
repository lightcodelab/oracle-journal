-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_text TEXT NOT NULL DEFAULT '',
  is_quick_capture BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  revisit_count INT NOT NULL DEFAULT 0,
  last_revisited_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  -- Context fields for linking to cards/lessons/courses
  context_type TEXT, -- 'card', 'lesson', 'course', 'deck', null for standalone
  context_id UUID, -- ID of the related entity
  context_title TEXT -- Cached title for display
);

CREATE INDEX IF NOT EXISTS idx_entries_user_captured ON journal_entries (user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_content_json_gin ON journal_entries USING gin (content_json);
CREATE INDEX IF NOT EXISTS idx_entries_context ON journal_entries (user_id, context_type, context_id);

-- Revisions table
CREATE TABLE IF NOT EXISTS journal_entry_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version INT NOT NULL,
  content JSONB NOT NULL,
  content_text TEXT NOT NULL DEFAULT '',
  is_autosave BOOLEAN NOT NULL DEFAULT false,
  client_ts TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revs_entry_version ON journal_entry_revisions (entry_id, version);
CREATE INDEX IF NOT EXISTS idx_revs_user_created ON journal_entry_revisions (user_id, created_at DESC);

-- Journal categories
CREATE TABLE IF NOT EXISTS journal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  color TEXT,
  emoji TEXT,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS entry_categories (
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES journal_categories(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID,
  PRIMARY KEY (entry_id, category_id)
);

-- Journal tags
CREATE TABLE IF NOT EXISTS journal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  color TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES journal_tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, tag_id)
);

-- Enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;

-- Journal entries policies
CREATE POLICY "Users can view their own entries" ON journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries" ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries" ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Revisions policies
CREATE POLICY "Users can view their own revisions" ON journal_entry_revisions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revisions" ON journal_entry_revisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view their own categories" ON journal_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" ON journal_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON journal_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON journal_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Entry categories policies
CREATE POLICY "Users can view their own entry categories" ON entry_categories
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM journal_entries WHERE journal_entries.id = entry_categories.entry_id AND journal_entries.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own entry categories" ON entry_categories
  FOR ALL USING (EXISTS (
    SELECT 1 FROM journal_entries WHERE journal_entries.id = entry_categories.entry_id AND journal_entries.user_id = auth.uid()
  ));

-- Tags policies
CREATE POLICY "Users can view their own tags" ON journal_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" ON journal_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON journal_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON journal_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Entry tags policies
CREATE POLICY "Users can view their own entry tags" ON entry_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own entry tags" ON entry_tags
  FOR ALL USING (auth.uid() = user_id);

-- Updated at trigger for journal entries
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated at trigger for categories
CREATE TRIGGER update_journal_categories_updated_at
  BEFORE UPDATE ON journal_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated at trigger for tags
CREATE TRIGGER update_journal_tags_updated_at
  BEFORE UPDATE ON journal_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();