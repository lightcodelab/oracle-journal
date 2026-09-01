import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Play, CheckCircle, DoorOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ContextualJournal from '@/components/journal/ContextualJournal';
import CourseSessionNav from '@/components/CourseSessionNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import { ToolDetailDialog } from '@/components/tools/ToolDetailDialog';
import DOMPurify from 'dompurify';
import { looksLikeHtml } from '@/lib/richText';
import { livingPatternToolRoute } from '@/lib/livingPatternTools';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  lesson_number: number;
  module_title: string | null;
  module_order: number | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location_id?: string | null;
}

const DevotionCoursePage = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeToolSlug, setActiveToolSlug] = useState<string | null>(null);

  const openTool = (slug: string) => {
    const livingRoute = livingPatternToolRoute(slug);
    if (livingRoute) {
      navigate(livingRoute);
      return;
    }
    setActiveToolSlug(slug);
  };

  useEffect(() => {
    const t = searchParams.get('tool');
    if (t) openTool(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


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
        .select('*, location:content_categories!courses_location_id_fkey(id, name, slug)')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data as Course & { location?: { id: string; name: string; slug: string } | null };
    },
    enabled: !loading && !!courseId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['devotion-course-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, description, lesson_number, module_title, module_order')
        .eq('course_id', courseId)
        .order('module_order', { ascending: true, nullsFirst: false })
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
        .not('completed_at', 'is', null)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return data?.map(e => e.lesson_id) || [];
    },
    enabled: !loading && !!userId && !!lessons && lessons.length > 0,
  });

  const { data: trackingTools } = useQuery({
    queryKey: ['course-tracking-tools', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('course_transformation_tools')
        .select('display_order, tool:transformation_tools(id, slug, title, short_description, is_published)')
        .eq('course_id', courseId)
        .order('display_order');
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.tool)
        .filter((t: any) => t && t.is_published);
    },
    enabled: !loading && !!courseId,
  });

  const handleLessonClick = (lessonId: string) => {
    navigate(`/devotion/course/${courseId}/lesson/${lessonId}`);
  };

  const isDeepeningCourse = (course as any)?.location?.name === 'Deepening Courses';

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
      <div className="ml-0 md:ml-72">
        {/* Navigation Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pl-14 pr-4 py-3 md:px-4 flex items-center justify-between">
          {(() => {
            const locName = (course as any).location?.name as string | undefined;
            const locSlug = (course as any).location?.slug as string | undefined;
            const isRemembrance = locName === 'The Alchemy of Becoming' || locName === 'The Rites of Remembrance' || locName === 'Deepening Courses';
            const isDeepening = locName === 'Deepening Courses';
            const doorCrumb = isRemembrance
              ? { label: 'The Door of Remembrance', href: '/remembrance', icon: DoorOpen }
              : { label: 'The Door of Devotion', href: '/devotion', icon: DoorOpen };
            const sectionCrumb = locName
              ? {
                  label: isDeepening ? 'Companion Courses' : locName,
                  href: isDeepening
                    ? '/remembrance/companion-courses'
                    : isRemembrance
                      ? `/remembrance/section/${locSlug?.replace(/^loc-/, '') ?? ''}`
                      : `/devotion/section/${locSlug?.replace(/^loc-/, '') ?? ''}`,
                }
              : null;
            return (
              <PageBreadcrumb
                items={[
                  doorCrumb,
                  ...(sectionCrumb ? [sectionCrumb] : []),
                  { label: course.title },
                ]}
              />
            );
          })()}
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
              looksLikeHtml(course.description) ? (
                <div
                  className="prose prose-sm dark:prose-invert font-sans text-muted-foreground max-w-2xl mx-auto text-left leading-snug prose-headings:font-serif prose-headings:text-foreground prose-headings:my-3 prose-p:my-2 prose-strong:text-foreground prose-a:text-primary prose-li:marker:text-primary prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5 prose-ul:my-2 prose-ol:my-2"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description) }}
                />
              ) : (
                <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
                  {course.description}
                </p>
              )
            )}
          </motion.div>

          {trackingTools && trackingTools.length > 0 ? (
            <Tabs defaultValue="sessions" className="w-full">
              <TabsList>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="tracking">Relevant Tracking Tools</TabsTrigger>
              </TabsList>
              <TabsContent value="sessions" className="mt-6">
                <LessonsList
                  lessons={lessons}
                  journalEntries={journalEntries}
                  onLessonClick={handleLessonClick}
                  hideSessionLabel={isDeepeningCourse}
                />
              </TabsContent>
              <TabsContent value="tracking" className="mt-6 space-y-4">
                {trackingTools.map((tool: any, index: number) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    onClick={() => openTool(tool.slug)}
                    className="cursor-pointer group"
                  >
                    <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:border-primary/30">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
                          {tool.title}
                        </h3>
                        {tool.short_description && (
                          <p className="text-muted-foreground text-sm mt-1">{tool.short_description}</p>
                        )}
                        {tool.slug === 'living-pattern-open' && (
                          <p className="text-muted-foreground text-sm mt-2 italic">
                            This is a private laboratory, not homework. Open a tool only when it helps you meet the life that is actually here.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <LessonsList
              lessons={lessons}
              journalEntries={journalEntries}
              onLessonClick={handleLessonClick}
              hideSessionLabel={isDeepeningCourse}
            />
          )}

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
      <ToolDetailDialog
        slug={activeToolSlug}
        open={!!activeToolSlug}
        onClose={() => {
          setActiveToolSlug(null);
          if (searchParams.get('tool')) {
            searchParams.delete('tool');
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
    </div>
  );
};

const LessonsList = ({
  lessons,
  journalEntries,
  onLessonClick,
  hideSessionLabel = false,
}: {
  lessons: Lesson[] | undefined;
  journalEntries: string[] | undefined;
  onLessonClick: (id: string) => void;
  hideSessionLabel?: boolean;
}) => {
  if (!lessons || lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground font-sans">
          Sessions are being prepared for this course.
        </p>
      </div>
    );
  }

  // Group lessons by module_title, preserving module_order for module groups
  const moduleOrderMap = new Map<string, number>();
  lessons.forEach((l) => {
    const key = l.module_title || '';
    const existing = moduleOrderMap.get(key);
    const order = l.module_order ?? Number.MAX_SAFE_INTEGER;
    if (existing === undefined || order < existing) {
      moduleOrderMap.set(key, order);
    }
  });

  const moduleKeys = Array.from(moduleOrderMap.keys()).sort((a, b) => {
    // Empty (unassigned) goes last
    if (a === '' && b !== '') return 1;
    if (b === '' && a !== '') return -1;
    return (moduleOrderMap.get(a) ?? 0) - (moduleOrderMap.get(b) ?? 0);
  });

  let globalIndex = 0;

  const renderLesson = (lesson: Lesson) => {
    const hasStarted = journalEntries?.includes(lesson.id);
    const delay = globalIndex * 0.06;
    globalIndex += 1;
    return (
      <motion.div
        key={lesson.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay }}
        onClick={() => onLessonClick(lesson.id)}
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
              {hideSessionLabel ? lesson.title : `Session ${lesson.lesson_number}: ${lesson.title}`}
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
  };

  const hasAnyModule = moduleKeys.some((k) => k !== '');

  return (
    <div className="space-y-8">
      {moduleKeys.map((moduleKey) => {
        const moduleLessons = lessons
          .filter((l) => (l.module_title || '') === moduleKey)
          .sort((a, b) => a.lesson_number - b.lesson_number);
        if (moduleLessons.length === 0) return null;

        return (
          <div key={moduleKey || '__unassigned__'} className="space-y-4">
            {moduleKey ? (
              <div className="border-b border-border pb-2">
                <h2 className="font-serif text-2xl text-primary">{moduleKey}</h2>
              </div>
            ) : hasAnyModule ? (
              <div className="border-b border-border pb-2">
                <h2 className="font-serif text-2xl text-muted-foreground">Additional Sessions</h2>
              </div>
            ) : null}
            <div className="space-y-4">
              {moduleLessons.map(renderLesson)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DevotionCoursePage;
