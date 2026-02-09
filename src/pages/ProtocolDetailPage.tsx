import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Play, Clock, Heart, Headphones } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ContextualJournal from '@/components/journal/ContextualJournal';
import ProtocolSessionNav from '@/components/ProtocolSessionNav';
import { VimeoEmbed } from '@/components/VimeoEmbed';
import ResourceAudioPlayers from '@/components/ResourceAudioPlayers';
import DOMPurify from 'dompurify';
import type { Json } from '@/integrations/supabase/types';

// Extract Vimeo video ID from URL or embed URL
const extractVimeoId = (url: string): string => {
  // Handle various Vimeo URL formats
  const patterns = [
    /vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  // If it's just a number, return it directly
  if (/^\d+$/.test(url.trim())) return url.trim();
  
  return '';
};

// Extract YouTube video ID from URL
const extractYouTubeId = (url: string): string => {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return '';
};

// Check if URL is a Vimeo URL
const isVimeoUrl = (url: string): boolean => {
  return /vimeo\.com/.test(url) || /^\d+$/.test(url.trim());
};

// Check if URL is a YouTube URL
const isYouTubeUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be/.test(url);
};

interface ProtocolStep {
  id: string;
  step_index: number;
  resource_id: string | null;
  is_completed: boolean | null;
  notes: string | null;
  duration_sec: number | null;
  resource?: {
    id: string;
    title: string;
    modality: string;
    intensity: number | null;
    duration_sec: number | null;
    teaching_description: string | null;
    body_richtext: Json | null;
    vimeo_embed_url: string | null;
    display_image_url: string | null;
    audio_file_url: string | null;
  } | null;
}

interface Protocol {
  id: string;
  title: string;
  summary: string | null;
  safety_notes: string | null;
  stated_feelings: string[] | null;
  created_at: string | null;
}

const ProtocolDetailPage = () => {
  const navigate = useNavigate();
  const { protocolId } = useParams<{ protocolId: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch protocol details
  const { data: protocol, isLoading: protocolLoading } = useQuery({
    queryKey: ['protocol-detail', protocolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areekeera_protocols')
        .select('*')
        .eq('id', protocolId)
        .single();

      if (error) throw error;
      return data as Protocol;
    },
    enabled: !loading && !!protocolId,
  });

  // Fetch protocol steps with resources
  const { data: steps, isLoading: stepsLoading } = useQuery({
    queryKey: ['protocol-steps', protocolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areekeera_protocol_steps')
        .select(`
          id,
          step_index,
          resource_id,
          is_completed,
          notes,
          duration_sec,
          healing_resources (
            id,
            title,
            modality,
            intensity,
            duration_sec,
            teaching_description,
            body_richtext,
            vimeo_embed_url,
            display_image_url,
            audio_file_url
          )
        `)
        .eq('protocol_id', protocolId)
        .order('step_index', { ascending: true });

      if (error) throw error;
      
      // Transform nested data
      return (data || []).map(step => ({
        ...step,
        resource: step.healing_resources,
      })) as ProtocolStep[];
    },
    enabled: !loading && !!protocolId,
  });

  // Mark step complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('areekeera_protocol_steps')
        .update({ 
          is_completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocol-steps', protocolId] });
      toast({
        title: "Step completed",
        description: "Your progress has been saved.",
      });
    },
  });

  const currentStep = steps?.find(s => s.step_index === currentStepIndex);
  const resource = currentStep?.resource;

  const prevStep = steps?.find(s => s.step_index === currentStepIndex - 1);
  const nextStep = steps?.find(s => s.step_index === currentStepIndex + 1);

  const handleStepClick = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
  };

  const handleMarkComplete = () => {
    if (currentStep && !currentStep.is_completed) {
      markCompleteMutation.mutate(currentStep.id);
    }
  };

  // Render rich text content
  const renderRichText = (content: Json | null): React.ReactNode => {
    if (!content) return null;
    
    const richTextContent = content as { type: string; content?: unknown[] };
    if (richTextContent.type !== 'doc' || !richTextContent.content) return null;

    return richTextContent.content.map((node: unknown, index: number) => {
      const typedNode = node as { type: string; attrs?: Record<string, unknown>; content?: unknown[] };
      
      if (typedNode.type === 'paragraph') {
        const textContent = typedNode.content?.map((child: unknown, childIndex: number) => {
          const textChild = child as { type: string; text?: string; marks?: { type: string }[] };
          if (textChild.type === 'text') {
            let text: React.ReactNode = textChild.text;
            if (textChild.marks) {
              textChild.marks.forEach(mark => {
                if (mark.type === 'bold') text = <strong key={childIndex}>{text}</strong>;
                if (mark.type === 'italic') text = <em key={childIndex}>{text}</em>;
                if (mark.type === 'underline') text = <u key={childIndex}>{text}</u>;
              });
            }
            return text;
          }
          return null;
        });
        return <p key={index} className="mb-4 leading-relaxed">{textContent}</p>;
      }
      
      if (typedNode.type === 'heading') {
        const level = (typedNode.attrs?.level as number) || 2;
        const textContent = typedNode.content?.map((child: unknown) => {
          const textChild = child as { type: string; text?: string };
          return textChild.type === 'text' ? textChild.text : '';
        }).join('');
        
        const headingClass = level === 2 
          ? "font-serif text-xl mb-3 mt-6 text-primary" 
          : "font-serif text-xl mb-3 mt-6 text-foreground";
        
        if (level === 1) return <h1 key={index} className="font-serif text-2xl mb-4 mt-6 text-foreground">{textContent}</h1>;
        if (level === 2) return <h2 key={index} className={headingClass}>{textContent}</h2>;
        if (level === 3) return <h3 key={index} className="font-serif text-lg mb-2 mt-4 text-foreground">{textContent}</h3>;
      }

      if (typedNode.type === 'bulletList') {
        return (
          <ul key={index} className="list-disc list-inside mb-4 space-y-1">
            {typedNode.content?.map((listItem: unknown, liIndex: number) => {
              const li = listItem as { type: string; content?: unknown[] };
              const itemContent = li.content?.map((p: unknown) => {
                const para = p as { type: string; content?: unknown[] };
                return para.content?.map((t: unknown) => {
                  const text = t as { type: string; text?: string };
                  return text.text;
                }).join('');
              }).join('');
              return <li key={liIndex}>{itemContent}</li>;
            })}
          </ul>
        );
      }

      if (typedNode.type === 'orderedList') {
        return (
          <ol key={index} className="list-decimal list-inside mb-4 space-y-1">
            {typedNode.content?.map((listItem: unknown, liIndex: number) => {
              const li = listItem as { type: string; content?: unknown[] };
              const itemContent = li.content?.map((p: unknown) => {
                const para = p as { type: string; content?: unknown[] };
                return para.content?.map((t: unknown) => {
                  const text = t as { type: string; text?: string };
                  return text.text;
                }).join('');
              }).join('');
              return <li key={liIndex}>{itemContent}</li>;
            })}
          </ol>
        );
      }
      
      return null;
    });
  };

  if (loading || protocolLoading || stepsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading protocol...
        </div>
      </div>
    );
  }

  if (!protocol || !steps || steps.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-serif text-xl">
          Protocol not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <ProtocolSessionNav
        steps={steps}
        protocolId={protocolId || ''}
        currentStepIndex={currentStepIndex}
        protocolTitle={protocol.title}
        onStepClick={handleStepClick}
      />

      {/* Main Content Area */}
      <div className="ml-64 md:ml-72">
        {/* Navigation Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <PageBreadcrumb 
            items={[
              { label: 'Devotion', href: '/devotion' },
              { label: 'My Protocols', href: '/devotion/protocols' },
              { label: protocol.title },
            ]} 
          />
          <ProfileDropdown />
        </div>

        {/* Content */}
        <div className="px-4 py-8 max-w-3xl mx-auto">
          {/* Step Header */}
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <p className="text-primary font-sans text-sm uppercase tracking-wider mb-2">
              Step {currentStepIndex} of {steps.length}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
              {resource?.title || `Step ${currentStepIndex}`}
            </h1>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {resource?.modality && (
                <Badge variant="secondary" className="capitalize">
                  {resource.modality}
                </Badge>
              )}
              {resource?.intensity && (
                <Badge variant="outline">
                  Intensity: {resource.intensity}/5
                </Badge>
              )}
              {(resource?.duration_sec || currentStep?.duration_sec) && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor((resource?.duration_sec || currentStep?.duration_sec || 0) / 60)} min
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Personalized Disclaimer (first step only) */}
          {currentStepIndex === 1 && protocol.stated_feelings && protocol.stated_feelings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mb-8"
            >
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm flex items-center gap-2 font-medium mb-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Complementary Resource
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This protocol is being built as a complementary energy resource to support your bio-field 
                  while you continue your professional medical care for{' '}
                  <span className="font-medium text-foreground">
                    {protocol.stated_feelings.join(', ')}
                  </span>.
                </p>
              </div>
            </motion.div>
          )}

          {/* Safety Notes (first step only) */}
          {currentStepIndex === 1 && protocol.safety_notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-8"
            >
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm flex items-center gap-2 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Safety Note
                </p>
                <p className="text-sm text-muted-foreground">
                  {protocol.safety_notes}
                </p>
              </div>
            </motion.div>
          )}

          {/* Display Image */}
          {resource?.display_image_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-8"
            >
              <img 
                src={resource.display_image_url} 
                alt={resource.title}
                className="w-full rounded-lg border border-border"
              />
            </motion.div>
          )}

          {/* Video Embed (Vimeo or YouTube) */}
          {resource?.vimeo_embed_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {isVimeoUrl(resource.vimeo_embed_url) ? (
                  <VimeoEmbed videoId={extractVimeoId(resource.vimeo_embed_url)} title={resource.title} />
                ) : isYouTubeUrl(resource.vimeo_embed_url) ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(resource.vimeo_embed_url)}`}
                      title={resource.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <VimeoEmbed videoId={extractVimeoId(resource.vimeo_embed_url)} title={resource.title} />
                )}
              </div>
            </motion.div>
          )}

          {/* Audio Players */}
          {resource && (
            <ResourceAudioPlayers
              resourceId={resource.id}
              bucket="healing-resource-images"
              table="healing_resource_audio_files"
              foreignKey="resource_id"
              legacyAudioUrl={resource.audio_file_url}
              delayOffset={0.22}
            />
          )}

          {/* Teaching Description */}
          {resource?.teaching_description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mb-8"
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-serif text-lg text-foreground mb-4">About This Practice</h3>
                <p className="text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap">
                  {resource.teaching_description}
                </p>
              </div>
            </motion.div>
          )}

          {/* Rich Text Content */}
          {resource?.body_richtext && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8"
            >
              <div className="prose prose-invert max-w-none">
                <div className="text-foreground/90 font-sans leading-relaxed">
                  {renderRichText(resource.body_richtext)}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step Notes (from protocol generation) */}
          {currentStep?.notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mb-8"
            >
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-medium text-sm text-primary mb-2">Why This Step</h4>
                <p className="text-sm text-muted-foreground">{currentStep.notes}</p>
              </div>
            </motion.div>
          )}

          {/* Mark Complete Button */}
          {!currentStep?.is_completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-8"
            >
              <Button 
                onClick={handleMarkComplete}
                className="w-full"
                disabled={markCompleteMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Step Complete
              </Button>
            </motion.div>
          )}

          {currentStep?.is_completed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 text-center"
            >
              <div className="inline-flex items-center gap-2 text-primary bg-primary/10 px-4 py-2 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Step Completed</span>
              </div>
            </motion.div>
          )}

          {/* Contextual Journal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mb-12"
          >
            <ContextualJournal
              contextType="protocol_step"
              contextId={currentStep?.id || ''}
              contextTitle={`${protocol.title} - Step ${currentStepIndex}: ${resource?.title || 'Practice'}`}
              placeholder="Reflect on your experience with this practice..."
            />
          </motion.div>

          {/* Navigation Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-between border-t border-border pt-8"
          >
            {prevStep ? (
              <Button
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                variant="ghost"
                className="text-foreground/70 hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Step {prevStep.step_index}
              </Button>
            ) : (
              <div />
            )}
            
            {nextStep ? (
              <Button
                onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                variant="ghost"
                className="text-foreground/70 hover:text-foreground"
              >
                Step {nextStep.step_index}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/devotion/protocols')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Complete Protocol
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProtocolDetailPage;
