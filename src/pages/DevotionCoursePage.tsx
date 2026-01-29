import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Play, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ContextualJournal from '@/components/journal/ContextualJournal';
import CourseSessionNav from '@/components/CourseSessionNav';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  lesson_number: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

const DevotionCoursePage = () => {
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
    queryKey: ['devotion-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data as Course;
    },
    enabled: !loading && !!courseId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['devotion-course-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, description, lesson_number')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true });

      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !loading && !!courseId,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ['devotion-lesson-progress', courseId, userId],
    queryFn: async () => {
      if (!userId || !lessons) return [];
      
      const lessonIds = lessons.map(l => l.id);
      const { data, error } = await supabase
        .from('lesson_journal_entries')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return data?.map(e => e.lesson_id) || [];
    },
    enabled: !loading && !!userId && !!lessons && lessons.length > 0,
  });

  const handleLessonClick = (lessonId: string) => {
    navigate(`/devotion/course/${courseId}/lesson/${lessonId}`);
  };

  if (loading || courseLoading || lessonsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading sessions...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-serif text-xl">
          Course not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      {lessons && lessons.length > 0 && courseId && (
        <CourseSessionNav
          lessons={lessons}
          completedLessonIds={journalEntries || []}
          courseId={courseId}
          courseTitle={course.title}
        />
      )}

      {/* Main Content Area - offset by sidebar width on desktop */}
      <div className="lg:ml-72">
        {/* Navigation Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <PageBreadcrumb 
            items={[
              { label: 'Door of Devotion', href: '/devotion' },
              { label: 'Energy Hygiene', href: '/devotion/energy-hygiene' },
              { label: course.title }
            ]} 
          />
          <ProfileDropdown />
        </div>

        {/* Content */}
        <div className="px-4 py-8 max-w-4xl mx-auto">
          {/* Course Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            {course.image_url && (
              <div className="mb-8 rounded-lg overflow-hidden max-w-2xl mx-auto">
                <img
                  src={course.image_url}
                  alt={course.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
                {course.description}
              </p>
            )}
          </motion.div>

          {/* Lessons List */}
          <div className="space-y-4">
            {lessons && lessons.length > 0 ? (
              lessons.map((lesson, index) => {
                const hasStarted = journalEntries?.includes(lesson.id);
                
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => handleLessonClick(lesson.id)}
                    className="cursor-pointer group"
                  >
                    <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:border-primary/30">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        {hasStarted ? (
                          <CheckCircle className="w-6 h-6 text-primary" />
                        ) : (
                          <Play className="w-5 h-5 text-primary ml-0.5" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                          Session {lesson.lesson_number}: {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p className="text-muted-foreground text-sm mt-1">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-sans">
                  Sessions are being prepared for this course.
                </p>
              </div>
            )}
          </div>

          {/* Course-level Journal */}
          {courseId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <ContextualJournal
                contextType="course"
                contextId={courseId}
                contextTitle={course.title}
                placeholder="Capture your overall course insights and reflections..."
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevotionCoursePage;
