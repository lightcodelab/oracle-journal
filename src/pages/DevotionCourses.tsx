import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ProfileDropdown from '@/components/ProfileDropdown';

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

const DevotionCourses = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['devotion-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('door_type', 'devotion')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Course[];
    },
    enabled: !loading,
  });

  const handleCourseClick = (courseId: string) => {
    navigate(`/devotion/course/${courseId}`);
  };

  if (loading || coursesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading practices...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <Button
          onClick={() => navigate('/devotion')}
          variant="ghost"
          size="sm"
          className="text-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Door of Devotion
        </Button>
        <ProfileDropdown />
      </div>

      <div className="max-w-6xl mx-auto pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            Energy Hygiene Practices
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            Tools for clearing and protecting your energetic field.
          </p>
        </motion.div>

        {/* Course Grid */}
        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                onClick={() => handleCourseClick(course.id)}
                className="cursor-pointer group"
              >
                <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:border-primary/30">
                  {course.image_url ? (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-primary/50 font-serif text-2xl">✦</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground font-sans text-lg">
              New practices are being prepared for you.
            </p>
            <p className="text-muted-foreground/70 font-sans text-sm mt-2">
              Check back soon.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DevotionCourses;
