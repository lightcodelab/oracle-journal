import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ProfileDropdown from '@/components/ProfileDropdown';
import { 
  ArrowLeft, Plus, Search, Upload, Save, Trash2, Edit2, 
  FileAudio, FileVideo, Image, BookOpen, Users, Tag, 
  AlertTriangle, Sparkles, Filter, MoreVertical, Eye, EyeOff 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type Modality = 'meditation' | 'visualisation' | 'ritual' | 'somatic' | 'process';
type ResourceStatus = 'draft' | 'review' | 'published';
type ResourceTier = 'free' | 'paid';

interface HealingResource {
  id: string;
  title: string;
  modality: Modality;
  intensity: number;
  duration_sec: number | null;
  teaching_description: string | null;
  display_image_url: string | null;
  tier: ResourceTier;
  locale: string;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
}

interface Symptom {
  id: string;
  name: string;
  domain: 'physical' | 'mental' | 'emotional' | 'spiritual';
  description: string | null;
}

interface Teacher {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface ResourceTag {
  id: string;
  name: string;
  category: string | null;
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

const AreekeeraAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  
  // Resources state
  const [resources, setResources] = useState<HealingResource[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ResourceStatus | 'all'>('all');
  const [modalityFilter, setModalityFilter] = useState<Modality | 'all'>('all');
  
  // Symptoms state
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  
  // Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // Tags state
  const [tags, setTags] = useState<ResourceTag[]>([]);
  
  // Dialog states
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [isSymptomDialogOpen, setIsSymptomDialogOpen] = useState(false);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<HealingResource | null>(null);
  const [editingSymptom, setEditingSymptom] = useState<Symptom | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingTag, setEditingTag] = useState<ResourceTag | null>(null);
  
  // Form states
  const [resourceForm, setResourceForm] = useState({
    title: '',
    modality: 'meditation' as Modality,
    intensity: 3,
    duration_sec: 0,
    teaching_description: '',
    display_image_url: '',
    tier: 'free' as ResourceTier,
    locale: 'en',
    status: 'draft' as ResourceStatus,
  });
  
  const [symptomForm, setSymptomForm] = useState({
    name: '',
    domain: 'physical' as 'physical' | 'mental' | 'emotional' | 'spiritual',
    description: '',
  });
  
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    bio: '',
    avatar_url: '',
  });
  
  const [tagForm, setTagForm] = useState({
    name: '',
    category: '',
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/devotion');
      return;
    }

    setIsAdmin(true);
    await loadAllData();
    setLoading(false);
  };

  const loadAllData = async () => {
    await Promise.all([
      loadResources(),
      loadSymptoms(),
      loadTeachers(),
      loadTags(),
    ]);
  };

  const loadResources = async () => {
    const { data, error } = await supabase
      .from('healing_resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading resources:', error);
      return;
    }
    setResources(data || []);
  };

  const loadSymptoms = async () => {
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .order('domain', { ascending: true });
    
    if (error) {
      console.error('Error loading symptoms:', error);
      return;
    }
    setSymptoms(data || []);
  };

  const loadTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading teachers:', error);
      return;
    }
    setTeachers(data || []);
  };

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('resource_tags')
      .select('*')
      .order('category', { ascending: true });
    
    if (error) {
      console.error('Error loading tags:', error);
      return;
    }
    setTags(data || []);
  };

  // Resource CRUD
  const handleSaveResource = async () => {
    try {
      if (editingResource) {
        const { error } = await supabase
          .from('healing_resources')
          .update({
            ...resourceForm,
            duration_sec: resourceForm.duration_sec || null,
            teaching_description: resourceForm.teaching_description || null,
            display_image_url: resourceForm.display_image_url || null,
          })
          .eq('id', editingResource.id);
        
        if (error) throw error;
        toast({ title: "Resource updated successfully" });
      } else {
        const { error } = await supabase
          .from('healing_resources')
          .insert({
            ...resourceForm,
            duration_sec: resourceForm.duration_sec || null,
            teaching_description: resourceForm.teaching_description || null,
            display_image_url: resourceForm.display_image_url || null,
          });
        
        if (error) throw error;
        toast({ title: "Resource created successfully" });
      }
      
      setIsResourceDialogOpen(false);
      setEditingResource(null);
      resetResourceForm();
      await loadResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast({
        title: "Error saving resource",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('healing_resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Resource deleted" });
      await loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Error deleting resource",
        variant: "destructive",
      });
    }
  };

  const handlePublishResource = async (id: string, publish: boolean) => {
    try {
      const { error } = await supabase
        .from('healing_resources')
        .update({ status: publish ? 'published' : 'draft' })
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: publish ? "Resource published" : "Resource unpublished" });
      await loadResources();
    } catch (error) {
      console.error('Error updating resource status:', error);
      toast({
        title: "Error updating resource",
        variant: "destructive",
      });
    }
  };

  // Symptom CRUD
  const handleSaveSymptom = async () => {
    try {
      if (editingSymptom) {
        const { error } = await supabase
          .from('symptoms')
          .update({
            name: symptomForm.name,
            domain: symptomForm.domain,
            description: symptomForm.description || null,
          })
          .eq('id', editingSymptom.id);
        
        if (error) throw error;
        toast({ title: "Symptom updated successfully" });
      } else {
        const { error } = await supabase
          .from('symptoms')
          .insert({
            name: symptomForm.name,
            domain: symptomForm.domain,
            description: symptomForm.description || null,
          });
        
        if (error) throw error;
        toast({ title: "Symptom created successfully" });
      }
      
      setIsSymptomDialogOpen(false);
      setEditingSymptom(null);
      resetSymptomForm();
      await loadSymptoms();
    } catch (error) {
      console.error('Error saving symptom:', error);
      toast({
        title: "Error saving symptom",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSymptom = async (id: string) => {
    try {
      const { error } = await supabase
        .from('symptoms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Symptom deleted" });
      await loadSymptoms();
    } catch (error) {
      console.error('Error deleting symptom:', error);
      toast({
        title: "Error deleting symptom",
        variant: "destructive",
      });
    }
  };

  // Teacher CRUD
  const handleSaveTeacher = async () => {
    try {
      if (editingTeacher) {
        const { error } = await supabase
          .from('teachers')
          .update({
            name: teacherForm.name,
            bio: teacherForm.bio || null,
            avatar_url: teacherForm.avatar_url || null,
          })
          .eq('id', editingTeacher.id);
        
        if (error) throw error;
        toast({ title: "Teacher updated successfully" });
      } else {
        const { error } = await supabase
          .from('teachers')
          .insert({
            name: teacherForm.name,
            bio: teacherForm.bio || null,
            avatar_url: teacherForm.avatar_url || null,
          });
        
        if (error) throw error;
        toast({ title: "Teacher created successfully" });
      }
      
      setIsTeacherDialogOpen(false);
      setEditingTeacher(null);
      resetTeacherForm();
      await loadTeachers();
    } catch (error) {
      console.error('Error saving teacher:', error);
      toast({
        title: "Error saving teacher",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Teacher deleted" });
      await loadTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast({
        title: "Error deleting teacher",
        variant: "destructive",
      });
    }
  };

  // Tag CRUD
  const handleSaveTag = async () => {
    try {
      if (editingTag) {
        const { error } = await supabase
          .from('resource_tags')
          .update({
            name: tagForm.name,
            category: tagForm.category || null,
          })
          .eq('id', editingTag.id);
        
        if (error) throw error;
        toast({ title: "Tag updated successfully" });
      } else {
        const { error } = await supabase
          .from('resource_tags')
          .insert({
            name: tagForm.name,
            category: tagForm.category || null,
          });
        
        if (error) throw error;
        toast({ title: "Tag created successfully" });
      }
      
      setIsTagDialogOpen(false);
      setEditingTag(null);
      resetTagForm();
      await loadTags();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast({
        title: "Error saving tag",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('resource_tags')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Tag deleted" });
      await loadTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error deleting tag",
        variant: "destructive",
      });
    }
  };

  // Form reset helpers
  const resetResourceForm = () => {
    setResourceForm({
      title: '',
      modality: 'meditation',
      intensity: 3,
      duration_sec: 0,
      teaching_description: '',
      display_image_url: '',
      tier: 'free',
      locale: 'en',
      status: 'draft',
    });
  };

  const resetSymptomForm = () => {
    setSymptomForm({
      name: '',
      domain: 'physical',
      description: '',
    });
  };

  const resetTeacherForm = () => {
    setTeacherForm({
      name: '',
      bio: '',
      avatar_url: '',
    });
  };

  const resetTagForm = () => {
    setTagForm({
      name: '',
      category: '',
    });
  };

  // Edit helpers
  const openEditResource = (resource: HealingResource) => {
    setEditingResource(resource);
    setResourceForm({
      title: resource.title,
      modality: resource.modality,
      intensity: resource.intensity,
      duration_sec: resource.duration_sec || 0,
      teaching_description: resource.teaching_description || '',
      display_image_url: resource.display_image_url || '',
      tier: resource.tier,
      locale: resource.locale,
      status: resource.status,
    });
    setIsResourceDialogOpen(true);
  };

  const openEditSymptom = (symptom: Symptom) => {
    setEditingSymptom(symptom);
    setSymptomForm({
      name: symptom.name,
      domain: symptom.domain,
      description: symptom.description || '',
    });
    setIsSymptomDialogOpen(true);
  };

  const openEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      bio: teacher.bio || '',
      avatar_url: teacher.avatar_url || '',
    });
    setIsTeacherDialogOpen(true);
  };

  const openEditTag = (tag: ResourceTag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      category: tag.category || '',
    });
    setIsTagDialogOpen(true);
  };

  // Filtered data
  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(resourceSearch.toLowerCase());
    const matchesStatus = resourceFilter === 'all' || r.status === resourceFilter;
    const matchesModality = modalityFilter === 'all' || r.modality === modalityFilter;
    return matchesSearch && matchesStatus && matchesModality;
  });

  const filteredSymptoms = symptoms.filter(s => 
    s.name.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading Admin Panel...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/devotion')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-serif text-2xl text-foreground">AreekeerA Admin</h1>
              <p className="text-sm text-muted-foreground">Manage healing resources, symptoms, and protocols</p>
            </div>
          </div>
          <ProfileDropdown />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="symptoms" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Symptoms</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
          </TabsList>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v as ResourceStatus | 'all')}>
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
              <Dialog open={isResourceDialogOpen} onOpenChange={(open) => {
                setIsResourceDialogOpen(open);
                if (!open) {
                  setEditingResource(null);
                  resetResourceForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingResource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
                    <DialogDescription>
                      Create a healing resource with rich metadata for the recommendation engine.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={resourceForm.title}
                          onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                          placeholder="Enter resource title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modality">Modality *</Label>
                        <Select value={resourceForm.modality} onValueChange={(v) => setResourceForm({ ...resourceForm, modality: v as Modality })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {modalityOptions.map(m => (
                              <SelectItem key={m.value} value={m.value}>
                                <div className="flex items-center gap-2">
                                  {m.icon}
                                  {m.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tier">Tier</Label>
                        <Select value={resourceForm.tier} onValueChange={(v) => setResourceForm({ ...resourceForm, tier: v as ResourceTier })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Intensity: {resourceForm.intensity}</Label>
                        <Slider
                          value={[resourceForm.intensity]}
                          onValueChange={(v) => setResourceForm({ ...resourceForm, intensity: v[0] })}
                          min={1}
                          max={5}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Gentle</span>
                          <span>Moderate</span>
                          <span>Intense</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (seconds)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={resourceForm.duration_sec}
                          onChange={(e) => setResourceForm({ ...resourceForm, duration_sec: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 600 for 10 minutes"
                        />
                      </div>
                      <div>
                        <Label htmlFor="locale">Locale</Label>
                        <Input
                          id="locale"
                          value={resourceForm.locale}
                          onChange={(e) => setResourceForm({ ...resourceForm, locale: e.target.value })}
                          placeholder="en"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="description">Teaching Description</Label>
                        <Textarea
                          id="description"
                          value={resourceForm.teaching_description}
                          onChange={(e) => setResourceForm({ ...resourceForm, teaching_description: e.target.value })}
                          placeholder="Describe the healing practice and its benefits..."
                          rows={4}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="image">Display Image URL</Label>
                        <Input
                          id="image"
                          value={resourceForm.display_image_url}
                          onChange={(e) => setResourceForm({ ...resourceForm, display_image_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={resourceForm.status} onValueChange={(v) => setResourceForm({ ...resourceForm, status: v as ResourceStatus })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsResourceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveResource} disabled={!resourceForm.title}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingResource ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {filteredResources.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No resources found. Create your first healing resource to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredResources.map((resource) => (
                  <Card key={resource.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{resource.title}</h3>
                            <Badge variant="outline" className={statusColors[resource.status]}>
                              {resource.status}
                            </Badge>
                            <Badge variant="secondary">{resource.tier}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {modalityOptions.find(m => m.value === resource.modality)?.icon}
                              {resource.modality}
                            </span>
                            <span>Intensity: {resource.intensity}/5</span>
                            <span>Duration: {formatDuration(resource.duration_sec)}</span>
                          </div>
                          {resource.teaching_description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {resource.teaching_description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditResource(resource)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {resource.status === 'published' ? (
                              <DropdownMenuItem onClick={() => handlePublishResource(resource.id, false)}>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Unpublish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handlePublishResource(resource.id, true)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteResource(resource.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Symptoms Tab */}
          <TabsContent value="symptoms" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search symptoms..."
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isSymptomDialogOpen} onOpenChange={(open) => {
                setIsSymptomDialogOpen(open);
                if (!open) {
                  setEditingSymptom(null);
                  resetSymptomForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Symptom
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSymptom ? 'Edit Symptom' : 'Add New Symptom'}</DialogTitle>
                    <DialogDescription>
                      Define symptoms that users can report during intake.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="symptom-name">Name *</Label>
                      <Input
                        id="symptom-name"
                        value={symptomForm.name}
                        onChange={(e) => setSymptomForm({ ...symptomForm, name: e.target.value })}
                        placeholder="e.g., Anxiety, Chronic Pain"
                      />
                    </div>
                    <div>
                      <Label htmlFor="symptom-domain">Domain *</Label>
                      <Select value={symptomForm.domain} onValueChange={(v) => setSymptomForm({ ...symptomForm, domain: v as typeof symptomForm.domain })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="mental">Mental</SelectItem>
                          <SelectItem value="emotional">Emotional</SelectItem>
                          <SelectItem value="spiritual">Spiritual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="symptom-description">Description</Label>
                      <Textarea
                        id="symptom-description"
                        value={symptomForm.description}
                        onChange={(e) => setSymptomForm({ ...symptomForm, description: e.target.value })}
                        placeholder="Optional description of this symptom..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSymptomDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSymptom} disabled={!symptomForm.name}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingSymptom ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-2">
              {['physical', 'mental', 'emotional', 'spiritual'].map(domain => {
                const domainSymptoms = filteredSymptoms.filter(s => s.domain === domain);
                if (domainSymptoms.length === 0) return null;
                
                return (
                  <Card key={domain}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          domain === 'physical' ? 'bg-red-500' :
                          domain === 'mental' ? 'bg-blue-500' :
                          domain === 'emotional' ? 'bg-yellow-500' :
                          'bg-purple-500'
                        }`} />
                        {domain}
                        <Badge variant="secondary" className="ml-2">{domainSymptoms.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {domainSymptoms.map(symptom => (
                          <Badge 
                            key={symptom.id} 
                            variant="outline"
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => openEditSymptom(symptom)}
                          >
                            {symptom.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredSymptoms.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No symptoms defined. Add symptoms that users can report.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isTeacherDialogOpen} onOpenChange={(open) => {
                setIsTeacherDialogOpen(open);
                if (!open) {
                  setEditingTeacher(null);
                  resetTeacherForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
                    <DialogDescription>
                      Add teachers who create healing content.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="teacher-name">Name *</Label>
                      <Input
                        id="teacher-name"
                        value={teacherForm.name}
                        onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                        placeholder="Teacher name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher-bio">Bio</Label>
                      <Textarea
                        id="teacher-bio"
                        value={teacherForm.bio}
                        onChange={(e) => setTeacherForm({ ...teacherForm, bio: e.target.value })}
                        placeholder="Short biography..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher-avatar">Avatar URL</Label>
                      <Input
                        id="teacher-avatar"
                        value={teacherForm.avatar_url}
                        onChange={(e) => setTeacherForm({ ...teacherForm, avatar_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTeacherDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTeacher} disabled={!teacherForm.name}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingTeacher ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No teachers added yet.</p>
                  </CardContent>
                </Card>
              ) : (
                teachers.map(teacher => (
                  <Card key={teacher.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => openEditTeacher(teacher)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {teacher.avatar_url ? (
                            <img src={teacher.avatar_url} alt={teacher.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Users className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{teacher.name}</h3>
                          {teacher.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{teacher.bio}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isTagDialogOpen} onOpenChange={(open) => {
                setIsTagDialogOpen(open);
                if (!open) {
                  setEditingTag(null);
                  resetTagForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTag ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
                    <DialogDescription>
                      Create tags to categorize resources.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="tag-name">Name *</Label>
                      <Input
                        id="tag-name"
                        value={tagForm.name}
                        onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                        placeholder="Tag name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tag-category">Category</Label>
                      <Input
                        id="tag-category"
                        value={tagForm.category}
                        onChange={(e) => setTagForm({ ...tagForm, category: e.target.value })}
                        placeholder="e.g., Technique, Focus Area"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTag} disabled={!tagForm.name}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingTag ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <Card className="w-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tags created yet.</p>
                  </CardContent>
                </Card>
              ) : (
                tags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="outline"
                    className="cursor-pointer hover:bg-accent py-2 px-3"
                    onClick={() => openEditTag(tag)}
                  >
                    {tag.name}
                    {tag.category && (
                      <span className="text-muted-foreground ml-1">({tag.category})</span>
                    )}
                  </Badge>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AreekeeraAdmin;
