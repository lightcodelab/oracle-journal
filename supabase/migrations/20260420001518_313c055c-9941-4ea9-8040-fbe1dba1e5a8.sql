
-- Create course_tags table
CREATE TABLE public.course_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course tags"
  ON public.course_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage course tags"
  ON public.course_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_course_tags_updated_at
  BEFORE UPDATE ON public.course_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create junction table course_tag_assignments
CREATE TABLE public.course_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.course_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (course_id, tag_id)
);

CREATE INDEX idx_course_tag_assignments_course ON public.course_tag_assignments(course_id);
CREATE INDEX idx_course_tag_assignments_tag ON public.course_tag_assignments(tag_id);

ALTER TABLE public.course_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignments for published courses"
  ON public.course_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_tag_assignments.course_id
        AND c.is_published = true
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage course tag assignments"
  ON public.course_tag_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
