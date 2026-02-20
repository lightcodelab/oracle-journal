import { motion } from "framer-motion";
import { useRitesCourses } from "@/hooks/useRitesCourses";
import ResourceCard from "@/components/devotion/ResourceCard";
import type { ContentResource } from "@/hooks/useContentByLocation";

const COMING_SOON_RITE_IDS = new Set([
  '36df1ff9-1ac3-445d-b834-6b6ce8b3a02d', // Rite I
  'f5510d55-c142-4272-9358-4e7be13e608b', // Rite II
  '41d04a99-17bb-4122-9339-0cb728b03ba9', // Rite III
  '3a18f8ca-b1af-470f-9d34-65f0db06bf9c', // Rite IV
  '66980be1-4fe9-4eee-9546-074938cf6aa5', // Rite V
]);

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
              resource={{
                ...course,
                source: (course.source === 'legacy' ? 'content' : course.source) as ContentResource['source'],
              }} 
              index={index} 
              showDraftBadge={isAdmin}
              basePath="/decks"
              comingSoon={COMING_SOON_RITE_IDS.has(course.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RitesOfRemembranceSection;
