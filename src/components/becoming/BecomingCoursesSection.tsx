import { useMemo } from "react";
import { motion } from "framer-motion";
import ResourceCard from "@/components/devotion/ResourceCard";
import { useRemembranceCourses } from "@/hooks/useRemembranceCourses";

export function BecomingCoursesSection({ limit }: { limit?: number }) {
  const { courses, loading, error, isAdmin } = useRemembranceCourses();
  // With a limit (home page strip), show a random selection that stays put for this visit.
  const visibleCourses = useMemo(() => {
    if (typeof limit !== "number") return courses;
    const shuffled = [...courses];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, limit);
  }, [courses, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse font-serif text-primary">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return <p className="py-12 text-center text-muted-foreground">Unable to load courses. Please try again later.</p>;
  }

  if (courses.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Courses for this Door are coming soon.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {visibleCourses.map((course, index) => (
        <ResourceCard
          key={course.id}
          resource={course}
          index={index}
          showDraftBadge={isAdmin}
          basePath="/becoming"
        />
      ))}
    </motion.div>
  );
}