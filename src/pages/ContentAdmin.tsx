import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Settings } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import ContentLibrary from '@/components/admin/ContentLibrary';
import ContentResourceForm from '@/components/admin/ContentResourceForm';
import CategoryManager from '@/components/admin/CategoryManager';
type View = 'library' | 'form' | 'categories';

const ContentAdmin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>('library');
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle ?edit=resourceId query parameter
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !loading) {
      setEditingResourceId(editId);
      setView('form');
      // Clear the query param after processing
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading, setSearchParams]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // UX-only admin check: This prevents non-admins from seeing the admin UI.
      // SECURITY NOTE: Actual authorization is enforced by RLS policies on all tables.
      // The has_role() SECURITY DEFINER function and RLS policies prevent unauthorized
      // data access even if this client-side check is bypassed.
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

  const handleEdit = (resourceId: string) => {
    setEditingResourceId(resourceId);
    setView('form');
  };

  const handleNew = () => {
    setEditingResourceId(null);
    setView('form');
  };

  const handleFormSuccess = () => {
    setEditingResourceId(null);
    setView('library');
  };

  const handleFormCancel = () => {
    setEditingResourceId(null);
    setView('library');
  };

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
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <PageBreadcrumb 
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Content Uploader' }
            ]} 
          />
          <ProfileDropdown />
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-4">
          <h1 className="text-2xl font-serif text-foreground">Content Uploader</h1>
          <p className="text-sm text-muted-foreground">Upload and manage courses, resources, and media content</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {view === 'library' && (
          <Tabs defaultValue="resources" className="space-y-6">
            <TabsList>
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources">
              <ContentLibrary onEdit={handleEdit} onNew={handleNew} />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManager />
            </TabsContent>
          </Tabs>
        )}

        {view === 'form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleFormCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Button>
              <h2 className="font-serif text-lg">
                {editingResourceId ? 'Edit Resource' : 'New Resource'}
              </h2>
            </div>
            <ContentResourceForm
              resourceId={editingResourceId || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAdmin;
