import { useNavigate, useParams } from 'react-router-dom';
import { Play, CheckCircle } from 'lucide-react';
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
}

export default function CourseSessionNav({
  lessons,
  completedLessonIds = [],
  courseId,
  currentLessonId,
}: CourseSessionNavProps) {
  const navigate = useNavigate();

  const handleLessonClick = (lessonId: string) => {
    navigate(`/devotion/course/${courseId}/lesson/${lessonId}`);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-serif text-lg text-foreground mb-4 px-2">Sessions</h3>
      <nav className="space-y-1">
        {lessons.map((lesson) => {
          const isActive = lesson.id === currentLessonId;
          const isCompleted = completedLessonIds.includes(lesson.id);

          return (
            <button
              key={lesson.id}
              onClick={() => handleLessonClick(lesson.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  lesson.lesson_number
                )}
              </div>
              <span className={cn(
                "text-sm truncate",
                isActive && "font-medium"
              )}>
                {lesson.title}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
