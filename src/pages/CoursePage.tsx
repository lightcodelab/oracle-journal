import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, BookOpen, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Lesson {
  id: string;
  lesson_number: number;
  title: string;
  description: string | null;
}

interface JournalEntry {
  lesson_id: string;
}

const CoursePage = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!courseId && !loading,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, lesson_number, title, description')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true });

      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!courseId && !loading,
  });

  const { data: completedLessons } = useQuery({
    queryKey: ['completed-lessons', courseId, userId],
    queryFn: async () => {
      if (!userId || !lessons) return [];
      
      const lessonIds = lessons.map(l => l.id);
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return (data as JournalEntry[]).map(e => e.lesson_id);
    },
    enabled: !!userId && !!lessons && lessons.length > 0,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleLessonClick = (lessonId: string) => {
    navigate(`/devotion/course/${courseId}/lesson/${lessonId}`);
  };

  if (loading || courseLoading || lessonsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading course...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Course not found</p>
          <Button onClick={() => navigate('/devotion')}>
            Return to Door of Devotion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            onClick={() => navigate('/devotion')}
            variant="ghost"
            size="sm"
            className="text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="text-foreground/70 hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="pt-16 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:block w-80 border-r border-border bg-card/50 fixed left-0 top-16 bottom-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h2 className="font-serif text-xl text-foreground mb-2">{course.title}</h2>
              {course.description && (
                <p className="text-muted-foreground text-sm mb-6">{course.description}</p>
              )}
              
              <nav className="space-y-2">
                {lessons?.map((lesson) => {
                  const isCompleted = completedLessons?.includes(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => handleLessonClick(lesson.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors group flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                        )}
                      </span>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Lesson {lesson.lesson_number}
                        </span>
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {lesson.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-80">
          <div className="max-w-3xl mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-muted-foreground text-lg mb-8">
                  {course.description}
                </p>
              )}

              {/* Mobile Lesson List */}
              <div className="md:hidden mb-8">
                <h3 className="font-sans text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Course Lessons
                </h3>
                <div className="space-y-2">
                  {lessons?.map((lesson) => {
                    const isCompleted = completedLessons?.includes(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson.id)}
                        className="w-full text-left p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors flex items-center gap-3"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Lesson {lesson.lesson_number}
                          </span>
                          <p className="text-foreground">{lesson.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Course CTA */}
              {lessons && lessons.length > 0 && (
                <div className="text-center">
                  <Button
                    onClick={() => handleLessonClick(lessons[0].id)}
                    size="lg"
                    className="font-sans"
                  >
                    Begin Your Journey
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoursePage;
