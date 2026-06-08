CREATE TABLE public.course_transformation_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.transformation_tools(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, tool_id)
);

GRANT SELECT ON public.course_transformation_tools TO anon, authenticated;
GRANT ALL ON public.course_transformation_tools TO authenticated;
GRANT ALL ON public.course_transformation_tools TO service_role;

ALTER TABLE public.course_transformation_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course tool links"
  ON public.course_transformation_tools FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage course tool links"
  ON public.course_transformation_tools FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));