import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, MoreVertical, Edit2, Trash2, Eye, EyeOff,
  Sparkles, BookOpen, Users, AlertTriangle, Copy
} from 'lucide-react';

type Modality = 'meditation' | 'visualisation' | 'ritual' | 'somatic' | 'process';
type ResourceStatus = 'draft' | 'review' | 'published';

interface HealingResource {
  id: string;
  title: string;
  modality: Modality;
  intensity: number;
  duration_sec: number | null;
  teaching_description: string | null;
  display_image_url: string | null;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
}

const modalityOptions: { value: Modality; label: string; icon: React.ReactNode }[] = [
  { value: 'meditation', label: 'Meditation', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'visualisation', label: 'Visualisation', icon: <Eye className="w-4 h-4" /> },
  { value: 'ritual', label: 'Ritual', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'somatic', label: 'Somatic', icon: <Users className="w-4 h-4" /> },
  { value: 'process', label: 'Process', icon: <AlertTriangle className="w-4 h-4" /> },
];

const statusColors: Record<ResourceStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  published: 'bg-green-500/20 text-green-700 dark:text-green-400',
};

interface HealingResourceLibraryProps {
  onEdit: (resourceId: string) => void;
  onNew: () => void;
}

const HealingResourceLibrary = ({ onEdit, onNew }: HealingResourceLibraryProps) => {
  const { toast } = useToast();
  const [resources, setResources] = useState<HealingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'all'>('all');
  const [modalityFilter, setModalityFilter] = useState<Modality | 'all'>('all');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('healing_resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading resources:', error);
      toast({
        title: 'Error loading resources',
        variant: 'destructive',
      });
    } else {
      setResources(data || []);
    }
    setLoading(false);
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

  const handleTogglePublish = async (id: string, currentStatus: ResourceStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase
        .from('healing_resources')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: newStatus === 'published' ? 'Resource published' : 'Resource unpublished' });
      await loadResources();
    } catch (error) {
      console.error('Error updating resource status:', error);
      toast({
        title: 'Error updating resource',
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
      const { data: newResource, error: insertError } = await supabase
        .from('healing_resources')
        .insert({
          title: `${original.title} (Copy)`,
          modality: original.modality,
          intensity: original.intensity,
          duration_sec: original.duration_sec,
          teaching_description: original.teaching_description,
          body_richtext: original.body_richtext,
          display_image_url: original.display_image_url,
          vimeo_embed_url: original.vimeo_embed_url,
          tier: original.tier,
          locale: original.locale,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError || !newResource) {
        throw new Error('Failed to create duplicate');
      }

      // Copy symptom associations if any
      const { data: symptomLinks } = await supabase
        .from('contraindications')
        .select('*')
        .eq('resource_id', id);

      if (symptomLinks && symptomLinks.length > 0) {
        await supabase.from('contraindications').insert(
          symptomLinks.map(link => ({
            resource_id: newResource.id,
            symptom_id: link.symptom_id,
            rule: link.rule,
            min_band: link.min_band,
            message: link.message,
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
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesModality = modalityFilter === 'all' || r.modality === modalityFilter;
    return matchesSearch && matchesStatus && matchesModality;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading resources...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ResourceStatus | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modalityFilter} onValueChange={(v) => setModalityFilter(v as Modality | 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Modality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modalities</SelectItem>
              {modalityOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Resource Grid */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate">
                      {resource.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={statusColors[resource.status]}>
                        {resource.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getModalityLabel(resource.modality)}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(resource.id)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(resource.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePublish(resource.id, resource.status)}>
                        {resource.status === 'published' ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(resource.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Intensity:</span>
                    <span className="font-medium">{resource.intensity}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{formatDuration(resource.duration_sec)}</span>
                  </div>
                </div>
                {resource.display_image_url && (
                  <div className="mt-3">
                    <img 
                      src={resource.display_image_url.startsWith('http') 
                        ? resource.display_image_url 
                        : supabase.storage.from('healing-resource-images').getPublicUrl(resource.display_image_url).data.publicUrl
                      }
                      alt={resource.title}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredResources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No resources found. Create your first healing resource.
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default HealingResourceLibrary;
