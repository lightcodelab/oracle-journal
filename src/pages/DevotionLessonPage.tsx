import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ContextualJournal from '@/components/journal/ContextualJournal';
import CourseSessionNav from '@/components/CourseSessionNav';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content: string;
  audio_url: string | null;
  audio_timestamp: string | null;
  lesson_number: number;
  course_id: string;
  survey_question: string | null;
  survey_options: string[] | null;
}

interface JournalEntry {
  id: string;
  journal_text: string | null;
  selected_answer: number | null;
  audio_position: number | null;
}

const DevotionLessonPage = () => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [journalText, setJournalText] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [audioPosition, setAudioPosition] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const { data: course } = useQuery({
    queryKey: ['devotion-course-for-lesson', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !loading && !!courseId,
  });

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['devotion-lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      return data as Lesson;
    },
    enabled: !loading && !!lessonId,
  });

  const { data: allLessons } = useQuery({
    queryKey: ['devotion-all-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, lesson_number, title')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !loading && !!courseId,
  });

  const { data: journalEntry, isLoading: journalLoading } = useQuery({
    queryKey: ['devotion-journal-entry', lessonId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as JournalEntry | null;
    },
    enabled: !loading && !!lessonId && !!userId,
  });

  // Fetch completed lesson IDs for the nav
  const { data: completedLessonIds } = useQuery({
    queryKey: ['devotion-lesson-progress-nav', courseId, userId],
    queryFn: async () => {
      if (!userId || !allLessons) return [];
      
      const lessonIds = allLessons.map(l => l.id);
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return data?.map(e => e.lesson_id) || [];
    },
    enabled: !loading && !!userId && !!allLessons && allLessons.length > 0,
  });

  // Initialize form state from journal entry
  useEffect(() => {
    if (journalEntry) {
      setJournalText(journalEntry.journal_text || '');
      setSelectedAnswer(journalEntry.selected_answer);
      setAudioPosition(journalEntry.audio_position || 0);
    }
  }, [journalEntry]);

  // Set audio position when loaded
  useEffect(() => {
    if (audioRef.current && audioPosition > 0 && !journalLoading) {
      audioRef.current.currentTime = audioPosition;
    }
  }, [audioPosition, journalLoading]);

  const saveJournalMutation = useMutation({
    mutationFn: async (data: { journal_text?: string; selected_answer?: number | null; audio_position?: number }) => {
      if (!userId || !lessonId) throw new Error('Missing required data');

      const payload = {
        user_id: userId,
        lesson_id: lessonId,
        ...data,
        updated_at: new Date().toISOString(),
      };

      if (journalEntry) {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .update(payload)
          .eq('id', journalEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotion-journal-entry', lessonId, userId] });
    },
  });

  const debouncedSave = useCallback((data: { journal_text?: string; selected_answer?: number | null; audio_position?: number }) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveJournalMutation.mutate(data);
    }, 1000);
  }, [saveJournalMutation]);

  const handleJournalChange = (text: string) => {
    setJournalText(text);
    debouncedSave({ journal_text: text, selected_answer: selectedAnswer });
  };

  const handleAnswerChange = (value: string) => {
    const answer = parseInt(value);
    setSelectedAnswer(answer);
    debouncedSave({ journal_text: journalText, selected_answer: answer });
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      // Save position every 10 seconds
      if (Math.floor(currentTime) % 10 === 0 && currentTime > 0) {
        debouncedSave({ journal_text: journalText, selected_answer: selectedAnswer, audio_position: currentTime });
      }
    }
  };

  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const currentLessonIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1;
  const prevLesson = currentLessonIndex > 0 ? allLessons?.[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < (allLessons?.length ?? 0) - 1 ? allLessons?.[currentLessonIndex + 1] : null;

  if (loading || lessonLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading session...
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-serif text-xl">
          Session not found
        </div>
      </div>
    );
  }

  const surveyOptions = Array.isArray(lesson.survey_options) ? lesson.survey_options : [];

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb 
          items={[
            { label: 'Devotion', href: '/devotion' },
            { label: 'Energy Hygiene', href: '/devotion/energy-hygiene' },
            { label: course?.title || 'Course', href: `/devotion/course/${courseId}` },
            { label: `Session ${lesson.lesson_number}` }
          ]} 
        />
        <ProfileDropdown />
      </div>

      <div className="max-w-6xl mx-auto pt-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Side Navigation - Sessions Panel */}
          <aside className="lg:w-72 flex-shrink-0 order-2 lg:order-1">
            <div className="lg:sticky lg:top-20">
              {allLessons && allLessons.length > 0 && courseId && (
                <CourseSessionNav
                  lessons={allLessons}
                  completedLessonIds={completedLessonIds || []}
                  courseId={courseId}
                  currentLessonId={lessonId}
                />
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 order-1 lg:order-2">
            {/* Session Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-8"
            >
              <p className="text-primary font-sans text-sm uppercase tracking-wider mb-2">
                Session {lesson.lesson_number}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                {lesson.title}
              </h1>
            </motion.div>

            {/* Audio Player */}
            {lesson.audio_url && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-8"
              >
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-lg text-foreground">Audio Lesson</h3>
                    <Button
                      onClick={handleRestartAudio}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restart
                    </Button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={lesson.audio_url}
                    controls
                    className="w-full"
                    onTimeUpdate={handleAudioTimeUpdate}
                  />
                  {lesson.audio_timestamp && (
                    <p className="text-muted-foreground text-sm mt-2">
                      Duration: {lesson.audio_timestamp}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Lesson Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="prose prose-invert max-w-none mb-8"
            >
              <div 
                className="text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
              />
            </motion.div>

            {/* Survey Question */}
            {lesson.survey_question && surveyOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-8"
              >
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    {lesson.survey_question}
                  </h3>
                  <RadioGroup
                    value={selectedAnswer?.toString()}
                    onValueChange={handleAnswerChange}
                    className="space-y-3"
                  >
                    {surveyOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <RadioGroupItem
                          value={index.toString()}
                          id={`option-${index}`}
                          className="border-primary"
                        />
                        <Label
                          htmlFor={`option-${index}`}
                          className="text-foreground/90 font-sans cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            )}


            {/* Digital Journal (Rich Text) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mb-12"
            >
              <ContextualJournal
                contextType="lesson"
                contextId={lessonId || ''}
                contextTitle={`Session ${lesson.lesson_number}: ${lesson.title}`}
                placeholder="Add deeper reflections, insights, or notes to your digital journal..."
              />
            </motion.div>

            {/* Navigation Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center justify-between border-t border-border pt-8"
            >
              {prevLesson ? (
                <Button
                  onClick={() => navigate(`/devotion/course/${courseId}/lesson/${prevLesson.id}`)}
                  variant="ghost"
                  className="text-foreground/70 hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Session {prevLesson.lesson_number}
                </Button>
              ) : (
                <div />
              )}
              
              {nextLesson ? (
                <Button
                  onClick={() => navigate(`/devotion/course/${courseId}/lesson/${nextLesson.id}`)}
                  variant="ghost"
                  className="text-foreground/70 hover:text-foreground"
                >
                  Session {nextLesson.lesson_number}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => navigate(`/devotion/course/${courseId}`)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Complete Course
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DevotionLessonPage;
