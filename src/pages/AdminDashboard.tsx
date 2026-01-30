import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Upload, Settings, Video } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';

const adminTasks = [
  {
    title: 'Manage Live Sessions',
    description: 'Create, edit, and manage live readings, classes, and workshops',
    icon: Calendar,
    href: '/admin/live-sessions',
  },
  {
    title: 'Session Replays',
    description: 'Upload and manage replay videos from completed live sessions',
    icon: Video,
    href: '/admin/session-replays',
  },
  {
    title: 'Content Uploader',
    description: 'Upload and manage courses, resources, and media content',
    icon: Upload,
    href: '/admin/content',
  },
  {
    title: 'AreekeerA Admin',
    description: 'Manage the AreekeerA healing protocol system',
    icon: Settings,
    href: '/devotion/areekeera/admin',
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        navigate('/devotion');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: 'Admin Dashboard' }]} />
        <ProfileDropdown />
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your Temple of Sustainment content and sessions
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {adminTasks.map((task, index) => {
              const Icon = task.icon;
              return (
                <motion.div
                  key={task.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] h-full"
                    onClick={() => navigate(task.href)}
                  >
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-serif">
                          {task.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {task.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
