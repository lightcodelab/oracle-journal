import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import CourseForm from '@/components/admin/CourseForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Course {
  id: string;
  title: string;
  description: string | null;
  door_type: string;
  is_published: boolean;
  display_order: number | null;
  location_id: string | null;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  type: 'resource_type' | 'location';
}

type View = 'list' | 'form';

const CourseAdmin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) { navigate('/devotion'); return; }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!loading) {
      fetchCourses();
      fetchCategories();
    }
  }, [loading]);

  // Deep-link: /admin/courses?edit=<courseId> opens that course's editor directly.
  useEffect(() => {
    if (loading) return;
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingCourseId(editId);
      setView('form');
    }
  }, [loading, searchParams]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load courses.', variant: 'destructive' });
    } else {
      setCourses((data || []) as Course[]);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('content_categories')
      .select('*')
      .eq('active', true)
      .eq('type', 'location')
      .order('name');

    if (data) setCategories(data as Category[]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete course.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Course has been removed.' });
      fetchCourses();
    }
  };

  const handleEdit = (courseId: string) => {
    setEditingCourseId(courseId);
    setView('form');
  };

  const handleNew = () => {
    setEditingCourseId(null);
    setView('form');
  };

  const handleFormSuccess = () => {
    setEditingCourseId(null);
    setView('list');
    if (searchParams.get('edit')) setSearchParams({}, { replace: true });
    fetchCourses();
  };

  const handleFormCancel = () => {
    setEditingCourseId(null);
    setView('list');
    if (searchParams.get('edit')) setSearchParams({}, { replace: true });
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filterLocation === 'all' || course.location_id === filterLocation;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'published' ? course.is_published : !course.is_published);
    return matchesSearch && matchesLocation && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <PageBreadcrumb
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Course Uploader' },
            ]}
          />
          <ProfileDropdown />
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-4">
          <h1 className="text-2xl font-serif text-foreground">Course Uploader</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and manage courses with modules and lessons</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Courses</h2>
              <Button onClick={handleNew}>
                <Plus className="w-4 h-4 mr-2" />
                New Course
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No courses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span className="font-medium">{course.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {categories.find(c => c.id === course.location_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={course.is_published ? 'default' : 'secondary'}>
                            {course.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>{course.display_order ?? '-'}</TableCell>
                        <TableCell>
                          {format(new Date(course.updated_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(course.id)} title="Edit">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{course.title}" and all its lessons.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(course.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredCourses.length} of {courses.length} courses
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleFormCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Button>
              <h2 className="font-serif text-lg">
                {editingCourseId ? 'Edit Course' : 'New Course'}
              </h2>
            </div>
            <CourseForm
              courseId={editingCourseId || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseAdmin;
