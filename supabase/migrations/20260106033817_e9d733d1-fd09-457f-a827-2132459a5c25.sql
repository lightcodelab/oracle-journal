-- Create healing content table for templates and meditations
CREATE TABLE public.healing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('template', 'meditation', 'audio', 'video', 'guide')),
  content_url TEXT,
  content_text TEXT,
  symptom_tags TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user healing protocols (flexible collections)
CREATE TABLE public.healing_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  symptoms_addressed TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for protocol items
CREATE TABLE public.protocol_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID NOT NULL REFERENCES public.healing_protocols(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.healing_content(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation history for the healing bot
CREATE TABLE public.healing_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.healing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healing_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healing_conversations ENABLE ROW LEVEL SECURITY;

-- Healing content policies (admins manage, anyone can view published)
CREATE POLICY "Admins can manage healing content"
  ON public.healing_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published healing content"
  ON public.healing_content FOR SELECT
  USING (is_published = true);

-- Healing protocols policies (users own their protocols)
CREATE POLICY "Users can view their own protocols"
  ON public.healing_protocols FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own protocols"
  ON public.healing_protocols FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own protocols"
  ON public.healing_protocols FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own protocols"
  ON public.healing_protocols FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all protocols"
  ON public.healing_protocols FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Protocol items policies
CREATE POLICY "Users can view their own protocol items"
  ON public.protocol_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.healing_protocols
    WHERE id = protocol_items.protocol_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own protocol items"
  ON public.protocol_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.healing_protocols
    WHERE id = protocol_items.protocol_id AND user_id = auth.uid()
  ));

-- Conversation history policies
CREATE POLICY "Users can view their own conversations"
  ON public.healing_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.healing_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.healing_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_healing_content_updated_at
  BEFORE UPDATE ON public.healing_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_healing_protocols_updated_at
  BEFORE UPDATE ON public.healing_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_healing_conversations_updated_at
  BEFORE UPDATE ON public.healing_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();