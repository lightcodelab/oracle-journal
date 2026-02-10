import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useRemembranceCourses } from "@/hooks/useRemembranceCourses";
import ResourceCard from "@/components/devotion/ResourceCard";

const RemembranceCourseSection = () => {
  const { courses, loading, error, isAdmin } = useRemembranceCourses();
  const navigate = useNavigate();

  // Don't render if no courses and not admin (nothing to show)
  if (!loading && courses.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="text-3xl mb-2">🜃</div>
        <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
          The Alchemy of Becoming
        </h2>
        <p className="font-bold text-primary font-sans text-base mb-3">
          Mini-Courses for Integration &amp; Identity
        </p>
        <div className="text-muted-foreground font-sans text-base max-w-2xl mx-auto space-y-3">
          <p>
            These journeys help you integrate what the Mirrors reveal — stabilising triggers, excavating belief, and reshaping identity.
          </p>
          <p>Enter these when something has already been seen.</p>
          <p>
            This is not about fixing yourself.
            <br />
            It is about becoming capable of holding what you know.
          </p>
        </div>
      </motion.div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary font-serif">
            Loading courses...
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Unable to load courses. Please try again later.</p>
        </div>
      ) : courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground font-sans">
            Courses for this section are coming soon.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Check back later for new content.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {courses.map((course, index) => (
            <ResourceCard 
              key={course.id} 
              resource={course} 
              index={index} 
              showDraftBadge={isAdmin}
              basePath="/decks"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RemembranceCourseSection;
