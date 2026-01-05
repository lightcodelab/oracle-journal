-- Create courses table for storing course information
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  door_type TEXT NOT NULL DEFAULT 'devotion', -- devotion, seeing, communion
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create lessons table for storing individual lessons
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  audio_timestamp TEXT, -- e.g., "3:23" for returning users
  content TEXT NOT NULL,
  survey_question TEXT,
  survey_options JSONB DEFAULT '[]'::jsonb, -- Array of answer options
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, lesson_number)
);

-- Create lesson journal entries table for storing user responses
CREATE TABLE public.lesson_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  selected_answer INTEGER, -- Index of selected survey answer (0-3)
  journal_text TEXT, -- Optional free-form journaling
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_journal_entries ENABLE ROW LEVEL SECURITY;

-- Courses policies (anyone can view published courses)
CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage courses"
ON public.courses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Lessons policies (anyone can view lessons of published courses)
CREATE POLICY "Anyone can view lessons"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND is_published = true
  )
);

CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Journal entries policies (users can only access their own entries)
CREATE POLICY "Users can view their own journal entries"
ON public.lesson_journal_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries"
ON public.lesson_journal_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
ON public.lesson_journal_entries
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all journal entries"
ON public.lesson_journal_entries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.lesson_journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();