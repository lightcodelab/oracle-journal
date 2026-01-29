import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  lesson_number: number;
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

  const handleLessonClick = (lessonId: string) => {
    navigate(`/devotion/course/${courseId}/lesson/${lessonId}`);
  };

  const handleBackToCourse = () => {
    navigate(`/devotion/course/${courseId}`);
  };

  const completedCount = lessons.filter(l => completedLessonIds.includes(l.id)).length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  const navContent = (
    <>
      {/* Course Header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={handleBackToCourse}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Course
        </button>
        {courseTitle && (
          <h2 className="font-serif text-lg text-foreground leading-tight">
            {courseTitle}
          </h2>
        )}
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
        <div className="space-y-0.5">
          {lessons.map((lesson) => {
            const isActive = lesson.id === currentLessonId;
            const isCompleted = completedLessonIds.includes(lesson.id);

            return (
              <button
                key={lesson.id}
                onClick={() => handleLessonClick(lesson.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors",
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
          })}
        </div>
      </nav>
    </>
  );

  return (
    <aside className="fixed top-0 left-0 h-full w-64 md:w-72 bg-card border-r border-border flex flex-col z-40">
      {navContent}
    </aside>
  );
}
