import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Edit, Trash2, Loader2, ExternalLink, Copy,
  Sparkles, Eye, BookOpen, Users, AlertTriangle, UtensilsCrossed
} from 'lucide-react';
import { format } from 'date-fns';
import { SITE_CONFIG } from '@/lib/siteConfig';
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

type Modality = 'meditation' | 'visualisation' | 'ritual' | 'somatic' | 'process' | 'recipe';
type ResourceStatus = 'draft' | 'review' | 'published';

interface HealingResource {
  id: string;
  title: string;
  slug: string | null;
  modality: Modality;
  intensity: number;
  duration_sec: number | null;
  status: ResourceStatus;
  location_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  name: string;
}

const modalityOptions: { value: Modality; label: string; icon: React.ReactNode }[] = [
  { value: 'meditation', label: 'Meditation', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'visualisation', label: 'Visualisation', icon: <Eye className="w-4 h-4" /> },
  { value: 'ritual', label: 'Ritual', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'somatic', label: 'Somatic', icon: <Users className="w-4 h-4" /> },
  { value: 'process', label: 'Process', icon: <AlertTriangle className="w-4 h-4" /> },
  { value: 'recipe', label: 'Recipe', icon: <UtensilsCrossed className="w-4 h-4" /> },
];

interface HealingResourceLibraryProps {
  onEdit: (resourceId: string) => void;
  onNew: () => void;
}

const HealingResourceLibrary = ({ onEdit, onNew }: HealingResourceLibraryProps) => {
  const { toast } = useToast();
  const [resources, setResources] = useState<HealingResource[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');
  const [modalityFilter, setModalityFilter] = useState<Modality | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([loadResources(), loadLocations()]);
  }, []);

  const loadResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('healing_resources')
      .select('id, title, slug, modality, intensity, duration_sec, status, location_id, created_at, updated_at')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error loading resources:', error);
      toast({
        title: 'Error loading resources',
        variant: 'destructive',
      });
    } else {
      setResources((data || []) as HealingResource[]);
    }
    setLoading(false);
  };

  const loadLocations = async () => {
    const { data } = await supabase
      .from('content_categories')
      .select('id, name')
      .eq('type', 'location')
      .eq('active', true)
      .order('display_order');

    if (data) {
      setLocations(data);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('healing_resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Resource deleted' });
      await loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error deleting resource',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      // Fetch the original resource
      const { data: original, error: fetchError } = await supabase
        .from('healing_resources')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !original) {
        throw new Error('Failed to fetch resource');
      }

      // Create duplicate with modified title
      const timestamp = Date.now();
      const { data: newResource, error: insertError } = await supabase
        .from('healing_resources')
        .insert({
          title: `${original.title} (Copy)`,
          slug: original.slug ? `${original.slug}-copy-${timestamp}` : null,
          summary: original.summary,
          modality: original.modality,
          intensity: original.intensity,
          duration_sec: original.duration_sec,
          teaching_description: original.teaching_description,
          body_richtext: original.body_richtext,
          display_image_url: original.display_image_url,
          vimeo_embed_url: original.vimeo_embed_url,
          audio_file_url: original.audio_file_url,
          tier: original.tier,
          locale: original.locale,
          location_id: original.location_id,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError || !newResource) {
        throw new Error('Failed to create duplicate');
      }

      // Copy symptom mappings if any
      const { data: symptomMappings } = await supabase
        .from('resource_symptom_mappings')
        .select('*')
        .eq('resource_id', id);

      if (symptomMappings && symptomMappings.length > 0) {
        await supabase.from('resource_symptom_mappings').insert(
          symptomMappings.map(mapping => ({
            resource_id: newResource.id,
            symptom_id: mapping.symptom_id,
          }))
        );
      }

      toast({ title: 'Resource duplicated. Opening editor...' });
      await loadResources();
      onEdit(newResource.id);
    } catch (error) {
      console.error('Error duplicating resource:', error);
      toast({
        title: 'Error duplicating resource',
        variant: 'destructive',
      });
    }
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.slug?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesModality = modalityFilter === 'all' || r.modality === modalityFilter;
    const matchesLocation = locationFilter === 'all' || r.location_id === locationFilter;
    return matchesSearch && matchesStatus && matchesModality && matchesLocation;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModalityLabel = (modality: Modality) => {
    return modalityOptions.find(m => m.value === modality)?.label || modality;
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return '-';
    return locations.find(l => l.id === locationId)?.name || '-';
  };

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
        <h2 className="text-lg font-semibold">Resource Library</h2>
        <Button onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={modalityFilter} onValueChange={(v) => setModalityFilter(v as Modality | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Modality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modalities</SelectItem>
            {modalityOptions.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ResourceStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Title</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No resources found. Create your first healing resource.
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {resource.slug || resource.id.substring(0, 8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getModalityLabel(resource.modality)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getLocationName(resource.location_id)}
                  </TableCell>
                  <TableCell>
                    {formatDuration(resource.duration_sec)}
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
                        title="View on live site"
                        asChild
                      >
                        <a
                          href={`${SITE_CONFIG.productionDomain}/devotion/resources/healing-${resource.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(resource.id)}
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(resource.id)}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Delete">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{resource.title}" and all associated symptom mappings.
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

export default HealingResourceLibrary;
