import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ProfileDropdown from '@/components/ProfileDropdown';
import ResourceCard from '@/components/devotion/ResourceCard';
import { Button } from '@/components/ui/button';
import { useAllCourses } from '@/hooks/useAllCourses';

const AllCourses = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? 'all';
  const { items, categories, loading, error, isAdmin } = useAllCourses();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        navigate('/auth');
        return;
      }
      setAuthChecked(true);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/auth');
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [navigate]);

  const setCategory = (slug: string) => {
    if (slug === 'all') setSearchParams({}, { replace: true });
    else setSearchParams({ category: slug }, { replace: true });
  };

  const visible = activeCategory === 'all'
    ? items
    : items.filter((item) => item.categorySlug === activeCategory);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Loading courses…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-6xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <PageBreadcrumb items={[{ label: 'All Courses', icon: GraduationCap }]} />
        <ProfileDropdown />
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">All Courses</h1>
          <p className="text-muted-foreground font-sans max-w-2xl">
            Every course offering in The Temple, gathered in one place. Filter by category to find
            the path you are ready for.
          </p>
        </motion.div>

        {/* Sub navigation — filter by course category */}
        <nav aria-label="Filter courses by category" className="mb-8 border-b border-border/60">
          <div className="flex gap-1 overflow-x-auto pb-2 -mb-px">
            {[{ name: 'All', slug: 'all', count: items.length }, ...categories].map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setCategory(cat.slug)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 font-sans text-sm transition-colors border-b-2 ${
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.name}
                  <span className="ml-1.5 text-xs text-muted-foreground/70">{cat.count}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-primary font-serif">Loading courses…</div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Unable to load courses. Please try again later.</p>
            <Button variant="ghost" className="mt-4" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-sans">No courses in this category yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Check back later for new courses.</p>
          </div>
        ) : (
          <div className={visible.length === 1
            ? 'grid grid-cols-1 gap-6 max-w-sm mx-auto'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
            {visible.map((item, index) => (
              <ResourceCard
                key={item.resource.id}
                resource={item.resource}
                index={index}
                showDraftBadge={isAdmin}
                basePath={item.basePath}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AllCourses;