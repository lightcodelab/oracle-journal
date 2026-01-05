import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, LogOut, BookOpen, CheckCircle2, Menu, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FormattedContent } from '@/components/FormattedContent';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface Course {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  course_id: string;
  lesson_number: number;
  title: string;
  description: string | null;
  audio_url: string | null;
  audio_timestamp: string | null;
  content: string;
  survey_question: string | null;
  survey_options: string[];
}

interface JournalEntry {
  id: string;
  lesson_id: string;
  selected_answer: number | null;
  journal_text: string | null;
  audio_position: number | null;
}

interface LessonListItem {
  id: string;
  lesson_number: number;
  title: string;
}

const LessonPage = () => {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [journalText, setJournalText] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedPositionRef = useRef<number>(0);
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

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!courseId && !loading,
  });

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (error) throw error;
      
      // Parse survey_options from JSONB
      const lessonData = data as any;
      if (lessonData) {
        lessonData.survey_options = Array.isArray(lessonData.survey_options) 
          ? lessonData.survey_options 
          : [];
      }
      
      return lessonData as Lesson | null;
    },
    enabled: !!lessonId && !loading,
  });

  const { data: allLessons } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, lesson_number, title')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true });

      if (error) throw error;
      return data as LessonListItem[];
    },
    enabled: !!courseId && !loading,
  });

  const { data: existingEntry, isLoading: entryLoading } = useQuery({
    queryKey: ['journal-entry', lessonId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('id, lesson_id, selected_answer, journal_text, audio_position')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as JournalEntry | null;
    },
    enabled: !!lessonId && !!userId,
  });

  const { data: completedLessons } = useQuery({
    queryKey: ['completed-lessons', courseId, userId],
    queryFn: async () => {
      if (!userId || !allLessons) return [];
      
      const lessonIds = allLessons.map(l => l.id);
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return data.map(e => e.lesson_id);
    },
    enabled: !!userId && !!allLessons && allLessons.length > 0,
  });

  // Set form values when existing entry loads
  useEffect(() => {
    if (existingEntry) {
      if (existingEntry.selected_answer !== null) {
        setSelectedAnswer(existingEntry.selected_answer.toString());
      }
      if (existingEntry.journal_text) {
        setJournalText(existingEntry.journal_text);
      }
      // Restore audio position
      if (existingEntry.audio_position && audioRef.current) {
        audioRef.current.currentTime = existingEntry.audio_position;
        lastSavedPositionRef.current = existingEntry.audio_position;
      }
    } else {
      setSelectedAnswer('');
      setJournalText('');
    }
  }, [existingEntry, lessonId]);

  // Save audio position periodically
  const saveAudioPosition = useCallback(async (position: number) => {
    if (!userId || !lessonId) return;
    
    // Only save if position changed by more than 5 seconds
    if (Math.abs(position - lastSavedPositionRef.current) < 5) return;
    
    lastSavedPositionRef.current = position;
    
    try {
      if (existingEntry) {
        await supabase
          .from('lesson_journal_entries')
          .update({ audio_position: position })
          .eq('id', existingEntry.id);
      } else {
        await supabase
          .from('lesson_journal_entries')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            audio_position: position,
          });
        // Invalidate to get the new entry
        queryClient.invalidateQueries({ queryKey: ['journal-entry', lessonId, userId] });
      }
    } catch (error) {
      console.error('Error saving audio position:', error);
    }
  }, [userId, lessonId, existingEntry, queryClient]);

  // Handle audio time updates
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      saveAudioPosition(audioRef.current.currentTime);
    }
  }, [saveAudioPosition]);

  // Restart audio from beginning
  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      lastSavedPositionRef.current = 0;
    }
  };

  const saveJournalMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !lessonId) throw new Error('Not authenticated');

      const entryData = {
        user_id: userId,
        lesson_id: lessonId,
        selected_answer: selectedAnswer ? parseInt(selectedAnswer) : null,
        journal_text: journalText || null,
      };

      if (existingEntry) {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .update(entryData)
          .eq('id', existingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_journal_entries')
          .insert(entryData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Saved',
        description: 'Your reflections have been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['journal-entry', lessonId, userId] });
      queryClient.invalidateQueries({ queryKey: ['completed-lessons', courseId, userId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save your reflections. Please try again.',
        variant: 'destructive',
      });
      console.error('Save error:', error);
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Navigation helpers
  const currentIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1;
  const prevLesson = currentIndex > 0 ? allLessons?.[currentIndex - 1] : null;
  const nextLesson = currentIndex < (allLessons?.length ?? 0) - 1 ? allLessons?.[currentIndex + 1] : null;

  const navigateToLesson = (targetLessonId: string) => {
    navigate(`/seeing/course/${courseId}/lesson/${targetLessonId}`);
    setMobileMenuOpen(false);
  };

  if (loading || lessonLoading || entryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading lesson...
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Lesson not found</p>
          <Button onClick={() => navigate(`/seeing/course/${courseId}`)}>
            Return to Course
          </Button>
        </div>
      </div>
    );
  }

  const LessonNav = () => (
    <nav className="space-y-2">
      {allLessons?.map((l) => {
        const isCompleted = completedLessons?.includes(l.id);
        const isActive = l.id === lessonId;
        return (
          <button
            key={l.id}
            onClick={() => navigateToLesson(l.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
              isActive 
                ? 'bg-primary/10 border border-primary/30' 
                : 'hover:bg-accent'
            }`}
          >
            <span className="flex-shrink-0 mt-0.5">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <BookOpen className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
            </span>
            <div>
              <span className="text-xs text-muted-foreground">
                Lesson {l.lesson_number}
              </span>
              <p className={`text-sm ${isActive ? 'text-primary font-medium' : 'text-foreground'}`}>
                {l.title}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="p-6">
                  <h2 className="font-serif text-lg text-foreground mb-4">{course?.title}</h2>
                  <LessonNav />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              onClick={() => navigate(`/seeing/course/${courseId}`)}
              variant="ghost"
              size="sm"
              className="text-foreground/70 hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{course?.title}</span>
              <span className="sm:hidden">Course</span>
            </Button>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="text-foreground/70 hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      <div className="pt-16 flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-80 border-r border-border bg-card/50 fixed left-0 top-16 bottom-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h2 className="font-serif text-lg text-foreground mb-4">{course?.title}</h2>
              <LessonNav />
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-80">
          <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
            <motion.div
              key={lessonId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Lesson Header */}
              <div className="mb-8">
                <span className="text-sm text-muted-foreground font-sans uppercase tracking-wider">
                  Lesson {lesson.lesson_number}
                </span>
                <h1 className="font-serif text-2xl md:text-3xl text-foreground mt-1">
                  {lesson.title}
                </h1>
                {lesson.description && (
                  <p className="text-muted-foreground mt-2">{lesson.description}</p>
                )}
              </div>

              {/* Audio Player */}
              {lesson.audio_url && (
                <div className="mb-8 p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-sans text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Guided Practice
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRestartAudio}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restart
                    </Button>
                  </div>
                  <audio 
                    ref={audioRef}
                    controls 
                    className="w-full"
                    src={lesson.audio_url}
                    onTimeUpdate={handleTimeUpdate}
                    onPause={handleTimeUpdate}
                  >
                    Your browser does not support the audio element.
                  </audio>
                  {existingEntry?.audio_position && existingEntry.audio_position > 0 && (
                    <p className="text-xs text-primary mt-2">
                      Resuming from where you left off
                    </p>
                  )}
                  {lesson.audio_timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      The guided practice begins at {lesson.audio_timestamp}.
                    </p>
                  )}
                </div>
              )}

              {/* Lesson Content */}
              <div className="prose prose-invert max-w-none mb-12">
                <FormattedContent content={lesson.content} />
              </div>

              {/* Survey/Journal Section */}
              {(lesson.survey_question || true) && (
                <div className="bg-card border border-border rounded-lg p-6 mb-8">
                  <h3 className="font-serif text-xl text-foreground mb-4">
                    Reflection
                  </h3>
                  
                  {lesson.survey_question && lesson.survey_options.length > 0 && (
                    <div className="mb-6">
                      <p className="text-foreground mb-4">{lesson.survey_question}</p>
                      <RadioGroup
                        value={selectedAnswer}
                        onValueChange={setSelectedAnswer}
                        className="space-y-3"
                      >
                        {lesson.survey_options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <Label 
                              htmlFor={`option-${index}`}
                              className="text-foreground cursor-pointer"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="journal" className="text-foreground">
                      Journal your thoughts (optional)
                    </Label>
                    <Textarea
                      id="journal"
                      value={journalText}
                      onChange={(e) => setJournalText(e.target.value)}
                      placeholder="Write your reflections here..."
                      className="min-h-[150px] bg-background"
                    />
                  </div>

                  <Button
                    onClick={() => saveJournalMutation.mutate()}
                    disabled={saveJournalMutation.isPending}
                    className="mt-4"
                  >
                    {saveJournalMutation.isPending ? 'Saving...' : 'Save Reflections'}
                  </Button>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-8 border-t border-border">
                {prevLesson ? (
                  <Button
                    variant="outline"
                    onClick={() => navigateToLesson(prevLesson.id)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Lesson {prevLesson.lesson_number}</span>
                  </Button>
                ) : (
                  <div />
                )}

                {nextLesson ? (
                  <Button
                    onClick={() => navigateToLesson(nextLesson.id)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm">Lesson {nextLesson.lesson_number}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate(`/devotion/course/${courseId}`)}
                    className="flex items-center gap-2"
                  >
                    Complete Course
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LessonPage;
