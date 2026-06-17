import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Lesson {
  id: string;
  title: string;
  lesson_number: number;
  module_title?: string | null;
  module_order?: number | null;
}

interface CourseSessionNavProps {
  lessons: Lesson[];
  completedLessonIds?: string[];
  courseId: string;
  currentLessonId?: string;
  courseTitle?: string;
}

export default function CourseSessionNav({
  lessons,
  completedLessonIds = [],
  courseId,
  currentLessonId,
  courseTitle,
}: CourseSessionNavProps) {
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLessonClick = (lessonId: string) => {
    setIsMobileOpen(false);
    navigate(`/devotion/course/${courseId}/lesson/${lessonId}`);
  };

  const { data: trackingTools } = useQuery({
    queryKey: ['course-tracking-tools-nav', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('course_transformation_tools')
        .select('display_order, tool:transformation_tools(id, slug, title, is_published)')
        .eq('course_id', courseId)
        .order('display_order');
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.tool)
        .filter((t: any) => t && t.is_published);
    },
    enabled: !!courseId,
  });

  const handleToolClick = (slug: string) => {
    setIsMobileOpen(false);
    navigate(`/devotion/course/${courseId}?tool=${encodeURIComponent(slug)}`);
  };

  const completedCount = lessons.filter(l => completedLessonIds.includes(l.id)).length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  // Group lessons by module
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
    if (a === '' && b !== '') return 1;
    if (b === '' && a !== '') return -1;
    return (moduleOrderMap.get(a) ?? 0) - (moduleOrderMap.get(b) ?? 0);
  });
  const hasAnyModule = moduleKeys.some((k) => k !== '');

  const renderLessonButton = (lesson: Lesson) => {
    const isActive = lesson.id === currentLessonId;
    const isCompleted = completedLessonIds.includes(lesson.id);
    return (
      <button
        key={lesson.id}
        onClick={() => handleLessonClick(lesson.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
          isActive
            ? "bg-primary/10 text-primary border-l-2 border-primary"
            : "text-foreground/70 hover:bg-muted hover:text-foreground"
        )}
      >
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
          isActive
            ? "bg-primary text-primary-foreground"
            : isCompleted
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
        )}>
          {isCompleted ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            lesson.lesson_number
          )}
        </div>
        <span className={cn(
          "text-sm leading-tight",
          isActive && "font-medium"
        )}>
          {lesson.title}
        </span>
      </button>
    );
  };

  const navContent = (
    <>
      {/* Course Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          {courseTitle && (
            <h2 className="font-serif text-lg text-foreground leading-tight">
              {courseTitle}
            </h2>
          )}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1 hover:bg-muted rounded ml-2"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{completedCount} of {lessons.length} complete</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-4">
          {moduleKeys.map((moduleKey) => {
            const moduleLessons = lessons
              .filter((l) => (l.module_title || '') === moduleKey)
              .sort((a, b) => a.lesson_number - b.lesson_number);
            if (moduleLessons.length === 0) return null;
            return (
              <div key={moduleKey || '__unassigned__'} className="space-y-1">
                {moduleKey ? (
                  <div className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-primary/80">
                    {moduleKey}
                  </div>
                ) : hasAnyModule ? (
                  <div className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Additional Sessions
                  </div>
                ) : null}
                <div className="space-y-0.5">
                  {moduleLessons.map(renderLessonButton)}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {trackingTools && trackingTools.length > 0 && (
        <div className="border-t border-border p-2">
          <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tracking Tools
          </div>
          <div className="space-y-0.5">
            {trackingTools.map((tool: any) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.slug)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm leading-tight">{tool.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          "md:hidden fixed top-3 left-3 z-50 p-2 bg-card border border-border rounded-lg shadow-lg transition-opacity",
          isMobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 md:w-72 bg-card border-r border-border flex flex-col transition-transform duration-300",
          isMobileOpen ? "translate-x-0 z-50" : "-translate-x-full md:translate-x-0 z-40"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
