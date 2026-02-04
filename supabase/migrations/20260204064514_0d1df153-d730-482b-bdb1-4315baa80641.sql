-- Add scheduled_publish_at column to content_resources
ALTER TABLE public.content_resources
ADD COLUMN scheduled_publish_at TIMESTAMP WITH TIME ZONE NULL;

-- Add scheduled_publish_at column to healing_resources
ALTER TABLE public.healing_resources
ADD COLUMN scheduled_publish_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for efficient scheduled content lookup
CREATE INDEX idx_content_resources_scheduled ON public.content_resources (scheduled_publish_at)
WHERE scheduled_publish_at IS NOT NULL AND status = 'draft';

CREATE INDEX idx_healing_resources_scheduled ON public.healing_resources (scheduled_publish_at)
WHERE scheduled_publish_at IS NOT NULL AND status = 'draft';