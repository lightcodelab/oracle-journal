import { motion } from "framer-motion";
import { useRitesCourses } from "@/hooks/useRitesCourses";
import ResourceCard from "@/components/devotion/ResourceCard";

const RitesOfRemembranceSection = () => {
  const { courses, loading, error, isAdmin } = useRitesCourses();

  if (!loading && courses.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground font-sans">
          Coming soon.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary font-serif">
            Loading rites...
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Unable to load rites. Please try again later.</p>
        </div>
      ) : courses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-muted-foreground font-sans">
            Rites for this section are coming soon.
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

export default RitesOfRemembranceSection;
