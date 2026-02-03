import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Loader2, BookOpen, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
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

interface ContentResource {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  is_course: boolean;
  updated_at: string;
  resource_type_id: string | null;
  location_id: string | null;
}

interface Category {
  id: string;
  name: string;
  type: 'resource_type' | 'location';
}

interface ContentLibraryProps {
  onEdit: (resourceId: string) => void;
  onNew: () => void;
}

const ContentLibrary = ({ onEdit, onNew }: ContentLibraryProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ContentResource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    Promise.all([fetchResources(), fetchCategories()]);
  }, []);

  const fetchResources = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('content_resources')
      .select(`
        id,
        title,
        slug,
        status,
        is_course,
        updated_at,
        resource_type_id,
        location_id
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resources.',
        variant: 'destructive',
      });
    } else {
      setResources((data || []) as ContentResource[]);
    }

    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('content_categories')
      .select('*')
      .eq('active', true)
      .order('name');

    if (data) {
      setCategories(data as Category[]);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('content_resources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete resource.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Resource has been removed.',
      });
      fetchResources();
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || resource.resource_type_id === filterType;
    
    const matchesLocation = filterLocation === 'all' || resource.location_id === filterLocation;
    
    const matchesStatus = filterStatus === 'all' || resource.status === filterStatus;

    return matchesSearch && matchesType && matchesLocation && matchesStatus;
  });

  const resourceTypes = categories.filter(c => c.type === 'resource_type');
  const locations = categories.filter(c => c.type === 'location');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Content Library</h2>
        <Button onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
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

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No resources found
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {resource.is_course ? (
                        <BookOpen className="w-4 h-4 text-primary" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{resource.title}</div>
                        <div className="text-xs text-muted-foreground">{resource.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {categories.find(c => c.id === resource.resource_type_id)?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {categories.find(c => c.id === resource.location_id)?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={resource.status === 'published' ? 'default' : 'secondary'}>
                      {resource.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(resource.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        title="View live content"
                      >
                        <a
                          href={resource.is_course 
                            ? `/devotion/courses/${resource.slug}` 
                            : `/devotion/resources/${resource.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(resource.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{resource.title}" and all associated content.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(resource.id)}>
                              Delete
                            </AlertDialogAction>
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
        {filteredResources.length} of {resources.length} resources
      </div>
    </div>
  );
};

export default ContentLibrary;
